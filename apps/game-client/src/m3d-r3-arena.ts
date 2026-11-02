import type Phaser from 'phaser';
const key = 'm3d_r3_arena_scenery';
const replacements: Record<
  string,
  Record<string, readonly [string, number]>
> = {
  hong_liet: {
    command_tent: ['hl_command', 320],
    yurt: ['hl_yurt', 165],
    soldier_tent: ['hl_yurt', 165],
    military_gate: ['hl_gate', 268],
    watchtower: ['hl_tower', 151],
    military_drum: ['hl_drum', 90],
  },
  co_mo: {
    male_founder_statue: ['cm_male', 100],
    female_founder_statue: ['cm_female', 96],
    altar: ['cm_altar', 101],
    jade_lantern: ['cm_lantern', 46],
    tomb_school_arch: ['cm_gate', 104],
  },
  kim_luan: {
    wall_horizontal: ['kl_wall_h', 207],
    gatehouse: ['kl_gate', 253],
    watchtower: ['kl_tower', 145],
    wall_vertical: ['kl_wall_v', 96],
    barracks: ['kl_barracks', 213],
    banners: ['kl_banner', 90],
  },
};
export function preloadR3Arena(scene: Phaser.Scene): void {
  scene.load.atlas(
    key,
    '/assets/m3d_r3/arena_scenery.png',
    '/assets/m3d_r3/arena_scenery.json',
  );
}
/** Independent authored transparent props on retained Tiled layers; simulation owns collision. */
export function replaceR3ArenaProp(
  image: Phaser.GameObjects.Image,
  zone: string,
  name: string,
  scale: number,
): void {
  const replacement = replacements[zone]?.[name];
  if (!replacement) return;
  image
    .setTexture(key, replacement[0])
    .setOrigin(0.5, 1)
    .setScale((replacement[1] / image.width) * scale)
    .setName(image.name + ':r3');
}
