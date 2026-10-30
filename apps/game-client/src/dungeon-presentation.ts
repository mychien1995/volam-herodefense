import Phaser from 'phaser';
import { creepDungeon, dungeonMapObjects } from '@volam/game-data';

function clickOnCanvas(
  pointer: Phaser.Input.Pointer,
  action: () => void,
): void {
  if (pointer.event.target instanceof HTMLCanvasElement) action();
}
/** M2A environment prototype: existing tile/PNG assets, no regenerated artwork. */
export function createCreepDungeonArt(
  scene: Phaser.Scene,
  exit: () => void,
): Phaser.GameObjects.Image[] {
  const map = scene.make.tilemap({ key: 'creep_forest' });
  const tiles = map.addTilesetImage('terrain', 'terrain', 32, 32, 0, 0);
  if (!tiles) throw new Error('Missing shared dungeon terrain.');
  map.createLayer('ground', tiles)?.setDepth(-10000);
  const trees: Phaser.GameObjects.Image[] = [];
  for (const marker of dungeonMapObjects.filter((o) => o.type === 'tree'))
    trees.push(
      scene.add
        .image(marker.x, marker.y, 'arena_world_art01', 'tree_jade')
        .setOrigin(0.5, 184 / 192)
        .setDepth(marker.y),
    );
  for (const [x, y] of [
    [100, 180],
    [300, 170],
    [520, 160],
    [760, 170],
    [900, 180],
    [100, 540],
    [340, 560],
    [580, 560],
    [800, 560],
  ] as const)
    scene.add
      .image(x, y, 'arena_world_art01', 'bamboo')
      .setOrigin(0.5, 184 / 192)
      .setDepth(y);
  const portal = creepDungeon.exit;
  scene.add
    .image(portal.x, portal.y, 'dungeon_gate')
    .setOrigin(0.5, 1)
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
