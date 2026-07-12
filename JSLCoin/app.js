(() => {
"use strict";
const API=window.JSL_CONFIG.API_BASE,TK="jslcoin_token",RID="jslcoin_reset_identity";
const $=id=>document.getElementById(id),v=id=>($(id)?.value||"").trim();
const tok=()=>localStorage.getItem(TK)||"",setTok=t=>t?localStorage.setItem(TK,t):localStorage.removeItem(TK);
const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fmt=n=>`${Number(n||0).toLocaleString()} JSL`;
function msg(t,ok=false){const e=$("message");if(!e)return;e.textContent=t||"";e.className=`message ${ok?"ok":"error"}`}
async function api(path,opt={}){const h={"Content-Type":"application/json",...(opt.headers||{})};if(tok())h.Authorization=`Bearer ${tok()}`;const r=await fetch(API+path,{...opt,headers:h});let d;try{d=await r.json()}catch{d={ok:false,error:`HTTP ${r.status}`}}if(!r.ok||d.ok===false)throw new Error(d.error||d.message||`HTTP ${r.status}`);return d}
async function me(role){const d=await api("/me");if(role&&d.user.role!==role)throw new Error("Permission denied");return d.user}
async function login(){try{const d=await api("/login",{method:"POST",body:JSON.stringify({identity:v("identity"),password:v("password")})});setTok(d.token);location.href=d.user.role==="owner"?"owner.html":"dashboard.html"}catch(e){msg(e.message)}}
async function register(){try{const d=await api("/register",{method:"POST",body:JSON.stringify({username:v("username"),name:v("name"),email:v("email"),phone:v("phone"),password:v("password")})});setTok(d.token);location.href="dashboard.html"}catch(e){msg(e.message)}}
async function owner(){try{const d=await api("/owner/setup-or-login",{method:"POST",body:JSON.stringify({identity:v("identity"),password:v("password"),setupKey:v("setupKey")})});setTok(d.token);location.href="owner.html"}catch(e){msg(e.message)}}
async function logout(){try{await api("/logout",{method:"POST",body:"{}"})}catch{}setTok("");location.href="index.html"}
function txRows(id,txs){const e=$(id);if(!e)return;e.innerHTML=txs.length?txs.map(t=>`<tr><td>${esc(new Date(t.createdAt).toLocaleString())}</td><td>${esc(t.type)}</td><td>${esc(t.fromLabel)}</td><td>${esc(t.toLabel)}</td><td>${esc(fmt(t.amount))}</td><td>${esc(t.status)}</td></tr>`).join(""):`<tr><td colspan="6">No transactions.</td></tr>`}
async function initDashboard(){if(!$("dashboard"))return;try{const u=await me(),t=await api("/transactions");$("displayName").textContent=u.displayName;$("role").textContent=u.role;$("balance").textContent=fmt(u.balance);$("wallet").textContent=u.wallet;txRows("recentRows",t.transactions.slice(0,10))}catch{location.href="login.html"}}
async function initProfile(){if(!$("profile"))return;try{const u=await me();for(const [id,val] of Object.entries({pName:u.displayName,pUser:u.username||"—",pEmail:u.email||"—",pPhone:u.phone||"—",pWallet:u.wallet,pRole:u.role,pBalance:fmt(u.balance)}))$(id).textContent=val}catch{location.href="login.html"}}
async function initTransactions(){if(!$("transactions"))return;try{await me();const d=await api("/transactions");txRows("transactionRows",d.transactions)}catch{location.href="login.html"}}
async function transfer(){try{const d=await api("/send",{method:"POST",body:JSON.stringify({to:v("to"),amount:Number(v("amount"))})});msg(d.message,true)}catch(e){msg(e.message)}}
async function buy(){try{const d=await api("/buy",{method:"POST",body:JSON.stringify({amount:Number(v("amount"))})});msg(d.message,true)}catch(e){msg(e.message)}}
async function sell(){try{const d=await api("/sell",{method:"POST",body:JSON.stringify({amount:Number(v("amount"))})});msg(d.message,true)}catch(e){msg(e.message)}}
async function forgot(){try{const identity=v("identity"),d=await api("/forgot-password",{method:"POST",body:JSON.stringify({identity})});sessionStorage.setItem(RID,identity);if(d.testCode)sessionStorage.setItem("jslcoin_test_code",d.testCode);msg(d.message,true);setTimeout(()=>location.href="reset-password.html",600)}catch(e){msg(e.message)}}
async function reset(){try{const d=await api("/reset-password",{method:"POST",body:JSON.stringify({identity:v("identity"),code:v("code"),password:v("password")})});msg(d.message,true);sessionStorage.removeItem(RID);sessionStorage.removeItem("jslcoin_test_code");setTimeout(()=>location.href="login.html",700)}catch(e){msg(e.message)}}
async function initReset(){if(!$("resetPage"))return;$("identity").value=sessionStorage.getItem(RID)||"";const c=sessionStorage.getItem("jslcoin_test_code");if(c)$("code").value=c}
async function initOwner(){if(!$("ownerPage"))return;try{const u=await me("owner"),s=await api("/status");$("oName").textContent=u.displayName;$("oBalance").textContent=fmt(u.balance);$("supply").textContent=fmt(s.totalSupply);$("treasury").textContent=fmt(s.treasury);$("users").textContent=s.users;$("genesisState").textContent=s.genesis?"Complete":"Pending"}catch{location.href="owner-login.html"}}
async function genesis(){try{const d=await api("/genesis",{method:"POST",body:"{}"});msg(d.message,true);setTimeout(()=>location.reload(),600)}catch(e){msg(e.message)}}
async function treasury(){try{const d=await api("/owner/treasury",{method:"POST",body:JSON.stringify({amount:Number(v("treasuryAmount"))})});msg(d.message,true)}catch(e){msg(e.message)}}
async function ownerSend(){try{const d=await api("/owner/send",{method:"POST",body:JSON.stringify({to:v("to"),amount:Number(v("amount"))})});msg(d.message,true)}catch(e){msg(e.message)}}
async function initUsers(){if(!$("usersPage"))return;try{await me("owner");const d=await api("/users");$("userRows").innerHTML=d.users.map(u=>`<tr><td>${esc(u.displayName)}</td><td>${esc(u.username||"—")}</td><td>${esc(u.email||"—")}</td><td>${esc(u.phone||"—")}</td><td>${esc(u.wallet)}</td><td>${esc(fmt(u.balance))}</td><td>${esc(u.role)}</td></tr>`).join("")}catch{location.href="owner-login.html"}}
async function initLedger(){if(!$("ledgerPage"))return;try{await me("owner");const d=await api("/ledger");txRows("ledgerRows",d.transactions)}catch{location.href="owner-login.html"}}
async function audit(){try{const d=await api("/audit",{method:"POST",body:"{}"});msg(d.message,d.ok)}catch(e){msg(e.message)}}
document.addEventListener("DOMContentLoaded",()=>{initDashboard();initProfile();initTransactions();initReset();initOwner();initUsers();initLedger()});
window.JSLApp={login,register,owner,logout,transfer,buy,sell,forgot,reset,genesis,treasury,ownerSend,audit};
})();
