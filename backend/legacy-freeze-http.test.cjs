'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const http=require('node:http');
const {startFrozenServer}=require('./legacy-freeze-http');
const base={PORT:'0',MAI_LEGACY_CUTOVER_FROZEN:'true',MAI_PAYOUT_ENABLED:'false'};
function read(port,path,method='GET'){
 return new Promise((resolve,reject)=>{
  const req=http.request({hostname:'127.0.0.1',port,path,method,timeout:2000},res=>{
   let body='';res.on('data',c=>body+=c);
   res.on('end',()=>resolve({status:res.statusCode,
    response:JSON.parse(body),retryAfter:res.headers['retry-after']}));
  });
  req.on('error',reject);req.end();
 });
}
test('cannot start without explicit freeze flag',async()=>{
 await assert.rejects(()=>startFrozenServer({...base,MAI_LEGACY_CUTOVER_FROZEN:'false'}),
  /REFUSE_LEGACY_FREEZE_START_WITHOUT_EXPLICIT_FLAG/);
});
test('cannot start if old auto payout enabled',async()=>{
 await assert.rejects(()=>startFrozenServer({...base,MAI_PAYOUT_ENABLED:'true'}),
  /REFUSE_FREEZE_WHILE_AUTO_PAYOUT_ENABLED/);
});
test('health only; Telegram, user, admin, payment and mining routes are all inert',async t=>{
 const server=await startFrozenServer(base);t.after(()=>new Promise(r=>server.close(r)));
 const port=server.address().port;
 for(const route of ['/health','/healthz']){
  const response=await read(port,route);
  assert.equal(response.status,200,route);
  assert.equal(response.response.webhook,false);
  assert.equal(response.response.payout,false);
 }
 for(const route of ['/','/telegram/webhook','/api/bootstrap','/admin/withdrawals',
 '/api/withdrawals','/api/mining/start','/admin/withdrawal-settings/auto']){
  const response=await read(port,route,route==='/telegram/webhook'?'POST':'GET');
  assert.equal(response.status,503,route);
  assert.equal(response.response.code,'MAI_LEGACY_CUTOVER_FROZEN',route);
  assert.equal(response.retryAfter,'60');
 }
 const healthPost=await read(port,'/health','POST');
 assert.equal(healthPost.status,503);
});
test('standalone freeze code never imports DB, TON, bot or legacy application',()=>{
 const source=require('node:fs').readFileSync(require('node:path').join(__dirname,'legacy-freeze-http.js'),'utf8');
 assert.doesNotMatch(source,/require\(['"](?:pg|@ton\/|\.\/server|dotenv)/);
 assert.doesNotMatch(source,/setWebhook|sendTransaction|new Pool\(/);
});
