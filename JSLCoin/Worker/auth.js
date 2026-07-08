(function(){
  function normalizeEmail(e){return String(e||'').trim().toLowerCase();}
  function findByEmailOrPhone(s,email,phone){email=normalizeEmail(email); phone=String(phone||'').trim(); return Object.values(s.users).find(u=>(email&&u.email===email)||(phone&&u.phone===phone));}
  function enter({email,phone,name,password}){let s=JSLApi.load(); email=normalizeEmail(email); phone=String(phone||'').trim(); name=String(name||'').trim()||email||phone; if(!email&&!phone) throw new Error('Email or phone required'); let u=findByEmailOrPhone(s,email,phone); if(u){s.currentUser=u.email; if(phone&&!u.phone) u.phone=phone; if(name&&!u.name) u.name=name; JSLApi.save(s); return u;} const key=email||('phone:'+phone); const role=(email===JSLApi.OWNER)?'owner':'user'; u={email:key,phone,name,role,wallet:JSLApi.walletFor(key+phone+Date.now()),balance:0,created:JSLApi.now()}; s.users[key]=u; s.currentUser=key; s.ledger.unshift({id:'USER-'+Date.now(),time:JSLApi.now(),type:'REGISTER',amount:0,from:'Ω',to:u.wallet,status:'confirmed',note:'User registered and wallet auto-created'}); JSLApi.recalc(s); return u;}
  function logout(){const s=JSLApi.load(); s.currentUser=null; JSLApi.save(s); location.href='index.html';}
  function requireLogin(){const u=JSLApi.current(); if(!u){location.href='index.html'; return null;} return u;}
  function isOwner(u){return u&&u.role==='owner'&&u.email===JSLApi.OWNER;}
  window.JSLAuth={enter,logout,requireLogin,isOwner};
})();
