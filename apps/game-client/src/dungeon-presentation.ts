import { createKimArena } from './kim-luan-art.js';
import { createChuArena } from './chu-presentation.js';
import { createHongLietArena } from './hong-liet-art.js';
import Phaser from 'phaser';
import { creepDungeon, desertDungeon, beachDungeon } from '@volam/game-data';
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
/** Presentation of shared map objects; collision remains server-owned. */
export function createCreepDungeonArt(
  scene: Phaser.Scene,
  destination = 'forest',
): Phaser.GameObjects.Image[] {
  if (destination === 'chu_ba_thong') return createChuArena(scene);
  if (destination === 'hong_liet') return createHongLietArena(scene);
  if (destination === 'kim_luan') return createKimArena(scene);
  if (destination === 'desert' || destination === 'sea')
    return createAtlasDungeonArt(scene, destination);
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
    .setName('dungeon-exit');
  scene.add
    .text(portal.x, portal.y + 5, 'Lối Ra · Về đấu trường', {
      fontFamily: 'Segoe UI',
      fontSize: '10px',
      color: '#e2f4ee',
      backgroundColor: '#25372b',
      padding: { x: 4, y: 2 },
    })
    .setOrigin(0.5, 0)
    .setDepth(portal.y + 0.2);
  return trees;
}

function createAtlasDungeonArt(
  scene: Phaser.Scene,
  destination: string,
): Phaser.GameObjects.Image[] {
  const beach = destination === 'sea';
  const prefix = beach ? 'beach' : 'desert';
  const dungeon = beach ? beachDungeon : desertDungeon;
  for (const key of [`${prefix}_terrain`, `${prefix}_scenery`])
    scene.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
  const map = scene.make.tilemap({ key: `creep_${prefix}` });
  const tiles = map.addTilesetImage(
    `${prefix}_terrain`,
    `${prefix}_terrain`,
    32,
    32,
    0,
    0,
  );
  if (!tiles) throw new Error('Missing desert terrain.');
  const names = beach
    ? ['ground', 'shoreline']
    : ['ground', 'paving', 'details'];
  const waterTiles: Array<{
    tile: Phaser.Tilemaps.Tile;
    frames: number[];
    offset: number;
  }> = [];
  const waterMetadata = beach ? thisWaterMetadata(scene) : [];
  for (const [i, name] of names.entries()) {
    const layer = map.createLayer(name, tiles);
    if (!layer) throw new Error(`Missing desert layer: ${name}`);
    layer.setDepth(-10000 + i).setName(`${prefix}:layer:${name}`);
    if (beach && name === 'ground')
      layer.forEachTile((tile) => {
        const index = tile.index - 1;
        for (const sequence of waterMetadata) {
          const frames = sequence.animation.map((frame) => frame.tileid);
          const offset = frames.indexOf(index);
          if (offset >= 0) waterTiles.push({ tile, frames, offset });
        }
      });
  }
  if (beach) {
    let step = 0;
    scene.registry.set('beachWaterPhases', [0]);
    scene.time.addEvent({
      delay: waterMetadata[0]!.animation[0]!.duration,
      loop: true,
      callback: () => {
        step = (step + 1) % 4;
        for (const { tile, frames, offset } of waterTiles)
          tile.index = frames[(offset + step) % frames.length]! + 1;
        const phases = scene.registry.get('beachWaterPhases') as number[];
        if (!phases.includes(step)) phases.push(step);
      },
    });
  }
  const manifest = scene.cache.json.get(`${prefix}_manifest`) as DesertManifest;
  const foreground: Phaser.GameObjects.Image[] = [];
  const place = (name: string, x: number, y: number, ground = false) => {
    const metadata = manifest.scenery.find((p) => p.id === name);
    if (!metadata) throw new Error(`Missing desert scenery: ${name}`);
    return scene.add
      .image(x, y, `${prefix}_scenery`, name)
      .setOrigin(
        metadata.pivot[0]! / metadata.size[0]!,
        metadata.pivot[1]! / metadata.size[1]!,
      )
      .setDepth(ground ? -9000 : y)
      .setName(`${prefix}:${name}`);
  };
  for (const marker of map.getObjectLayer('scenery')?.objects ?? []) {
    const ground = marker.properties?.some(
      (p: { name: string; value: unknown }) =>
        p.name === 'renderLayer' && p.value === 'ground',
    );
    const image = place(marker.name, marker.x ?? 0, marker.y ?? 0, ground);
    if (
      [
        'dead_tree',
        'abandoned_temple',
        'ruined_gateway',
        'palm_tall',
        'palm_broad',
        'shipwreck_mast',
      ].includes(marker.name)
    )
      foreground.push(image);
  }
  const p = dungeon.exit;
  place('dungeon_exit_portal', p.x, p.y).setName('dungeon-exit');
  scene.add
    .text(p.x, p.y + 5, 'Lối Ra · Về đấu trường', {
      fontFamily: 'Segoe UI',
      fontSize: '10px',
      color: '#e2f4ee',
      backgroundColor: '#49351f',
      padding: { x: 4, y: 2 },
    })
    .setOrigin(0.5, 0)
    .setDepth(p.y + 0.2);
  return foreground;
}
function thisWaterMetadata(
  scene: Phaser.Scene,
): Array<{ animation: Array<{ tileid: number; duration: number }> }> {
  const data = scene.cache.json.get('beach_terrain_metadata') as {
    animations: Array<{
      animation: Array<{ tileid: number; duration: number }>;
    }>;
  };
  const duration = data.animations[0]?.animation[0]?.duration;
  if (
    !duration ||
    !data.animations.every(
      (a) =>
        a.animation.length === 4 &&
        a.animation.every((f) => f.duration === duration),
    )
  )
    throw Error('Invalid authored Beach water animation metadata.');
  return data.animations;
}
