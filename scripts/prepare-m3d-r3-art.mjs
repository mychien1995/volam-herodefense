import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { copyIfChanged, writeIfChanged } from './asset-files.mjs';
const root = new URL('../', import.meta.url);
const base = 'assets/m3d-feedback-review-r3/';
const read = (p) => JSON.parse(readFileSync(new URL(p, root), 'utf8'));
const sha = (p) =>
  createHash('sha256')
    .update(readFileSync(new URL(p, root)))
    .digest('hex');

/** Import immutable approved raster containers; never execute preview recipes as gameplay. */
export function prepareM3dR3Art() {
  const register = read(base + 'director_approval_r3.json');
  if (!register.visualApproved || register.records.length !== 3)
    throw Error('Missing r3 approval');
  const assets = [];
  for (const [folder, record] of [
    ['', 'director_approval_ca_diep_batch01.json'],
    ['batch02-pha-giap-bong/', 'director_approval_pha_giap_review3.json'],
    ['batch03-remaining/', 'director_approval_review6.json'],
  ]) {
    const approval = read(base + folder + record);
    if (
      !approval.visualApproved ||
      !approval.directorApproved ||
      sha(approval.lock) !== approval.lockSha256
    )
      throw Error('Invalid r3 approval/lock ' + record);
    const lock = read(approval.lock),
      manifest = read(base + folder + 'manifest.json');
    for (const [path, hash] of Object.entries(lock.files))
      if (sha(path) !== hash) throw Error('Locked r3 asset changed: ' + path);
    const selections =
      lock.components ??
      Object.entries(lock.selectedTags).map(([id, tags]) => ({
        id,
        approvedTags: tags.map((name) => ({ name })),
      }));
    for (const selection of selections) {
      const c = manifest.components.find((c) => c.id === selection.id);
      if (!c) throw Error('Missing selected r3 component ' + selection.id);
      const id = 'review3_' + c.id;
      const png = readFileSync(new URL(c.sheet, root));
      const atlas = read(c.atlas);
      const canvas = c.canvas ?? [png.readUInt32BE(16), png.readUInt32BE(20)];
      const pivot = c.pivot;
      if (!Array.isArray(pivot) || pivot.length !== 2)
        throw Error('Missing r3 pivot ' + id);
      const animations = selection.approvedTags.map((s) => {
        const a = c.animations.find((a) => a.name === s.name);
        if (!a) throw Error('Unselected r3 tag ' + id + ':' + s.name);
        const frames = s.frames ?? a.frames;
        for (const frame of frames)
          if (!a.frames.includes(frame) || !atlas.frames[frame])
            throw Error('Missing selected cel ' + id + ':' + frame);
        const durations = frames.map(
          (f) => a.frameDurationsMs[a.frames.indexOf(f)],
        );
        if (durations.some((d) => !Number.isFinite(d) || d <= 0))
          throw Error('Invalid authored durations ' + id);
        return {
          name: a.name,
          frames,
          frameDurationsMs: durations,
          frameRate: 1000,
          repeat: a.loop ? -1 : 0,
          loop: !!a.loop,
          direction: a.facing ?? a.direction ?? 'billboard',
          stage: a.phase,
          origin: a.origin ?? [pivot[0] / canvas[0], pivot[1] / canvas[1]],
          frameDimensions: canvas,
          placement: 'world',
          effectPlacementOffset: a.placementOffsetFromFeet ?? [0, 0],
          durationMsTotal: durations.reduce((a, b) => a + b, 0),
        };
      });
      for (const [path, extension] of [
        [c.sheet, 'png'],
        [c.atlas, 'json'],
      ])
        copyIfChanged(
          new URL(path, root),
          new URL(
            `apps/game-client/public/assets/m3d_r3/${id}.${extension}`,
            root,
          ),
        );
      assets.push({
        id,
        sourceId: c.id,
        skillId: manifest.skillId ?? '',
        kind: c.role === 'character' ? 'character' : 'vfx',
        sheet: `assets/m3d_r3/${id}.png`,
        atlas: `assets/m3d_r3/${id}.json`,
        origin: [pivot[0] / canvas[0], pivot[1] / canvas[1]],
        frameDimensions: canvas,
        animations,
      });
    }
  }
  const nailAxis = read(
    base + 'batch03-remaining/source/review6-nail-axis.json',
  ).frames;
  const pack = {
    revision: 'approved-r3-review6-production-integration',
    approval: base + 'director_approval_r3.json',
    timingAuthority:
      'Authored cel durations only; world action/projectile/area state owns cast lifetime and position.',
    assets,
    nailAxis,
  };
  writeIfChanged(
    new URL('apps/game-client/src/m3d-r3-art.generated.json', root),
    JSON.stringify(pack, null, 2) + '\n',
  );
  // Menu thumbnails are concept illustrations, never substituted for layered runtime maps.
  for (const [id, name] of [
    ['co_mo', 'ly_mac_sau'],
    ['hong_liet', 'hong_liet'],
    ['kim_luan', 'kim_luan'],
  ])
    copyIfChanged(
      new URL(
        base + `batch03-remaining/source/generated/arena_${name}.png`,
        root,
      ),
      new URL(`apps/game-client/public/assets/m3d_r3/arena_${id}.png`, root),
    );
  console.log(
    `M3D r3: ${assets.length} approved components / ${assets.reduce((n, a) => n + a.animations.length, 0)} selected tags; three immutable locks verified`,
  );
  const arenaBase = 'assets/m3d-r3-arena-production/';
  const provenance = read(arenaBase + 'provenance.json'),
    atlas = read(arenaBase + 'scenery.json');
  if (
    sha(arenaBase + provenance.source) !== provenance.sourceSha256 ||
    Object.keys(atlas.frames).length !== 16
  )
    throw Error('Invalid r3 production scenery source');
  for (const [source, target] of [
    [provenance.source, 'arena_scenery.png'],
    ['scenery.json', 'arena_scenery.json'],
  ])
    copyIfChanged(
      new URL(arenaBase + source, root),
      new URL('apps/game-client/public/assets/m3d_r3/' + target, root),
    );
}
