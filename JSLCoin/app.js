const API = 'https://jslcoin.jsl-ian.com';
const SESSION_KEY = 'JSLCoin_currentUser_v31';

async function api(path,data){
  const opt=data===undefined?{}:{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(data)};
  const r=await fetch(API+path,opt);
  const txt=await r.text();
  let j;
  try{j=txt?JSON.parse(txt):{}}catch(e){j={ok:false,error:txt}}
  if(!r.ok||j.ok===false)throw new Error(j.error||('HTTP '+r.status));
  return j;
}
const $=id=>document.getElementById(id);
const num=n=>Number(n||0).toLocaleString();
const currentUser=()=>localStorage.getItem(SESSION_KEY)||'';
function setCurrentUser(u){u?localStorage.setItem(SESSION_KEY,u):localStorage.removeItem(SESSION_KEY);renderSession();}
function msg(t,ok=true){const m=$('msg');if(m){m.textContent=t;m.className=ok?'msg ok':'msg bad'}}
function set(id,v){const e=$(id); if(e)e.textContent=v}
function getAmount(){return Number(($('amount')&&$('amount').value)||0)}
function renderSession(){
  const u=currentUser();
  set('currentUser',u||'Not logged in');
  const badge=$('sessionBadge'); if(badge) badge.textContent = u ? ('Logged in: '+u) : 'Not logged in';
  const userInput=$('userName'); if(userInput && u) userInput.value=u;
}
async function refresh(){
  renderSession();
  try{
    const s=await api('/status');
    set('genesis',String(s.genesis));
    set('totalSupply',num(s.totalSupply));
    set('circulatingSupply',num(s.circulating));
    set('users',num(s.users));
    await loadLedger();
    await loadBalances();
  }catch(e){msg(e.message,false)}
}
async function loadLedger(){
  const j=await api('/transactions');
  const rows=(j.transactions||[]).map(x=>`<tr><td>${x.id}</td><td>${x.type}</td><td>${x.from}</td><td>${x.to}</td><td>${num(x.amount)}</td><td>${x.status}</td><td>${x.time}</td></tr>`).join('');
  const el=$('ledgerRows'); if(el)el.innerHTML=rows;
}
async function loadBalances(){
  try{
    const j=await api('/balances');
    const entries=Object.entries(j.users||{});
    const el=$('balanceRows');
    if(el)el.innerHTML=entries.map(([u,o])=>`<tr><td>${u}</td><td>${num(o.balance)}</td><td>${o.createdAt||''}</td></tr>`).join('');
    const u=currentUser();
    if(u && j.users && j.users[u]) set('myBalance',num(j.users[u].balance));
    else set('myBalance','—');
  }catch(e){}
}
async function ownerGenesis(){try{await api('/genesis',{});msg('Genesis completed');await refresh()}catch(e){msg(e.message,false)}}
async function ownerIssue(){try{await api('/issue',{amount:Number($('issueAmount').value||0)});msg('Issue completed');await refresh()}catch(e){msg(e.message,false)}}
async function registerUser(){
  try{
    const u=$('userName').value.trim();
    await api('/register',{user:u});
    setCurrentUser(u);
    msg('Registered and logged in: '+u);
    await refresh();
  }catch(e){msg(e.message,false)}
}
async function loginUser(){
  try{
    const u=$('userName').value.trim();
    const r=await api('/login',{user:u});
    setCurrentUser(r.user||u);
    msg('Logged in: '+(r.user||u));
    await refresh();
  }catch(e){msg(e.message,false)}
}
async function logoutUser(){
  const u=currentUser();
  setCurrentUser('');
  msg(u ? ('Logged out: '+u) : 'Already logged out');
  await refresh();
}
function requireLogin(){const u=currentUser(); if(!u) throw new Error('Please login first'); return u;}
async function buyCoin(){try{const u=requireLogin(); await api('/buy',{user:u,amount:getAmount()});msg('Buy completed');await refresh()}catch(e){msg(e.message,false)}}
async function sellCoin(){try{const u=requireLogin(); await api('/sell',{user:u,amount:getAmount()});msg('Sell completed');await refresh()}catch(e){msg(e.message,false)}}
async function sendCoin(){try{const u=requireLogin(); await api('/send',{from:u,to:$('toUser').value.trim(),amount:getAmount()});msg('Send completed');await refresh()}catch(e){msg(e.message,false)}}
async function pairConfirm(){try{const u=requireLogin(); await api('/pair-confirm',{receiver:$('toUser').value.trim()||u});msg('Pair confirmed');await refresh()}catch(e){msg(e.message,false)}}
window.addEventListener('load',refresh);
