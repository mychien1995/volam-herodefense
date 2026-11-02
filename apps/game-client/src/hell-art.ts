import Phaser from 'phaser';
import type { DesertManifest } from './desert-art.js';
export const isHellZone = (zone: string) =>
  zone === 'hell_shared' || /^hell_private_.+/.test(zone);
export function hellCreepArt(
  scene: Phaser.Scene,
  archetype: string | undefined,
  zone: string,
) {
  if (!isHellZone(zone)) return undefined;
  const asset = (
    scene.cache.json.get('hell_manifest') as DesertManifest
  ).assets.find((a) => a.archetypeId === archetype);
  if (!asset) throw Error(`Unknown authoritative Hell creep: ${archetype}`);
  return asset;
}
export function preloadHellArt(scene: Phaser.Scene) {
  scene.load.pack('hell_pack', '/assets/hell/pack.json');
  scene.load.image('hell_terrain', '/assets/hell/terrain.png');
  scene.load.atlas(
    'hell_scenery',
    '/assets/hell/scenery.png',
    '/assets/hell/scenery.json',
  );
  scene.load.tilemapTiledJSON('creep_hell', '/assets/creep_hell.tmj');
}
export function registerHellArt(scene: Phaser.Scene) {
  const m = scene.cache.json.get('hell_manifest') as DesertManifest;
  for (const a of m.assets) {
    scene.textures.get(a.id).setFilter(Phaser.Textures.FilterMode.NEAREST);
    for (const tag of a.animations) {
      const key = `${a.id}:${tag.state}:${tag.direction}`;
      for (const frame of tag.frames)
        if (!scene.textures.get(a.id).has(frame))
          throw Error(`Missing Hell frame ${a.id}/${frame}`);
      if (!scene.anims.exists(key))
        scene.anims.create({
          key,
          frames: tag.frames.map((frame, i) => ({
            key: a.id,
            frame,
            duration: tag.durations![i]!,
          })),
          frameRate: tag.frameRate,
          repeat: tag.repeat,
        });
    }
  }
  scene.textures.get('hell_fx').setFilter(Phaser.Textures.FilterMode.NEAREST);
  for (const e of m.effects)
    if (!scene.anims.exists(e.id))
      scene.anims.create({
        key: e.id,
        frames: e.frames.map((frame) => ({ key: 'hell_fx', frame })),
        frameRate: e.frameRate,
        repeat: e.repeat ?? 0,
      });
}
/** Only contact feedback for the existing authoritative generic melee hit. */
export function hellStrikeEffect(
  archetype: string,
  kind: string,
  ability: string,
) {
  if (kind !== 'hit' || ability !== 'creep_strike') return undefined;
  const contact: Record<string, string> = {
    hell_xich_quy: 'hell_crimson_slash',
    hell_dia_nguc_khuyen: 'hell_fiery_bite',
    hell_dung_nham_linh: 'hell_lava_impact',
    hell_hac_viem_phap_su: 'hell_violet_black_impact',
    hell_hac_dien_nguu_ma: 'hell_heavy_impact',
    hell_dung_nham_cu_nhan: 'hell_stone_fragments',
  };
  return contact[archetype];
}
