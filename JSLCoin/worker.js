const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,OPTIONS",
  "access-control-allow-headers": "content-type,authorization"
};
const KEY = "JSLCoin_STATE_v4";
const SESSION_TTL = 12 * 60 * 60 * 1000;
const RESET_TTL = 15 * 60 * 1000;
const INITIAL_SUPPLY = 1_000_000_000;
const OWNER_EMAIL = "jingxingwei@hotmail.com";

const clean = v => String(v ?? "").trim();
const norm = v => clean(v).toLowerCase();
const now = () => new Date().toISOString();
const id = prefix => `${prefix}-${Date.now()}-${crypto.randomUUID().slice(0,8)}`;
const wallet = () => `JSLΩ-${crypto.randomUUID().replaceAll("-","").slice(0,12).toUpperCase()}`;

function json(data, status=200) {
  return new Response(JSON.stringify(data, null, 2), {status, headers: {...CORS, "content-type":"application/json"}});
}
async function body(req){ try{return await req.json()}catch{return {}} }

function emptyState(){
  return {coin:"JSLCoin",version:"5.1",genesis:false,totalSupply:0,treasury:0,circulating:0,owner:null,users:{},sessions:{},ledger:[]};
}
function normalizeState(s){
  const base = emptyState();
  s = {...base, ...(s || {})};
  s.users = s.users || {};
  s.sessions = s.sessions || {};
  s.ledger = Array.isArray(s.ledger) ? s.ledger : [];
  for (const [k,u0] of Object.entries(s.users)) {
    const u = u0 || {};
    u.id = u.id || k;
    u.username = norm(u.username || u.name || k);
    u.displayName = clean(u.displayName || u.name || u.username || "User");
    u.email = norm(u.email);
    u.phone = clean(u.phone);
    u.wallet = clean(u.wallet || u.walletKey) || wallet();
    u.balance = Number(u.balance || 0);
    u.role = u.role === "owner" ? "owner" : "user";
    s.users[k] = u;
  }
  s.totalSupply = Number(s.totalSupply || s.supply || 0);
  s.treasury = Number(s.treasury || 0);
  s.circulating = Number(s.circulating || 0);
  return s;
}
async function readState(env){
  if (!env.DB) throw new Error("KV binding DB is missing");
  const raw = await env.DB.get(KEY);
  return normalizeState(raw ? JSON.parse(raw) : emptyState());
}
async function writeState(env,state){ await env.DB.put(KEY, JSON.stringify(normalizeState(state))); }

function publicUser(u){
  return {id:u.id,username:u.username,displayName:u.displayName,email:u.email,phone:u.phone,wallet:u.wallet,balance:u.balance,role:u.role};
}
function findUserKey(state, login){
  const q = norm(login);
  if (!q) return "";
  if (state.users[q]) return q;
  for (const [k,u] of Object.entries(state.users)) {
    if ([u.id,u.username,u.email,u.phone,u.wallet].some(v => norm(v) === q)) return k;
  }
  return "";
}
function bearer(req){ return clean(req.headers.get("authorization")).replace(/^Bearer\s+/i,""); }
function sessionUser(state,req,role){
  const t=bearer(req), s=state.sessions[t];
  if(!t || !s || s.expires < Date.now()) throw new Error("Login required");
  const u=state.users[s.user];
  if(!u) throw new Error("Account not found");
  if(role && u.role!==role) throw new Error("Permission denied");
  return {token:t, session:s, user:u, key:s.user};
}
async function digest(text){
  const buf=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map(x=>x.toString(16).padStart(2,"0")).join("");
}
async function setPassword(u,password){
  if(clean(password).length<8) throw new Error("Password must be at least 8 characters");
  u.passwordHash=await digest(password);
  delete u.password;
}
async function verifyPassword(u,password){
  if(u.passwordHash) return (await digest(password))===u.passwordHash;
  if(u.password !== undefined && String(u.password)===String(password)){ await setPassword(u,password); return true; }
  return false;
}
function makeSession(state,key){
  const t=crypto.randomUUID()+crypto.randomUUID();
  state.sessions[t]={user:key,expires:Date.now()+SESSION_TTL};
  return t;
}
function addTx(state,{type,fromKey=null,toKey=null,amount=0,status="confirmed",note=""}){
  const from=fromKey ? state.users[fromKey] : null;
  const to=toKey ? state.users[toKey] : null;
  const tx={id:id("TX"),time:now(),type,fromUserId:from?.id||null,fromWallet:from?.wallet||"Ω",fromLabel:from?.displayName||"Ω",
    toUserId:to?.id||null,toWallet:to?.wallet||"TREASURY",toLabel:to?.displayName||"Treasury",amount:Number(amount),status,note};
  state.ledger.unshift(tx);
  return tx;
}
function requireAmount(v){ const n=Number(v); if(!Number.isFinite(n)||n<=0) throw new Error("Amount must be greater than zero"); return n; }
function userTransactions(state,u){ return state.ledger.filter(t=>t.fromUserId===u.id||t.toUserId===u.id||t.fromWallet===u.wallet||t.toWallet===u.wallet); }

async function handle(req,env){
  if(req.method==="OPTIONS") return new Response(null,{headers:CORS});
  const path=new URL(req.url).pathname.replace(/\/$/,"")||"/";
  const state=await readState(env);
  for(const [k,s] of Object.entries(state.sessions)) if(!s.expires||s.expires<Date.now()) delete state.sessions[k];

  if(path==="/"||path==="/status"){
    return json({ok:true,coin:state.coin,version:state.version,genesis:state.genesis,totalSupply:state.totalSupply,
      circulating:state.circulating,treasury:state.treasury,users:Object.keys(state.users).length,ledgerCount:state.ledger.length,
      ownerReady:!!state.owner,db:true});
  }

  if(path==="/owner-login"){
    const b=await body(req), login=clean(b.login||b.email||b.walletKey), password=String(b.password||"");
    if(!state.owner){
      if(!login) throw new Error("Owner email or wallet key required");
      const key="owner";
      const owner={id:key,username:"owner",displayName:"JSL-ian Owner",email:norm(b.email||login.includes("@")?login:OWNER_EMAIL),
        phone:"",wallet:login.includes("@")?wallet():login,balance:0,role:"owner"};
      await setPassword(owner,password);
      state.users[key]=owner; state.owner=key;
    }
    const key=state.owner, owner=state.users[key];
    if(![owner.email,owner.wallet,owner.username].some(v=>norm(v)===norm(login))) throw new Error("Owner account not found");
    if(!await verifyPassword(owner,password)) throw new Error("Invalid password");
    const token=makeSession(state,key); await writeState(env,state);
    return json({ok:true,token,user:publicUser(owner)});
  }

  if(path==="/register"){
    if(!state.genesis) throw new Error("Genesis must be completed first");
    const b=await body(req), username=norm(b.user||b.username), email=norm(b.email), phone=clean(b.phone);
    if(!username&&!email&&!phone) throw new Error("Username, email, or phone required");
    if(findUserKey(state,username||email||phone)) throw new Error("Account already exists");
    const key=id("USER");
    const u={id:key,username:username||`user-${Object.keys(state.users).length}`,displayName:clean(b.name)||username||"User",
      email,phone,wallet:wallet(),balance:0,role:"user"};
    await setPassword(u,String(b.password||""));
    state.users[key]=u; addTx(state,{type:"REGISTER",toKey:key,amount:0,note:"Account and wallet created"});
    const token=makeSession(state,key); await writeState(env,state);
    return json({ok:true,token,user:publicUser(u),message:"Account and wallet created"});
  }

  if(path==="/login"){
    const b=await body(req), key=findUserKey(state,b.login||b.user||b.email||b.phone||b.wallet);
    if(!key) throw new Error("Account not found");
    const u=state.users[key];
    if(!await verifyPassword(u,String(b.password||""))) throw new Error("Invalid password");
    const token=makeSession(state,key); await writeState(env,state);
    return json({ok:true,token,user:publicUser(u)});
  }

  if(path==="/logout"){
    const t=bearer(req); if(t) delete state.sessions[t]; await writeState(env,state); return json({ok:true});
  }
  if(path==="/me"){ const {user}=sessionUser(state,req); return json({ok:true,user:publicUser(user)}); }

  if(path==="/genesis"){
    const {key}=sessionUser(state,req,"owner");
    if(state.genesis) return json({ok:true,message:"Genesis already completed"});
    state.genesis=true; state.totalSupply=INITIAL_SUPPLY; state.users[key].balance=INITIAL_SUPPLY; state.circulating=INITIAL_SUPPLY; state.treasury=0;
    addTx(state,{type:"GENESIS",toKey:key,amount:INITIAL_SUPPLY,note:"Initial supply"});
    await writeState(env,state); return json({ok:true,message:"Genesis completed"});
  }

  if(path==="/send"||path==="/owner-send"){
    const needed=path==="/owner-send"?"owner":null;
    const {key,user}=sessionUser(state,req,needed);
    const b=await body(req), toKey=findUserKey(state,b.to), amount=requireAmount(b.amount);
    if(!toKey) throw new Error("Recipient not found");
    if(toKey===key) throw new Error("Cannot send to yourself");
    if(user.balance<amount) throw new Error("Insufficient balance");
    user.balance-=amount; state.users[toKey].balance+=amount;
    addTx(state,{type:path==="/owner-send"?"OWNER_SEND":"SEND",fromKey:key,toKey,amount});
    await writeState(env,state); return json({ok:true,message:"Transfer completed",balance:user.balance});
  }

  if(path==="/buy"){
    const {key,user}=sessionUser(state,req); const b=await body(req), amount=requireAmount(b.amount);
    if(state.treasury<amount) throw new Error("Treasury balance insufficient");
    state.treasury-=amount; user.balance+=amount; state.circulating+=amount;
    addTx(state,{type:"BUY",toKey:key,amount,note:"Treasury purchase"});
    await writeState(env,state); return json({ok:true,message:"Buy completed",balance:user.balance});
  }

  if(path==="/sell"){
    const {key,user}=sessionUser(state,req); const b=await body(req), amount=requireAmount(b.amount);
    if(user.balance<amount) throw new Error("Insufficient balance");
    user.balance-=amount; state.treasury+=amount; state.circulating-=amount;
    addTx(state,{type:"SELL",fromKey:key,amount,note:"Sold to treasury"});
    await writeState(env,state); return json({ok:true,message:"Sell completed",balance:user.balance});
  }

  if(path==="/transactions"){
    const {user}=sessionUser(state,req);
    return json({ok:true,transactions:user.role==="owner"?state.ledger:userTransactions(state,user)});
  }
  if(path==="/ledger"){ sessionUser(state,req,"owner"); return json({ok:true,transactions:state.ledger}); }
  if(path==="/users"){ sessionUser(state,req,"owner"); return json({ok:true,users:Object.values(state.users).map(publicUser)}); }

  if(path==="/forgot-password"){
    const b=await body(req), login=clean(b.login||b.user||b.email||b.phone||b.wallet), key=findUserKey(state,login);
    // Do not reveal whether an account exists in production.
    if(!key) return json({ok:true,message:"If the account exists, a reset code has been prepared."});
    const code=String(Math.floor(100000+Math.random()*900000));
    state.users[key].resetCodeHash=await digest(code);
    state.users[key].resetExpires=Date.now()+RESET_TTL;
    await writeState(env,state);
    return json({ok:true,message:"Reset code created. Continue to Update Password.",resetCode:code});
  }

  if(path==="/reset-password"){
    const b=await body(req), key=findUserKey(state,b.login||b.user||b.email||b.phone||b.wallet);
    if(!key) throw new Error("Invalid reset request");
    const u=state.users[key];
    if(!u.resetCodeHash||u.resetExpires<Date.now()) throw new Error("Reset code expired or invalid");
    if(await digest(String(b.code||""))!==u.resetCodeHash) throw new Error("Reset code expired or invalid");
    await setPassword(u,String(b.password||"")); delete u.resetCodeHash; delete u.resetExpires;
    for(const [t,s] of Object.entries(state.sessions)) if(s.user===key) delete state.sessions[t];
    await writeState(env,state); return json({ok:true,message:"Password updated. Please sign in again."});
  }

  if(path==="/audit"){
    sessionUser(state,req,"owner");
    const sum=Object.values(state.users).reduce((n,u)=>n+Number(u.balance||0),0)+Number(state.treasury||0);
    const ok=Math.abs(sum-state.totalSupply)<1e-9;
    return json({ok,message:ok?"Audit passed: balances plus treasury equal total supply.":`Audit failed: ${sum} does not equal ${state.totalSupply}.`,
      totals:{userBalances:sum-state.treasury,treasury:state.treasury,totalSupply:state.totalSupply}});
  }

  if(path==="/issue") return json({ok:false,error:"Additional issuance is disabled for JSLCoin."},403);
  return json({ok:false,error:"Not found",path},404);
}

export default {async fetch(req,env){try{return await handle(req,env)}catch(e){return json({ok:false,error:e.message||String(e)},400)}}};