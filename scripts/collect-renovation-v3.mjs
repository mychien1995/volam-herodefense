import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
const root = 'assets/source/renovation-v3';
mkdirSync(root + '/contracts', { recursive: true });
const read = (p) => JSON.parse(readFileSync(p, 'utf8'));
const input = (url) => {
  const p = url.replace(/^\//, '').replace(/^assets\//, 'assets/exports/');
  return existsSync(p)
    ? p
    : 'apps/game-client/public/' + url.replace(/^\//, '');
};
const records = [],
  urls = new Map(),
  bodyFrames = {};
const bodyR3 = new Set([
  'review3_hero',
  'review3_vo_cau_character',
  'review3_ts_dao',
  'review3_shaolin_a',
  'review3_vo_anh_cuoc_character',
  'review3_nhu_lai_niet_ban_character',
  'review3_tru_ta_character',
  'review3_school_dao',
  'review3_kim_quang_ho_tran_character',
  'review3_tam_gioi_quy_thien_character',
  'review3_lms',
  'review3_co_mo_minion',
  'review3_hhl_boss_locomotion',
  'review3_hhl_boss_basics',
  'review3_hhl_boss_thrust_vertical',
  'review3_cbt',
  'review3_cbt_runtime_actions',
  'review3_hoac_do_base',
  'review3_hoac_do_actions',
  'review3_dat_nhi_ba_base',
  'review3_dat_nhi_ba_actions',
  'review3_kim_luan_base',
  'review3_kim_luan_actions',
]);
function add({
  id,
  key = id,
  url,
  atlasUrl,
  frames,
  animations,
  origin = [0.5, 0.5],
  kind = 'vfx',
  group = 'school',
  skillId = '',
}) {
  if (!url || !existsSync(input(url)))
    throw Error('Missing runtime image ' + id + ' ' + url);
  let atlas = frames ? { frames, meta: { image: url } } : read(input(atlasUrl));
  if (Array.isArray(atlas.frames))
    atlas.frames = Object.fromEntries(atlas.frames.map((f) => [f.filename, f]));
  let tags = Array.isArray(animations)
    ? animations
    : animations
      ? Object.entries(animations).map(([name, c]) => ({ name, ...c }))
      : [];
  if (!tags.length) {
    const groups = {};
    for (const name of Object.keys(atlas.frames)) {
      const tag = name.replace(/(?:_\d+|_[ab])(?:\.png)?$/, '');
      (groups[tag] ??= []).push(name);
    }
    tags = Object.entries(groups).map(([name, frames]) => ({
      name,
      frames: frames.sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true }),
      ),
    }));
  }
  const route = {};
  for (const t of tags)
    for (const [i, name] of t.frames.entries())
      route[name] = {
        clip: t.name,
        progress: t.frames.length === 1 ? 0.45 : i / (t.frames.length - 1),
      };
  bodyFrames[key] = route;
  if (kind === 'body') return;
  if (urls.has(url)) {
    const old = urls.get(url);
    if (!old.textureKeys.includes(key)) old.textureKeys.push(key);
    return;
  }
  const safe = id.replace(/[^a-zA-Z0-9_-]/g, '_');
  const contract = root + '/contracts/' + safe + '.json';
  writeFileSync(contract, JSON.stringify(atlas) + '\n');
  const r = {
    id: safe,
    textureKeys: [key],
    url,
    atlasUrl: atlasUrl ?? null,
    input: input(url),
    inputAtlas: contract,
    inline: !atlasUrl,
    origin,
    skillId,
    group,
    animations: tags,
  };
  records.push(r);
  urls.set(url, r);
}
for (const file of [
  'packages/game-data/src/skill-art.json',
  'apps/game-client/src/feedback-art.generated.json',
  'apps/game-client/src/approved-skill-assets.generated.json',
  'apps/game-client/src/m3d-feedback-art.generated.json',
  'apps/game-client/src/m3d-r3-art.generated.json',
])
  for (const a of read(file).assets)
    add({
      id: a.id,
      url: '/' + a.sheet.replace('assets/exports/', 'assets/'),
      atlasUrl: '/' + a.atlas.replace('assets/exports/', 'assets/'),
      animations: a.animations,
      origin: a.origin,
      kind: a.kind === 'character' || bodyR3.has(a.id) ? 'body' : 'vfx',
      skillId: a.skillId ?? '',
      group: 'school',
    });
for (const [id, b] of Object.entries(
  read('apps/game-client/src/chu-art.generated.json').bundles,
))
  add({
    id: 'chu_' + id,
    key: 'chu_' + id,
    url: b.url,
    frames: b.frames,
    animations: b.animations,
    origin: b.origin,
    kind: ['boss', 'base', 'disciple'].includes(id) ? 'body' : 'vfx',
    group: 'boss:chu',
  });
const wine = read('apps/game-client/src/chu-wine-art.generated.json');
add({
  id: 'chu_wine',
  url: wine.url,
  frames: wine.frames,
  animations: wine.animations,
  origin: wine.origin,
  group: 'boss:chu',
});
for (const [id, b] of Object.entries(
  read('apps/game-client/src/nam-de-art.generated.json').bundles,
))
  add({
    id: 'nd_' + id,
    key: 'nd_' + id,
    url: '/assets/nam_de/' + id + '.png',
    frames: b.frames,
    animations: b.clips,
    origin: b.origin,
    kind: id === 'boss' ? 'body' : 'vfx',
    group: 'boss:nam_de',
  });
for (const [id, b] of Object.entries(
  read('apps/game-client/src/dong-playback.json').bundles,
))
  add({
    id: 'dt_' + id,
    key: 'dt_' + id,
    url: '/assets/dong_ta/' + id + '.png',
    atlasUrl: '/assets/dong_ta/' + id + '.json',
    animations: b.clips,
    origin: b.origin,
    kind: ['dong', 'mai', 'hoang', 'actions'].includes(id) ? 'body' : 'vfx',
    group: 'boss:dong_ta',
  });
for (const [id, b] of Object.entries(
  read('apps/game-client/src/tay-doc-playback.json'),
))
  add({
    id: 'tay_' + id,
    key: 'tay:' + id,
    url: '/assets/tay_doc/' + id + '.png',
    atlasUrl: '/assets/tay_doc/' + id + '.json',
    animations: b.animations,
    origin: b.origin,
    kind: [
      'p1',
      'p2',
      'p2_extra',
      'transition',
      'newactor',
      'actions',
      'directions',
      'snake8',
    ].includes(id)
      ? 'body'
      : 'vfx',
    group: 'boss:tay_doc',
  });
for (const [id, b] of Object.entries(
  read('apps/game-client/src/kim-playback.json').bundles,
))
  add({
    id: 'kl_' + id,
    key: 'kl_' + id,
    url: '/assets/kim_luan/' + id + '.png',
    atlasUrl: '/assets/kim_luan/' + id + '.json',
    animations: b.clips,
    origin: b.origin,
    kind: /base|actions|elephant/.test(id) ? 'body' : 'vfx',
    group: 'boss:kim_luan',
  });
for (const id of [
  'boss_locomotion',
  'boss_basics',
  'boss_thrust_vertical',
  'boss_casts',
  'minion_infantry',
  'minion_archer',
  'vfx_basics',
  'vfx_stomp',
  'vfx_volcano',
  'vfx_meteor',
  'vfx_meteor_safe',
  'vfx_lava_lane',
  'vfx_lava_lane_v03',
  'vfx_arrows',
])
  add({
    id: 'hl_' + id,
    key: 'hl_' + id,
    url: '/assets/bosses/hoan_nhan_hong_liet_v01/' + id + '.png',
    atlasUrl: '/assets/bosses/hoan_nhan_hong_liet_v01/' + id + '.json',
    kind: /boss_|minion_/.test(id) ? 'body' : 'vfx',
    group: 'boss:hong_liet',
  });
const bac = read(
  'apps/game-client/public/assets/bac-cai-preview/manifest.json',
);
for (const id of [
  'boss_bac_cai',
  'bac_cai_beam_v03',
  'bac_cai_staff',
  'bac_cai_dragon_palms',
  'bac_cai_ultimate',
  'bac_cai_shared',
  'bac_cai_rework_character',
  'bac_cai_black_dog',
  'bac_cai_rework_vfx',
]) {
  const b = bac.assets.find((a) => a.id === id);
  if (!b) throw Error('Missing Bac metadata ' + id);
  add({
    id,
    key: id,
    url: '/assets/bac-cai-preview/' + id + '.png',
    atlasUrl: '/assets/bac-cai-preview/' + id + '.json',
    animations: b.animations,
    origin: b.origin,
    kind: [
      'boss_bac_cai',
      'bac_cai_rework_character',
      'bac_cai_black_dog',
    ].includes(id)
      ? 'body'
      : 'vfx',
    group: 'boss:bac_cai',
  });
}
for (const id of ['body', 'effects'])
  add({
    id: 'vtd_' + id,
    key: 'vtd-' + id,
    url: '/assets/vuong-trung-duong/' + id + '.png',
    atlasUrl: '/assets/vuong-trung-duong/' + id + '.json',
    kind: id === 'body' ? 'body' : 'vfx',
    group: 'boss:vuong',
  });
for (const f of read('apps/game-client/public/assets/co_mo/pack.json').co_mo
  .files)
  if (f.type === 'atlas')
    add({
      id: f.key,
      key: f.key,
      url: f.textureURL,
      atlasUrl: f.atlasURL,
      kind: /boss_|summon_/.test(f.key) ? 'body' : 'vfx',
      group: 'boss:ly_mac_sau',
    });
add({
  id: 'co_mo_original_fx',
  url: '/assets/co_mo/co_mo_fx.png',
  atlasUrl: '/assets/co_mo/co_mo_fx.json',
  group: 'boss:ly_mac_sau',
});
const wave = read(
  'apps/game-client/src/wave-boss-feedback-art.generated.json',
).bundles;
for (const id of [
  'nam_de_ring',
  'tay_doc_cloud_v2',
  'tay_doc_impact',
  'snake_bolt',
  'poison_bolt',
  'gold_bolt',
  'spotlight',
]) {
  const b = wave[id];
  add({
    id: 'wave_' + id,
    key: b.texture,
    url: '/assets/wave-boss-feedback/' + id + '.png',
    atlasUrl: '/assets/wave-boss-feedback/' + id + '.json',
    animations: b.clips,
    origin: b.origin,
    group: 'boss:wave',
  });
}
writeFileSync(
  root + '/components.json',
  JSON.stringify(records, null, 2) + '\n',
);
writeFileSync(
  root + '/body-frame-routes.json',
  JSON.stringify(bodyFrames, null, 2) + '\n',
);
console.log(
  'V3 collected',
  records.length,
  'FX contracts,',
  Object.keys(bodyFrames).length,
  'runtime texture routes',
);
