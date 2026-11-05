import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
const run = (exe, args) => {
  const r = spawnSync(exe, args, { encoding: 'utf8', windowsHide: true });
  process.stdout.write(r.stdout ?? '');
  process.stderr.write(r.stderr ?? '');
  if (r.status !== 0) throw Error(exe + ' failed');
  return r.stdout;
};
const only = process.argv.find((a) => a.startsWith('--only='))?.slice(7);
run('node', ['scripts/prepare-assets.mjs']);
if (!only) run('node', ['scripts/export-renovation-v3-bodies.mjs']);
run('node', ['scripts/collect-renovation-v3.mjs']);
run('python', ['-X', 'utf8', 'scripts/plan-renovation-v3-fx.py']);
if (only) {
  const ids = new Set(
    JSON.parse(
      readFileSync('assets/source/renovation-v3/fx-plan.json', 'utf8'),
    ).map((a) => a.id),
  );
  for (const id of only.split(','))
    if (!ids.has(id)) throw Error('Unknown scoped V3 atlas: ' + id);
}
const result = run(
  process.env.ASEPRITE ?? 'C:/Program Files/Aseprite/Aseprite.exe',
  [
    '-b',
    '--script-param',
    'root=' + process.cwd().replaceAll('\\', '/'),
    ...(only ? ['--script-param', 'only=' + only] : []),
    '--script',
    'assets/source/renovation-v3/export-fx.lua',
  ],
);
if (!result.includes('V3 exported FX'))
  throw Error('Aseprite export incomplete');
run('python', [
  '-X',
  'utf8',
  'scripts/verify-renovation-v3.py',
  '--write-manifest',
]);
