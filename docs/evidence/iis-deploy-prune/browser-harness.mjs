import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {createRequire} from 'node:module';
// Evidence copy; run from repository root after extracting the ZIP to the
// .cache/iis-slim-qa-ui-complete fixture and starting its isolated backend.
import {qaBrowserEnvironment} from '../../../tools/qa-preflight.mjs';
import {acknowledgeQaLobby,waitForGameReady,observeQa,pressQaAndWait} from '../../../tools/qa-browser.mjs';
Object.assign(process.env,qaBrowserEnvironment(process.env,process.cwd()));
const req=createRequire(new URL('../../../package.json',import.meta.url));
const {chromium,expect}=req('@playwright/test');
const serverReq=createRequire(path.resolve('.cache/iis-slim-qa-ui-complete/server/package.json'));
const express=serverReq('express'),WebSocket=createRequire(serverReq.resolve('@colyseus/ws-transport'))('ws');
const app=express(),client=path.resolve('.cache/iis-slim-qa-ui-complete/client'),aliases={};
const sidecar=JSON.parse(fs.readFileSync('artifacts/volam-hero-defense-windows-iis-m4d-slim.zip.assets.json'));
Object.assign(aliases,sidecar.aliases);
app.use((req,res,next)=>{if(aliases[req.path])req.url=aliases[req.path];next();});
app.use('/game-api',(req,res)=>{const upstream=http.request('http://127.0.0.1:2972'+req.url,{method:req.method,headers:req.headers},r=>{res.writeHead(r.statusCode,r.headers);r.pipe(res);});upstream.on('error',()=>res.sendStatus(502));req.pipe(upstream);});
app.use(express.static(client));
const listener=app.listen(5577,'127.0.0.1');
const browser=await chromium.launch({headless:true,args:['--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows']});
const errors=[],badAssets=[],contexts=[];
const snap=p=>p.evaluate(()=>window.__VOLAM__.snapshot());
async function pageFor(){const c=await browser.newContext({viewport:{width:1280,height:900}});contexts.push(c);
await c.route('**/*',async route=>{const u=new URL(route.request().url());if(u.hostname!=='hero-defense.stackfolio.cloud')return route.abort();await route.fulfill({response:await route.fetch({url:'http://127.0.0.1:5577'+u.pathname+u.search})});});
await c.routeWebSocket('**/*',r=>{const u=new URL(r.url());if(u.hostname!=='hero-defense.stackfolio.cloud')return r.close();const ws=new WebSocket('ws://127.0.0.1:2972'+u.pathname.replace(/^\/game-api/,'')+u.search),queued=[];r.onMessage(data=>{if(ws.readyState===WebSocket.OPEN)ws.send(data);else queued.push(data)});ws.on('open',()=>queued.splice(0).forEach(data=>ws.send(data)));ws.on('message',(data,binary)=>r.send(binary?data:data.toString()));ws.on('close',()=>r.close());ws.on('error',e=>errors.push('WS '+e.message));r.onClose(()=>ws.close());});
const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()>=400&&r.url().includes('/assets/'))badAssets.push({url:r.url(),status:r.status()})});return p;}
async function enter(p,name,room){await p.goto('https://hero-defense.stackfolio.cloud/?debug=1');await p.locator('[data-action=play]').click();await p.locator('#pre-nickname').fill(name);await p.getByRole('button',{name:'Vào game',exact:true}).click();
if(room){await p.locator('#pregame').getByLabel('Mã phòng',{exact:true}).fill(room);await p.getByRole('button',{name:'Vào bằng mã',exact:true}).click();}
else{await p.getByRole('button',{name:'Tạo phòng',exact:true}).click();await p.getByRole('combobox',{name:'Độ khó',exact:true}).selectOption('easy');await p.locator('#pre-arena').selectOption('tuong_duong');await p.locator('[data-action=confirm-create]').click();}
await expect(p.locator('#pregame .pre-title')).toHaveText('Phòng chờ',{timeout:20000});}
try{
const a=await pageFor(),b=await pageFor();await enter(a,'IIS slim host');const room=(await snap(a)).roomId;await enter(b,'IIS slim peer',room);
await acknowledgeQaLobby(a,'start');
for(const [p,branch] of [[a,'cai_bang_bong'],[b,'vo_dang_kiem']]){await acknowledgeQaLobby(p,'school',branch.startsWith('cai_bang')?'cai_bang':'vo_dang');await acknowledgeQaLobby(p,'branch',branch);await expect(p.locator('#scene-status')).toHaveAttribute('data-ready','true',{timeout:90000});await acknowledgeQaLobby(p,'confirm');}
await Promise.all([a,b].map(p=>waitForGameReady(p,{timeout:30000})));
const before=await snap(a),hero=before.state.players[before.sessionId];
const moved=await pressQaAndWait(a,'ArrowLeft',x=>{const s=window.__VOLAM__.snapshot(),h=s.state.players[s.sessionId];return h.x<x-5&&{x:h.x,sequence:h.lastSequence}},hero.x,{keyDelay:300,timeout:10000});
await observeQa(b,({id,sequence})=>window.__VOLAM__.snapshot().state.players[id]?.lastSequence>=sequence,{id:before.sessionId,sequence:moved.sequence});
const seq=(await snap(a)).state.players[before.sessionId].lastSequence;
const basicAcknowledged=await pressQaAndWait(a,'a',sequence=>{const s=window.__VOLAM__.snapshot(),h=s.state.players[s.sessionId];return h.lastSequence>sequence&&{sequence:h.lastSequence}},seq,{timeout:10000});
await a.locator('#boss-test-nam-dark').click();
for(const p of [a,b])await observeQa(p,()=>{const s=window.__VOLAM__.snapshot(),v=JSON.parse(s.state.defense.namDe||'null');return v?.dark?.shield&&s.state.players[s.sessionId].level===18},undefined,{timeout:15000});
const presentation=await a.evaluate(()=>window.__VOLAM__.presentation());
if(!presentation.namDe.sprites.some(s=>s.texture==='nam-de-dark:body'))throw Error('Missing phase-two sprite');
if(errors.length||badAssets.length)throw Error(JSON.stringify({errors,badAssets}));
await a.screenshot({path:'artifacts/iis-slim-host.png'});await b.screenshot({path:'artifacts/iis-slim-peer.png'});
fs.writeFileSync('artifacts/iis-slim-browser.json',JSON.stringify({status:'PASS',scope:'Actual slim ZIP client/server; IIS URL prefix and asset aliases emulated locally. Two Phaser renderers; isolated DEV progression room prerequisite only. Movement synchronized; A protocol acknowledgment only (no damage claim). No live IIS deployment or full campaign claim.',room,moved,basicAcknowledged,body:presentation.namDe.sprites,errors,badAssets},null,2));console.log('PASS two real clients / slim ZIP / movement sync / A acknowledgment / Nam De dark / no missing assets');
}finally{await browser.close();await new Promise(r=>listener.close(r));}
