import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const run = (command, args) => {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: 'utf8',
    windowsHide: true,
  });
  process.stdout.write(result.stdout ?? '');
  process.stderr.write(result.stderr ?? '');
  if (result.error) throw result.error;
  if (result.status !== 0) throw Error(`${command} exited ${result.status}`);
  return result.stdout;
};
run('python', ['-X', 'utf8', 'scripts/measure-renovation.py']);
const output = run(
  process.env.ASEPRITE ?? 'C:/Program Files/Aseprite/Aseprite.exe',
  [
    '-b',
    '--script-param',
    'root=' + root.replaceAll('\\', '/'),
    '--script',
    'assets/source/renovation-v1/export.lua',
  ],
);
// Aseprite can print a Lua exception while returning exit status zero.
if (
  !output.includes('Exported 74 actors') ||
  !output.includes('Exported 9 scenes')
)
  throw Error('Incomplete Aseprite export');
const catalog = JSON.parse(
  readFileSync(
    resolve(root, 'assets/exports/renovation-v1/catalog.json'),
    'utf8',
  ),
);
if (catalog.assets.length !== 74 || catalog.scenes.length !== 9)
  throw Error('Incomplete runtime catalog');
run('python', ['-X', 'utf8', 'scripts/verify-renovation.py']);
