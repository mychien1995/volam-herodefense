import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const src = 'assets/source/renovation-v6',
  out = 'assets/exports/renovation-v6';
mkdirSync(out, { recursive: true });
const plan = [
  {
    id: 'dragon_turns',
    source: 'dragon_turns',
    type: 'effect',
    grid: [4, 5],
    directions: ['right', 'down_right', 'down', 'up_right', 'up'],
    rows: [0, 215, 435, 690, 920, 1247],
    size: 260,
    canvas: [512, 512],
  },
  {
    id: 'staff_action',
    source: 'staff_action_clean',
    type: 'body',
    grid: [4, 4],
    directions: ['down', 'left', 'right', 'up'],
    // Measured midpoint of the two boot soles in each source cell.
    // A descending staff tip must never participate in the foot anchor.
    feet: [
      [162, 263],
      [153, 263],
      [152, 259],
      [150, 259],
      [159, 239],
      [140, 237],
      [153, 234],
      [157, 235],
      [164, 212],
      [160, 211],
      [136, 210],
      [137, 211],
      [162, 204],
      [163, 205],
      [145, 205],
      [141, 204],
    ],
    size: 88,
    canvas: [400, 400],
  },
  ...['staff_arc', 'staff_crack'].map((id) => ({
    id,
    source: id,
    type: 'effect',
    grid: [2, 2],
    size: id === 'staff_arc' ? 210 : 190,
    canvas: [512, 512],
  })),
];
writeFileSync(src + '/export-plan.json', JSON.stringify(plan, null, 2));
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
if (r.status !== 0 || !r.stdout.includes('V6 EXPORT COMPLETE'))
  throw Error('Incomplete Aseprite export');
writeFileSync(
  'apps/game-client/src/renovation-followup.generated.json',
  JSON.stringify(
    {
      assets: plan.map((s) => ({
        ...s,
        key: 'renovated-v6-' + s.id,
        url: '/assets/renovation-v6/' + s.id + '.png',
        atlas: '/assets/renovation-v6/' + s.id + '.json',
        sha256: createHash('sha256')
          .update(readFileSync(out + '/' + s.id + '.png'))
          .digest('hex'),
      })),
    },
    null,
    2,
  ),
);
