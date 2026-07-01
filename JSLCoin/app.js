const API = 'https://jslcoin-api.peterjingrn01.workers.dev';
async function api(path, data){
  const opt = data===undefined ? {} : {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(data)};
  const r = await fetch(API + path, opt);
  const txt = await r.text();
  let j;
  try{ j = txt ? JSON.parse(txt) : {}; } catch(e){ j = {ok:false,error:txt}; }
  if(!r.ok || j.ok===false) throw new Error(j.error || ('HTTP '+r.status));
  return j;
}
function $(id){return document.getElementById(id)}
function money(n){return Number(n||0).toLocaleString()}
function msg(t, ok=true){const m=$('msg'); if(m){m.textContent=t; m.className=ok?'msg ok':'msg bad'}}
function setVal(id,v){const e=$(id); if(e)e.textContent=v}
async function loadStatus(){try{const s=await api('/status'); setVal('genesis',String(s.genesis)); setVal('totalSupply',money(s.totalSupply)); setVal('circulating',money(s.circulating)); setVal('treasury',money(s.treasury)); setVal('users',money(s.users)); setVal('ledgerCount',money(s.ledgerCount));}catch(e){msg('Status error: '+e.message,false)}}
async function loadLedger(){try{const j=await api('/transactions'); const rows=(j.transactions||j.ledger||[]).map(x=>`<tr><td>${x.id??''}</td><td>${x.type??''}</td><td>${x.from??''}</td><td>${x.to??''}</td><td>${money(x.amount)}</td><td>${x.status??''}</td><td>${x.time??x.ts??''}</td></tr>`).join(''); const body=$('ledgerRows'); if(body)body.innerHTML=rows;}catch(e){msg('Ledger error: '+e.message,false)}}
async function ownerGenesis(){try{msg('Running Genesis...'); await api('/genesis',{}); msg('Genesis completed'); await refresh()}catch(e){msg(e.message,false)}}
async function ownerIssue(){try{const amount=Number($('issueAmount').value||1000000000); msg('Issuing...'); await api('/issue',{amount}); msg('Issue completed'); await refresh()}catch(e){msg(e.message,false)}}
async function registerUser(){try{const name=$('userName').value.trim(); if(!name)throw new Error('Enter user name'); await api('/register',{user:name}); msg('Registered: '+name); await refresh()}catch(e){msg(e.message,false)}}
async function buyCoin(){try{await api('/buy',{user:$('userName').value.trim(),amount:Number($('amount').value||0)}); msg('Buy completed'); await refresh()}catch(e){msg(e.message,false)}}
async function sellCoin(){try{await api('/sell',{user:$('userName').value.trim(),amount:Number($('amount').value||0)}); msg('Sell completed'); await refresh()}catch(e){msg(e.message,false)}}
async function sendCoin(){try{await api('/send',{from:$('userName').value.trim(),to:$('toUser').value.trim(),amount:Number($('amount').value||0)}); msg('Send completed'); await refresh()}catch(e){msg(e.message,false)}}
async function pairConfirm(){try{await api('/pair-confirm',{receiver:($('toUser').value.trim()||$('userName').value.trim())}); msg('Pair confirmed'); await refresh()}catch(e){msg(e.message,false)}}
async function refresh(){await loadStatus(); await loadLedger()}
window.addEventListener('load',refresh);
