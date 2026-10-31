/** Controlled snapshots only. Uses production ArenaScene; opens no game room. */
import Phaser from 'phaser';
import type { LobbyState } from '@volam/game-protocol';
import { ArenaScene } from './arena-scene.js';
import { CreepPlayback } from './arena-creeps.js';
import type { ForestCreepManifest } from './forest-creeps.js';
const query = new URLSearchParams(location.search),
  heroCount = query.get('players') === '6' ? 6 : 2;
const poseControl = document.querySelector<HTMLSelectElement>('#review-pose')!;
const directionControl =
  document.querySelector<HTMLSelectElement>('#review-direction')!;
const independent = document.querySelector<HTMLInputElement>(
  '#review-independent',
)!;
const effectControl =
  document.querySelector<HTMLSelectElement>('#review-effect')!;
interface ControlledActor {
  x: number;
  y: number;
  fx: number;
  fy: number;
  hp: number;
  maxHp: number;
  pose: string;
  zoneId: string;
  archetypeId: string;
  statuses: string;
  confirmed: boolean;
  nickname: string;
  schoolId: string;
  basicId: string;
}
const players = new Map<string, ControlledActor>(),
  creeps = new Map<string, ControlledActor>();
const base = (x: number, y: number): ControlledActor => ({
  x,
  y,
  fx: 0,
  fy: 1,
  hp: 160,
  maxHp: 160,
  pose: 'idle',
  zoneId: 'forest_shared',
  archetypeId: '',
  statuses: '[]',
  confirmed: true,
  nickname: 'Cái Bang',
  schoolId: 'cai_bang',
  basicId: 'cai_bang_bong',
});
const state = {
  phase: 'IN_GAME',
  defense: { enabled: false },
  tick: 0,
  players,
  creeps,
  areas: new Map(),
  projectiles: new Map(),
} as unknown as LobbyState;
class ForestReview extends ArenaScene {
  private roster: ForestCreepManifest['assets'] = [];
  private homes = new Map<string, [number, number]>();
  private effectFrames = new Map<string, Set<string>>();
  private effectCompleted: string[] = [];
  private effectRepeats = new Map<string, number>();
  private activeEffects = new Set<Phaser.GameObjects.Sprite>();
  override create() {
    super.create();
    const manifest = this.cache.json.get(
      'forest_creeps_manifest',
    ) as ForestCreepManifest;
    this.roster = manifest.assets.filter(
      (a) => !query.get('enemy') || a.archetypeId === query.get('enemy'),
    );
    for (let i = 0; i < heroCount; i++)
      players.set('hero_' + i, base(250 + i * 88, 320));
    this.roster.forEach((asset, i) => {
      for (let pair = 0; pair < 2; pair++) {
        const id = asset.archetypeId + ':' + pair,
          home: [number, number] = [
            340 + (i % 3) * 180 + pair * 62,
            400 + Math.floor(i / 3) * 100 + pair * 14,
          ];
        creeps.set(id, { ...base(...home), archetypeId: asset.archetypeId });
        this.homes.set(id, home);
      }
    });
    this.setSnapshot(state, 'hero_0');
    this.pose();
    this.cameras.main.stopFollow().centerOn(480, 320);
    poseControl.onchange =
      directionControl.onchange =
      independent.onchange =
        () => this.pose();
    for (const button of document.querySelectorAll<HTMLButtonElement>(
      '[data-depth]',
    ))
      button.onclick = () => {
        if (button.dataset['depth'] === 'reset')
          for (const [id, home] of this.homes)
            Object.assign(creeps.get(id)!, { x: home[0], y: home[1] });
        else
          Object.assign(creeps.values().next().value!, {
            x: 440,
            y: button.dataset['depth'] === 'behind' ? 192 : 280,
          });
        this.update(this.time.now, 45);
      };
    if (query.get('vfx') === '1')
      for (const fx of manifest.effects) {
        const option = document.createElement('option');
        option.value = option.textContent = fx.id.replace('forest_fx:', '');
        effectControl.append(option);
      }
    document.querySelector<HTMLButtonElement>('#review-play-effect')!.onclick =
      () => this.playEffect();
    const ready = document.querySelector<HTMLElement>('#review-ready')!;
    ready.dataset['ready'] = 'true';
    ready.textContent = `${this.roster.length} species · ${heroCount} hero scale stand-ins · Shared runtime renderer · Camera1× / display2×`;
  }
  private pose() {
    // Only this disconnected, labelled fixture resets playback for controlled pose inspection.
    for (const view of this.actors.values())
      view.playback = new CreepPlayback();
    this.completedAnimations.length = 0;
    this.observedCreepFrames.clear();
    this.creepRepeats.clear();
    let i = 0;
    for (const actor of creeps.values()) {
      const alternate = independent.checked && i++ % 2 === 1;
      actor.pose = alternate ? 'walk' : poseControl.value;
      actor.hp = actor.pose === 'death' ? 0 : 160;
      const dir = alternate ? 'right' : directionControl.value;
      [actor.fx, actor.fy] =
        dir === 'left'
          ? [-1, 0]
          : dir === 'right'
            ? [1, 0]
            : dir === 'up'
              ? [0, -1]
              : [0, 1];
    }
    this.update(this.time.now, 45);
  }
  private playEffect() {
    const manifest = this.cache.json.get(
      'forest_creeps_manifest',
    ) as ForestCreepManifest;
    const fx = manifest.effects.find(
      (a) => a.id === 'forest_fx:' + effectControl.value,
    );
    if (!fx) return;
    for (const sprite of this.activeEffects) sprite.destroy();
    this.effectFrames.clear();
    this.effectCompleted = [];
    this.effectRepeats.clear();
    const sequence = fx as typeof fx & { ownerTypeId: string };
    const owner = [...creeps.values()].find(
      (a) => a.archetypeId === sequence.ownerTypeId,
    ) ?? { x: 530, y: 390 };
    const sprite = this.creepEffects!.contact(fx.id, owner.x, owner.y);
    this.activeEffects.add(sprite);
    const hold = document.querySelector<HTMLInputElement>(
        '#review-hold-effect',
      )!.checked,
      name = effectControl.value;
    const observe = () => {
      const seen = this.effectFrames.get(name) ?? new Set<string>();
      seen.add(String(sprite.frame.name));
      this.effectFrames.set(name, seen);
      if (hold && String(sprite.frame.name) === fx.frames[2])
        sprite.anims.pause();
    };
    observe();
    sprite.on(Phaser.Animations.Events.ANIMATION_UPDATE, observe);
    sprite.on(Phaser.Animations.Events.ANIMATION_REPEAT, () =>
      this.effectRepeats.set(name, (this.effectRepeats.get(name) ?? 0) + 1),
    );
    sprite.once(Phaser.GameObjects.Events.DESTROY, () => {
      this.activeEffects.delete(sprite);
      if (
        fx.repeat === -1 ||
        this.creepEffects!.inspect().completed.includes(fx.id)
      )
        this.effectCompleted.push(name);
    });
    if (fx.repeat === -1 && !hold)
      this.time.delayedCall(650, () => sprite.destroy());
  }
  override inspect() {
    const v = super.inspect();
    return {
      ...v,
      time: v.sceneTime,
      heroCount: players.size,
      actorCount: creeps.size,
      controlledArtReview: true,
      sharedRuntimeRenderer: true,
      naturalCombat: false,
      gameplayIntegration: false,
      observed: v.observedCreepFrames,
      repeats: v.creepRepeats,
      completed: v.completedAnimations.map((a) => ({
        actor: a.id,
        key: a.key,
        at: a.at,
      })),
      actors: v.actors
        .filter((a) => a.texture.startsWith('forest_'))
        .map((a) => ({
          ...a,
          frame: String(a.frame),
          animation: a.animation ?? '',
        })),
      effectFrames: Object.fromEntries(
        [...this.effectFrames].map(([k, v]) => [k, [...v]]),
      ),
      effectCompleted: [...this.effectCompleted],
      effectRepeats: Object.fromEntries(this.effectRepeats),
      activeEffects: this.activeEffects.size,
    };
  }
}
const scene = new ForestReview();
const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'review-game',
  width: 960,
  height: 540,
  render: {
    pixelArt: true,
    roundPixels: true,
    antialias: false,
    antialiasGL: false,
  },
  scale: { mode: Phaser.Scale.NONE },
  scene: [scene],
  audio: { noAudio: true },
  input: { keyboard: false },
});
const fit = () => {
  if (game.isBooted) {
    const scale = innerWidth >= 960 && innerHeight >= 600 ? 2 : 1;
    game.scale.resize(
      Math.ceil(innerWidth / scale),
      Math.ceil(innerHeight / scale),
    );
    game.canvas.style.width = innerWidth + 'px';
    game.canvas.style.height = innerHeight + 'px';
    scene.cameras.main?.centerOn(480, 320);
  }
};
game.events.once(Phaser.Core.Events.READY, fit);
addEventListener('resize', fit);
Object.defineProperty(window, '__FOREST_REVIEW__', {
  value: Object.freeze({ inspect: () => scene.inspect() }),
});
