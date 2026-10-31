import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { writeIfChanged } from './asset-files.mjs';
const root = new URL('../', import.meta.url);
const read = (path) => JSON.parse(readFileSync(new URL(path, root), 'utf8'));
/** Adapt supplied art metadata only. Never export/regenerate or approve source artwork. */
export function prepareFeedbackV2Art() {
  const handoff = read(
    'assets/reviews/skills/m3c3_feedback_v2_batches/asset_handoff.json',
  );
  const supplied = handoff.components.map((c) => {
    for (const [path, hash] of [
      [c.source, c.sourceSha256],
      [c.sheet, c.sheetSha256],
      [c.atlas, c.atlasSha256],
      [c.metadata, c.metadataSha256],
    ]) {
      if (
        createHash('sha256')
          .update(readFileSync(new URL(path, root)))
          .digest('hex') !== hash
      )
        throw Error('M3C3 supplied art changed: ' + path);
    }
    return read(c.metadata);
  });
  for (const role of ['character', 'vfx'])
    supplied.push({
      ...read(
        'assets/exports/skills/cai-bang/cai_bang_bong_a_m3c3_feedback_v2/cai_bang_bong_combo_v2_' +
          role +
          '.animations.json',
      ),
      handoffId: 'cai_bang_bong_basic_v2',
      role: role === 'vfx' ? 'aura' : role,
    });
  execFileSync(
    'python',
    [
      '-B',
      fileURLToPath(new URL('scripts/prepare-feedback-v2-atlas.py', root)),
    ],
    { cwd: fileURLToPath(root), windowsHide: true, stdio: 'pipe' },
  );
  const assets = supplied.map((c) => {
    const atlas = read(c.atlas),
      png = readFileSync(new URL(c.sheet, root));
    return {
      ...c,
      sourceSheet: c.sheet,
      sourceAtlas: c.atlas,
      sheet: 'assets/feedback_v2_runtime/' + c.id + '.png',
      atlas: 'assets/feedback_v2_runtime/' + c.id + '.json',
      kind: c.role === 'character' ? 'character' : 'vfx',
      animations: c.animations.map((a) => {
        if (
          !a.frameDurationsMs ||
          a.frameDurationsMs.length !== a.frames.length ||
          a.frameDurationsMs.some((n) => !Number.isFinite(n) || n < 1)
        )
          throw Error('Invalid frame durations ' + c.id + ':' + a.name);
        for (const name of a.frames) {
          const f = atlas.frames[name]?.frame;
          if (
            !f ||
            f.x < 0 ||
            f.y < 0 ||
            f.x + f.w > png.readUInt32BE(16) ||
            f.y + f.h > png.readUInt32BE(20)
          )
            throw Error('Invalid supplied atlas frame ' + c.id + ':' + name);
        }
        return {
          ...a,
          frameRate: 1000,
          repeat: a.loop ? -1 : 0,
          origin: a.origin ?? c.origin,
          frameDimensions: c.frameDimensions,
          stage: a.phase ?? 'cast',
          placement: c.role === 'ground' ? 'ground' : 'world',
          effectPlacementOffset: a.placementOffsetFromFeet ??
            a.effectPlacementOffset ?? [0, 0],
        };
      }),
    };
  });
  const keys = assets.flatMap((c) =>
    c.animations.map((a) => c.id + ':' + a.name),
  );
  if (new Set(keys).size !== keys.length)
    throw Error('Duplicate feedback v2 animation key');
  writeIfChanged(
    new URL('apps/game-client/src/feedback-art.generated.json', root),
    JSON.stringify(
      {
        schemaVersion: 2,
        status: 'INTEGRATION_CANDIDATE_PENDING_DIRECTOR_RUNTIME_REVIEW',
        assets,
      },
      null,
      2,
    ) + '\n',
  );
  return {
    components: assets.length,
    tags: keys.length,
    frames: assets
      .flatMap((c) => c.animations)
      .reduce((n, a) => n + a.frames.length, 0),
  };
}
