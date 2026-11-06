import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const src = 'assets/source/renovation-v5',
  out = 'assets/exports/renovation-v5';
mkdirSync(out, { recursive: true });
const spec = [
  ['dragon_head', [2, 2], 200],
  ['dragon_flight', [4, 2], 260],
  ['dragon_impact', [2, 2], 280],
  ['azure_crescent', [2, 2], 150],
  ['blue_fissure', [2, 2], 360],
  ['blossom_slashes', [4, 2], 230],
  ['foot_wind', [2, 2], 140],
  ['staff_slam', [2, 2], 200],
  ['tai_chi_dome', [2, 2], 480],
  ['bach_liet_body', [4, 4], 88, 'body'],
  ['vi_da_body', [4, 4], 88, 'body'],
]
  .filter(([id]) => existsSync(src + '/raw/' + id + '.png'))
  .map(([id, grid, size, type]) => ({
    id,
    source: id === 'tai_chi_dome' ? 'tai_chi_dome_clean' : id,
    grid,
    size,
    type: type ?? 'effect',
    canvas:
      type === 'body'
        ? [400, 400]
        : id === 'tai_chi_dome'
          ? [512, 384]
          : [512, 512],
  }));
writeFileSync(src + '/export-plan.json', JSON.stringify(spec, null, 2));
const r = spawnSync(
  process.env.ASEPRITE ?? 'C:/Program Files/Aseprite/Aseprite.exe',
  [
    '-b',
    '--script-param',
    'root=' + process.cwd().replaceAll('\\', '/'),
    '--script',
    src + '/export.lua',
  ],
  { encoding: 'utf8', windowsHide: true },
);
process.stdout.write(r.stdout ?? '');
process.stderr.write(r.stderr ?? '');
if (r.status !== 0 || !r.stdout.includes('V5 EXPORT COMPLETE'))
  throw Error('Aseprite V5 export incomplete');
const assets = spec.map((s) => ({
  ...s,
  key: 'renovated-v5-' + s.id,
  url: '/assets/renovation-v5/' + s.id + '.png',
  atlas: '/assets/renovation-v5/' + s.id + '.json',
  sha256: createHash('sha256')
    .update(readFileSync(out + '/' + s.id + '.png'))
    .digest('hex'),
}));
writeFileSync(
  'apps/game-client/src/renovation-revision.generated.json',
  JSON.stringify({ assets }, null, 2),
);
