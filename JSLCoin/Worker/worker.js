const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET,POST,OPTIONS',
  'access-control-allow-headers': 'content-type'
};
const KEY = 'JSLCoin_STATE_v3';
const freshState = () => ({coin:'JSLCoin',version:'3.0',genesis:false,totalSupply:0,circulating:0,treasury:0,users:{},ledger:[]});
function json(data,status=200){return new Response(JSON.stringify(data,null,2),{status,headers:{...CORS,'content-type':'application/json'}})}
async function readState(env){
  if(!env.DB) return freshState();
  const raw = await env.DB.get(KEY);
  if(!raw) return freshState();
  try { return {...freshState(), ...JSON.parse(raw)}; } catch(e){ return freshState(); }
}
async function writeState(env,state){ if(env.DB) await env.DB.put(KEY, JSON.stringify(state)); }
function tx(state,type,from,to,amount,status='confirmed'){
  const id = 'TX-' + String(state.ledger.length + 1).padStart(6,'0');
  state.ledger.unshift({id,type,from,to,amount:Number(amount||0),status,time:new Date().toISOString()});
  return id;
}
function needGenesis(state){ if(!state.genesis) throw new Error('Genesis has not been started'); }
async function body(req){ try{return await req.json()}catch(e){return {}} }
export default { async fetch(req, env) {
  if(req.method === 'OPTIONS') return new Response(null,{headers:CORS});
  const url = new URL(req.url); const path = url.pathname.replace(/\/$/,'') || '/';
  try{
    const state = await readState(env);
    if(path === '/' || path === '/status') return json({ok:true,coin:state.coin,version:state.version,genesis:state.genesis,totalSupply:state.totalSupply,circulating:state.circulating,treasury:state.treasury,users:Object.keys(state.users).length,ledgerCount:state.ledger.length,db:!!env.DB});
    if(path === '/transactions') return json({ok:true,transactions:state.ledger});
    if(path === '/balances') return json({ok:true,users:state.users,treasury:state.treasury});
    if(path === '/genesis'){
      if(!state.genesis){ state.genesis=true; tx(state,'GENESIS','SYSTEM','OWNER',0); await writeState(env,state); }
      return json({ok:true,message:'Genesis completed',state});
    }
    if(path === '/issue'){
      needGenesis(state); const b = await body(req); const amount = Number(b.amount||1000000000);
      if(!Number.isFinite(amount)||amount<=0) throw new Error('Invalid amount');
      state.totalSupply += amount; state.treasury += amount; tx(state,'ISSUE','OWNER','TREASURY',amount); await writeState(env,state);
      return json({ok:true,message:'Issue completed',state});
    }
    if(path === '/register'){
      needGenesis(state); const b = await body(req); const name = String(b.user||b.name||'').trim(); if(!name) throw new Error('Enter user name');
      if(!state.users[name]){ state.users[name] = {balance:0,createdAt:new Date().toISOString()}; tx(state,'REGISTER','USER',name,0); await writeState(env,state); }
      return json({ok:true,message:'Registered: '+name,user:name,balance:state.users[name].balance});
    }
    if(path === '/buy'){
      needGenesis(state); const b = await body(req); const user=String(b.user||'').trim(); const amount=Number(b.amount||0);
      if(!state.users[user]) throw new Error('User not registered'); if(amount<=0) throw new Error('Invalid amount'); if(state.treasury<amount) throw new Error('Treasury insufficient');
      state.treasury-=amount; state.circulating+=amount; state.users[user].balance+=amount; tx(state,'BUY','TREASURY',user,amount); await writeState(env,state); return json({ok:true,message:'Buy completed',balance:state.users[user].balance});
    }
    if(path === '/sell'){
      needGenesis(state); const b=await body(req); const user=String(b.user||'').trim(); const amount=Number(b.amount||0);
      if(!state.users[user]) throw new Error('User not registered'); if(amount<=0) throw new Error('Invalid amount'); if(state.users[user].balance<amount) throw new Error('Balance insufficient');
      state.users[user].balance-=amount; state.treasury+=amount; state.circulating-=amount; tx(state,'SELL',user,'TREASURY',amount); await writeState(env,state); return json({ok:true,message:'Sell completed',balance:state.users[user].balance});
    }
    if(path === '/send'){
      needGenesis(state); const b=await body(req); const from=String(b.from||b.user||'').trim(); const to=String(b.to||'').trim(); const amount=Number(b.amount||0);
      if(!state.users[from]) throw new Error('Sender not registered'); if(!state.users[to]) throw new Error('Receiver not registered'); if(amount<=0) throw new Error('Invalid amount'); if(state.users[from].balance<amount) throw new Error('Balance insufficient');
      state.users[from].balance-=amount; state.users[to].balance+=amount; tx(state,'SEND',from,to,amount); await writeState(env,state); return json({ok:true,message:'Send completed',fromBalance:state.users[from].balance,toBalance:state.users[to].balance});
    }
    if(path === '/pair-confirm'){
      needGenesis(state); const b=await body(req); const receiver=String(b.receiver||b.to||'').trim(); if(!receiver) throw new Error('Receiver required'); tx(state,'PAIR_CONFIRM','NETWORK',receiver,0); await writeState(env,state); return json({ok:true,message:'Pair confirmed: '+receiver});
    }
    if(path === '/reset'){
      const b=await body(req); if(b.confirm !== 'RESET-JSLCOIN') throw new Error('Reset confirmation required'); const ns=freshState(); await writeState(env,ns); return json({ok:true,message:'Reset completed'});
    }
    return json({ok:false,error:'Not found',path},404);
  }catch(e){return json({ok:false,error:e.message||String(e)},400)}
}};
