import type Phaser from 'phaser';
import type { ArenaCreepArt, ActorAnimation } from './arena-creeps.js';
import chu from './chu-art.generated.json' with { type: 'json' };

type PreviewArt = ArenaCreepArt & {
  previewScale?: number;
  mirrorFacing?: boolean;
};
const retained = new WeakMap<Phaser.Scene, Map<string, PreviewArt>>();
/** Preview-only adapter. Real matches retain their existing zone/encounter renderers. */
export function previewCreepArt(
  scene: Phaser.Scene,
  id: string | undefined,
): PreviewArt | undefined {
  if (!id) return;
  for (const key of [
    'arena_creeps_manifest',
    'forest_creeps_manifest',
    'desert_manifest',
    'beach_manifest',
    'hell_manifest',
    'co_mo_manifest',
  ]) {
    const manifest = scene.cache.json.get(key) as
      { assets?: Array<ArenaCreepArt & { archetypeId?: string }> } | undefined;
    const art = manifest?.assets?.find(
      (a) =>
        a.archetypeId === id ||
        (id.startsWith('wave_') && a.wave === Number(id.slice(5))),
    );
    if (art) return art;
  }
  const cache = retained.get(scene) ?? new Map<string, PreviewArt>();
  retained.set(scene, cache);
  if (cache.has(id)) return cache.get(id);
  if (
    ![
      'mongol_infantry',
      'mongol_archer',
      'bc_dog',
      'chu_wine_disciple',
    ].includes(id)
  )
    return;
  const texture =
    id === 'bc_dog'
      ? 'bac_cai_black_dog'
      : id === 'chu_wine_disciple'
        ? 'chu_disciple'
        : `hl_minion_${id === 'mongol_archer' ? 'archer' : 'infantry'}`;
  const animations: ActorAnimation[] = [];
  const origin: [number, number] = id.startsWith('mongol_')
    ? [0.5, 0.82]
    : [0.5, 0.8];
  for (const direction of ['down', 'left', 'right', 'up'])
    for (const state of [
      'idle',
      'walk',
      'basic_attack',
      'hurt',
      'death',
      'cast',
    ]) {
      let frames: string[],
        frameRate = 8;
      if (id.startsWith('mongol_')) {
        const pose = ['cast', 'basic_attack'].includes(state)
          ? 'attack'
          : state === 'walk'
            ? 'walk'
            : 'idle';
        frames = Array.from(
          { length: pose === 'walk' ? 4 : 2 },
          (_, i) => `${direction}_${pose}_${i}`,
        );
      } else if (id === 'chu_wine_disciple') {
        const pose =
          state === 'basic_attack' || state === 'cast'
            ? 'basic_defense_attack'
            : state === 'hurt'
              ? 'hit'
              : state;
        const clip = chu.bundles.disciple.animations.find(
          (a) => a.name === `${pose}_${direction}`,
        )!;
        frames = clip.frames;
        frameRate = clip.frameRate;
      } else {
        const pose =
          state === 'basic_attack' || state === 'cast' ? 'bite' : state;
        const bundle = (
          scene.cache.json.get('bc_manifest') as {
            assets: Array<{
              id: string;
              animations: Array<{
                name: string;
                frames: string[];
                durations: number[];
              }>;
            }>;
          }
        ).assets.find((a) => a.id === texture)!;
        const clip = bundle.animations.find((a) => a.name === `${pose}_right`)!;
        frames = clip.frames;
        frameRate = 1000 / clip.durations[0]!;
      }
      const repeat = ['idle', 'walk'].includes(state) ? -1 : 0;
      const key = `${texture}:${state}:${direction}`;
      if (!scene.anims.exists(key))
        scene.anims.create({
          key,
          frames: frames.map((frame) => ({ key: texture, frame })),
          frameRate,
          repeat,
        });
      animations.push({ state, direction, frames, frameRate, repeat });
    }
  const art: PreviewArt = {
    id: texture,
    wave: 0,
    slug: id,
    nameVi: id,
    status: 'retained-preview-adapter',
    bodyHeight: 42,
    footPivot: origin,
    animations,
    sourceConcept: '',
    sourceConceptSha256: '',
    previewScale: id.startsWith('mongol_')
      ? 0.55
      : id === 'bc_dog'
        ? 0.8
        : 0.65,
    mirrorFacing: id === 'bc_dog',
  };
  cache.set(id, art);
  return art;
}
