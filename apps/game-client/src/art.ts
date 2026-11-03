import { preloadWaveBossFeedback } from './wave-boss-feedback-art.js';
import { preloadTayDocArt, registerTayDocArt } from './tay-doc-art.js';
import { preloadNamDe, registerNamDe } from './nam-de-presentation.js';
import { preloadChu, registerChu } from './chu-presentation.js';
import { preloadKimArt, registerKimArt } from './kim-luan-art.js';
import { preloadDongArt, registerDongArt } from './dong-ta-art.js';
import { preloadHongLietArt, registerHongLietArt } from './hong-liet-art.js';
import Phaser from 'phaser';
import { preloadCoMo, registerCoMoEffects } from './co-mo-art.js';
import { preloadHellArt, registerHellArt } from './hell-art.js';
import {
  preloadBeachArt,
  registerBeachArt,
  type BeachManifest,
} from './beach-art.js';
import { preloadForestCreepArt, registerForestCreepArt } from './forest-art.js';
import type { ForestCreepManifest } from './forest-creeps.js';
import { forestArtNotice } from './forest-creeps.js';
import {
  preloadDesertArt,
  registerDesertArt,
  type DesertManifest,
} from './desert-art.js';
import { preloadBambooForestArt } from './dungeon-presentation.js';
import { preloadSkillArt, registerSkillArt } from './skill-vfx.js';
import type { ArenaCreepManifest } from './arena-creeps.js';
// Retained M1 prototype, not an arena production creep or finished forest art.
export const creepPlaceholderTexture = 'creep_outlaw';
export const bambooCreepArtNotice = forestArtNotice([]);
export const actorSheets = [
  { id: 'hero_cai_bang', folder: 'characters' },
  { id: 'hero_cai_bang_chuong', folder: 'characters' },
  { id: 'hero_thien_son', folder: 'characters' },
  { id: 'hero_thien_son_dao', folder: 'characters' },
  { id: 'hero_vo_dang', folder: 'characters' },
  { id: 'hero_vo_dang_kiem', folder: 'characters' },
  { id: 'hero_thieu_lam', folder: 'characters' },
  { id: 'hero_thieu_lam_dao', folder: 'characters' },
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
// Explicit art-review variant only; never sends a weapon/loadout command.
const artQuery = new URLSearchParams(location.search);
const reviewDao =
  artQuery.has('debug') && artQuery.get('thienSonWeapon') === 'dao';
const reviewKiem =
  artQuery.has('debug') && artQuery.get('voDangWeapon') === 'kiem';
const reviewThieuLamDao =
  artQuery.has('debug') && artQuery.get('thieuLamWeapon') === 'dao';
export function heroTexture(
  basicId?: string,
  schoolId?: string,
):
  | 'hero_cai_bang'
  | 'hero_cai_bang_chuong'
  | 'hero_thien_son'
  | 'hero_thien_son_dao'
  | 'hero_vo_dang'
  | 'hero_vo_dang_kiem'
  | 'hero_thieu_lam'
  | 'hero_thieu_lam_dao' {
  if (schoolId === 'thieu_lam' || basicId?.startsWith('thieu_lam_'))
    return basicId === 'thieu_lam_dao' || reviewThieuLamDao
      ? 'hero_thieu_lam_dao'
      : 'hero_thieu_lam';
  if (schoolId === 'vo_dang' || basicId?.startsWith('vo_dang_'))
    return basicId === 'vo_dang_kiem' || reviewKiem
      ? 'hero_vo_dang_kiem'
      : 'hero_vo_dang';
  if (schoolId === 'thien_son' || basicId?.startsWith('thien_son_'))
    return basicId === 'thien_son_dao' || reviewDao
      ? 'hero_thien_son_dao'
      : 'hero_thien_son';
  return basicId === 'cai_bang_chuong'
    ? 'hero_cai_bang_chuong'
    : 'hero_cai_bang';
}
export { facing } from './facing.js';
export function preloadArt(scene: Phaser.Scene): void {
  preloadWaveBossFeedback(scene);
  preloadBacCaiArt(scene);
  preloadChu(scene);
  preloadNamDe(scene);
  preloadHongLietArt(scene);
  preloadTayDocArt(scene);
  preloadKimArt(scene);
  preloadDongArt(scene);
  preloadCoMo(scene);
  preloadBeachArt(scene);
  preloadHellArt(scene);
  preloadForestCreepArt(scene);
  preloadBambooForestArt(scene);
  preloadDesertArt(scene);
  preloadSkillArt(scene);
  scene.load.pack('arena_creep_pack', '/assets/arena_creeps/pack.json');
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
  const creeps = scene.cache.json.get('arena_creeps_manifest') as
    ArenaCreepManifest | undefined;
  const entry =
    (
      scene.cache.json.get('co_mo_manifest') as DesertManifest | undefined
    )?.assets.find((a) => a.id === id) ??
    manifest.assets.find((asset) => asset.id === id) ??
    (
      scene.cache.json.get('beach_manifest') as BeachManifest | undefined
    )?.assets.find((a) => a.id === id) ??
    (
      scene.cache.json.get('hell_manifest') as DesertManifest | undefined
    )?.assets.find((a) => a.id === id) ??
    creeps?.assets.find((asset) => asset.id === id) ??
    (
      scene.cache.json.get('desert_manifest') as DesertManifest | undefined
    )?.assets.find((a) => a.id === id);
  const forest = (
    scene.cache.json.get('forest_creeps_manifest') as
      ForestCreepManifest | undefined
  )?.assets.find((a) => a.id === id);
  if (!entry && !forest) throw new Error(`Missing actor pivot: ${id}`);
  return (entry ?? forest)!.footPivot;
}
export function registerArt(scene: Phaser.Scene): void {
  registerChu(scene);
  registerNamDe(scene);
  registerHongLietArt(scene);
  registerTayDocArt(scene);
  registerKimArt(scene);
  registerDongArt(scene);
  registerDesertArt(scene, 'co_mo_manifest');
  registerCoMoEffects(scene);
  registerBeachArt(scene);
  registerHellArt(scene);
  registerForestCreepArt(scene);
  registerDesertArt(scene);
  registerSkillArt(scene);
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
  const creeps = scene.cache.json.get(
    'arena_creeps_manifest',
  ) as ArenaCreepManifest;
  for (const entry of creeps.assets) {
    scene.textures.get(entry.id).setFilter(Phaser.Textures.FilterMode.NEAREST);
    for (const anim of entry.animations) {
      const key = `${entry.id}:${anim.state}:${anim.direction}`;
      for (const frame of anim.frames)
        if (!scene.textures.get(entry.id).has(frame))
          throw new Error(`Missing ${entry.id}/${frame}`);
      if (!scene.anims.exists(key))
        scene.anims.create({
          key,
          frames: anim.frames.map((frame) => ({ key: entry.id, frame })),
          frameRate: anim.frameRate,
          repeat: anim.repeat,
        });
    }
  }
  scene.textures
    .get('arena_creep_impacts')
    .setFilter(Phaser.Textures.FilterMode.NEAREST);
  for (const effect of creeps.effects) {
    const texture = effect.texture ?? 'arena_creep_impacts';
    scene.textures.get(texture).setFilter(Phaser.Textures.FilterMode.NEAREST);
    for (const frame of effect.frames)
      if (!scene.textures.get(texture).has(frame))
        throw new Error(`Missing ${texture}/${frame}`);
    if (!scene.anims.exists(effect.id))
      scene.anims.create({
        key: effect.id,
        frames: effect.frames.map((frame) => ({
          key: texture,
          frame,
        })),
        frameRate: effect.frameRate,
        repeat: effect.repeat ?? 0,
      });
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
import { preloadBacCaiArt } from './bac-cai-art.js';
