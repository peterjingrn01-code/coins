(function(){
  const KEY='JSLCOIN_OMEGA_5_STATE_V2';
  const OWNER='jingxingwei@hotmail.com';
  const SUPPLY=1000000000;
  function now(){return new Date().toLocaleString();}
  function walletFor(seed){let h=0; for(let i=0;i<seed.length;i++) h=(h*31+seed.charCodeAt(i))>>>0; return 'JSLΩ-'+h.toString(16).toUpperCase().padStart(8,'0')+'-'+Math.random().toString(36).slice(2,7).toUpperCase();}
  function defaultState(){const ownerWallet=walletFor(OWNER); return {version:'5.0-fixed',ownerEmail:OWNER,omegaEndpoint:'https://omega.jsl-ian.com',totalSupply:SUPPLY,currentUser:null,users:{[OWNER]:{email:OWNER,phone:'',name:'Genesis Owner',role:'owner',wallet:ownerWallet,balance:SUPPLY,created:now()}},ledger:[{id:'GENESIS-OMEGA-5-0',time:now(),type:'GENESIS',amount:SUPPLY,from:'Ω',to:ownerWallet,status:'confirmed',note:'Initial supply issued to Genesis Owner'}]};}
  function load(){try{const s=JSON.parse(localStorage.getItem(KEY)); if(s&&s.users&&s.ledger) return s;}catch(e){} const s=defaultState(); save(s); return s;}
  function save(s){localStorage.setItem(KEY,JSON.stringify(s)); return s;}
  function reset(){const s=defaultState(); save(s); return s;}
  function recalc(s){Object.values(s.users).forEach(u=>u.balance=0); if(s.users[s.ownerEmail]) s.users[s.ownerEmail].balance=s.totalSupply; s.ledger.filter(x=>x.type==='SEND'&&x.status==='confirmed').forEach(tx=>{const from=Object.values(s.users).find(u=>u.wallet===tx.from); const to=Object.values(s.users).find(u=>u.wallet===tx.to); if(from) from.balance-=Number(tx.amount)||0; if(to) to.balance+=Number(tx.amount)||0;}); return save(s);}
  function current(){const s=load(); return s.currentUser ? s.users[s.currentUser] : null;}
  window.JSLApi={KEY,OWNER,SUPPLY,now,walletFor,load,save,reset,recalc,current};
})();
