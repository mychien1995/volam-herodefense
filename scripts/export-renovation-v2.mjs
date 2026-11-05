import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
const read = (p) => JSON.parse(readFileSync(p, 'utf8'));
const ids = new Set([
  'vo_dang_kiem',
  'thien_son_phien',
  'that_tinh_kiem',
  'nhan_kiem_hop_nhat',
  'bat_quai_kiem_tran',
  'toa_sat_bac_do',
  'van_kiem_quy_tong',
  'lien_hoa_phien',
  'luc_duong_chuong',
  'luu_phong_bo',
  'chiet_mai_thu',
  'bach_phien_phong_bao',
]);
const records = [];
for (const p of [
  'packages/game-data/src/skill-art.json',
  'apps/game-client/src/feedback-art.generated.json',
  'apps/game-client/src/approved-skill-assets.generated.json',
  'apps/game-client/src/m3d-feedback-art.generated.json',
])
  for (const a of read(p).assets) {
    if (
      ids.has(a.skillId) ||
      /^(thien_son_fan_v2_|thien_son_wind_actions_v2_|vo_dang_shield_formation_v2_|m3d_vo_dang_basic_vfx$|r2_hero_vo_dang$)/.test(
        a.id,
      ) ||
      ['review_lotus', 'review_sword'].includes(a.id)
    )
      records.push(a);
  }
for (const id of ['hero_vo_dang_kiem', 'hero_thien_son'])
  records.push({
    id,
    kind: 'character',
    skillId: id === 'hero_thien_son' ? 'thien_son_phien' : 'vo_dang_kiem',
    sheet: `assets/exports/characters/visual_improvement_v02/${id}.png`,
    atlas: `assets/exports/characters/visual_improvement_v02/${id}.json`,
    origin: [0.5, 0.8],
    animations: [],
  });
records.push({
  ...records.find((a) => a.id === 'vo_dang_shield_formation_v2_aura'),
  id: 'renovated_toa_guard',
  skillId: 'toa_sat_bac_do',
});
for (const a of records) {
  a.url = '/' + a.sheet.replace('assets/exports/', 'assets/');
  a.atlasUrl = '/' + a.atlas.replace('assets/exports/', 'assets/');
  a.input = existsSync(a.sheet)
    ? a.sheet
    : 'apps/game-client/public/' + a.sheet;
  a.inputAtlas = existsSync(a.atlas)
    ? a.atlas
    : 'apps/game-client/public/' + a.atlas;
}
for (const a of records)
  if (a.id === 'renovated_toa_guard') {
    a.url = '/assets/renovation-v2/overrides/renovated_toa_guard.png';
    a.atlasUrl = '/assets/renovation-v2/overrides/renovated_toa_guard.json';
  }
mkdirSync('assets/exports/renovation-v2', { recursive: true });
writeFileSync(
  'assets/source/renovation-v2/components.json',
  JSON.stringify(records, null, 2) + '\n',
);
const run = (exe, args) => {
  const r = spawnSync(exe, args, { encoding: 'utf8', windowsHide: true });
  process.stdout.write(r.stdout ?? '');
  process.stderr.write(r.stderr ?? '');
  if (r.status !== 0) throw Error(exe + ' failed');
  return r.stdout;
};
run('python', ['-X', 'utf8', 'scripts/measure-renovation-v2.py']);
const only = process.argv.find((a) => a.startsWith('--only='))?.slice(7);
const args = [
  '-b',
  '--script-param',
  'root=' + process.cwd().replaceAll('\\', '/'),
  ...(only ? ['--script-param', 'only=' + only] : []),
  '--script',
];
if (
  !only &&
  !run(process.env.ASEPRITE ?? 'C:/Program Files/Aseprite/Aseprite.exe', [
    ...args,
    'assets/source/renovation-v2/export-arena.lua',
  ]).includes('V2 original arena layout exported at density2')
)
  throw Error('Arena export incomplete');
if (
  !run(process.env.ASEPRITE ?? 'C:/Program Files/Aseprite/Aseprite.exe', [
    ...args,
    'assets/source/renovation-v2/export-bodies.lua',
  ]).includes('V2 bodies exported')
)
  throw Error('Body export incomplete');
run('python', ['-X', 'utf8', 'scripts/plan-renovation-v2-overrides.py']);
if (
  !run(process.env.ASEPRITE ?? 'C:/Program Files/Aseprite/Aseprite.exe', [
    ...args,
    'assets/source/renovation-v2/export-overrides.lua',
  ]).includes('V2 overrides exported')
)
  throw Error('Override export incomplete');
run('python', [
  '-X',
  'utf8',
  'scripts/verify-renovation-v2.py',
  '--write-manifest',
]);
