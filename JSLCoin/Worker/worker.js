const CORS={"access-control-allow-origin":"*","access-control-allow-methods":"GET,POST,OPTIONS","access-control-allow-headers":"content-type"};
let state={coin:'JSLCoin',genesis:false,totalSupply:0,circulating:0,treasury:0,users:{},ledger:[]};
function json(data,status=200){return new Response(JSON.stringify(data,null,2),{status,headers:{'content-type':'application/json',...CORS}})}
async function body(req){try{return await req.json()}catch{return {}}}
function tx(type,from,to,amount,status='confirmed'){const item={id:String(state.ledger.length+1).padStart(6,'0'),type,from,to,amount:Number(amount||0),status,time:new Date().toISOString()};state.ledger.unshift(item);return item}
function needGenesis(){if(!state.genesis)throw new Error('Genesis not started')}
async function api(req,path){
 if(req.method==='OPTIONS')return new Response(null,{headers:CORS});
 try{
  if(req.method==='GET'&&path==='/status')return json({ok:true,coin:state.coin,genesis:state.genesis,totalSupply:state.totalSupply,circulating:state.circulating,treasury:state.treasury,users:Object.keys(state.users).length,ledgerCount:state.ledger.length});
  if(req.method==='GET'&&path==='/transactions')return json({ok:true,transactions:state.ledger,ledger:state.ledger});
  if(req.method==='POST'&&path==='/genesis'){if(!state.genesis){state.genesis=true;tx('GENESIS','Ω','treasury',0)}return json({ok:true,genesis:true});}
  if(req.method==='POST'&&path==='/issue'){needGenesis();const b=await body(req);const amount=Number(b.amount||0);if(amount<=0)throw new Error('Invalid issue amount');state.totalSupply+=amount;state.treasury+=amount;tx('ISSUE','owner','treasury',amount);return json({ok:true,totalSupply:state.totalSupply,treasury:state.treasury});}
  if(req.method==='POST'&&path==='/register'){needGenesis();const b=await body(req);const user=String(b.user||'').trim();if(!user)throw new Error('Missing user');if(!state.users[user])state.users[user]={balance:0};tx('REGISTER',user,user,0);return json({ok:true,user,balance:state.users[user].balance});}
  if(req.method==='POST'&&path==='/buy'){needGenesis();const b=await body(req);const user=String(b.user||'').trim();const amount=Number(b.amount||0);if(!user)throw new Error('Missing user');if(amount<=0)throw new Error('Invalid amount');if(!state.users[user])state.users[user]={balance:0};if(state.treasury<amount)throw new Error('Treasury insufficient');state.treasury-=amount;state.users[user].balance+=amount;state.circulating+=amount;tx('BUY','treasury',user,amount);return json({ok:true,user,balance:state.users[user].balance});}
  if(req.method==='POST'&&path==='/sell'){needGenesis();const b=await body(req);const user=String(b.user||'').trim();const amount=Number(b.amount||0);if(!state.users[user])throw new Error('User not found');if(amount<=0||state.users[user].balance<amount)throw new Error('Insufficient balance');state.users[user].balance-=amount;state.treasury+=amount;state.circulating-=amount;tx('SELL',user,'treasury',amount);return json({ok:true,user,balance:state.users[user].balance});}
  if(req.method==='POST'&&path==='/send'){needGenesis();const b=await body(req);const from=String(b.from||'').trim();const to=String(b.to||'').trim();const amount=Number(b.amount||0);if(!state.users[from])throw new Error('Sender not found');if(!state.users[to])state.users[to]={balance:0};if(amount<=0||state.users[from].balance<amount)throw new Error('Insufficient balance');state.users[from].balance-=amount;state.users[to].balance+=amount;tx('SEND',from,to,amount);return json({ok:true,fromBalance:state.users[from].balance,toBalance:state.users[to].balance});}
  if(req.method==='POST'&&path==='/pair-confirm'){needGenesis();const b=await body(req);tx('PAIR','Ω',String(b.receiver||'user'),0);return json({ok:true,pair:true});}
  return json({ok:false,error:'Not found',path},404);
 }catch(e){return json({ok:false,error:e.message},400)}
}
export default {async fetch(req,env,ctx){const url=new URL(req.url);const apiPaths=new Set(['/status','/transactions','/genesis','/issue','/register','/buy','/sell','/send','/pair-confirm']);if(apiPaths.has(url.pathname)||req.method==='OPTIONS')return api(req,url.pathname);return env.ASSETS.fetch(req);}};
