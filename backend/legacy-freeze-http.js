'use strict';
// MAI LEGACY CUTOVER: standalone inert Render service. This file deliberately
// imports no original server, DB client, TON wallet or Telegram code.
const http=require('node:http');

function startFrozenServer(env=process.env){
  if(env.MAI_LEGACY_CUTOVER_FROZEN!=='true')
    throw new Error('REFUSE_LEGACY_FREEZE_START_WITHOUT_EXPLICIT_FLAG');
  if(String(env.MAI_PAYOUT_ENABLED||'false').toLowerCase()==='true')
    throw new Error('REFUSE_FREEZE_WHILE_AUTO_PAYOUT_ENABLED');
  const port=Number(env.PORT||5000);
  if(!Number.isInteger(port)||port<0||port>65535)
    throw new Error('INVALID_FREEZE_PORT');
  const server=http.createServer((req,res)=>{
    const allowed=req.method==='GET'&&
      (req.url==='/health'||req.url==='/healthz');
    res.writeHead(allowed?200:503,{
      'Content-Type':'application/json; charset=utf-8',
      'Cache-Control':'no-store',
      'X-Content-Type-Options':'nosniff',
      'Retry-After':'60',
      'Connection':'close'
    });
    res.end(JSON.stringify(allowed?
      {status:'frozen',webhook:false,payout:false,broadcasts:false,dbMutations:false}:
      {success:false,code:'MAI_LEGACY_CUTOVER_FROZEN'}));
  });
  return new Promise((resolve,reject)=>{
    server.once('error',reject);
    server.listen(port,'0.0.0.0',()=>{
      console.log('[MAI LEGACY FREEZE] inert HTTP server active; no Bot, DB, TON or scheduled workers');
      resolve(server);
    });
  });
}
if(require.main===module){
 startFrozenServer().catch(error=>{
   console.error('[MAI LEGACY FREEZE] refused startup:',error.message);
   process.exitCode=78;
 });
}
module.exports={startFrozenServer};
