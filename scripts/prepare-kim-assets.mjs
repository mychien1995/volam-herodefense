import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { copyIfChanged, writeIfChanged } from './asset-files.mjs';
const root = new URL('../', import.meta.url),
  read = (p) => JSON.parse(readFileSync(new URL(p, root), 'utf8'));
export function prepareKimAssets() {
  const lock = read('assets/approved_kim_luan_phap_vuong.lock.json'),
    approval = read(lock.approvalRecord);
  if (
    lock.status !==
      'approved_visual_preview_feedback_02_for_phaser_integration' ||
    approval.status !== lock.status
  )
    throw Error('Missing feedback_02 Kim approval');
  for (const [p, h] of Object.entries(lock.files))
    if (
      createHash('sha256')
        .update(readFileSync(new URL(p, root)))
        .digest('hex') !== h
    )
      throw Error('Approved Kim input changed: ' + p);
  const d = read('assets/reviews/bosses/kim_luan_phap_vuong_v01/data.json');
  delete d.bundles.hero;
  const dest = 'apps/game-client/public/assets/kim_luan/';
  let frames = 0,
    clips = 0;
  for (const [id, b] of Object.entries(d.bundles)) {
    const selected = lock.selectedFrames[id];
    for (const clip of b.clips) {
      clips++;
      for (const f of clip.frames)
        if (!selected.includes(f) || !b.frames[f])
          throw Error('Unapproved Kim frame ' + id + ':' + f);
    }
    frames += selected.length;
    copyIfChanged(new URL(b.image, root), new URL(dest + id + '.png', root));
    // Filter atlas registration too: excluded candidate cels never enter the runtime texture.
    writeIfChanged(
      new URL(dest + id + '.json', root),
      JSON.stringify({
        frames: Object.fromEntries(selected.map((f) => [f, b.frames[f]])),
        meta: { image: id + '.png' },
      }),
    );
  }
  if (frames !== 184 || clips !== 53)
    throw Error('Kim playback selection changed');
  for (const [id, p] of Object.entries(d.props))
    copyIfChanged(new URL(p.image, root), new URL(dest + id + '.png', root));
  copyIfChanged(new URL(d.terrain, root), new URL(dest + 'terrain.png', root));
  const map = structuredClone(d.map);
  map.layers = map.layers
    .filter((l) => l.name !== 'collision_proposals')
    .map((l) => ({ ...l, visible: true, opacity: 1, x: 0, y: 0 }));
  writeIfChanged(new URL(dest + 'map.tmj', root), JSON.stringify(map));
  const metadata = {
    bundles: Object.fromEntries(
      Object.entries(d.bundles).map(([id, b]) => [
        id,
        { origin: b.origin, clips: b.clips },
      ]),
    ),
    props: d.props,
    stompFrames: d.stompFrames,
    approval: lock.status,
  };
  writeIfChanged(
    new URL(dest + 'playback.json', root),
    JSON.stringify(metadata),
  );
  writeIfChanged(
    new URL('packages/game-data/src/kim-map.json', root),
    JSON.stringify(d.map),
  );
  writeIfChanged(
    new URL('apps/game-client/src/kim-playback.json', root),
    JSON.stringify(metadata),
  );
  console.info(
    `Kim Luân: ${Object.keys(lock.files).length} exact approved inputs; ${frames} selected frames / ${clips} clips`,
  );
}
