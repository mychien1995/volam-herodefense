import Phaser from 'phaser';
import raw from './renovation-actions.generated.json';
import { renovationActionCel } from './renovation-action-model.js';
type Body = Phaser.GameObjects.Image | Phaser.GameObjects.Sprite;
type Definition = {
  id: string;
  actor: string;
  key: string;
  url: string;
  atlas: string;
  canvas: number[];
  pivot: number[];
};
const bodies = raw.bodies as Definition[],
  byId = new Map(bodies.map((b) => [b.id, b]));
export const renovationActionsEnabled = () => {
  const q = new URLSearchParams(location.search);
  return (
    !['old', 'v2'].includes(q.get('renovationSkills') ?? '') &&
    q.get('runtimeArtReview') !== '1'
  );
};
export const renovationActionSources = new Map(
  bodies.map((b) => [b.key, b.url]),
);
export function preloadRenovationActions(scene: Phaser.Scene) {
  if (!renovationActionsEnabled()) return;
  for (const b of bodies) scene.load.atlas(b.key, b.url, b.atlas);
}
/** Redraw only the sampled legacy action pose. The retained animator/server owns its clock. */
export function presentRenovationAction(
  scene: Phaser.Scene,
  image: Body,
  id: string,
  pose: string,
  fx: number,
  fy: number,
  ability = '',
) {
  if (
    !renovationActionsEnabled() ||
    ['idle', 'walk', 'death', 'hurt', 'stun'].includes(pose)
  )
    return false;
  const previous = image.getData('renovation-action') as
    | {
        sourceTexture: string;
        sourceFrame: string;
        clip: string;
        progress: number;
      }
    | undefined;
  const native = image.texture.key.startsWith('renovated-action-');
  const texture =
    native && previous ? previous.sourceTexture : image.texture.key;
  const renderedFrame =
    native && previous ? previous.sourceFrame : String(image.frame.name);
  const clips = (
    raw as unknown as {
      bodyFrames?: Record<
        string,
        Record<string, { clip: string; progress: number }>
      >;
    }
  ).bodyFrames;
  const anim = 'anims' in image ? image.anims.currentFrame : undefined;
  const frame =
    anim?.textureKey === texture ? String(anim.textureFrame) : renderedFrame;
  const route = clips?.[texture]?.[frame];
  // Phaser single-cel animations may have NaN progress (index / (length - 1)).
  const progress =
    anim?.textureKey === texture && Number.isFinite(anim.progress)
      ? anim.progress
      : (route?.progress ?? previous?.progress ?? 0.45);
  const clip =
    route?.clip ??
    (native && previous
      ? previous.clip
      : (('anims' in image ? image.anims.currentAnim?.key : undefined) ??
        frame));
  if (/death|die_|hurt|hit_reaction/.test(clip)) return false;
  const cel = renovationActionCel(id, ability, clip, progress),
    definition = byId.get(cel.sheet);
  if (!definition) return false;
  let direction =
    Math.abs(fx) > Math.abs(fy)
      ? fx < 0
        ? 'left'
        : 'right'
      : fy < 0
        ? 'up'
        : 'down';
  if (
    /spin|whirl|luc_duong|bach_phien|thien_ha_vo_cau/.test(
      ability + ' ' + clip,
    ) &&
    [
      'hero_thien_son',
      'hero_thien_son_dao',
      'hero_cai_bang',
      'chu_ba_thong',
    ].includes(id) &&
    cel.phase !== 'anticipation'
  ) {
    const facings = ['right', 'down', 'left', 'up'];
    direction =
      facings[
        (facings.indexOf(direction) +
          Math.floor(Math.max(0, Math.min(0.999, progress)) * 4)) %
          4
      ]!;
  }
  const name = direction + '_' + cel.index;
  if (!scene.textures.get(definition.key).has(name))
    throw Error('Missing renovated action ' + definition.id + ':' + name);
  // Do not stop the retained AnimationState: it continues sampling anticipation,
  // contact, sustain and recovery. No cast/hit is triggered by this rendering.
  image
    .setTexture(definition.key, name)
    .setOrigin(
      definition.pivot[0]! / definition.canvas[0]!,
      definition.pivot[1]! / definition.canvas[1]!,
    )
    .setScale(0.5)
    .setFlip(false, false)
    .setRotation(0);
  image.setData('renovation-action', {
    sourceTexture: texture,
    sourceFrame: frame,
    clip,
    progress,
    ability,
    phase: cel.phase,
    body: definition.id,
  });
  return true;
}
