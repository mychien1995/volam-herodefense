import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const dir = 'assets/source/renovation-v4',
  out = 'assets/exports/renovation-v4';
mkdirSync(out + '/overrides', { recursive: true });
const v3 = JSON.parse(
  readFileSync('apps/game-client/src/renovation-actions.generated.json'),
);
const plans = JSON.parse(
  readFileSync('assets/source/renovation-v3/fx-plan.json'),
);
const sheets = [];
for (const a of plans.filter((a) => a.group === 'school')) {
  const rightId = a.id.replace(/_left(?=_|$)/, '_right');
  const rightPlan = plans.find((b) => b.id === rightId) || a;
  const pairs = {};
  for (const f of a.frames) {
    if (!/(?:^|_)left(?:_|$)/.test(f.name) && rightId === a.id) continue;
    if (
      /aura|ring|guard|shield|glyph|sanskrit|buddha|tornado|ground|foot_force/.test(
        a.id + ' ' + f.name,
      )
    )
      continue;
    const name = f.name.replace(/(^|_)left(?=_|$)/, '$1right');
    if (rightPlan.frames.some((x) => x.name === name))
      pairs[f.name] = { id: rightId, name };
  }
  if (Object.keys(pairs).length) sheets.push({ id: a.id, pairs });
}
const effects = [
  ['liet_phong_overhead', 144],
  ['earth_eruption', 154],
  ['bach_liet_slashes-clean', 170],
  ['luong_nghi_disc', 92],
  ['that_tinh_slashes', 184],
  ['tru_ta_crescent', 212],
  ['nhu_lai_blade', 120],
].map(([source, size]) => ({ id: source.replace('-clean', ''), source, size }));
writeFileSync(
  dir + '/export-plan.json',
  JSON.stringify({ sheets, effects }, null, 2),
);
const run = spawnSync(
  process.env.ASEPRITE || 'C:/Program Files/Aseprite/Aseprite.exe',
  [
    '-b',
    '--script-param',
    'root=' + process.cwd().replaceAll('\\', '/'),
    '--script',
    dir + '/export.lua',
  ],
  { encoding: 'utf8', windowsHide: true },
);
process.stdout.write(run.stdout || '');
process.stderr.write(run.stderr || '');
if (run.status !== 0 || !run.stdout.includes('V4 EXPORT COMPLETE'))
  throw Error('Aseprite V4 export failed');
const ids = new Set(sheets.map((x) => x.id));
const assets = v3.assets
  .filter((a) => ids.has(a.id))
  .map((a) => ({
    ...a,
    sha256: createHash('sha256')
      .update(readFileSync(out + '/overrides/' + a.id + '.png'))
      .digest('hex'),
    candidateUrl: a.candidateUrl.replace('renovation-v3', 'renovation-v4'),
    atlasCandidateUrl: a.atlasCandidateUrl?.replace(
      'renovation-v3',
      'renovation-v4',
    ),
  }));
const atlases = Object.fromEntries(
  Object.entries(v3.atlases)
    .filter(([, v]) => ids.has(v.split('/').at(-1).replace('.json', '')))
    .map(([k, v]) => [k, v.replace('renovation-v3', 'renovation-v4')]),
);
const inlineAtlases = Object.fromEntries(
  Object.entries(v3.inlineAtlases)
    .filter(([, v]) => ids.has(v.split('/').at(-1).replace('.json', '')))
    .map(([k, v]) => [k, v.replace('renovation-v3', 'renovation-v4')]),
);
const frameAxes = {};
for (const s of sheets) {
  const a = assets.find((a) => a.id === s.id);
  for (const key of a?.textureKeys ?? [s.id]) {
    const axes = (frameAxes[key] ??= {});
    for (const [left, pair] of Object.entries(s.pairs)) {
      axes[left] = [-1, 0];
      if (pair.id === s.id) axes[pair.name] = [1, 0];
    }
  }
}
writeFileSync(
  'apps/game-client/src/renovation-feedback.generated.json',
  JSON.stringify(
    {
      effects: effects.map((e) => ({
        ...e,
        key: 'renovated-v4-' + e.id,
        url: '/assets/renovation-v4/' + e.id + '.png',
        atlas: '/assets/renovation-v4/' + e.id + '.json',
      })),
      assets,
      atlases,
      inlineAtlases,
      frameAxes,
    },
    null,
    2,
  ),
);
console.log(
  sheets.length + ' mirrored atlases; ' + effects.length + ' native effects',
);
