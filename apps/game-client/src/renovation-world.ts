import Phaser from 'phaser';
import { arena, dungeonForZone, renovationRocks } from '@volam/game-data';

/** Fixed original world coordinates. Raster density never changes navigation. */
export function createRenovationWorld(
  scene: Phaser.Scene,
  zone: string,
): Phaser.GameObjects.Image[] {
  const map = zone === 'arena' ? arena : dungeonForZone(zone),
    id = zone === 'arena' ? 'arena' : dungeonForZone(zone).id;
  const ground = scene.add
    .image(
      map.width / 2,
      map.height / 2,
      id === 'arena' ? 'renovated-arena-layout' : 'renovated-ground-' + id,
    )
    .setDisplaySize(map.width, map.height)
    .setDepth(-10000)
    .setName(id === 'arena' ? 'arena:ground' : 'renovation:ground:' + id)
    .setData('renovation-world', true);
  const backdrop = scene.add
    .image(map.width / 2, map.height / 2, ground.texture.key)
    .setDepth(-10001)
    .setTint(0x62735c);
  const fit = () =>
    backdrop.setDisplaySize(
      Math.max(map.width, scene.scale.width / scene.cameras.main.zoom),
      Math.max(map.height, scene.scale.height / scene.cameras.main.zoom),
    );
  fit();
  scene.scale.on('resize', fit);
  ground.once('destroy', () => {
    scene.scale.off('resize', fit);
    backdrop.destroy();
  });
  const props: Phaser.GameObjects.Image[] = [];
  const prop = (
    index: number,
    x: number,
    y: number,
    scale = 1,
    name = `renovation:${id}:prop:${index}`,
  ) => {
    const image = scene.add
      .image(x, y, `renovated-prop-${id}-${index}`)
      .setOrigin(0.5, 368 / 384)
      .setScale(scale * 0.5)
      .setDepth(y)
      .setName(name)
      .setData('renovation-world', true);
    props.push(image);
    return image;
  };
  if (id === 'arena') {
    prop(4, 800, 576, 1, 'art01:statue_male');
    prop(2, 744, 578, 0.65, 'art01:lantern:left');
    prop(2, 856, 578, 0.65, 'art01:lantern:right');
  } else {
    prop(0, map.width * 0.08, map.height * 0.24, 0.8);
    prop(1, map.width * 0.92, map.height * 0.24, 0.8);
    prop(2, map.width * 0.08, map.height * 0.84, 0.65);
    prop(3, map.width * 0.92, map.height * 0.84, 0.65);
    const rocks = renovationRocks[id];
    if (rocks)
      for (const [i, box] of rocks.entries())
        prop(
          id === 'sea' ? 4 : 5,
          box.x + box.width / 2,
          box.y + box.height,
          0.65,
          'renovation:rock:' + i,
        );
    else prop(4, map.width * 0.5, map.height * 0.25, 0.8);
    if ('exit' in map) {
      const portal = scene.add
        .image(map.exit.x, map.exit.y, 'renovated-hub-portal')
        .setOrigin(0.5, 368 / 384)
        .setScale(0.26)
        .setDepth(map.exit.y - 100)
        .setName('dungeon-exit')
        .setData('renovation-world', true);
      props.push(portal);
    }
  }
  return props;
}
