import { preloadUnifiedBosses, presentUnifiedBoss } from './boss-unified-body.js';
import Phaser from 'phaser';
import {
  approvedBossBody,
  clipBeat,
  presentApprovedBossAction,
} from './m3d-approved-boss-body.js';
import {
  caiBangBongBeatTicks,
  type DungeonDestination,
} from '@volam/game-data';
import { setArtFilter } from './art-filter.js';
import {
  bongReviewBody,
  caiBangBongArtEnabled,
} from './bong-combo-review-art.js';
import { basicFeedbackArt } from './feedback-bindings.js';
import { feedbackTag } from './feedback-art.js';
import raw from './renovation-art.generated.json';
import skillOverrides from './renovation-skills.generated.json';
import { assets as allOverrides } from './renovation-actions.generated.json';
import feedbackV4 from './renovation-feedback.generated.json';
import { renovationFeedbackEnabled } from './renovation-policy.js';
import {
  bongPhaGiapBody,
  bongPhaGiapEffects,
} from './bong-skill-review-art.js';
import {
  preloadRenovationActions,
  presentRenovationAction,
  renovationActionSources,
} from './renovation-actions.js';
import { hanNguyetKey, hanNguyetPath } from './thien-son-rework.js';
import {
  forestCombatBody,
  nativeBongBody,
  nativeBongOrigin,
  preloadM3dNativeArt,
  preloadNativeForestArt,
} from './m3d-native-art.js';

type BodyImage = Phaser.GameObjects.Image | Phaser.GameObjects.Sprite;
import { renovatedActors } from './renovation-model.js';
export { renovationActorId, renovationHeight } from './renovation-model.js';
const definitions = new Map(renovatedActors.map((actor) => [actor.id, actor]));
const filteredTextures = new WeakSet<Phaser.Textures.Texture>();
export const renovationEnabled = (scene: Phaser.Scene) =>
  scene.registry.get('renovation-enabled') === true;
const isCreepGroup = (group: string | undefined) =>
  group === 'wave_creeps' || group === 'dungeon_creeps' || group === 'minions';

export function usesRenovatedCreepPose(
  scene: Phaser.Scene,
  id: string | undefined,
  pose: string,
): boolean {
  return (
    renovationEnabled(scene) &&
    isCreepGroup(id ? definitions.get(id)?.group : undefined) &&
    ['idle', 'walk', 'hurt', 'stun', 'cast'].includes(pose)
  );
}

export function preloadRenovation(
  scene: Phaser.Scene,
  pack: DungeonDestination | 'arena' | 'wave-bosses' | 'all' = 'all',
): void {
  if (scene.sys.settings.key !== 'Arena') return;
  const includes = (id: string) => {
    if (pack === 'all') return true;
    const actor = definitions.get(id);
    if (!actor) return false;
    if (actor.biome !== 'arena') return pack === actor.biome;
    return actor.group === 'wave_bosses' || actor.group === 'minions'
      ? pack === 'wave-bosses'
      : pack === 'arena';
  };
  preloadRenovationActions(scene, includes);
  preloadUnifiedBosses(scene, includes);
  if (pack === 'forest' || pack === 'all') preloadNativeForestArt(scene);
  if (pack === 'arena' || pack === 'all') {
    preloadM3dNativeArt(scene);
    scene.load.atlas(
      hanNguyetKey,
      hanNguyetPath + '.png',
      hanNguyetPath + '.json',
    );
    scene.load.image(
      'renovated-arena-layout',
      '/assets/renovation-v2/arena-ground.png',
    );
    for (const id of ['merchant', 'portal'])
      scene.load.image(
        'renovated-hub-' + id,
        '/assets/visual-upgrade-2/' + id + '.png',
      );
  }
  for (const actor of renovatedActors) {
    if (!includes(actor.id)) continue;
    const path = '/assets/renovation-v1/runtime/' + actor.id;
    scene.load.atlas('renovated-' + actor.id, path + '.png', path + '.json');
  }
  for (const place of raw.scenes) {
    if (pack !== 'all' && place.id !== pack) continue;
    scene.load.image('renovated-ground-' + place.id, place.ground);
    place.props.forEach((prop, index) =>
      scene.load.image(`renovated-prop-${place.id}-${index}`, prop.image),
    );
  }
}
export function registerRenovation(scene: Phaser.Scene): void {
  if (scene.sys.settings.key !== 'Arena') return;
  if (!renovationEnabled(scene)) {
    scene.registry.set('renovation-enabled', true);
    scene.registry.set('renovation-observed', new Map<string, Set<string>>());
  }
  for (const key of scene.textures.getTextureKeys()) {
    if (key !== bongPhaGiapBody && !key.startsWith('renovated-')) continue;
    const texture = scene.textures.get(key);
    if (filteredTextures.has(texture)) continue;
    setArtFilter(
      texture,
      key === bongPhaGiapBody
        ? Phaser.Textures.FilterMode.NEAREST
        : Phaser.Textures.FilterMode.LINEAR,
    );
    filteredTextures.add(texture);
  }
}
/** Only presentation: retained action cels and server phase clocks remain authoritative. */
export function presentRenovatedBody(
  scene: Phaser.Scene,
  image: BodyImage | undefined,
  id: string | undefined,
  pose: string,
  fx = 0,
  fy = 1,
  ability = '',
  clock?: { phase?: string; progress?: number; beat?: 0 | 1 | 2 },
): void {
  if (!image || !id || !renovationEnabled(scene)) return;
  const definition = definitions.get(id);
  if (!definition) return;
  const direction =
    Math.abs(fx) > Math.abs(fy)
      ? fx < 0
        ? 'left'
        : 'right'
      : fy < 0
        ? 'up'
        : 'down';
  const locomotion = pose === 'idle' || pose === 'walk';
  const boss = approvedBossBody(id);
  const defeat = boss && pose === 'death';
  const defeatedAt = defeat
    ? ((image.getData('renovation-defeat') as number | undefined) ??
      scene.time.now)
    : undefined;
  if (boss) image.setData('renovation-defeat', defeatedAt);
  const creep = isCreepGroup(definition.group);
  const reaction =
    (creep || definition.group === 'heroes' || approvedBossBody(id)) &&
    (pose === 'hurt' || pose === 'stun');
  const creepCast = creep && pose === 'cast';
  let hanNguyetFrame: string | undefined;
  if (id === 'hero_thien_son_dao' && scene.textures.exists(hanNguyetKey)) {
    const walk = `walk_${direction}_${Math.floor(scene.time.now / 105) % 3}`;
    if (
      pose === 'idle' ||
      reaction ||
      (ability === 'bach_liet_thien_kich' && pose === 'cast')
    )
      hanNguyetFrame = `idle_${direction}`;
    else if (
      pose === 'walk' ||
      (ability === 'phi_anh_tram' && (pose === 'cast' || pose === 'action'))
    )
      hanNguyetFrame = walk;
    else if (pose === 'cast' || pose === 'action' || pose === 'basic_attack') {
      const phase = clock?.phase;
      const progress =
        clock?.progress ??
        ('anims' in image ? image.anims.currentFrame?.progress : undefined) ??
        0.5;
      const cel =
        ability === 'liet_phong_dao' && phase
          ? phase === 'liet_phong_gather'
            ? 0
            : phase === 'liet_phong_gather_hold'
              ? 1
              : phase === 'liet_phong_slash'
                ? 2
                : 3
          : Math.min(
              3,
              Math.max(
                0,
                Math.floor((Number.isFinite(progress) ? progress : 0.5) * 4),
              ),
            );
      hanNguyetFrame = `attack_${direction}_${cel}`;
    }
  }
  if (hanNguyetFrame) {
    if ((locomotion || reaction) && 'anims' in image) image.anims.stop();
    image
      .setTexture(hanNguyetKey, hanNguyetFrame)
      .setOrigin(0.5, 112 / 144)
      .setScale(0.5)
      .setFlip(false, false)
      .setRotation(0);
    image.setData('renovation-action', undefined);
  } else if (locomotion || reaction || creepCast || defeat) {
    if ('anims' in image) image.anims.stop();
    const progress = Phaser.Math.Clamp(clock?.progress ?? 0, 0, 1);
    const release = clock?.phase === 'release';
    // Creep cast and hurt poses reuse native cels. The ability's authored
    // projectile/impact still plays on its own server clock.
    let cel: number | undefined;
    if (creepCast) {
      if (release && progress < 0.5) cel = 2;
      if (!release && progress >= 0.5) cel = 1;
    }
    // Trúc Xà raises its jaw before releasing venom. Use the original
    // authored mouth poses on the server's separate Phun độc clock.
    const jawTexture =
      creepCast && id === 'forest_truc_xa'
        ? forestCombatBody(scene, id, 'basic_attack')
        : undefined;
    const jawCel = release
      ? progress < 0.5
        ? 2
        : 3
      : progress >= 0.7
        ? 1
        : progress >= 0.35
          ? 0
          : undefined;
    const frame =
      pose === 'walk'
        ? `walk_${direction}_${Math.floor(scene.time.now / 110) % 4}`
        : cel === undefined
          ? `idle_${direction}_0`
          : `walk_${direction}_${cel}`;
    const recoil = creep && pose === 'hurt' ? (1 - progress) * 0.025 : 0;
    const bong = caiBangBongArtEnabled && id === 'hero_cai_bang';
    image
      .setTexture(
        bong
          ? nativeBongBody
          : jawTexture && jawCel !== undefined
            ? jawTexture
            : 'renovated-' + id,
        jawTexture && jawCel !== undefined
          ? `basic_attack_${direction}_${jawCel}`
          : frame,
      )
      .setOrigin(
        bong
          ? nativeBongOrigin[0]
          : definition.pivot[0]! / definition.canvas[0]!,
        bong
          ? nativeBongOrigin[1]
          : definition.pivot[1]! / definition.canvas[1]!,
      )
      .setScale(0.5, 0.5 - recoil)
      .setFlip(false, false)
      .setRotation(0);
    image.setData('renovation-action', undefined);
    if (defeatedAt !== undefined) {
      const progress = Math.min(1, (scene.time.now - defeatedAt) / 480);
      image
        .setRotation((direction === 'left' ? 1 : -1) * progress * 1.15)
        .setAlpha(image.alpha * (1 - 0.7 * progress));
    }
  } else if (
    pose === 'death' ||
    !presentApprovedBossAction(
      scene,
      image,
      id,
      direction,
      ability,
      clock?.beat ?? clipBeat(clock?.progress ?? 0.5),
    )
  ) {
    presentRenovationAction(scene, image, id, pose, fx, fy, ability, clock);
  }
  if (!presentUnifiedBoss(scene, image, id, pose, fx, fy, ability, clock))
    image.setData('renovation', { id, pose, direction, locomotion });
  const seen = scene.registry.get('renovation-observed') as Map<
    string,
    Set<string>
  >;
  const frames = seen.get(id) ?? new Set<string>();
  frames.add(image.texture.key + ':' + image.frame.name);
  seen.set(id, frames);
}
/** Render all four approved Bổng beats from their accepted server tick. */
export function presentBongBasicBody(
  sprite: Phaser.GameObjects.Sprite,
  stage: string | undefined,
  age: number,
  fx: number,
  fy: number,
): void {
  if (
    !caiBangBongArtEnabled ||
    !stage ||
    age < 0 ||
    age >= caiBangBongBeatTicks
  )
    return;
  const ref = basicFeedbackArt('cai_bang_bong', stage, 0)?.ref;
  if (!ref) return;
  const tag = feedbackTag({ ...ref, asset: bongReviewBody }, fx, fy);
  if (!tag) return;
  const index = Math.min(
    tag.frames.length - 1,
    Math.floor((age * tag.frames.length) / caiBangBongBeatTicks),
  );
  sprite.anims.stop();
  sprite
    .setTexture(nativeBongBody, tag.frames[index])
    .setOrigin(...nativeBongOrigin)
    .setScale(0.5)
    .setFlip(false, false)
    .setRotation(0);
}

export function inspectRenovation(scene: Phaser.Scene) {
  const actualSources = scene.registry.get('runtime-art-urls') as
    Map<string, string> | undefined;
  const skillSources = scene.registry.get('renovated-skill-sources') as
    Map<string, string> | undefined;
  const skillKeys = new Set(
    (
      [...skillOverrides.assets, ...allOverrides] as Array<{
        id: string;
        textureKeys?: string[];
      }>
    ).flatMap((a) => a.textureKeys ?? [a.id]),
  );
  const seen = scene.registry.get('renovation-observed') as
    Map<string, Set<string>> | undefined;
  return {
    skillEffects: scene.children.list
      .filter((o) => {
        const b = o as BodyImage;
        return (
          b.texture &&
          (skillKeys.has(b.texture.key) ||
            b.texture.key === bongPhaGiapEffects ||
            b.texture.key.startsWith('renovated-v4-') ||
            b.texture.key.startsWith('renovated-v5-') ||
            b.texture.key.startsWith('renovated-v6-') ||
            b.texture.key.startsWith('renovated-v7-') ||
            b.texture.key.startsWith('renovated-v8-') ||
            /^cai_bang_hang_long_v[12]$/.test(b.texture.key) ||
            b.texture.key.startsWith('v6_') ||
            b.texture.key.startsWith('vdq-') ||
            b.texture.key.startsWith('vdk-') ||
            b.texture.key.startsWith('retained_m3d_')) &&
          !b.getData('renovation') &&
          b.visible &&
          b.alpha > 0
        );
      })
      .map((o) => {
        const b = o as BodyImage;
        return {
          texture: b.texture.key,
          frame: b.frame.name,
          x: b.x,
          y: b.y,
          origin: [b.originX, b.originY],
          scale: [b.scaleX, b.scaleY],
          rotation: b.rotation,
          flipX: b.flipX,
          name: b.name,
          sourceHeading:
            b.getData('source-heading') ??
            (renovationFeedbackEnabled()
              ? (
                  feedbackV4.frameAxes as Record<
                    string,
                    Record<string, number[]>
                  >
                )[b.texture.key]?.[String(b.frame.name)]
              : undefined),
          velocity: b.getData('velocity'),
          projectileStage: b.getData('projectile-stage'),
          swordPhase: b.getData('vdk-phase'),
          shadow: b.getData('v5-shadow'),
          effect: b.getData('v6-effect') ?? b.getData('v5-effect'),
          authoredHeading: b.getData('authored-heading'),
          dragonPhase: b.getData('v7-phase'),
          staffContact: b.getData('staff-contact'),
          bounds: { width: b.getBounds().width, height: b.getBounds().height },
          source:
            actualSources?.get(b.texture.key) ??
            feedbackV4.effects.find((e) => e.key === b.texture.key)?.url ??
            skillSources?.get(b.texture.key) ??
            (b.texture.getSourceImage() as { src?: string }).src ??
            '',
        };
      }),
    enabled: renovationEnabled(scene),
    bodies: scene.children.list
      .filter((object) => object.getData('renovation'))
      .map((object) => {
        const body = object as BodyImage;
        return {
          ...body.getData('renovation'),
          name: body.name,
          texture: body.texture.key,
          source:
            renovationActionSources.get(body.texture.key) ??
            actualSources?.get(body.texture.key) ??
            skillSources?.get(body.texture.key) ??
            (body.texture.getSourceImage() as { src?: string }).src ??
            '',
          density: body.texture.source[0]?.resolution,
          effectiveDensity:
            (body.texture.source[0]?.resolution ?? 1) / Math.abs(body.scaleX),
          action: body.getData('renovation-action'),
          screen: [
            (body.x - scene.cameras.main.worldView.x) * scene.cameras.main.zoom,
            (body.y - scene.cameras.main.worldView.y) * scene.cameras.main.zoom,
          ],
          frame: body.frame.name,
          x: body.x,
          y: body.y,
          origin: [body.originX, body.originY],
          scale: [body.scaleX, body.scaleY],
          depth: body.depth,
          visible: body.visible,
        };
      }),
    observed: Object.fromEntries(
      [...(seen ?? [])].map(([id, frames]) => [id, [...frames]]),
    ),
    environment: scene.children.list
      .filter((object) => object.getData('renovation-world'))
      .map((object) => {
        const image = object as Phaser.GameObjects.Image;
        return {
          name: image.name,
          texture: image.texture.key,
          x: image.x,
          y: image.y,
          depth: image.depth,
        };
      }),
  };
}
