const API = 'https://jslcoin.jsl-ian.com';
async function api(path,data){const opt=data===undefined?{}:{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(data)};const r=await fetch(API+path,opt);const txt=await r.text();let j;try{j=txt?JSON.parse(txt):{}}catch(e){j={ok:false,error:txt}}if(!r.ok||j.ok===false)throw new Error(j.error||('HTTP '+r.status));return j}
const $=id=>document.getElementById(id);const num=n=>Number(n||0).toLocaleString();
function msg(t,ok=true){const m=$('msg');if(m){m.textContent=t;m.className=ok?'msg ok':'msg bad'}}
function set(id,v){const e=$(id); if(e)e.textContent=v}
async function refresh(){try{const s=await api('/status');set('genesis',String(s.genesis));set('totalSupply',num(s.totalSupply));set('circulatingSupply',num(s.circulating));set('users',num(s.users));await loadLedger();await loadBalances()}catch(e){msg(e.message,false)}}
async function loadLedger(){const j=await api('/transactions');const rows=(j.transactions||[]).map(x=>`<tr><td>${x.id}</td><td>${x.type}</td><td>${x.from}</td><td>${x.to}</td><td>${num(x.amount)}</td><td>${x.status}</td><td>${x.time}</td></tr>`).join('');const el=$('ledgerRows'); if(el)el.innerHTML=rows;}
async function loadBalances(){try{const j=await api('/balances');const el=$('balanceRows');if(el)el.innerHTML=Object.entries(j.users||{}).map(([u,o])=>`<tr><td>${u}</td><td>${num(o.balance)}</td><td>${o.createdAt||''}</td></tr>`).join('')}catch(e){}}
async function ownerGenesis(){try{await api('/genesis',{});msg('Genesis completed');await refresh()}catch(e){msg(e.message,false)}}
async function ownerIssue(){try{await api('/issue',{amount:Number($('issueAmount').value||0)});msg('Issue completed');await refresh()}catch(e){msg(e.message,false)}}
async function registerUser(){try{const u=$('userName').value.trim();await api('/register',{user:u});msg('Registered: '+u);await refresh()}catch(e){msg(e.message,false)}}
async function buyCoin(){try{await api('/buy',{user:$('userName').value.trim(),amount:Number($('amount').value||0)});msg('Buy completed');await refresh()}catch(e){msg(e.message,false)}}
async function sellCoin(){try{await api('/sell',{user:$('userName').value.trim(),amount:Number($('amount').value||0)});msg('Sell completed');await refresh()}catch(e){msg(e.message,false)}}
async function sendCoin(){try{await api('/send',{from:$('userName').value.trim(),to:$('toUser').value.trim(),amount:Number($('amount').value||0)});msg('Send completed');await refresh()}catch(e){msg(e.message,false)}}
async function pairConfirm(){try{await api('/pair-confirm',{receiver:$('toUser').value.trim()||$('userName').value.trim()});msg('Pair confirmed');await refresh()}catch(e){msg(e.message,false)}}
window.addEventListener('load',refresh);
