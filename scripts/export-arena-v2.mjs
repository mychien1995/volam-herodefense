import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const aseprite =
  process.env.ASEPRITE_PATH ?? 'C:/Program Files/Aseprite/Aseprite.exe';
for (const script of process.argv.includes('--prepare')
  ? ['prepare-arena-v2.lua', 'export-arena-v2.lua']
  : ['export-arena-v2.lua']) {
  const result = spawnSync(
    aseprite,
    [
      '--batch',
      '--script-param',
      `root=${root.replaceAll('\\', '/')}`,
      '--script',
      fileURLToPath(new URL(script, import.meta.url)),
    ],
    { cwd: root, encoding: 'utf8', windowsHide: true },
  );
  process.stdout.write(result.stdout ?? '');
  process.stderr.write(result.stderr ?? '');
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
