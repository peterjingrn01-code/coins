const API = '';
async function api(path, data){
  const opt = data===undefined ? {} : {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(data)};
  const r = await fetch(API + path, opt);
  const txt = await r.text();
let j;
try{
  j = txt ? JSON.parse(txt) : {};
}catch(e){
  j = {ok:false,error:txt};
}
  if(!r.ok || j.ok===false) throw new Error(j.error || ('HTTP '+r.status));
  return j;
}
function $(id){return document.getElementById(id)}
function money(n){return Number(n||0).toLocaleString()}
function msg(t, ok=true){const m=$('msg'); if(m){m.textContent=t; m.className=ok?'msg ok':'msg bad'}}
async function loadStatus(){try{const s=await api('/status'); for(const k in s){const e=$(k); if(e)e.textContent=typeof s[k]==='number'?money(s[k]):s[k];}}catch(e){msg('API error: '+e.message,false)}}
async function loadLedger(){try{const j=await api('/transactions'); const rows=(j.transactions||j.ledger||[]).map((x,i)=>`<tr><td>${x.id||i+1}</td><td>${x.type||''}</td><td>${x.from||''}</td><td>${x.to||''}</td><td>${money(x.amount)}</td><td>${x.status||''}</td><td>${x.time||x.createdAt||''}</td></tr>`).join(''); const tb=$('ledgerRows'); if(tb)tb.innerHTML=rows||'<tr><td colspan="7">No records</td></tr>'}catch(e){msg('Ledger error: '+e.message,false)}}
async function ownerGenesis(){try{msg('Running Genesis...'); const j=await api('/genesis',{}); msg('Genesis completed'); await loadStatus(); await loadLedger()}catch(e){msg(e.message,false)}}
async function ownerIssue(){try{const amount=Number($('issueAmount').value||1000000000); msg('Issuing...'); await api('/issue',{amount}); msg('Initial Issue completed'); await loadStatus(); await loadLedger()}catch(e){msg(e.message,false)}}
async function registerUser(){try{const name=$('userName').value.trim(); if(!name)throw new Error('Enter user name'); const j=await api('/register',{name}); localStorage.setItem('jslcoin_user',JSON.stringify(j.user||{name})); msg('User registered'); await loadStatus(); await loadLedger()}catch(e){msg(e.message,false)}}
async function buyCoin(){try{await api('/buy',{user:$('userName').value.trim(),amount:Number($('amount').value||0)}); msg('Buy completed'); await loadStatus(); await loadLedger()}catch(e){msg(e.message,false)}}
async function sellCoin(){try{await api('/sell',{user:$('userName').value.trim(),amount:Number($('amount').value||0)}); msg('Sell completed'); await loadStatus(); await loadLedger()}catch(e){msg(e.message,false)}}
async function sendCoin(){try{await api('/send',{from:$('userName').value.trim(),to:$('toUser').value.trim(),amount:Number($('amount').value||0)}); msg('Send created, waiting pair confirm'); await loadStatus(); await loadLedger()}catch(e){msg(e.message,false)}}
async function pairConfirm(){try{await api('/pair-confirm',{receiver:$('toUser').value.trim()||$('userName').value.trim()}); msg('Pair confirmed'); await loadStatus(); await loadLedger()}catch(e){msg(e.message,false)}}
window.addEventListener('load',()=>{loadStatus();loadLedger();});
