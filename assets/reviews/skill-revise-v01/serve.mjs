import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const folder=dirname(fileURLToPath(import.meta.url)),root=resolve(folder,'../../..');
const files=new Map([['/',resolve(folder,'index.html')],['/preview.js',resolve(folder,'preview.js')],['/catalogue.json',resolve(folder,'catalogue.json')],['/phaser.js',resolve(root,'apps/game-client/node_modules/phaser/dist/phaser.js')],['/ground.png',resolve(root,'assets/exports/renovation-v2/arena-ground.png')],['/retained/body.png',resolve(root,'assets/exports/con-luan-thien-su-unified-v2/body.png')],['/retained/body.json',resolve(root,'assets/exports/con-luan-thien-su-unified-v2/body.json')]]);
const catalogue=JSON.parse(await readFile(resolve(folder,'catalogue.json'),'utf8'));
files.set('/components',resolve(folder,'index.html'));
files.set('/',resolve(folder,'end-to-end.html'));
for(const name of ['end-to-end.js','choreography.js','retained.json'])files.set('/'+name,resolve(folder,name));
files.set('/revisions.json',resolve(root,'assets/exports/skill-revise-sweep-v03/review-assets.json'));
const revisions=JSON.parse(await readFile(files.get('/revisions.json'),'utf8'));
for(const p of revisions.assets)for(const [ext,file] of [['png',p.sourcePng],['json',p.sourceAtlas]]){
 if(!file.startsWith('assets/exports/skill-revise-feedback-v02/')&&!file.startsWith('assets/exports/skill-revise-sweep-v03/'))throw Error('Unexpected revision path');
 files.set('/revisions/'+p.id+'.'+ext,resolve(root,file));
}
const retained=JSON.parse(await readFile(resolve(folder,'retained.json'),'utf8'));
for(const p of retained.assets)for(const [ext,file] of [['png',p.sourcePng],['json',p.sourceAtlas]]){
 if(!file.startsWith('assets/exports/')&&!file.startsWith('assets/reviews/duong-mon-vfx-v2/art/'))throw Error('Unexpected retained path');
 files.set('/retained/'+p.id+'.'+ext,resolve(root,file));
}
for(const p of catalogue.packs)for(const [url,file] of [[p.png,p.sourcePng],[p.atlas,p.sourceAtlas]]){if(!file.startsWith('assets/exports/skill-revise-'))throw Error('Unexpected review path');files.set(url,resolve(root,file))}
const server=createServer(async(req,res)=>{const url=new URL(req.url,'http://localhost').pathname;if(url==='/health')return res.writeHead(200,{'content-type':'application/json'}).end(JSON.stringify({pid:process.pid,review:'skill-revise-v01'}));if(url==='/favicon.ico')return res.writeHead(204).end();const file=files.get(url);if(!file)return res.writeHead(404).end();try{res.writeHead(200,{'content-type':({'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png'})[extname(file)],'cache-control':'no-store'}).end(await readFile(file))}catch(e){res.writeHead(500).end();console.error(e)}});
server.listen(Number(process.env.SKILL_REVISE_REVIEW_PORT??5608),'127.0.0.1');
process.on('SIGTERM',()=>server.close(()=>process.exit(0)));
