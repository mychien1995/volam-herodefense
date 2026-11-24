import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,dirname,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
const folder=dirname(fileURLToPath(import.meta.url)),root=resolve(folder,'../../..');
const files=new Map([
 ['/',resolve(folder,'index.html')],['/motion.js',resolve(folder,'motion.js')],
 ['/moves',resolve(folder,'index-v2.html')],['/motion-v2.js',resolve(folder,'motion-v2.js')],
 ['/phaser.js',resolve(root,'apps/game-client/node_modules/phaser/dist/phaser.js')],
 ['/body.png',resolve(folder,'body.png')],['/body.json',resolve(folder,'body.json')],
 ['/study.json',resolve(folder,'study.json')],
 ['/reference.png',resolve(folder,'reference.png')],
 ['/ground.png',resolve(root,'assets/exports/renovation-v2/arena-ground.png')],
 ['/idle.png',resolve(root,'assets/exports/skill-revise-feedback-v04/hammer-coherent-v4/body.png')],
 ['/idle.json',resolve(root,'assets/exports/skill-revise-feedback-v04/hammer-coherent-v4/body.json')],
]);
for(const name of ['body.png','body.json','study.json','reference.png'])files.set('/sweep/'+name,resolve(folder,'sweep',name));
const server=createServer(async(req,res)=>{
 const path=new URL(req.url,'http://localhost').pathname;
 if(path==='/health')return res.writeHead(200,{'content-type':'application/json'}).end(JSON.stringify({pid:process.pid,review:'thien-su-reference-motion-2026-11-24'}));
 if(path==='/favicon.ico')return res.writeHead(204).end();
 const file=files.get(path);if(!file)return res.writeHead(404).end();
 try{res.writeHead(200,{'content-type':({'.html':'text/html; charset=utf-8','.js':'text/javascript','.json':'application/json','.png':'image/png'})[extname(file)],'cache-control':'no-store'}).end(await readFile(file))}
 catch(error){res.writeHead(500).end();console.error(error)}
});
server.listen(Number(process.env.THIEN_SU_STUDY_PORT??5634),'127.0.0.1');
process.on('SIGTERM',()=>server.close(()=>process.exit(0)));
