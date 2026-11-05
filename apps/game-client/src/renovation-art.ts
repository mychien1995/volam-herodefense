import Phaser from 'phaser';
import raw from './renovation-art.generated.json';
import skillOverrides from './renovation-skills.generated.json';

type BodyImage = Phaser.GameObjects.Image | Phaser.GameObjects.Sprite;
import { renovatedActors } from './renovation-model.js';
export { renovationActorId, renovationHeight } from './renovation-model.js';
const definitions = new Map(renovatedActors.map((actor) => [actor.id, actor]));
export const renovationEnabled = (scene: Phaser.Scene) =>
  scene.registry.get('renovation-enabled') === true;
export function preloadRenovation(scene: Phaser.Scene): void {
  if (scene.sys.settings.key !== 'Arena') return;
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
  const skillSources = scene.registry.get('renovated-skill-sources') as
    Map<string, string> | undefined;
  const skillKeys = new Set(skillOverrides.assets.map((a) => a.id));
  const seen = scene.registry.get('renovation-observed') as
    Map<string, Set<string>> | undefined;
  return {
    skillEffects: scene.children.list
      .filter((o) => {
        const b = o as BodyImage;
        return (
          b.texture && skillKeys.has(b.texture.key) && b.visible && b.alpha > 0
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
          source:
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
            skillSources?.get(body.texture.key) ??
            (body.texture.getSourceImage() as { src?: string }).src ??
            '',
          density: body.texture.source[0]?.resolution,
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
