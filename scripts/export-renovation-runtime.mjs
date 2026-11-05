import { spawnSync } from 'node:child_process';
const run = (command, args) => {
  const r = spawnSync(command, args, { encoding: 'utf8', windowsHide: true });
  process.stdout.write(r.stdout ?? '');
  process.stderr.write(r.stderr ?? '');
  if (r.status !== 0) throw Error(command + ' failed');
  return r.stdout;
};
run('python', ['-X', 'utf8', 'scripts/prepare-renovation-runtime.py']);
const result = run(
  process.env.ASEPRITE ?? 'C:/Program Files/Aseprite/Aseprite.exe',
  [
    '-b',
    '--script-param',
    'root=' + process.cwd().replaceAll('\\', '/'),
    '--script',
    'assets/source/renovation-v1/pack-runtime.lua',
  ],
);
if (!result.includes('Packed 74')) throw Error('Incomplete atlas packing');
run('python', [
  '-X',
  'utf8',
  'scripts/verify-renovation-runtime.py',
  '--write-manifest',
]);
