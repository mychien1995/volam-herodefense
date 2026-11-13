import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const folder = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(folder, "../../..");
const phaser = process.argv[2] ?? path.join(root, "apps/game-client/node_modules/phaser/dist/phaser.js");
const port = Number(process.argv[3] ?? 5598);
const files = new Map([
  ["/", path.join(folder, "index.html")],
  ["/preview.css", path.join(folder, "preview.css")],
  ["/preview.js", path.join(folder, "preview.js")],
  ["/phaser.js", path.resolve(phaser)],
]);
for (const asset of [
  "renovation-v2/arena-ground.png",
  "arena_art01/lantern.png",
  "renovation-v1/hero_cai_bang.png",
  "renovation-v1/hero_cai_bang.json",
  "renovation-v1/creep_bandit_grunt.png",
  "renovation-v1/creep_bandit_grunt.json",
]) files.set("/assets/exports/" + asset, path.join(root, "assets/exports", asset));
for (const id of ["hero_con_luan_thien_su", "con_luan_thien_su_fx"]) {
  for (const ext of ["png", "json"]) {
    const asset = "assets/exports/characters/con_luan_thien_su_v03/" + id + "." + ext;
    files.set("/" + asset, path.join(root, asset));
  }
}
const sockets = "assets/exports/characters/con_luan_thien_su_v03/hammer-sockets.json";
files.set("/" + sockets, path.join(root, sockets));
const types = { ".css": "text/css", ".js": "text/javascript", ".png": "image/png", ".html": "text/html", ".json": "application/json" };
await readFile(phaser);

createServer(async (request, response) => {
  const route = new URL(request.url, "http://localhost").pathname;
  if (route === "/favicon.ico") return response.writeHead(204).end();
  const file = files.get(route);
  if (!file) {
    response.writeHead(404).end();
    return;
  }
  try {
    const content = await readFile(file);
    response.writeHead(200, { "Content-Type": types[path.extname(file)], "Cache-Control": "no-store" }).end(content);
  } catch (error) {
    console.error(error);
    response.writeHead(500).end();
  }
}).listen(port, "127.0.0.1", () => console.log("Thiền Sư art review: http://127.0.0.1:" + port));
