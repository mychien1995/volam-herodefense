import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const aseprite =
  process.env['ASEPRITE_PATH'] ?? 'C:/Program Files/Aseprite/Aseprite.exe';
if (!existsSync(aseprite))
  throw new Error(
    'Aseprite is needed only for art export. Set ASEPRITE_PATH to its executable. Runtime builds use committed exports.',
  );
const result = spawnSync(
  aseprite,
  [
    '--batch',
    '--script-param',
    `root=${root.replaceAll('\\', '/')}`,
    '--script',
    fileURLToPath(new URL('./export-arena-art01.lua', import.meta.url)),
  ],
  { cwd: root, encoding: 'utf8', windowsHide: true },
);
process.stdout.write(result.stdout ?? '');
process.stderr.write(result.stderr ?? '');
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);
