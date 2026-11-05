import Phaser from 'phaser';
import { arena, dungeonForZone } from '@volam/game-data';

/** Dress unchanged authoritative map footprints with the approved new raster art. */
export function createRenovationWorld(
  scene: Phaser.Scene,
  zone: string,
): Phaser.GameObjects.Image[] {
  const map = zone === 'arena' ? arena : dungeonForZone(zone);
  const id = zone === 'arena' ? 'arena' : dungeonForZone(zone).id;
  const ground = scene.add
    .image(map.width / 2, map.height / 2, 'renovated-ground-' + id)
    .setDepth(-10000)
    .setName(id === 'arena' ? 'arena:ground' : 'renovation:ground:' + id)
    .setData('renovation-world', true);
  // Decorative overscan fills the viewport on maps smaller than the native canvas.
  const resize = () => {
    const width = Math.max(map.width, scene.scale.width),
      height = Math.max(map.height, scene.scale.height);
    ground
      .setPosition(width / 2, height / 2)
      .setScale(Math.max(width / ground.width, height / ground.height));
  };
  resize();
  const foreground: Phaser.GameObjects.Image[] = [];
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
      .setScale(scale)
      .setDepth(y)
      .setName(name)
      .setData('renovation-world', true);
    foreground.push(image);
    return image;
  };
  if (id === 'arena') {
    prop(4, 800, 576, 1, 'art01:statue_male');
    for (const tree of arena.scenery)
      prop(
        tree.name === 'tree_east' ? 1 : 0,
        tree.x,
        tree.y,
        1,
        'renovation:tree:' + tree.name,
      );
    for (const [x, y] of [
      [350, 530],
      [1250, 500],
      [350, 940],
      [1250, 1000],
    ])
      prop(5, x!, y!, 0.8);
    for (const [x, y] of [
      [530, 530],
      [1060, 530],
      [570, 900],
      [1040, 900],
    ])
      prop(2, x!, y!, 0.7);
    for (const [x, y] of [
      [420, 730],
      [1180, 730],
    ])
      prop(3, x!, y!, 0.9);
    for (const [key, x, y] of [
      ['merchant', 520, 420],
      ['portal', 1100, 420],
    ] as const)
      scene.add
        .image(x, y, 'renovated-hub-' + key)
        .setOrigin(0.5, 368 / 384)
        .setDepth(y)
        .setName('renovation:hub:' + key)
        .setData('renovation-world', true);
    // Native authored stone wall segments mark the retained north barrier.
    const wall = arena.collision.find((box) => box.width > 100)!;
    for (let x = wall.x + 65; x < wall.x + wall.width; x += 130)
      scene.add
        .image(x, wall.y + wall.height, 'renovated-prop-desert-4')
        .setOrigin(0.5, 368 / 384)
        .setScale(0.42)
        .setDepth(wall.y + wall.height)
        .setName('renovation:collision:wall')
        .setData('renovation-world', true);
  } else {
    // Each scene retains its server map, spawn, exits and collision rectangles.
    prop(0, map.width * 0.12, map.height * 0.35);
    prop(1, map.width * 0.88, map.height * 0.35);
    prop(4, map.width * 0.5, map.height * 0.25);
    prop(5, map.width * 0.88, map.height * 0.85);
    prop(2, map.width * 0.12, map.height * 0.85, 0.85);
    prop(3, map.width * 0.9, map.height * 0.65, 0.85);
    // Tiled boundaries are many adjacent scanline rectangles, not separate props.
    // Join exact neighbouring rectangles before dressing the original obstacles.
    const obstacles = map.collision.map((box) => ({ ...box }));
    let joined = true;
    while (joined) {
      joined = false;
      for (let i = 0; i < obstacles.length && !joined; i++)
        for (let j = i + 1; j < obstacles.length; j++) {
          const a = obstacles[i]!,
            b = obstacles[j]!;
          if (
            a.x === b.x &&
            a.width === b.width &&
            (a.y + a.height === b.y || b.y + b.height === a.y)
          ) {
            a.y = Math.min(a.y, b.y);
            a.height += b.height;
            obstacles.splice(j, 1);
            joined = true;
            break;
          }
          if (
            a.y === b.y &&
            a.height === b.height &&
            (a.x + a.width === b.x || b.x + b.width === a.x)
          ) {
            a.x = Math.min(a.x, b.x);
            a.width += b.width;
            obstacles.splice(j, 1);
            joined = true;
            break;
          }
        }
    }
    for (const box of obstacles) {
      if (
        box.x === 0 ||
        box.y === 0 ||
        box.x + box.width >= map.width ||
        box.y + box.height >= map.height
      )
        continue;
      const x = box.x + box.width / 2,
        y = box.y + box.height;
      const index =
        id === 'sea'
          ? 4
          : id === 'hell' || id === 'forest'
            ? 5
            : id === 'co_mo'
              ? 2
              : 4;
      prop(
        index,
        x,
        y,
        Math.min(1.2, Math.max(0.45, box.width / 170)),
        `renovation:collision:${box.x}:${box.y}`,
      );
    }
    if ('exit' in map) {
      const portal = scene.add
        .image(map.exit.x, map.exit.y, 'renovated-hub-portal')
        .setOrigin(0.5, 368 / 384)
        .setScale(0.42)
        .setDepth(map.exit.y)
        .setName('dungeon-exit')
        .setData('renovation-world', true);
      foreground.push(portal);
    }
  }
  const cleanup = () => {
    scene.scale.off('resize', resize);
    scene.events.off(Phaser.Scenes.Events.SHUTDOWN, cleanup);
  };
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, cleanup);
  scene.scale.on('resize', resize);
  // drawZone destroys objects before the scene shuts down.
  ground.once('destroy', cleanup);
  return foreground;
}
