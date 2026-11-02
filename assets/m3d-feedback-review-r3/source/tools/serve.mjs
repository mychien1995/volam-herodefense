// Isolated art viewer. Read-only serving, no production imports, video or tracing.
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,dirname,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../../../..');
const viewer='/assets/m3d-feedback-review-r3/';
const server=createServer(async(req,res)=>{
  try {
    const path=new URL(req.url,'http://localhost').pathname;
    if(path==='/'){res.writeHead(302,{Location:viewer});res.end();return;}
    if(path==='/favicon.ico'){res.writeHead(204);res.end();return;}
    if(!path.startsWith(viewer)&&!path.startsWith('/assets/m3d-feedback-visual/previews/support/'))throw new Error('outside review');
    const name=decodeURIComponent(path)+(path.endsWith('/')?'index.html':'');
    const file=resolve(root,'.'+name);
    if(!file.startsWith(resolve(root,'assets/m3d-feedback-review-r3'))&&!file.startsWith(resolve(root,'assets/m3d-feedback-visual/previews/support')))throw new Error('outside review');
    const type={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.md':'text/plain; charset=utf-8'}[extname(file)];
    if(!type)throw new Error('unsupported file');
    const bytes=await readFile(file);res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-store'});res.end(bytes);
  } catch {res.writeHead(404);res.end('Not found');}
});
const port=Number(process.env.M3D_R3_REVIEW_PORT||5513);
server.listen(port,'127.0.0.1',()=>console.log(`R3 key-pose viewer: http://127.0.0.1:${port}${viewer}`));
process.on('SIGINT',()=>server.close(()=>process.exit(0)));
