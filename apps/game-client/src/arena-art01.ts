import Phaser from 'phaser';
import { arena } from '@volam/game-data';

/** Presentation only. Every blocking trunk retains its authoritative map position. */
export function createArenaArt(
  scene: Phaser.Scene,
): Phaser.GameObjects.Image[] {
  scene.add.image(0, 0, 'arena_ground_art01').setOrigin(0).setDepth(-10000).setName('arena:ground');
  const prop = (id: string, x: number, y: number) =>
    scene.add
      .image(x, y, 'arena_world_art01', id)
      .setOrigin(0.5, 184 / 192)
      .setDepth(y)
      .setName(`art01:${id}`);
  // The existing map's statue marker remains at (800,576). M1 has no solid statue.
  prop('statue_male', 800, 576);

  const trees: Phaser.GameObjects.Image[] = [];
  for (const tree of arena.scenery) {
    const id = tree.name === 'tree_east' ? 'tree_blossom' : 'tree_jade';
    // Independent base/canopy source layers share a feet pivot, not sprite-top sorting.
    scene.add
      .image(tree.x, tree.y, `art01_${id}_base`)
      .setOrigin(0.5, 184 / 192)
      .setDepth(tree.y - 0.05);
    trees.push(
      scene.add
        .image(tree.x, tree.y, `art01_${id}_top`)
        .setOrigin(0.5, 184 / 192)
        .setDepth(tree.y),
    );
  }
  const garden = (id: string, x: number, y: number) =>
    scene.add
      .image(x, y, 'arena_garden_art01', id)
      .setOrigin(0.5, 216 / 224)
      .setDepth(-9900);
  // Garden water is ornamental and shallow. No client-only water/rock collisions.
  for (const [id, x, y] of [
    ['cascade', 395, 520],
    ['stream_pool', 1210, 500],
    ['stream_pool', 390, 873],
    ['cascade', 1235, 890],
  ] as const)
    scene.add
      .sprite(x, y, 'arena_ambient_art01')
      .setOrigin(0.5, 216 / 224)
      .setDepth(-9900)
      .setName(`art01:${id}`)
      .play(`${id}_flow`);
  for (const [x, y] of [
    [404, 485],
    [1220, 465],
    [395, 825],
    [1230, 838],
  ] as const) {
    scene.add
      .image(x, y, 'art01_bridge_deck')
      .setOrigin(0.5, 216 / 224)
      .setDepth(-9800);
    scene.add
      .image(x, y, 'art01_bridge_front')
      .setOrigin(0.5, 216 / 224)
      .setDepth(y);
  }
  for (const [x, y] of [
    [335, 525],
    [520, 340],
    [1080, 330],
    [1310, 560],
    [330, 890],
    [540, 1010],
    [1080, 1020],
    [1330, 890],
  ] as const)
    prop('bamboo', x, y);
  for (const [x, y] of [
    [444, 530],
    [1150, 525],
    [452, 830],
    [1146, 835],
  ] as const)
    prop('red_banner', x, y);
  for (const [x, y] of [
    [744, 578],
    [856, 578],
    [462, 530],
    [1140, 530],
    [470, 792],
    [1145, 790],
  ] as const)
    scene.add
      .sprite(x, y, 'arena_ambient_art01')
      .setOrigin(0.5, 216 / 224)
      .setDepth(y)
      .setName('art01:lantern')
      .play('lantern_glow');
  for (const [x, y] of [
    [365, 650],
    [1230, 650],
    [425, 826],
    [1180, 837],
  ] as const)
    garden('flower_rocks', x, y);

  // Retain the existing north wall collision. Dress its exact footprint with stone,
  // rather than leaving an invisible server barrier under painted grass.
  const wall = arena.collision.find((item) => item.width > 100);
  if (wall) {
    scene.add
      .tileSprite(wall.x, wall.y, wall.width, wall.height, 'art01_wall')
      .setOrigin(0)
      .setDepth(wall.y + wall.height);
  }
  return trees;
}
