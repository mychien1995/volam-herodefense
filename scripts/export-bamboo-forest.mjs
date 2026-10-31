import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
for (const prepare of process.argv.includes('--prepare')
  ? [true, false]
  : [false]) {
  const result = spawnSync(
    process.env.ASEPRITE_PATH ?? 'C:/Program Files/Aseprite/Aseprite.exe',
    [
      '--batch',
      '--script-param',
      `prepare=${prepare}`,
      '--script-param',
      `root=${root.replaceAll('\\', '/')}`,
      '--script',
      fileURLToPath(new URL('export-bamboo-forest.lua', import.meta.url)),
    ],
    { cwd: root, encoding: 'utf8', windowsHide: true },
  );
  process.stdout.write(result.stdout ?? '');
  process.stderr.write(result.stderr ?? '');
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
