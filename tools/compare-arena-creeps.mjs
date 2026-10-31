/** Evidence layout only: existing source PNGs and unscaled crops of an actual arena screenshot. */
import {createServer} from 'node:http';
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve,extname,sep} from 'node:path';
const root=resolve('.'),out=resolve(root,'docs/evidence/phase1f-integration');
process.env.PLAYWRIGHT_BROWSERS_PATH??=resolve(root,'.cache/ms-playwright');
const {chromium}=await import('@playwright/test');
const manifest=JSON.parse(readFileSync(resolve(root,'assets/arena_creeps.manifest.json')));
const escape=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
const rows=manifest.assets.filter(a=>a.wave>=9).map((a,i)=>{
 const frame=a.animations.find(v=>v.state==='idle'&&v.direction==='down').frames[0];
 return `<section id="wave-${a.wave}"><h2>Wave ${a.wave} · ${escape(a.nameVi)}</h2><div class="columns">
 <article><h3>Approved concept · unchanged source</h3><img class="concept" src="/${a.sourceConcept}"></article>
 <article><h3>Production frame · nearest 3×</h3><div class="sprite"><img src="/sprites/creeps/arena/${a.slug}/frames/${frame}.png"></div><p>Body ${a.bodyHeight}px · pivot ${a.footPivot.map(v=>Number(v.toFixed(3))).join(', ')}<br>Five states × four facings · transparent PNG atlas</p></article>
 <article><h3>Actual arena · original screenshot pixels</h3><div class="crop"><img style="left:-${780+i*260}px;top:-320px" src="/docs/evidence/phase1f-integration/arena-idle-down.png"></div><p>Six connected players · real ArenaScene<br>Server fixture holds idle for comparison.<br>The orange stun marker belongs to the fixture.</p></article>
 </div></section>`;
}).join('');
const html=`<!doctype html><meta charset="utf-8"><title>Phase 1F concept / production / arena comparison</title><style>
*{box-sizing:border-box}body{margin:0;background:#171b22;color:#e9e5db;font:18px Arial,sans-serif}header{padding:24px 30px 6px}h1{font-size:28px;margin:0 0 10px}header p{color:#bec8cd;margin:0}section{padding:12px 30px 24px;border-bottom:2px solid #44515b;height:690px}h2{font-size:26px;margin:10px 0 12px;color:#efc983}h3{font-size:18px;color:#c6d4da;margin:0 0 14px}p{line-height:1.6;color:#bec8cd}.columns{display:grid;grid-template-columns:870px 540px 360px;gap:25px}.concept{width:840px;height:560px;object-fit:contain}.sprite{height:420px;display:flex;align-items:center;justify-content:center;background:repeating-conic-gradient(#29333d 0 25%,#222b34 0 50%) 50%/24px 24px}.sprite img{image-rendering:pixelated;transform:scale(3)}.crop{position:relative;width:360px;height:360px;overflow:hidden}.crop img{position:absolute;width:1920px;height:1080px;max-width:none}
</style><header><h1>Phase 1F — approved design to live arena</h1><p>Source concepts, exported frame PNGs and crops from the captured game. This layout does not generate or retouch character artwork.</p></header>${rows}`;
writeFileSync(resolve(out,'concept-production-arena-comparison.html'),html);
const server=createServer((req,res)=>{
 const file=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
 if(!file.startsWith(root+sep)){res.writeHead(403).end();return;}
 try{res.setHeader('Content-Type',({'.png':'image/png','.html':'text/html; charset=utf-8'})[extname(file)]??'application/octet-stream');res.end(readFileSync(file));}catch{res.writeHead(404).end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:1920,height:900},deviceScaleFactor:1});
 await page.goto(`http://127.0.0.1:${server.address().port}/docs/evidence/phase1f-integration/concept-production-arena-comparison.html`);
 await page.evaluate(()=>Promise.all([...document.images].map(i=>i.decode())));
 await page.screenshot({path:resolve(out,'concept-production-arena-comparison.png'),fullPage:true});
 for(const a of manifest.assets.filter(a=>a.wave>=9))await page.locator('#wave-'+a.wave).screenshot({path:resolve(out,a.slug+'-comparison.png')});
 console.log('Saved master comparison and four individual comparison PNGs. No recording.');
}finally{await browser.close();await new Promise(r=>server.close(r));}
