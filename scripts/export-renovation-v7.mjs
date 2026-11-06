import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const src = 'assets/source/renovation-v7',
  out = 'assets/exports/renovation-v7';
mkdirSync(out, { recursive: true });
const plan = [
  {
    id: 'dragon_forward_fire',
    grid: [4, 5],
    rows: [0, 215, 435, 690, 910, 1247],
    directions: ['right', 'down_right', 'down', 'up_right', 'up'],
    size: 260,
    canvas: [512, 512],
  },
  {
    id: 'dragon_coil_fire',
    grid: [4, 3],
    rows: [0, 350, 680, 1086],
    size: 220,
    canvas: [512, 512],
    heads: { 10: [201, 292], 11: [184, 345] },
  },
  {
    id: 'staff_sweep',
    grid: [4, 3],
    rows: [0, 340, 680, 1086],
    columns: [0, 300, 700, 1080, 1448],
    directions: ['right', 'down', 'up'],
    canvas: [400, 400],
    scale: [0.3, 0.44],
    contact: [
      [292, 292],
      [179, 305],
      [166, 45],
    ],
    sockets: JSON.parse(
      readFileSync(
        'apps/game-client/src/renovation-staff-sockets.json',
        'utf8',
      ),
    ),
  },
];
writeFileSync(src + '/export-plan.json', JSON.stringify(plan, null, 2) + '\n');
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
if (r.status !== 0 || !r.stdout.includes('V7 EXPORT COMPLETE'))
  throw Error('Incomplete V7 export');
writeFileSync(
  'apps/game-client/src/renovation-coil.generated.json',
  JSON.stringify(
    {
      assets: plan.map((s) => ({
        ...s,
        key: 'renovated-v7-' + s.id,
        url: '/assets/renovation-v7/' + s.id + '.png',
        atlas: '/assets/renovation-v7/' + s.id + '.json',
        origins: JSON.parse(readFileSync(out + '/' + s.id + '.json', 'utf8'))
          .origins,
        sha256: createHash('sha256')
          .update(readFileSync(out + '/' + s.id + '.png'))
          .digest('hex'),
      })),
    },
    null,
    2,
  ) + '\n',
);
