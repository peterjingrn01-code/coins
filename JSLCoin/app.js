const API = '';
async function api(path,data){
  const opt=data===undefined?{}:{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(data)};
  const r=await fetch(API+path,opt);
  const txt=await r.text();
  let j;
  try{j=txt?JSON.parse(txt):{};}catch(e){j={ok:false,error:txt};}
  if(!r.ok||j.ok===false)throw new Error(j.error||('HTTP '+r.status));
  return j;
}
function $(id){return document.getElementById(id)}
function money(n){return Number(n||0).toLocaleString()}
function msg(t,ok=true){const m=$('msg');if(m){m.textContent=t;m.className=ok?'msg ok':'msg bad'}}
function setText(id,v){const e=$(id);if(e)e.textContent=v}
async function loadStatus(){try{const s=await api('/status');setText('genesis',String(s.genesis));setText('totalSupply',money(s.totalSupply));setText('circulating',money(s.circulating));}catch(e){msg('Status error: '+e.message,false)}}
async function loadLedger(){try{const j=await api('/transactions');const rows=(j.transactions||j.ledger||[]).map(x=>`<tr><td>${x.id||''}</td><td>${x.type||''}</td><td>${x.from||''}</td><td>${x.to||''}</td><td>${money(x.amount)}</td><td>${x.status||''}</td><td>${x.time||''}</td></tr>`).join('');const b=$('ledgerRows');if(b)b.innerHTML=rows;}catch(e){msg('Ledger error: '+e.message,false)}}
async function ownerGenesis(){try{msg('Running Genesis...');await api('/genesis',{});msg('Genesis completed');await loadStatus();await loadLedger();}catch(e){msg(e.message,false)}}
async function ownerIssue(){try{const amount=Number($('issueAmount').value||1000000000);msg('Issuing...');await api('/issue',{amount});msg('Issue completed');await loadStatus();await loadLedger();}catch(e){msg(e.message,false)}}
async function registerUser(){try{const name=$('userName').value.trim();if(!name)throw new Error('Enter user name');await api('/register',{user:name});msg('User registered');}catch(e){msg(e.message,false)}}
async function buyCoin(){try{await api('/buy',{user:$('userName').value.trim(),amount:Number($('amount').value||0)});msg('Buy completed');}catch(e){msg(e.message,false)}}
async function sellCoin(){try{await api('/sell',{user:$('userName').value.trim(),amount:Number($('amount').value||0)});msg('Sell completed');}catch(e){msg(e.message,false)}}
async function sendCoin(){try{await api('/send',{from:$('userName').value.trim(),to:$('toUser').value.trim(),amount:Number($('sendAmount').value||0)});msg('Send completed');}catch(e){msg(e.message,false)}}
async function pairConfirm(){try{await api('/pair-confirm',{receiver:($('receiver')?.value.trim())||$('userName')?.value.trim()});msg('Pair confirmed');}catch(e){msg(e.message,false)}}
window.addEventListener('load',()=>{loadStatus();loadLedger();});
