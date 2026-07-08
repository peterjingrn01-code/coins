(function(){
  function findWallet(s,target){target=String(target||'').trim().toLowerCase(); return Object.values(s.users).find(u=>u.wallet.toLowerCase()===target||u.email.toLowerCase()===target||String(u.phone||'').toLowerCase()===target);}
  function owner(s){return s.users[s.ownerEmail];}
  window.JSLWallet={findWallet,owner};
})();
