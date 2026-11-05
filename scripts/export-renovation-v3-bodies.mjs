import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
const run = (exe, args) => {
  const r = spawnSync(exe, args, { encoding: 'utf8', windowsHide: true });
  process.stdout.write(r.stdout ?? '');
  if (r.status !== 0) throw Error(r.stderr + r.stdout);
  return r.stdout;
};
run('python', ['-X', 'utf8', 'scripts/measure-renovation-v3.py']);
const result = run(
  process.env.ASEPRITE ?? 'C:/Program Files/Aseprite/Aseprite.exe',
  [
    '-b',
    '--script-param',
    'root=' + process.cwd().replaceAll('\\', '/'),
    '--script',
    'assets/source/renovation-v3/export-bodies.lua',
  ],
);
if (!result.includes('V3 exported bodies'))
  throw Error('Aseprite export incomplete');
const layout = JSON.parse(
  readFileSync('assets/source/renovation-v3/body-layout.json'),
);
const bodies = Object.entries(layout).map(([id, b]) => ({
  id,
  actor: b.actor,
  key: 'renovated-action-' + id,
  url: '/assets/renovation-v3/actors/' + id + '.png',
  atlas: '/assets/renovation-v3/actors/' + id + '.json',
  canvas: [400, 400],
  pivot: [200, 320],
  height: b.height,
}));
for (const id of [
  'vo_dang_cast',
  'vo_dang_attack',
  'thien_son_cast',
  'thien_son_throw',
])
  bodies.push({
    id: 'v2:' + id,
    actor: id.startsWith('vo_dang') ? 'hero_vo_dang_kiem' : 'hero_thien_son',
    key: 'renovated-action-v2:' + id,
    url: '/assets/renovation-v2/' + id + '.png',
    atlas: '/assets/renovation-v2/' + id + '.json',
    canvas: [320, 256],
    pivot: [160, 224],
    height: 88,
  });
const path = 'apps/game-client/src/renovation-actions.generated.json',
  old = existsSync(path) ? JSON.parse(readFileSync(path)) : {};
writeFileSync(path, JSON.stringify({ ...old, bodies }, null, 2) + '\n');
console.log('V3 native body manifest', bodies.length);
