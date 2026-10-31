import Phaser from 'phaser';
import { creepDungeon, desertDungeon } from '@volam/game-data';
import type { DesertManifest } from './desert-art.js';

/** Dungeon-only assets use the same PNG/hash-atlas and Tiled pipeline as arena. */
export function preloadBambooForestArt(scene: Phaser.Scene): void {
  scene.load.image('bamboo_terrain', '/assets/bamboo_forest/terrain.png');
  scene.load.atlas(
    'bamboo_scenery',
    '/assets/bamboo_forest/scenery.png',
    '/assets/bamboo_forest/scenery.json',
  );
}
function clickOnCanvas(
  pointer: Phaser.Input.Pointer,
  action: () => void,
): void {
  if (pointer.event.target instanceof HTMLCanvasElement) action();
}

/** Presentation of shared map objects; collision remains server-owned. */
export function createCreepDungeonArt(
  scene: Phaser.Scene,
  exit: () => void,
  destination = 'forest',
): Phaser.GameObjects.Image[] {
  if (destination === 'desert') return createDesertArt(scene, exit);
  for (const key of ['bamboo_terrain', 'bamboo_scenery'])
    scene.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
  const map = scene.make.tilemap({ key: 'creep_forest' });
  const tiles = map.addTilesetImage(
    'bamboo_terrain',
    'bamboo_terrain',
    32,
    32,
    0,
    0,
  );
  if (!tiles) throw new Error('Missing Bamboo Forest terrain.');
  for (const [i, name] of ['ground', 'paving', 'details'].entries()) {
    const layer = map.createLayer(name, tiles);
    if (!layer) throw new Error(`Missing Bamboo Forest layer: ${name}`);
    layer.setDepth(-10000 + i).setName(`bamboo:layer:${name}`);
  }
  const trees: Phaser.GameObjects.Image[] = [];
  for (const marker of map.getObjectLayer('scenery')?.objects ?? []) {
    if (!scene.textures.get('bamboo_scenery').has(marker.name))
      throw new Error(`Missing Bamboo Forest frame: ${marker.name}`);
    const image = scene.add.image(
      marker.x ?? 0,
      marker.y ?? 0,
      'bamboo_scenery',
      marker.name,
    );
    const ground = marker.properties?.some(
      (p: { name: string; value: unknown }) =>
        p.name === 'renderLayer' && p.value === 'ground',
    );
    image
      .setOrigin(0.5, (image.height - 4) / image.height)
      .setDepth(ground ? -9000 : image.y)
      .setName(`bamboo:${marker.name}`);
    if (
      marker.name.startsWith('bamboo_') &&
      marker.name !== 'bamboo_fence' &&
      marker.name !== 'bamboo_gate'
    )
      trees.push(image);
  }
  const portal = creepDungeon.exit;
  const arch = scene.add.image(
    portal.x,
    portal.y,
    'bamboo_scenery',
    'exit_portal',
  );
  arch
    .setOrigin(0.5, (arch.height - 4) / arch.height)
    .setDepth(portal.y)
    .setName('dungeon-exit')
    .setInteractive({ useHandCursor: true })
    .on('pointerup', (p: Phaser.Input.Pointer) => clickOnCanvas(p, exit));
  scene.add
    .text(portal.x, portal.y + 5, 'Lối Ra · Về đấu trường', {
      fontFamily: 'Segoe UI',
      fontSize: '10px',
      color: '#e2f4ee',
      backgroundColor: '#25372b',
      padding: { x: 4, y: 2 },
    })
    .setOrigin(0.5, 0)
    .setDepth(portal.y + 0.2)
    .setInteractive({ useHandCursor: true })
    .on('pointerup', (p: Phaser.Input.Pointer) => clickOnCanvas(p, exit));
  return trees;
}

function createDesertArt(
  scene: Phaser.Scene,
  exit: () => void,
): Phaser.GameObjects.Image[] {
  for (const key of ['desert_terrain', 'desert_scenery'])
    scene.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
  const map = scene.make.tilemap({ key: 'creep_desert' });
  const tiles = map.addTilesetImage(
    'desert_terrain',
    'desert_terrain',
    32,
    32,
    0,
    0,
  );
  if (!tiles) throw new Error('Missing desert terrain.');
  for (const [i, name] of ['ground', 'paving', 'details'].entries()) {
    const layer = map.createLayer(name, tiles);
    if (!layer) throw new Error(`Missing desert layer: ${name}`);
    layer.setDepth(-10000 + i).setName(`desert:layer:${name}`);
  }
  const manifest = scene.cache.json.get('desert_manifest') as DesertManifest;
  const foreground: Phaser.GameObjects.Image[] = [];
  const place = (name: string, x: number, y: number, ground = false) => {
    const metadata = manifest.scenery.find((p) => p.id === name);
    if (!metadata) throw new Error(`Missing desert scenery: ${name}`);
    return scene.add
      .image(x, y, 'desert_scenery', name)
      .setOrigin(
        metadata.pivot[0]! / metadata.size[0]!,
        metadata.pivot[1]! / metadata.size[1]!,
      )
      .setDepth(ground ? -9000 : y)
      .setName(`desert:${name}`);
  };
  for (const marker of map.getObjectLayer('scenery')?.objects ?? []) {
    const ground = marker.properties?.some(
      (p: { name: string; value: unknown }) =>
        p.name === 'renderLayer' && p.value === 'ground',
    );
    const image = place(marker.name, marker.x ?? 0, marker.y ?? 0, ground);
    if (
      ['dead_tree', 'abandoned_temple', 'ruined_gateway'].includes(marker.name)
    )
      foreground.push(image);
  }
  const p = desertDungeon.exit;
  place('dungeon_exit_portal', p.x, p.y)
    .setName('dungeon-exit')
    .setInteractive({ useHandCursor: true })
    .on('pointerup', (pointer: Phaser.Input.Pointer) =>
      clickOnCanvas(pointer, exit),
    );
  scene.add
    .text(p.x, p.y + 5, 'Lối Ra · Về đấu trường', {
      fontFamily: 'Segoe UI',
      fontSize: '10px',
      color: '#e2f4ee',
      backgroundColor: '#49351f',
      padding: { x: 4, y: 2 },
    })
    .setOrigin(0.5, 0)
    .setDepth(p.y + 0.2)
    .setInteractive({ useHandCursor: true })
    .on('pointerup', (pointer: Phaser.Input.Pointer) =>
      clickOnCanvas(pointer, exit),
    );
  return foreground;
}
