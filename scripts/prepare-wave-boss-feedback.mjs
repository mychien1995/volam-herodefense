import { readFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { copyIfChanged, writeIfChanged } from './asset-files.mjs';
export function prepareWaveBossFeedback() {
  const root = new URL('../', import.meta.url),
    folder = 'assets/reviews/wave_boss_feedback_v01/';
  const lock = JSON.parse(
    readFileSync(
      new URL('assets/approved_wave_boss_feedback_v01.lock.json', root),
      'utf8',
    ),
  );
  for (const [name, hash] of Object.entries(lock.files))
    if (
      createHash('sha256')
        .update(readFileSync(new URL(name, root)))
        .digest('hex') !== hash
    )
      throw Error('Approved wave boss VFX changed: ' + name);
  const source = JSON.parse(
    readFileSync(new URL(folder + 'data.json', root), 'utf8'),
  );
  const ids = [
    'nam_de_ring',
    'tay_doc_cloud_v2',
    'tay_doc_impact',
    'dt_maifx',
    'dt_fan',
    'dt_fx',
    'td_fx2',
    'nd_feedback01',
    'nd_feedback02',
    'nd_palm',
  ];
  const bundles = Object.fromEntries(ids.map((id) => [id, source.bundles[id]]));
  const dest = new URL(
    'apps/game-client/public/assets/wave-boss-feedback/',
    root,
  );
  mkdirSync(dest, { recursive: true });
  for (const id of ids.slice(0, 3)) {
    const b = bundles[id];
    b.texture = 'wave_feedback:' + id;
    copyIfChanged(
      new URL(folder + 'exports/' + id + '.png', root),
      new URL(id + '.png', dest),
    );
    writeIfChanged(
      new URL(id + '.json', dest),
      JSON.stringify(
        { frames: b.frames, meta: { image: id + '.png' } },
        null,
        2,
      ) + '\n',
    );
  }
  for (const id of ids.slice(3))
    bundles[id].texture = id === 'td_fx2' ? 'tay:fx2' : id;
  const v2lock = JSON.parse(
    readFileSync(
      new URL('assets/approved_wave_boss_feedback_v02.lock.json', root),
      'utf8',
    ),
  );
  for (const [name, hash] of Object.entries(v2lock.files))
    if (
      createHash('sha256')
        .update(readFileSync(new URL(name, root)))
        .digest('hex') !== hash
    )
      throw Error('Approved v02 VFX changed: ' + name);
  const v2 = JSON.parse(
    readFileSync(
      new URL('assets/reviews/wave_boss_feedback_v02/data.json', root),
      'utf8',
    ),
  );
  for (const id of ['snake_bolt', 'poison_bolt', 'gold_bolt', 'spotlight']) {
    bundles[id] = { ...v2.bundles[id], texture: 'wave_feedback_v02:' + id };
    copyIfChanged(
      new URL(
        'assets/reviews/wave_boss_feedback_v02/exports/' + id + '.png',
        root,
      ),
      new URL(id + '.png', dest),
    );
    writeIfChanged(
      new URL(id + '.json', dest),
      JSON.stringify(
        { frames: bundles[id].frames, meta: { image: id + '.png' } },
        null,
        2,
      ) + '\n',
    );
  }
  for (const [id, texture] of Object.entries({
    bc_boss: 'boss_bac_cai',
    bc_staff: 'bac_cai_staff',
    bc_fx: 'bac_cai_rework_vfx',
  }))
    bundles[id] = { ...v2.bundles[id], texture };
  writeIfChanged(
    new URL('apps/game-client/src/wave-boss-feedback-art.generated.json', root),
    JSON.stringify({ bundles }, null, 2) + '\n',
  );
  console.info(
    'Wave boss approved feedback: exact PNGs / native-scale presentation contract',
  );
}
