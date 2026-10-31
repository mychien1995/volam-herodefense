import {createServer} from 'vite';
import {fileURLToPath} from 'node:url';
const server=await createServer({
 root:fileURLToPath(new URL('../../../../apps/game-client',import.meta.url)),
 configFile:false,
 cacheDir:fileURLToPath(new URL('../../../../.cache/vite-thien-son-skill-review',import.meta.url)),
 define:{'import.meta.env.VITE_SERVER_URL':JSON.stringify('http://127.0.0.1:0')},
 server:{host:'127.0.0.1',port:5194,strictPort:true,watch:null,hmr:false},
});
await server.listen();
console.log('Thiên Sơn ART-ONLY preview: http://127.0.0.1:5194/?artPreview=1&thienSonSkills=1');
console.log('Frontend only. No game server or room is started.');
for(const signal of ['SIGINT','SIGTERM'])process.once(signal,async()=>{await server.close();process.exit(0);});

