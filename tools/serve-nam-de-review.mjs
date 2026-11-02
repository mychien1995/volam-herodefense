import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const root=path.resolve(fileURLToPath(new URL('../',import.meta.url)));
const i=process.argv.indexOf('--deps-root');
const deps=i<0?root:path.resolve(process.argv[i+1]);
const require=createRequire(path.join(deps,'apps/game-client/package.json'));
const phaser=path.join(path.dirname(require.resolve('phaser/package.json')),'dist/phaser.js');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json','.png':'image/png','.css':'text/css; charset=utf-8'};
const server=http.createServer((req,res)=>{
 try {
  const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  let file=name==='/vendor/phaser.js'?phaser:path.resolve(root,'.'+name);
  if(file!==phaser && !file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  if(fs.statSync(file).isDirectory())file=path.join(file,'index.html');
  res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});
  fs.createReadStream(file).pipe(res);
 }catch{res.writeHead(404).end('Not found');}
});
server.listen(5413,'127.0.0.1',()=>console.log('Nam Đế art preview: http://127.0.0.1:5413/assets/reviews/nam_de_v02/'));
server.on('error',e=>{console.error(e.message);process.exitCode=1;});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>process.exit()));
