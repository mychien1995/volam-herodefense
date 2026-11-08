import Phaser from 'phaser';
import raw from './renovation-art.generated.json';
import skillOverrides from './renovation-skills.generated.json';
import allOverrides from './renovation-actions.generated.json';
import feedbackV4 from './renovation-feedback.generated.json';
import { renovationFeedbackEnabled } from './renovation-feedback.js';
import {
  bongPhaGiapBody,
  bongPhaGiapEffects,
} from './bong-skill-review-art.js';
import {
  preloadRenovationActions,
  presentRenovationAction,
  renovationActionSources,
} from './renovation-actions.js';

type BodyImage = Phaser.GameObjects.Image | Phaser.GameObjects.Sprite;
import { renovatedActors } from './renovation-model.js';
export { renovationActorId, renovationHeight } from './renovation-model.js';
const definitions = new Map(renovatedActors.map((actor) => [actor.id, actor]));
export const renovationEnabled = (scene: Phaser.Scene) =>
  scene.registry.get('renovation-enabled') === true;
export function preloadRenovation(scene: Phaser.Scene): void {
  if (scene.sys.settings.key !== 'Arena') return;
  preloadRenovationActions(scene);
  scene.load.image(
    'renovated-arena-layout',
    '/assets/renovation-v2/arena-ground.png',
  );
  for (const actor of renovatedActors) {
    const path = '/assets/renovation-v1/runtime/' + actor.id;
    scene.load.atlas('renovated-' + actor.id, path + '.png', path + '.json');
  }
  for (const place of raw.scenes) {
    scene.load.image('renovated-ground-' + place.id, place.ground);
    place.props.forEach((prop, index) =>
      scene.load.image(`renovated-prop-${place.id}-${index}`, prop.image),
    );
  }
  for (const id of ['merchant', 'portal'])
    scene.load.image(
      'renovated-hub-' + id,
      '/assets/visual-upgrade-2/' + id + '.png',
    );
}
export function registerRenovation(scene: Phaser.Scene): void {
  if (scene.sys.settings.key !== 'Arena') return;
  scene.registry.set('renovation-enabled', true);
  scene.registry.set('renovation-observed', new Map<string, Set<string>>());
  if (scene.textures.exists(bongPhaGiapBody))
    scene.textures
      .get(bongPhaGiapBody)
      .setFilter(Phaser.Textures.FilterMode.NEAREST);
  for (const key of scene.textures
    .getTextureKeys()
    .filter((key) => key.startsWith('renovated-')))
    scene.textures.get(key).setFilter(Phaser.Textures.FilterMode.LINEAR);
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
  clock?: { phase?: string; progress?: number },
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
  if (locomotion) {
    if ('anims' in image) image.anims.stop();
    const frame = `${pose}_${direction}_${pose === 'walk' ? Math.floor(scene.time.now / 110) % 4 : 0}`;
    image
      .setTexture('renovated-' + id, frame)
      .setOrigin(
        definition.pivot[0]! / definition.canvas[0]!,
        definition.pivot[1]! / definition.canvas[1]!,
      )
      .setScale(0.5)
      .setFlip(false, false)
      .setRotation(0);
    image.setData('renovation-action', undefined);
  } else {
    presentRenovationAction(scene, image, id, pose, fx, fy, ability, clock);
  }
  image.setData('renovation', { id, pose, direction, locomotion });
  const seen = scene.registry.get('renovation-observed') as Map<
    string,
    Set<string>
  >;
  const frames = seen.get(id) ?? new Set<string>();
  frames.add(image.texture.key + ':' + image.frame.name);
  seen.set(id, frames);
}
export function inspectRenovation(scene: Phaser.Scene) {
  const actualSources = scene.registry.get('runtime-art-urls') as
    Map<string, string> | undefined;
  const skillSources = scene.registry.get('renovated-skill-sources') as
    Map<string, string> | undefined;
  const skillKeys = new Set(
    (
      [...skillOverrides.assets, ...allOverrides.assets] as Array<{
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
