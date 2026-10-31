import Phaser from 'phaser';
import { preloadBambooForestArt } from './dungeon-presentation.js';
export const actorSheets = [
  { id: 'hero_cai_bang', folder: 'characters' },
  { id: 'hero_cai_bang_chuong', folder: 'characters' },
  { id: 'creep_outlaw', folder: 'enemies' },
] as const;
export const poses = [
  'idle',
  'walk',
  'basic_attack',
  'cast',
  'hurt',
  'death',
] as const;
export const facings = ['down', 'left', 'right', 'up'] as const;
export function heroTexture(
  basicId?: string,
): 'hero_cai_bang' | 'hero_cai_bang_chuong' {
  return basicId === 'cai_bang_chuong'
    ? 'hero_cai_bang_chuong'
    : 'hero_cai_bang';
}
export function facing(x: number, y: number): string {
  return Math.abs(x) >= Math.abs(y)
    ? x < 0
      ? 'left'
      : 'right'
    : y < 0
      ? 'up'
      : 'down';
}
export function preloadArt(scene: Phaser.Scene): void {
  preloadBambooForestArt(scene);
  scene.load.image('arena_ground_art01', '/assets/arena_v2/ground.png');
  scene.load.atlas(
    'arena_world_art01',
    '/assets/arena_art01/world.png',
    '/assets/arena_art01/world.json',
  );
  scene.load.atlas(
    'arena_garden_art01',
    '/assets/arena_art01/garden.png',
    '/assets/arena_art01/garden.json',
  );
  scene.load.atlas(
    'arena_ambient_art01',
    '/assets/arena_art01/ambient.png',
    '/assets/arena_art01/ambient.json',
  );
  for (const id of [
    'tree_jade_base',
    'tree_jade_top',
    'tree_blossom_base',
    'tree_blossom_top',
    'bridge_deck',
    'bridge_front',
    'wall',
  ])
    scene.load.image(`art01_${id}`, `/assets/arena_art01/${id}.png`);
  for (const asset of actorSheets)
    scene.load.atlas(
      asset.id,
      `/assets/${asset.folder}/${asset.id}.png`,
      `/assets/${asset.folder}/${asset.id}.json`,
    );
  for (const id of [
    'blossom',
    'merchant_stall',
    'dungeon_gate',
    'statue_study',
    'lantern',
    'bamboo',
    'courtyard_seal',
    'water',
    'bridge',
  ])
    scene.load.image(id, `/assets/presentation/${id}.png`);
  scene.load.json('art_manifest', '/assets/manifest.json');
  scene.load.tilemapTiledJSON('arena', '/assets/arena.tmj');
  scene.load.tilemapTiledJSON('creep_forest', '/assets/creep_forest.tmj');
  scene.load.image('tree', '/assets/scenery/tree.png');
  scene.load.spritesheet('terrain', '/assets/tilesets/terrain.png', {
    frameWidth: 32,
    frameHeight: 32,
  });
  scene.load.spritesheet('fire', '/assets/effects/fire.png', {
    frameWidth: 32,
    frameHeight: 32,
  });
}
interface Manifest {
  assets: Array<{
    id: string;
    status: string;
    footPivot: [number, number];
    animations?: Array<{
      state: string;
      direction: string;
      frames: string[];
      frameRate: number;
      repeat: number;
    }>;
  }>;
}
export function actorFootPivot(
  scene: Phaser.Scene,
  id: string,
): [number, number] {
  const manifest = scene.cache.json.get('art_manifest') as Manifest;
  const entry = manifest.assets.find((asset) => asset.id === id);
  if (!entry) throw new Error(`Missing actor pivot: ${id}`);
  return entry.footPivot;
}
export function registerArt(scene: Phaser.Scene): void {
  for (const id of [
    'arena_ground_art01',
    'arena_world_art01',
    'arena_garden_art01',
    'arena_ambient_art01',
    'art01_tree_jade_base',
    'art01_tree_jade_top',
    'art01_tree_blossom_base',
    'art01_tree_blossom_top',
    'art01_bridge_deck',
    'art01_bridge_front',
    'art01_wall',
  ])
    scene.textures.get(id).setFilter(Phaser.Textures.FilterMode.NEAREST);
  for (const key of ['cascade_flow', 'stream_pool_flow', 'lantern_glow']) {
    if (!scene.anims.exists(key))
      scene.anims.create({
        key,
        frames: Array.from({ length: 4 }, (_, frame) => ({
          key: 'arena_ambient_art01',
          frame: `${key}_${frame}`,
        })),
        frameRate: 6.25,
        repeat: -1,
      });
  }
  const manifest = scene.cache.json.get('art_manifest') as Manifest;
  for (const asset of actorSheets) {
    const entry = manifest.assets.find((item) => item.id === asset.id);
    if (
      !entry?.animations?.length ||
      !['placeholder', 'prototype', 'approved'].includes(entry.status)
    )
      throw new Error(`Invalid art manifest for ${asset.id}`);
    scene.textures.get(asset.id).setFilter(Phaser.Textures.FilterMode.NEAREST);
    for (const anim of entry.animations) {
      for (const frame of anim.frames)
        if (!scene.textures.get(asset.id).has(frame))
          throw new Error(`Missing ${asset.id}/${frame}`);
      scene.anims.create({
        key: `${asset.id}:${anim.state}:${anim.direction}`,
        frames: anim.frames.map((frame) => ({ key: asset.id, frame })),
        frameRate: anim.frameRate,
        repeat: anim.repeat,
      });
    }
  }
  for (const id of [
    'tree',
    'terrain',
    'fire',
    'blossom',
    'merchant_stall',
    'dungeon_gate',
    'statue_study',
    'lantern',
    'bamboo',
    'courtyard_seal',
    'water',
    'bridge',
  ])
    scene.textures.get(id).setFilter(Phaser.Textures.FilterMode.NEAREST);
  scene.anims.create({
    key: 'fire_orb',
    frames: scene.anims.generateFrameNumbers('fire', { start: 0, end: 3 }),
    frameRate: 12,
    repeat: -1,
  });
  scene.anims.create({
    key: 'fire_impact',
    frames: scene.anims.generateFrameNumbers('fire', { start: 0, end: 3 }),
    frameRate: 14,
    repeat: 0,
  });
}
