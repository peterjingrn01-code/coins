const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET,POST,OPTIONS',
  'access-control-allow-headers': 'content-type, authorization'
};
const KEY = 'JSLCoin_STATE_v4';
const SESSION_TTL_MS = 1000 * 60 * 60 * 12;
const freshState = () => ({
  coin:'JSLCoin', version:'4.0', genesis:false,
  totalSupply:0, circulating:0, treasury:0,
  owner:null, users:{}, sessions:{}, ledger:[]
});
function json(data,status=200){return new Response(JSON.stringify(data,null,2),{status,headers:{...CORS,'content-type':'application/json'}})}
async function body(req){ try{return await req.json()}catch(e){return {}} }
async function readState(env){
  if(!env.DB) return freshState();
  const raw = await env.DB.get(KEY);
  if(!raw) return freshState();
  try { return {...freshState(), ...JSON.parse(raw)}; } catch(e){ return freshState(); }
}
async function writeState(env,state){ if(env.DB) await env.DB.put(KEY, JSON.stringify(state)); }
function clean(s){ return String(s||'').trim(); }
function uname(s){ return clean(s).toLowerCase(); }
function amountOf(v){ const n=Number(v||0); if(!Number.isFinite(n)||n<=0) throw new Error('Invalid amount'); return n; }
function token(){ return crypto.randomUUID()+'-'+Math.random().toString(36).slice(2); }
function salt(){ return crypto.randomUUID().replaceAll('-',''); }
async function sha256(text){
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b=>b.toString(16).padStart(2,'0')).join('');
}
async function makeHash(password, s=salt()){ return {salt:s, hash:await sha256(s+'|'+String(password||''))}; }
async function verify(password, rec){ if(!rec||!rec.salt||!rec.hash) return false; return (await sha256(rec.salt+'|'+String(password||'')))===rec.hash; }
function publicUser(u){ if(!u) return null; return {name:u.name,email:u.email||'',walletKey:u.walletKey||'',balance:Number(u.balance||0),role:u.role||'user',created:u.created}; }
function publicBalances(state){
  const out={};
  for(const [k,u] of Object.entries(state.users||{})) out[k]=publicUser(u);
  return out;
}
function tx(state,type,from,to,amount,status='confirmed', note=''){
  const id = 'TX-' + String(state.ledger.length + 1).padStart(6,'0');
  state.ledger.unshift({id,type,from,to,amount:Number(amount||0),status,note,time:new Date().toISOString()});
  return id;
}
function needGenesis(state){ if(!state.genesis) throw new Error('Genesis has not been started'); }
function bearer(req){ const h=req.headers.get('authorization')||''; return h.toLowerCase().startsWith('bearer ')?h.slice(7).trim():''; }
function sessionUser(state, req, role){
  const t=bearer(req);
  if(!t) throw new Error('Login required');
  const s=state.sessions && state.sessions[t];
  if(!s || !s.expires || s.expires < Date.now()) throw new Error('Session expired. Please login again.');
  if(role && s.role !== role) throw new Error('Permission denied');
  return {token:t, ...s};
}
function findUserKey(state, login){
  const q=uname(login);
  if(!q) return '';
  if(state.users[q]) return q;
  for(const [k,u] of Object.entries(state.users||{})){
    if(uname(u.email)===q || clean(u.walletKey)===clean(login)) return k;
  }
  return '';
}
function ownerMatches(state, login){
  if(!state.owner) return false;
  const q=clean(login);
  return uname(state.owner.email)===uname(q) || clean(state.owner.walletKey)===q || uname(state.owner.name)==='owner';
}
function safeStatus(state, env){ return {ok:true,coin:state.coin,version:state.version,genesis:state.genesis,totalSupply:state.totalSupply,circulating:state.circulating,treasury:state.treasury,users:Object.keys(state.users||{}).length,ledgerCount:state.ledger.length,ownerReady:!!state.owner,db:!!env.DB}; }
export default { async fetch(req, env) {
  if(req.method === 'OPTIONS') return new Response(null,{headers:CORS});
  const url = new URL(req.url); const path = url.pathname.replace(/\/$/,'') || '/';
  try{
    const state = await readState(env);
    // remove expired sessions opportunistically
    for(const [k,s] of Object.entries(state.sessions||{})){ if(!s.expires || s.expires < Date.now()) delete state.sessions[k]; }

    if(path === '/' || path === '/status') return json(safeStatus(state,env));
    if(path === '/transactions') return json({ok:true,transactions:state.ledger});
    if(path === '/balances') return json({ok:true,users:publicBalances(state),treasury:state.treasury});
    if(path === '/me'){
      const s=sessionUser(state,req);
      return json({ok:true,user:s.user,role:s.role,expires:s.expires,balance:s.role==='user'&&state.users[s.user]?state.users[s.user].balance:null});
    }
    if(path === '/logout'){
      const t=bearer(req); if(t && state.sessions) delete state.sessions[t]; await writeState(env,state); return json({ok:true,message:'Logged out'});
    }

    if(path === '/owner-login'){
      const b=await body(req); const email=clean(b.email||b.login); const walletKey=clean(b.walletKey); const password=String(b.password||'');
      if(!password) throw new Error('Owner password required');
      if(!state.owner){
        if(!email && !walletKey) throw new Error('Owner email or wallet key required');
        state.owner={name:'owner',email,walletKey,password:await makeHash(password),created:new Date().toISOString()};
        tx(state,'OWNER_SETUP','SYSTEM','OWNER',0,'confirmed','Owner account created');
      } else {
        if(!(ownerMatches(state,email)||ownerMatches(state,walletKey))) throw new Error('Owner not found');
        if(!(await verify(password,state.owner.password))) throw new Error('Invalid owner password');
      }
      const t=token(); state.sessions[t]={user:'owner',role:'owner',expires:Date.now()+SESSION_TTL_MS}; await writeState(env,state);
      return json({ok:true,message:'Owner logged in',token:t,user:'owner',role:'owner',expires:Date.now()+SESSION_TTL_MS});
    }

    if(path === '/register'){
      needGenesis(state); const b=await body(req); const name=uname(b.user||b.name); const password=String(b.password||'');
      if(!name) throw new Error('User name required');
      if(!password) throw new Error('Password required');
      if(state.users[name]) throw new Error('User already exists');
      state.users[name]={name,email:clean(b.email),walletKey:clean(b.walletKey),password:await makeHash(password),balance:0,role:'user',created:new Date().toISOString()};
      tx(state,'REGISTER','SYSTEM',name,0,'confirmed','User registered');
      const t=token(); state.sessions[t]={user:name,role:'user',expires:Date.now()+SESSION_TTL_MS}; await writeState(env,state);
      return json({ok:true,message:'Registered and logged in',token:t,user:name,role:'user'});
    }
    if(path === '/login'){
      const b=await body(req); const login=clean(b.login||b.user||b.email||b.walletKey); const password=String(b.password||'');
      const key=findUserKey(state,login); if(!key) throw new Error('User not found');
      if(!(await verify(password,state.users[key].password))) throw new Error('Invalid password');
      const t=token(); state.sessions[t]={user:key,role:'user',expires:Date.now()+SESSION_TTL_MS}; await writeState(env,state);
      return json({ok:true,message:'Logged in',token:t,user:key,role:'user',balance:state.users[key].balance});
    }

    if(path === '/genesis'){
      sessionUser(state,req,'owner');
      if(!state.genesis){ state.genesis=true; tx(state,'GENESIS','SYSTEM','OWNER',0); await writeState(env,state); }
      return json({ok:true,message:'Genesis completed',state:safeStatus(state,env)});
    }
    if(path === '/issue'){
      sessionUser(state,req,'owner'); needGenesis(state); const b = await body(req); const amount = amountOf(b.amount||1000000000);
      state.totalSupply += amount; state.treasury += amount; tx(state,'ISSUE','OWNER','TREASURY',amount); await writeState(env,state);
      return json({ok:true,message:'Issue completed',state:safeStatus(state,env)});
    }
    if(path === '/buy'){
      const s=sessionUser(state,req,'user'); needGenesis(state); const b=await body(req); const amount=amountOf(b.amount); const u=state.users[s.user];
      if(state.treasury < amount) throw new Error('Treasury insufficient');
      state.treasury -= amount; state.circulating += amount; u.balance += amount; tx(state,'BUY','TREASURY',s.user,amount); await writeState(env,state);
      return json({ok:true,message:'Buy completed',balance:u.balance,state:safeStatus(state,env)});
    }
    if(path === '/sell'){
      const s=sessionUser(state,req,'user'); needGenesis(state); const b=await body(req); const amount=amountOf(b.amount); const u=state.users[s.user];
      if(u.balance < amount) throw new Error('User balance insufficient');
      u.balance -= amount; state.treasury += amount; state.circulating -= amount; tx(state,'SELL',s.user,'TREASURY',amount); await writeState(env,state);
      return json({ok:true,message:'Sell completed',balance:u.balance,state:safeStatus(state,env)});
    }
    if(path === '/send'){
      const s=sessionUser(state,req,'user'); needGenesis(state); const b=await body(req); const to=uname(b.to); const amount=amountOf(b.amount);
      if(!to || !state.users[to]) throw new Error('Receiver not found');
      if(to===s.user) throw new Error('Cannot send to yourself');
      if(state.users[s.user].balance < amount) throw new Error('Sender balance insufficient');
      state.users[s.user].balance -= amount; state.users[to].balance += amount; tx(state,'SEND',s.user,to,amount); await writeState(env,state);
      return json({ok:true,message:'Send completed',from:s.user,to,balance:state.users[s.user].balance});
    }
    if(path === '/pair-confirm'){
      const s=sessionUser(state,req,'user'); needGenesis(state); const b=await body(req); const to=uname(b.to)||s.user; tx(state,'PAIR_CONFIRM',s.user,to,0,'confirmed','OmegaPair confirmation'); await writeState(env,state);
      return json({ok:true,message:'Pair confirmed'});
    }
    return json({ok:false,error:'Not found',path},404);
  }catch(e){ return json({ok:false,error:e.message||String(e)},400); }
}};
