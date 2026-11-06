import Phaser from 'phaser';
import raw from './renovation-actions.generated.json';
import revision from './renovation-revision.generated.json';
import followup from './renovation-followup.generated.json';
import { renovationFollowupEnabled } from './renovation-policy.js';
import { staffSlamCel } from './renovation-followup-model.js';
import { renovationRevisionEnabled } from './renovation-policy.js';
import { retainM3dBody } from './renovation-policy.js';
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
  extraBodies = revision.assets
    .filter((a) => a.type === 'body')
    .map((a) => ({
      ...a,
      id: 'v5:' + a.id,
      actor: a.id === 'vi_da_body' ? 'hero_thieu_lam' : 'hero_thien_son_dao',
      pivot: [200, 320],
    })),
  followupBodies = followup.assets
    .filter((a) => a.type === 'body')
    .map((a) => ({
      ...a,
      id: 'v6:' + a.id,
      actor: 'hero_cai_bang',
      pivot: [200, 320],
    })),
  byId = new Map(
    [...bodies, ...extraBodies, ...followupBodies].map((b) => [b.id, b]),
  );
export const renovationActionsEnabled = () => {
  const q = new URLSearchParams(location.search);
  return (
    !['old', 'v2'].includes(q.get('renovationSkills') ?? '') &&
    q.get('runtimeArtReview') !== '1'
  );
};
export const renovationActionSources = new Map(
  [...bodies, ...extraBodies, ...followupBodies].map((b) => [b.key, b.url]),
);
export function preloadRenovationActions(scene: Phaser.Scene) {
  if (!renovationActionsEnabled()) return;
  for (const b of bodies) scene.load.atlas(b.key, b.url, b.atlas);
  if (renovationRevisionEnabled())
    for (const b of extraBodies) scene.load.atlas(b.key, b.url, b.atlas);
  if (renovationFollowupEnabled())
    for (const b of followupBodies) scene.load.atlas(b.key, b.url, b.atlas);
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
  clock?: { phase?: string; progress?: number },
) {
  if (retainM3dBody(id, ability)) {
    image.setData('renovation-action', undefined);
    return false;
  }
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
  const native =
    image.texture.key.startsWith('renovated-action-') ||
    image.texture.key.startsWith('renovated-v5-') ||
    image.texture.key.startsWith('renovated-v6-');
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
  const sampledProgress =
    renovationRevisionEnabled() && Number.isFinite(clock?.progress)
      ? clock!.progress!
      : anim?.textureKey === texture && Number.isFinite(anim.progress)
        ? anim.progress
        : (route?.progress ?? previous?.progress ?? 0.45);
  // Event and state patches can straddle one server tick. Never address a
  // negative cel while the retained action clock catches up to its start.
  const progress = Math.max(0, Math.min(0.999, sampledProgress));
  const clip =
    (renovationRevisionEnabled() ? clock?.phase : undefined) ??
    route?.clip ??
    (native && previous
      ? previous.clip
      : (('anims' in image ? image.anims.currentAnim?.key : undefined) ??
        frame));
  if (/death|die_|hurt|hit_reaction/.test(clip)) return false;
  const cel =
      renovationFollowupEnabled() && ability === 'pha_giap_bong'
        ? {
            sheet: 'v6:staff_action',
            index: staffSlamCel(clip, progress),
            phase: 'staff-slam',
          }
        : renovationRevisionEnabled() && ability === 'bach_liet_thien_kich'
          ? {
              sheet: 'v5:bach_liet_body',
              index: Math.floor(scene.time.now / 70) % 4,
              phase: 'flurry',
            }
          : renovationRevisionEnabled() && ability === 'vi_da_quyen'
            ? {
                sheet: 'v5:vi_da_body',
                index: Math.min(3, Math.floor(progress * 4)),
                phase: 'ground-punch',
              }
            : renovationActionCel(id, ability, clip, progress),
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
    !(renovationRevisionEnabled() && ability === 'bach_liet_thien_kich') &&
    ((renovationRevisionEnabled() &&
      ability === 'thieu_lam_quyen' &&
      /roundhouse/.test(clip)) ||
      /spin|whirl|luc_duong|bach_phien|thien_ha_vo_cau/.test(
        ability + ' ' + clip,
      )) &&
    [
      'hero_thien_son',
      'hero_thien_son_dao',
      'hero_cai_bang',
      'chu_ba_thong',
      'hero_thieu_lam',
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
