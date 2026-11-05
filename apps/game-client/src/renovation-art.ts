import Phaser from 'phaser';
import raw from './renovation-art.generated.json';

type BodyImage = Phaser.GameObjects.Image | Phaser.GameObjects.Sprite;
import { renovatedActors } from './renovation-model.js';
export { renovationActorId, renovationHeight } from './renovation-model.js';
const definitions = new Map(renovatedActors.map((actor) => [actor.id, actor]));
export const renovationEnabled = (scene: Phaser.Scene) =>
  scene.registry.get('renovation-enabled') === true;
export function preloadRenovation(scene: Phaser.Scene): void {
  if (scene.sys.settings.key !== 'Arena') return;
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
      .setScale(1)
      .setFlip(false, false)
      .setRotation(0);
  } else {
    image.setScale(
      image.scaleX * definition.legacyRatio,
      image.scaleY * definition.legacyRatio,
    );
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
  const seen = scene.registry.get('renovation-observed') as
    Map<string, Set<string>> | undefined;
  return {
    enabled: renovationEnabled(scene),
    bodies: scene.children.list
      .filter((object) => object.getData('renovation'))
      .map((object) => {
        const body = object as BodyImage;
        return {
          ...body.getData('renovation'),
          name: body.name,
          texture: body.texture.key,
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
