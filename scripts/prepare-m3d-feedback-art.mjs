import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { copyIfChanged, writeIfChanged } from './asset-files.mjs';

const root = new URL('../', import.meta.url);
const read = (p) => JSON.parse(readFileSync(new URL(p, root), 'utf8'));
const sha = (p) =>
  createHash('sha256')
    .update(readFileSync(new URL(p, root)))
    .digest('hex');
const base = 'assets/m3d-feedback-visual/';

/** Retained exports only. Approval selection is narrower than its protected containers. */
export function prepareM3dFeedbackArt() {
  const approval = read(base + 'director_approval_r2.json');
  const lock = read(base + 'approved_visual_r2.lock.json');
  if (
    !approval.visualApproved ||
    !approval.directorApproved ||
    approval.lockSha256 !== sha(base + 'approved_visual_r2.lock.json')
  )
    throw Error('Missing or changed M3D r2 approval');
  for (const [file, hash] of Object.entries(lock.files))
    if (sha(file) !== hash)
      throw Error('Approved M3D r2 bytes changed: ' + file);
  const manifest = read(base + 'manifest.json');
  copyIfChanged(
    new URL(base + 'exported/m3d_dash_icon/frames/dash_icon_0.png', root),
    new URL(
      'apps/game-client/public/assets/m3d_feedback/dash_icon_frame.png',
      root,
    ),
  );
  const validation = read(base + 'previews/validation.json');
  const assets = lock.components.map((selection) => {
    const c = manifest.components.find((c) => c.id === selection.id);
    if (!c) throw Error('Missing M3D component ' + selection.id);
    const metadata = read(c.sheet.replace(/\.png$/, '.animations.json'));
    for (const file of [c.sheet, c.atlas])
      copyIfChanged(
        new URL(file, root),
        new URL(
          'apps/game-client/public/assets/m3d_feedback/' +
            file.split('/').at(-1),
          root,
        ),
      );
    const animations = selection.approvedTags.map((s) => {
      const a = metadata.animations.find((a) => a.name === s.name);
      if (!a || s.frames.some((f) => !a.frames.includes(f)))
        throw Error('Invalid selected M3D tag ' + s.name);
      const durations = s.frames.map(
        (f) => a.frameDurationsMs[a.frames.indexOf(f)],
      );
      const bounds = validation.components.find(
        (v) => v.id === c.id,
      )?.frameBounds;
      const [px, py] = metadata.pivot;
      const [ox, oy] = a.placementOffsetFromFeet ?? [0, 0];
      const forwardExtent = Math.max(
        0,
        ...s.frames.map((f) => {
          const b = bounds?.[f];
          if (!b) return 0;
          return a.direction === 'right'
            ? b[2] - px + ox
            : a.direction === 'left'
              ? px - b[0] - ox
              : a.direction === 'down'
                ? (b[3] - py + oy) / 0.65
                : (py - b[1] - oy) / 0.65;
        }),
      );
      return {
        ...a,
        frames: s.frames,
        frameDurationsMs: durations,
        forwardExtent,
        durationMsTotal: durations.reduce((n, t) => n + t, 0),
        frameRate: 1000,
        repeat: a.loop ? -1 : 0,
        origin: a.origin ?? metadata.origin,
        frameDimensions: metadata.frameDimensions,
        stage: a.phase,
        placement: 'world',
        effectPlacementOffset: a.placementOffsetFromFeet ?? [0, 0],
      };
    });
    return {
      id: c.id,
      skillId: metadata.mapping[0],
      kind: metadata.role === 'character' ? 'character' : 'vfx',
      sheet: 'assets/m3d_feedback/' + c.sheet.split('/').at(-1),
      atlas: 'assets/m3d_feedback/' + c.atlas.split('/').at(-1),
      origin: metadata.origin,
      frameDimensions: metadata.frameDimensions,
      animations,
    };
  });
  const support = read(base + 'previews/support/manifest.json');
  for (const selected of lock.retainedActorTags) {
    const c = support.components.find((c) => c.id === selected.id);
    const atlas = read(base + c.atlas);
    const frame = Object.values(atlas.frames)[0].sourceSize;
    const origin = [c.pivot[0] / frame.w, c.pivot[1] / frame.h];
    for (const file of [c.sheet, c.atlas])
      copyIfChanged(
        new URL(base + file, root),
        new URL(
          'apps/game-client/public/assets/m3d_feedback/retained_' +
            file.split('/').at(-1),
          root,
        ),
      );
    assets.push({
      id: 'r2_' + c.id,
      skillId: '',
      kind: 'character',
      sheet: 'assets/m3d_feedback/retained_' + c.sheet.split('/').at(-1),
      atlas: 'assets/m3d_feedback/retained_' + c.atlas.split('/').at(-1),
      origin,
      frameDimensions: [frame.w, frame.h],
      animations: c.animations
        .filter((a) => selected.tags.includes(a.name))
        .map((a) => ({
          ...a,
          origin,
          frameDimensions: [frame.w, frame.h],
          direction: a.name.split('_').at(-1),
          frameDurationsMs:
            a.frameDurationsMs ?? a.frames.map(() => 1000 / a.frameRate),
          durationMsTotal: (
            a.frameDurationsMs ?? a.frames.map(() => 1000 / a.frameRate)
          ).reduce((n, t) => n + t, 0),
          frameRate: 1000,
          repeat: a.loop ? -1 : 0,
          effectPlacementOffset: [0, 0],
          placement: 'world',
          stage: 'cast',
        })),
    });
  }
  writeIfChanged(
    new URL('apps/game-client/src/m3d-feedback-art.generated.json', root),
    JSON.stringify(
      { revision: 2, runtimeDirectorApproved: false, assets },
      null,
      2,
    ) + '\n',
  );
  return assets;
}
