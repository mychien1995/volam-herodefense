import {
  createGroundSurface,
  preloadGroundSurface,
} from './m4d-ground-surface.js';
import { createArenaAmbient } from './m4d-arena-ambient.js';
import Phaser from 'phaser';
import { arenaVariants, arenaProps, type ArenaId } from '@volam/game-data';
import { createRenovationWorld } from './renovation-world.js';
import raw from './m4d-arena.generated.json';
import lotus from './m4d-lotus.generated.json';
const grounds = { dao_hoa_dao: 'dh', tuong_duong: 'td', tu_hien_trang: 'th' };
export function preloadM4dArena(scene: Phaser.Scene): void {
  preloadGroundSurface(scene);
  for (const [id, prefix] of Object.entries(grounds))
    scene.load.image('m4d-ground-' + id, `/assets/m4d/r2/${prefix}-ground.png`);
  for (const p of lotus)
    scene.load.image('m4d:' + p.id, '/assets/m4d/' + p.image);
  for (const p of raw.props)
    scene.load.image('m4d-prop-' + p.id, '/assets/m4d/' + p.image);
}
export function createM4dArena(
  scene: Phaser.Scene,
  requested: string,
): Phaser.GameObjects.Image[] {
  const id: ArenaId = Object.hasOwn(arenaVariants, requested)
    ? (requested as ArenaId)
    : 'dao_hoa_dao';
  scene.registry.set('m4d-arena', id);
  scene.textures
    .get('m4d-ground-' + id)
    .setFilter(Phaser.Textures.FilterMode.NEAREST);
  const props = createRenovationWorld(scene, 'arena', 'm4d-ground-' + id);
  createGroundSurface(scene, id);
  const add = (kind: string, x: number, y: number, scale = 1) => {
    const spec = raw.props.find((p) => p.id === kind);
    if (!spec) return;
    const image = scene.add
      .image(x, y, 'm4d-prop-' + kind)
      .setOrigin(
        spec.anchor[0]! / spec.size[0]!,
        spec.anchor[1]! / spec.size[1]!,
      )
      .setScale(spec.scale * scale)
      .setDepth(y)
      .setName(`m4d:prop:${kind}:${x}:${y}`)
      .setData('world-depth-prop', true);
    if (['war-banner', 'watchtower', 'bridge-railing'].includes(kind))
      image.setName(image.name + ':brazier');
    props.push(image);
  };
  for (const p of arenaProps[id] ?? []) add(p.kind, p.x, p.y, p.scale);
  createArenaAmbient(scene, id);
  return props;
}
