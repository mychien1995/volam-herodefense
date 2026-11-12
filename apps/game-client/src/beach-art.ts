import Phaser from 'phaser';
import type { ArenaCreepArt } from './arena-creeps.js';
import type { DesertManifest } from './desert-art.js';
export interface BeachManifest extends DesertManifest {}
export const isBeachZone = (zone: string) =>
  zone === 'sea_shared' || /^sea_private_.+/.test(zone);
export function beachCreepArt(
  scene: Phaser.Scene,
  archetype: string | undefined,
  zone: string,
): ArenaCreepArt | undefined {
  if (!isBeachZone(zone)) return undefined;
  const manifest = scene.cache.json.get('beach_manifest') as BeachManifest;
  const art = manifest.assets.find((a) => a.archetypeId === archetype);
  if (!art) throw Error(`Unknown authoritative Beach creep: ${archetype}`);
  return art;
}
export function preloadBeachArt(scene: Phaser.Scene): void {
  scene.load.pack('beach_pack', '/assets/beach/pack.json');
  scene.load.image('beach_terrain', '/assets/beach/terrain.png');
  scene.load.atlas(
    'beach_scenery',
    '/assets/beach/scenery.png',
    '/assets/beach/scenery.json',
  );
  scene.load.tilemapTiledJSON('creep_beach', '/assets/creep_beach.tmj');
}
export function registerBeachArt(scene: Phaser.Scene): void {
  const manifest = scene.cache.json.get('beach_manifest') as BeachManifest;
  for (const asset of manifest.assets) {
    scene.textures.get(asset.id).setFilter(Phaser.Textures.FilterMode.NEAREST);
    for (const a of asset.animations) {
      for (const frame of a.frames)
        if (!scene.textures.get(asset.id).has(frame))
          throw Error(`Missing ${asset.id}/${frame}`);
      const key = `${asset.id}:${a.state}:${a.direction}`;
      if (!scene.anims.exists(key))
        scene.anims.create({
          key,
          frames: a.frames.map((frame, i) => ({
            key: asset.id,
            frame,
            duration: a.durations![i]!,
          })),
          frameRate: a.frameRate,
          repeat: a.repeat,
        });
    }
  }
  scene.textures.get('beach_fx').setFilter(Phaser.Textures.FilterMode.NEAREST);
  for (const e of manifest.effects)
    if (!scene.anims.exists(e.id))
      scene.anims.create({
        key: e.id,
        frames: e.frames.map((frame) => ({ key: 'beach_fx', frame })),
        frameRate: e.frameRate,
        repeat: e.repeat ?? 0,
      });
}
/** Contact art for the existing server melee hit, never inferred projectile releases. */
export function beachStrikeEffect(
  archetype: string,
  kind: string,
  abilityId: string,
): string | undefined {
  if (
    kind !== 'hit' ||
    ![
      'creep_strike',
      'creep_cua_khong_lo_special',
      'creep_hai_vu_special',
    ].includes(abilityId)
  )
    return undefined;
  const contact: Record<string, string> = {
    cua_khong_lo: 'pincer_impact',
    hai_xa: 'serpent_bite',
    hai_tac: 'weapon_impact',
    hai_tac_hoa_phao: 'sand_particles',
    thuy_quy: 'spectral_impact',
    hai_vu: 'water_splash',
  };
  const effect = contact[archetype];
  return effect ? 'beach_fx:' + effect : undefined;
}
