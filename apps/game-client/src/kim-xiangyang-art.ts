import Phaser from 'phaser';
import { kimLuanXiangyangArena } from '@volam/game-data';
import court from '../../../assets/exports/bosses/kim_luan_xiangyang_v02/xiangyang-gate-court.png?url';

const texture = 'kim-xiangyang-gate-court';

export function isKimLuanZone(zone: string): boolean {
  return zone.startsWith('kim_luan_');
}

export function preloadKimXiangyang(scene: Phaser.Scene): void {
  scene.load.image(texture, court);
}

export function drawKimXiangyang(
  scene: Phaser.Scene,
): Phaser.GameObjects.Image[] {
  const { width, height } = kimLuanXiangyangArena;
  scene.textures.get(texture).setFilter(Phaser.Textures.FilterMode.LINEAR);
  const ground = scene.add
    .image(0, 0, texture)
    .setOrigin(0, 0)
    .setDepth(-10000)
    .setName('kim_luan:xiangyang-court');
  // One scale derived from the original aspect ratio, including the gate and walls.
  ground.setScale(width / ground.width);
  if (Math.abs(ground.displayHeight - height) > 0.001)
    throw Error('Xiangyang arena raster aspect does not match the map');
  const { exit } = kimLuanXiangyangArena;
  const portal = scene.add
    .image(exit.x, exit.y, 'renovated-hub-portal')
    .setOrigin(0.5, 368 / 384)
    .setScale(0.26)
    .setDepth(exit.y - 100)
    .setName('dungeon-exit');
  return [ground, portal];
}
