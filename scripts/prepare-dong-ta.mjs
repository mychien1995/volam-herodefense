import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { copyIfChanged, writeIfChanged } from './asset-files.mjs';
const root = new URL('../', import.meta.url);
const read = (p) =>
  JSON.parse(readFileSync(new URL(p, root), 'utf8').replace(/^\uFEFF/, ''));
export function prepareDongTa() {
  const lock = read('assets/approved_dong_ta.lock.json'),
    approval = read(lock.approvalRecord);
  if (
    lock.status !==
      'approved_visual_design_v04_feedback_02_for_game_integration' ||
    approval.status !== lock.status
  )
    throw Error('Missing approved Đông Tà V04 inputs');
  for (const [p, hash] of Object.entries(lock.files))
    if (
      createHash('sha256')
        .update(readFileSync(new URL(p, root)))
        .digest('hex') !== hash
    )
      throw Error('Approved Đông Tà input changed: ' + p);
  const data = read('assets/reviews/bosses/dong_ta_v02/data.json'),
    bundles = {};
  let frames = 0,
    clips = 0;
  for (const [id, selection] of Object.entries(approval.selectedBundles)) {
    const b = data.bundles[id],
      chosen = b.clips.filter((c) => selection.clips.includes(c.name));
    if (chosen.length !== selection.clips.length || b.image !== selection.image)
      throw Error('Invalid Đông Tà selection: ' + id);
    const names = [...new Set(chosen.flatMap((c) => c.frames))];
    for (const name of names)
      if (!b.frames[name])
        throw Error('Missing approved frame: ' + id + ':' + name);
    copyIfChanged(
      new URL(b.image, root),
      new URL('apps/game-client/public/assets/dong_ta/' + id + '.png', root),
    );
    writeIfChanged(
      new URL('apps/game-client/public/assets/dong_ta/' + id + '.json', root),
      JSON.stringify({
        frames: Object.fromEntries(names.map((n) => [n, b.frames[n]])),
        meta: { image: id + '.png' },
      }),
    );
    bundles[id] = { origin: b.origin, clips: chosen };
    frames += names.length;
    clips += chosen.length;
  }
  const metadata = { approval: lock.status, bundles };
  writeIfChanged(
    new URL('apps/game-client/src/dong-playback.json', root),
    JSON.stringify(metadata),
  );
  writeIfChanged(
    new URL('apps/game-client/public/assets/dong_ta/playback.json', root),
    JSON.stringify(metadata),
  );
  console.info(
    `Đông Tà: ${Object.keys(lock.files).length} approved input hashes; ${clips} clips / ${frames} frames`,
  );
}
