'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'server.js'),'utf8');
const start=source.indexOf('async function registerTelegramWebhook() {');
const guard=source.slice(start,source.indexOf('return false;',start)+'return false;'.length)+'\n}}';
test('explicit legacy registration hold returns before bot credentials or network are touched',async()=>{
 let logs=0;
 const context={process:{env:{MAI_LEGACY_WEBHOOK_REGISTRATION_DISABLED:'true'}},console:{log(){logs++}}};
 vm.createContext(context);vm.runInContext(guard,context);
 assert.equal(await context.registerTelegramWebhook(),false);assert.equal(logs,1);
});
test('legacy registration hold must precede all setWebhook calls in the registrar',()=>{
 const flag=source.indexOf('MAI_LEGACY_WEBHOOK_REGISTRATION_DISABLED',start);
 const setter=source.indexOf("'setWebhook'",start);
 assert.ok(flag>start&&setter>flag);
 assert.match(source.slice(flag,flag+180),/=== 'true'/);
});
