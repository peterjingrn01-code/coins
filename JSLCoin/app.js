(function(){
'use strict';
const KEY='JSLCoinOmega50StablePatch';
const OLD_KEYS=['JSLCoinOmega50StableUpgrade','JSLCoinOmega50FixedRelease','JSLCoinOmega50'];
const OWNER_ID='jingxingwei@hotmail.com';
const OWNER_DISPLAY='JSL-ian Owner';
const SUPPLY=1000000000;
const OMEGA='https://omega.jsl-ian.com';
function $(id){return document.getElementById(id)}
function now(){return new Date().toLocaleString()}
function clean(v){return String(v||'').trim()}
function lower(v){return clean(v).toLowerCase()}
function safeNum(n){n=Number(n);return Number.isFinite(n)?n:0}
function fmt(n){return safeNum(n).toLocaleString()+' JSL'}
function walletSeed(id){let s=0;id=String(id||'');for(let i=0;i<id.length;i++)s=(s*31+id.charCodeAt(i))>>>0;return 'JSLΩ-'+s.toString(16).toUpperCase().padStart(8,'0')}
function txid(prefix){return prefix+'-'+Date.now()+'-'+Math.floor(Math.random()*9999)}
function initState(){const w=walletSeed(OWNER_ID);return {current:null,supply:SUPPLY,users:{[OWNER_ID]:{id:OWNER_ID,email:OWNER_ID,phone:'',username:'owner',name:OWNER_DISPLAY,role:'owner',wallet:w,balance:SUPPLY}},ledger:[{id:'GENESIS-OMEGA-5-0',time:now(),type:'GENESIS',from:'Ω',to:OWNER_DISPLAY,amount:SUPPLY,status:'confirmed',note:'Initial supply issued to Genesis Owner',closure:'L^n=-1'}]}}
function normalize(s){if(!s||!s.users)return initState();if(!s.users[OWNER_ID]){s.users[OWNER_ID]={id:OWNER_ID,email:OWNER_ID,phone:'',username:'owner',name:OWNER_DISPLAY,role:'owner',wallet:walletSeed(OWNER_ID),balance:SUPPLY}};Object.keys(s.users).forEach(k=>{const u=s.users[k];u.id=u.id||k;u.name=u.name||u.username||'User';u.username=u.username||'';u.wallet=u.wallet||walletSeed(u.email||u.phone||u.username||k);u.balance=safeNum(u.balance);u.role=u.role||'user'});s.supply=safeNum(s.supply)||SUPPLY;s.ledger=Array.isArray(s.ledger)?s.ledger:[];return s}
function load(){try{let raw=localStorage.getItem(KEY);if(!raw){for(const k of OLD_KEYS){raw=localStorage.getItem(k);if(raw)break}}if(raw)return normalize(JSON.parse(raw))}catch(e){}const s=initState();save(s);return s}
function save(s){localStorage.setItem(KEY,JSON.stringify(normalize(s)))}
function publicName(u){return u?(u.name||u.username||'User'):'User'}
function identityValue(){return lower($('identity')?.value)||lower($('email')?.value)||lower($('phone')?.value)||lower($('username')?.value)}
function msg(text,type='ok'){const el=$('msg')||$('status');if(el)el.innerHTML='<div class="notice '+type+'">'+text+'</div>'}
function findUser(s,id){id=lower(id);if(!id)return null;if(s.users[id])return s.users[id];return Object.values(s.users).find(u=>lower(u.email)===id||lower(u.phone)===id||lower(u.username)===id||lower(u.wallet)===id)||null}
function makeKey(id){id=lower(id);return id||('user-'+Date.now())}
function createUser(s,data){let id=lower(data.email)||lower(data.phone)||lower(data.username);let old=findUser(s,id);if(old)return old;const key=makeKey(id);const u={id:key,email:lower(data.email),phone:clean(data.phone),username:lower(data.username),name:clean(data.name)||clean(data.username)||'User',role:'user',wallet:walletSeed(key),balance:0};s.users[key]=u;s.ledger.push({id:txid('USER'),time:now(),type:'REGISTER',from:'Ω',to:publicName(u),amount:0,status:'confirmed',note:'Wallet auto-created',closure:'L^n=-1'});return u}
function current(){const s=load();return s.current?findUser(s,s.current):null}
function setCurrent(s,u){s.current=u.id||u.email||u.phone||u.username;save(s)}
function requireLogin(){if(!current()){location.href='wallet-login.html';return false}return true}
function requireOwner(){const u=current();return !!(u&&u.role==='owner')}
function navActive(){const p=(location.pathname.split('/').pop()||'index.html');document.querySelectorAll('.nav a').forEach(a=>{if((a.getAttribute('href')||'')===p)a.classList.add('active')})}
function txRow(x){return '<tr><td>'+(x.time||'')+'</td><td>'+(x.type||'')+'</td><td>'+(x.from||'')+'</td><td>'+(x.to||'')+'</td><td>'+fmt(x.amount)+'</td><td><span class="pill">'+(x.status||'confirmed')+'</span></td></tr>'}
function ledgerRow(x,i){return '<tr><td>'+i+'</td><td>'+(x.id||'')+'</td><td>'+(x.type||'')+'</td><td>'+(x.from||'')+'</td><td>'+(x.to||'')+'</td><td>'+fmt(x.amount)+'</td><td>'+(x.note||'')+'</td></tr>'}
function userTx(s,u){return s.ledger.filter(x=>x.from===publicName(u)||x.to===publicName(u)||x.from===u.wallet||x.to===u.wallet)}
function sendCoins(from,toId,amount,type='SEND',note=''){amount=safeNum(amount);if(amount<=0)return {ok:false,error:'Amount must be greater than 0.'};let s=load();let sender=findUser(s,from.id||from.email||from.phone||from.username||from.wallet);let receiver=findUser(s,toId);if(!receiver){receiver=createUser(s,{email:String(toId).includes('@')?toId:'',phone:String(toId).includes('@')?'':toId,name:'User'});}if(!sender)return {ok:false,error:'Sender not found.'};if(sender.balance<amount)return {ok:false,error:'Insufficient balance.'};sender.balance-=amount;receiver.balance+=amount;s.ledger.push({id:txid(type),time:now(),type,from:publicName(sender),to:publicName(receiver),amount,status:'confirmed',note,closure:'L^n=-1'});save(s);return {ok:true}}
function renderIndex(){if(!$('publicHome'))return;}
function renderLogin(){if(!$('loginBox'))return;}
function renderDashboard(){if(!$('currentUser'))return;if(!requireLogin())return;const s=load(),u=current();$('currentUser').textContent=publicName(u);$('role').textContent=u.role==='owner'?'Owner':'User';$('balance').textContent=fmt(u.balance);$('walletAddress').textContent=u.wallet;const last=userTx(s,u).slice(-6).reverse().map(txRow).join('');$('ledgerRows').innerHTML=last||'<tr><td colspan="6">No transactions yet.</td></tr>'}
function renderProfile(){if(!$('profileName'))return;if(!requireLogin())return;const u=current();$('profileName').textContent=publicName(u);$('profileRole').textContent=u.role==='owner'?'Owner':'User';$('profileWallet').textContent=u.wallet;}
function renderWallet(){if(!$('walletAddress'))return;if(!requireLogin())return;const u=current();$('walletAddress').textContent=u.wallet;$('walletBalance').textContent=fmt(u.balance);$('walletName').textContent=publicName(u);}
function renderTransactions(){if(!$('txRows'))return;if(!requireLogin())return;const s=load(),u=current();$('txRows').innerHTML=userTx(s,u).slice().reverse().map(txRow).join('')||'<tr><td colspan="6">No user transactions.</td></tr>'}
function renderLedger(){if(!$('fullLedgerRows'))return;if(!requireOwner()){document.querySelector('main').innerHTML='<section class="card"><h1>Owner only</h1><p>This ledger manager is restricted.</p><a class="btn primary" href="wallet-login.html">Owner Login</a></section>';return}const s=load();$('fullLedgerRows').innerHTML=s.ledger.map(ledgerRow).join('')}
function renderOwner(){if(!$('ownerArea'))return;if(!requireOwner()){$('guard').innerHTML='<div class="notice err">Owner only. Please sign in with the owner account.</div><a class="btn primary" href="wallet-login.html">Owner Login</a>';return}const s=load(),owner=findUser(s,OWNER_ID);$('guard').innerHTML='';$('ownerArea').classList.remove('hide');$('ownerName').textContent=OWNER_DISPLAY;$('ownerSupply').textContent=fmt(s.supply);$('ownerUsers').textContent=Object.keys(s.users).length;$('ownerWallet').textContent=owner.wallet;}
function renderUserList(){if(!$('userRows'))return;if(!requireOwner()){document.querySelector('main').innerHTML='<section class="card"><h1>Owner only</h1><a class="btn primary" href="wallet-login.html">Owner Login</a></section>';return}const s=load();$('userRows').innerHTML=Object.values(s.users).map(u=>'<tr><td>'+publicName(u)+'</td><td>'+(u.username||'')+'</td><td>'+u.wallet+'</td><td>'+fmt(u.balance)+'</td><td>'+(u.role||'user')+'</td></tr>').join('')}
function renderBuySell(kind){if(!$(kind+'Box'))return;if(!requireLogin())return;}
function login(){let s=load();let id=identityValue();let u=findUser(s,id);if(!u){msg('Account not found. Please create wallet first.','err');return}setCurrent(s,u);location.href='dashboard.html'}
function register(){let s=load();const data={email:lower($('email')?.value),phone:clean($('phone')?.value),username:lower($('username')?.value),name:clean($('name')?.value)};if(!data.email&&!data.phone&&!data.username){msg('Use username, email, or phone to create wallet.','err');return}let u=createUser(s,data);setCurrent(s,u);location.href='dashboard.html'}
function ownerLogin(){let s=load();let u=findUser(s,OWNER_ID);setCurrent(s,u);location.href='ownerpage.html'}
function logout(){let s=load();s.current=null;save(s);location.href='index.html'}
function send(){if(!requireLogin())return;const u=current();const res=sendCoins(u,clean($('to')?.value),safeNum($('amount')?.value),'SEND','User transfer');if(!res.ok){msg(res.error,'err');return}msg('Transfer complete. Balance updated.');setTimeout(()=>location.href='dashboard.html',400)}
function ownerSend(){if(!requireOwner())return;let s=load();const owner=findUser(s,OWNER_ID);const res=sendCoins(owner,clean($('sendTo')?.value),safeNum($('sendAmount')?.value),'OWNER_SEND','Owner distribution');if(!res.ok){msg(res.error,'err');return}msg('Coins sent. Ledger and balances updated.');setTimeout(()=>location.reload(),500)}
function issueProposal(){if(!requireOwner())return;const amount=safeNum($('issueAmount')?.value);const ref=clean($('legalRef')?.value);if(amount<=0||!ref){msg('Amount and legal reference are required.','err');return}let s=load();s.ledger.push({id:txid('ISSUE_REQUEST'),time:now(),type:'ISSUE_REQUEST',from:'Board/Legal',to:OWNER_DISPLAY,amount,status:'pending-legal',note:'Legal/governance authorization required: '+ref,closure:'L^n=-1'});save(s);msg('Issue request recorded as pending legal/governance approval. No new coins issued yet.','warn')}
function copyWallet(){const u=current();if(!u)return;navigator.clipboard&&navigator.clipboard.writeText(u.wallet);msg('Wallet address copied.')}
window.JSLApp={login,register,ownerLogin,logout,send,ownerSend,issueProposal,copyWallet};
document.addEventListener('DOMContentLoaded',()=>{navActive();renderIndex();renderLogin();renderDashboard();renderProfile();renderWallet();renderTransactions();renderLedger();renderOwner();renderUserList();renderBuySell('buy');renderBuySell('sell')});
})();