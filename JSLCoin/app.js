const API = 'https://jslcoin.jsl-ian.com';
const USER_TOKEN_KEY = 'JSLCoin_user_token_v40';
const USER_NAME_KEY = 'JSLCoin_user_name_v40';
const OWNER_TOKEN_KEY = 'JSLCoin_owner_token_v40';
const OWNER_NAME_KEY = 'JSLCoin_owner_name_v40';

const $=id=>document.getElementById(id);
const num=n=>Number(n||0).toLocaleString();
function get(k){return localStorage.getItem(k)||''}
function put(k,v){v?localStorage.setItem(k,v):localStorage.removeItem(k)}
function msg(t,ok=true){const m=$('msg');if(m){m.textContent=t;m.className=ok?'msg ok':'msg bad'}}
function set(id,v){const e=$(id); if(e)e.textContent=v}
function val(id){const e=$(id); return e?e.value.trim():''}
function amount(){const n=Number(val('amount')||val('issueAmount')||0); if(!Number.isFinite(n)||n<=0) throw new Error('Invalid amount'); return n;}
async function api(path,data,token){
  const headers={'content-type':'application/json'};
  if(token) headers.authorization='Bearer '+token;
  const opt=data===undefined?{headers}:{method:'POST',headers,body:JSON.stringify(data)};
  const r=await fetch(API+path,opt);
  const txt=await r.text(); let j;
  try{j=txt?JSON.parse(txt):{}}catch(e){j={ok:false,error:txt}}
  if(!r.ok||j.ok===false)throw new Error(j.error||('HTTP '+r.status));
  return j;
}
function userToken(){return get(USER_TOKEN_KEY)}
function ownerToken(){return get(OWNER_TOKEN_KEY)}
function setUserSession(j){put(USER_TOKEN_KEY,j.token); put(USER_NAME_KEY,j.user); renderSession();}
function setOwnerSession(j){put(OWNER_TOKEN_KEY,j.token); put(OWNER_NAME_KEY,j.user||'owner'); renderSession();}
function clearUser(){put(USER_TOKEN_KEY,''); put(USER_NAME_KEY,''); renderSession();}
function clearOwner(){put(OWNER_TOKEN_KEY,''); put(OWNER_NAME_KEY,''); renderSession();}
function renderSession(){
  const user=get(USER_NAME_KEY), owner=get(OWNER_NAME_KEY);
  set('currentUser',user||'Not logged in');
  set('currentOwner',owner||'Not logged in');
  set('sessionBadge',user?('Logged in: '+user):'Not logged in');
  set('ownerBadge',owner?('Owner session active'):'Owner not logged in');
  const u=$('loginUserName'); if(u && user) u.value=user;
}
async function refresh(){
  renderSession();
  try{
    const s=await api('/status');
    set('version',s.version||'—'); set('genesis',String(s.genesis)); set('totalSupply',num(s.totalSupply)); set('circulatingSupply',num(s.circulating)); set('treasury',num(s.treasury)); set('users',num(s.users)); set('ledgerCount',num(s.ledgerCount)); set('ownerReady',String(s.ownerReady)); set('db',String(s.db));
    await loadLedger(); await loadBalances();
  }catch(e){msg(e.message,false)}
}
async function loadLedger(){
  const el=$('ledgerRows'); if(!el) return;
  const j=await api('/transactions');
  el.innerHTML=(j.transactions||[]).map(x=>`<tr><td>${x.id}</td><td>${x.type}</td><td>${x.from}</td><td>${x.to}</td><td>${num(x.amount)}</td><td>${x.status}</td><td>${x.note||''}</td><td>${x.time}</td></tr>`).join('') || '<tr><td colspan="8">No ledger records</td></tr>';
}
async function loadBalances(){
  const el=$('balanceRows'); if(!el) return;
  const j=await api('/balances'); const users=j.users||{}; const current=get(USER_NAME_KEY);
  el.innerHTML=Object.keys(users).sort().map(k=>`<tr><td>${k}${k===current?' ★':''}</td><td>${num(users[k].balance)}</td><td>${users[k].email||''}</td><td>${users[k].walletKey||''}</td><td>${users[k].created||''}</td></tr>`).join('') || '<tr><td colspan="5">No users</td></tr>';
  if(current && users[current]) set('myBalance',num(users[current].balance)); else set('myBalance','—');
}
async function ownerLogin(){try{const j=await api('/owner-login',{email:val('ownerEmail'),walletKey:val('ownerWalletKey'),password:val('ownerPassword')}); setOwnerSession(j); msg(j.message||'Owner logged in'); await refresh();}catch(e){msg(e.message,false)}}
async function ownerLogout(){try{await api('/logout',{},ownerToken()); clearOwner(); msg('Owner logged out'); await refresh();}catch(e){clearOwner(); msg('Owner logged out')}}
async function ownerGenesis(){try{const j=await api('/genesis',{},ownerToken()); msg(j.message||'Genesis completed'); await refresh();}catch(e){msg(e.message,false)}}
async function ownerIssue(){try{const j=await api('/issue',{amount:Number(val('issueAmount')||1000000000)},ownerToken()); msg(j.message||'Issue completed'); await refresh();}catch(e){msg(e.message,false)}}
async function registerUser(){try{const j=await api('/register',{user:val('regUser'),email:val('regEmail'),walletKey:val('regWalletKey'),password:val('regPassword')}); setUserSession(j); msg(j.message||'Registered'); await refresh();}catch(e){msg(e.message,false)}}
async function loginUser(){try{const j=await api('/login',{login:val('loginUserName'),password:val('loginPassword')}); setUserSession(j); msg(j.message||'Logged in'); await refresh();}catch(e){msg(e.message,false)}}
async function logoutUser(){try{await api('/logout',{},userToken()); clearUser(); msg('Logged out'); await refresh();}catch(e){clearUser(); msg('Logged out')}}
async function buyCoin(){try{const j=await api('/buy',{amount:amount()},userToken()); msg(j.message||'Buy completed'); await refresh();}catch(e){msg(e.message,false)}}
async function sellCoin(){try{const j=await api('/sell',{amount:amount()},userToken()); msg(j.message||'Sell completed'); await refresh();}catch(e){msg(e.message,false)}}
async function sendCoin(){try{const j=await api('/send',{to:val('toUser'),amount:amount()},userToken()); msg(j.message||'Send completed'); await refresh();}catch(e){msg(e.message,false)}}
async function pairConfirm(){try{const j=await api('/pair-confirm',{to:val('toUser')},userToken()); msg(j.message||'Pair confirmed'); await refresh();}catch(e){msg(e.message,false)}}
window.addEventListener('load',refresh);
