import type Phaser from 'phaser';
import bong from '../../../assets/exports/cai-bang-bong-reach/bong.png?url';
import bongAtlas from '../../../assets/exports/cai-bang-bong-reach/bong.json?url';
import snake from '../../../assets/exports/m3d-sprite-continuity/forest_truc_xa.png?url';
import snakeAtlas from '../../../assets/exports/m3d-sprite-continuity/forest_truc_xa.json?url';
import spider from '../../../assets/exports/m3d-sprite-continuity/forest_doc_chu.png?url';
import spiderAtlas from '../../../assets/exports/m3d-sprite-continuity/forest_doc_chu.json?url';
import effects from '../../../assets/exports/m3d-sprite-continuity/forest_effects.png?url';
import effectsAtlas from '../../../assets/exports/m3d-sprite-continuity/forest_effects.json?url';

export const nativeBongBody = 'renovated-bong-combo-body';
export const nativeBongOrigin = [0.5, 235 / 320] as const;
export const nativeForestEffects = 'renovated-forest-combat-effects';
const forestBodies = new Map([
  ['forest_truc_xa', 'renovated-forest-truc-xa-actions'],
  ['forest_doc_chu', 'renovated-forest-doc-chu-actions'],
]);
export const forestCombatOrigin = [0.5, 224 / 256] as const;

export function preloadM3dNativeArt(scene: Phaser.Scene): void {
  scene.load.atlas(nativeBongBody, bong, bongAtlas);
  scene.load.atlas(forestBodies.get('forest_truc_xa')!, snake, snakeAtlas);
  scene.load.atlas(forestBodies.get('forest_doc_chu')!, spider, spiderAtlas);
  scene.load.atlas(nativeForestEffects, effects, effectsAtlas);
}

export function forestCombatBody(
  scene: Phaser.Scene,
  actor: string,
  state: string,
): string | undefined {
  if (state !== 'basic_attack' && state !== 'death') return;
  const texture = forestBodies.get(actor);
  return texture && scene.textures.exists(texture) ? texture : undefined;
}

export function forestCombatEffect(
  scene: Phaser.Scene,
  id: string,
): string | undefined {
  if (
    /^forest_fx:(truc_xa_|doc_chu_)/.test(id) &&
    scene.textures.exists(nativeForestEffects)
  )
    return nativeForestEffects;
}
