import {
  WaveBossHealth,
  WaveBossFeedbackArt,
} from './wave-boss-feedback-art.js';
import Phaser from 'phaser';
import type { LobbyState } from '@volam/game-protocol';
import type { BacCaiView } from '@volam/game-core';
const ids = [
  'boss_bac_cai',
  'bac_cai_beam_v03',
  'bac_cai_staff',
  'bac_cai_dragon_palms',
  'bac_cai_ultimate',
  'bac_cai_shared',
  'bac_cai_rework_character',
  'bac_cai_black_dog',
  'bac_cai_rework_vfx',
];
type Clip = {
  name: string;
  frames: string[];
  durations: number[];
  repeat: number;
};
type Bundle = { id: string; origin: [number, number]; animations: Clip[] };
export function preloadBacCaiArt(scene: Phaser.Scene) {
  scene.load.json('bc_manifest', '/assets/bac-cai-preview/manifest.json');
  for (const id of ids)
    scene.load.atlas(
      id,
      '/assets/bac-cai-preview/' + id + '.png',
      '/assets/bac-cai-preview/' + id + '.json',
    );
}
const facing = (x: number, y: number) =>
  Math.abs(x) > Math.abs(y)
    ? x < 0
      ? 'left'
      : 'right'
    : y < 0
      ? 'up'
      : 'down';
/** Samples retained authored cels from server clocks; this class never sends gameplay messages. */
export class BacCaiRenderer {
  private images = new Map<string, Phaser.GameObjects.Image>();
  private labels = new Map<string, Phaser.GameObjects.Text>();
  private seen = new Set<string>();
  private observed = new Map<string, Set<string>>();
  private bundles: Map<string, Bundle>;
  private lastTick = -1;
  private received = 0;
  private clock = 0;
  private latest: BacCaiView | undefined;
  private health: WaveBossHealth;
  private feedback: WaveBossFeedbackArt;
  constructor(private scene: Phaser.Scene) {
    this.health = new WaveBossHealth(scene);
    this.feedback = new WaveBossFeedbackArt(scene);
    const manifest = scene.cache.json.get('bc_manifest') as {
      assets: Bundle[];
    };
    this.bundles = new Map(manifest.assets.map((b) => [b.id, b]));
    for (const id of ids)
      scene.textures.get(id).setFilter(Phaser.Textures.FilterMode.NEAREST);
  }
  clear() {
    for (const v of this.images.values()) v.destroy();
    for (const v of this.labels.values()) v.destroy();
    this.images.clear();
    this.health.clear();
    this.feedback.clear();
    this.labels.clear();
    this.latest = undefined;
    this.lastTick = -1;
  }
  private cel(
    key: string,
    asset: string,
    tag: string,
    x: number,
    y: number,
    age: number,
    options: {
      sx?: number;
      sy?: number;
      angle?: number;
      alpha?: number;
      depth?: number;
      frame?: number;
      flip?: boolean;
      loop?: boolean;
    } = {},
  ) {
    const b = this.bundles.get(asset)!,
      clip = b.animations.find((a) => a.name === tag);
    if (!clip) throw Error('Missing Bắc Cái clip ' + asset + ':' + tag);
    const duration = clip.durations.reduce((a, b) => a + b, 0),
      loop = options.loop ?? clip.repeat === -1;
    let time = loop
        ? Math.max(0, age) % duration
        : Math.min(duration - 1, Math.max(0, age)),
      index = 0;
    while (index < clip.frames.length - 1 && time >= clip.durations[index]!) {
      time -= clip.durations[index]!;
      index++;
    }
    const frame = clip.frames[options.frame ?? index]!;
    let v = this.images.get(key);
    if (!v) {
      v = this.scene.add.image(x, y, asset, frame).setName('bac_cai:' + key);
      this.images.set(key, v);
    }
    v.setTexture(asset, frame)
      .setPosition(x, y)
      .setOrigin(...b.origin)
      .setScale(options.sx ?? 1, options.sy ?? options.sx ?? 1)
      .setAngle(options.angle ?? 0)
      .setAlpha(options.alpha ?? 1)
      .setFlipX(options.flip ?? false)
      .setDepth(options.depth ?? y);
    this.seen.add(key);
    const observed = this.observed.get(asset + ':' + tag) ?? new Set<string>();
    observed.add(frame);
    this.observed.set(asset + ':' + tag, observed);
    return v;
  }
  private text(
    key: string,
    value: string,
    x: number,
    y: number,
    color = '#fff0ba',
  ) {
    let t = this.labels.get(key);
    if (!t) {
      t = this.scene.add
        .text(x, y, value, {
          fontFamily: 'Segoe UI, sans-serif',
          fontSize: '12px',
          color,
          backgroundColor: '#182a25e8',
          padding: { x: 5, y: 3 },
          align: 'center',
          wordWrap: { width: 300, useAdvancedWrap: true },
        })
        .setOrigin(0.5, 1)
        .setName('bac_cai:' + key);
      this.labels.set(key, t);
    }
    t.setText(value).setPosition(x, y).setColor(color).setDepth(19000);
    if (key === 'dialogue') {
      const rect = this.scene.cameras.main.worldView;
      if (rect.width > t.width + 16)
        t.x = Phaser.Math.Clamp(
          x,
          rect.left + t.width / 2 + 8,
          rect.right - t.width / 2 - 8,
        );
      t.y = Math.max(y, rect.top + 65 + t.height);
      t.setDepth(19020);
    } else if (key === 'boss_hp') t.setDepth(19010);
    this.seen.add(key);
    return t;
  }
  sync(state: LobbyState | undefined, zone: string) {
    const raw = zone === 'arena' ? state?.bacCai.get('arena')?.snapshot : '';
    if (!raw) {
      if (this.images.size || this.labels.size) this.clear();
      return;
    }
    const v = JSON.parse(raw) as BacCaiView;
    if (v.phase === 'cleared') {
      this.clear();
      return;
    }
    if (v.tick !== this.lastTick) {
      this.received = this.scene.time.now;
      this.lastTick = v.tick;
    }
    // Presentation interpolates at most one patch; authority and expiry remain server snapshots.
    this.clock =
      v.tick +
      Math.min(1, ((this.scene.time.now - this.received) * v.tickRate) / 1000);
    this.latest = v;
    this.seen.clear();
    this.health.begin();
    this.feedback.begin();
    const age = (start: number) => ((this.clock - start) * 1000) / v.tickRate,
      cast = v.action,
      b = v.boss;
    if (b) {
      const dir = facing(b.fx, b.fy);
      let tag =
          (b.pose === 'walk'
            ? 'walk'
            : b.pose === 'hurt'
              ? 'hurt'
              : b.pose === 'death'
                ? 'death'
                : 'idle') +
          '_' +
          dir,
        asset = 'boss_bac_cai',
        clock = age(b.poseStart),
        frame: number | undefined;
      if (v.phase === 'sleep' || v.phase === 'drink') {
        asset = 'bac_cai_rework_character';
        tag = v.phase === 'sleep' ? 'sleep_down' : 'drink_down';
        clock =
          age(v.outcomeUntil) +
          (v.phase === 'sleep'
            ? v.tuning.preferences.sleepMs
            : v.tuning.preferences.drinkMs);
        frame =
          v.phase === 'sleep'
            ? clock < 400
              ? 0
              : clock < 800
                ? 1
                : 2
            : Math.min(3, Math.floor(clock / 380));
      } else if (cast) {
        clock = age(cast.start);
        switch (cast.ability) {
          case 'staff':
            tag = 'staff_combo_' + dir;
            break;
          case 'spiral':
            if (clock < v.tuning.spiral.dashMs) {
              tag = 'walk_' + dir;
              break;
            }
            clock -= v.tuning.spiral.dashMs;
            tag = 'dragon_release_' + dir;
            frame = Math.min(3, Math.floor(clock / 120));
            break;
          case 'palms':
            tag = 'dragon_release_' + dir;
            frame = Math.min(3, Math.floor(clock / 120));
            break;
          case 'beam':
            if (dir === 'right') {
              asset = 'bac_cai_rework_character';
              tag = 'staff_thrust_right';
              frame = clock < 230 ? 0 : clock < 350 ? 1 : clock < 500 ? 2 : 3;
            } else tag = 'staff_combo_' + dir;
            break;
          case 'vortex':
            tag =
              this.clock < cast.release
                ? 'ultimate_charge_' + dir
                : this.clock <
                    cast.release +
                      (v.tuning.vortex.activeMs * v.tickRate) / 1000
                  ? 'staff_spin_' + dir
                  : 'idle_' + dir;
            clock = age(this.clock < cast.release ? cast.start : cast.release);
            break;
          case 'field':
            tag = 'jumping_palm_' + dir;
            frame = Math.min(3, Math.floor(clock / 160));
            break;
          case 'tether':
            tag = 'dragon_charge_' + dir;
            break;
          case 'dogs':
            tag = 'staff_combo_' + dir;
            break;
        }
      }
      let x = b.x,
        y = b.y;
      if (cast?.ability === 'field' && !cast.released) {
        const p = Math.max(
          0,
          Math.min(1, (this.clock - cast.start) / (cast.release - cast.start)),
        );
        x = cast.origin.x + (cast.x - cast.origin.x) * p;
        y = cast.origin.y + (cast.y - cast.origin.y) * p;
      }
      if (cast?.ability === 'vortex')
        this.feedback.cel('spinner:0', 'bc_boss', tag, x, y, clock / 1000, {
          depth: y,
          loop: true,
        });
      else
        this.cel('boss', asset, tag, x, y, clock, {
          ...(frame === undefined ? {} : { frame }),
          depth: y + (cast?.ability === 'field' ? 1 : 0),
          loop:
            cast?.ability === 'staff' ||
            (!cast &&
              b.pose !== 'death' &&
              v.phase !== 'drink' &&
              v.phase !== 'sleep'),
        });
      if (v.phase !== 'defeated')
        this.health.draw('bac_cai', 'Bắc Cái', x, y - 65, v.hp, v.maxHp);
      if (v.dialogue && v.phase !== 'defeated')
        this.text('dialogue', v.dialogue, x, y - 110);
    } else if (v.forms.length) {
      const center = v.forms.reduce(
        (p, f) => ({ x: p.x + f.x / 8, y: p.y + f.y / 8 }),
        { x: 0, y: 0 },
      );
      if (v.dialogue)
        this.text('dialogue', v.dialogue, center.x, center.y - 230);
    }
    for (const form of v.forms)
      this.cel(
        form.key,
        'boss_bac_cai',
        'idle_down',
        form.x,
        form.y,
        age(cast?.start ?? 0),
        { loop: true },
      );
    for (const dog of v.dogs) {
      const tag =
        (dog.hp <= 0
          ? 'death'
          : dog.pose === 'basic_attack'
            ? 'bite'
            : dog.pose === 'walk'
              ? 'walk'
              : dog.pose === 'hurt'
                ? 'hurt'
                : 'idle') + '_right';
      this.cel(
        dog.id,
        'bac_cai_black_dog',
        tag,
        dog.x,
        dog.y,
        (dog.age * 1000) / v.tickRate,
        { flip: dog.fx < 0, loop: dog.hp > 0 },
      );
      if (dog.hp > 0 && dog.hp < dog.maxHp)
        this.text(
          'hp_' + dog.id,
          `${Math.ceil(dog.hp)}/${dog.maxHp}`,
          dog.x,
          dog.y - 38,
        );
    }
    if (cast) {
      const angle = (Math.atan2(cast.fy, cast.fx) * 180) / Math.PI;
      if (cast.ability === 'beam' && !cast.released)
        this.cel(
          'beam_warning',
          'bac_cai_shared',
          'direction_warning',
          cast.origin.x + cast.fx * 300,
          cast.origin.y - 20 + cast.fy * 300,
          age(cast.start),
          { sx: 5, sy: 0.3, angle, alpha: 0.65, depth: 10, loop: true },
        );
      if (cast.ability === 'field' && !cast.released)
        this.cel(
          'field_warning',
          'bac_cai_rework_vfx',
          'field_impact',
          cast.x,
          cast.y,
          0,
          { sx: 2.7, sy: 2, alpha: 0.3, depth: 20, frame: 0 },
        );
      if (cast.ability === 'staff')
        this.cel(
          'staff_sweep',
          'bac_cai_staff',
          'staff_slash',
          (b?.x ?? cast.origin.x) + cast.fx * 24,
          (b?.y ?? cast.origin.y) + cast.fy * 24 - 24,
          age(cast.start) % 350,
          { angle, alpha: 0.85, loop: true },
        );
      if (cast.ability === 'vortex') {
        const active =
          this.clock >= cast.release &&
          this.clock <
            cast.release + (v.tuning.vortex.activeMs * v.tickRate) / 1000;
        for (const [i, p] of v.spinners.entries()) {
          const clock = age(cast.release) / 1000;
          if (i > 0)
            this.feedback.cel(
              'spinner:' + i,
              'bc_boss',
              (active ? 'staff_spin_' : 'idle_') + facing(cast.fx, cast.fy),
              p.x,
              p.y,
              Math.max(0, clock),
              { depth: p.y, loop: active },
            );
          if (active)
            this.feedback.cel(
              'spin-fx:' + i,
              'bc_staff',
              'staff_whirlwind',
              p.x,
              p.y,
              clock,
              { sx: 1, sy: 0.65, depth: p.y + 0.2, loop: true },
            );
          else if (i > 0)
            this.feedback.cel(
              'spin-smoke:' + i,
              'bc_fx',
              'clone_smoke',
              p.x,
              p.y,
              age(cast.start) / 1000 - 0.3,
              { sx: 0.7, sy: 0.7, alpha: 0.7 },
            );
        }
      }
    }
    for (const e of v.effects) {
      const angle = (Math.atan2(e.fy, e.fx) * 180) / Math.PI,
        clock = age(e.start);
      if (e.kind === 'beam')
        this.cel(e.id, 'bac_cai_beam_v03', 'qi_beam', e.x, e.y - 20, clock, {
          angle,
          depth: e.y + 30,
        });
      else if (e.kind === 'palm')
        this.cel(
          e.id,
          'bac_cai_dragon_palms',
          'dragon_projectile',
          e.x,
          e.y - 24,
          clock,
          { angle, loop: true },
        );
      else if (e.kind === 'field')
        this.cel(e.id, 'bac_cai_rework_vfx', 'field_impact', e.x, e.y, clock, {
          sx: 2.7,
          sy: 2,
          alpha: 0.55,
          depth: 20,
        });
      else if (e.kind === 'spiral') {
        this.cel(
          e.id,
          'bac_cai_rework_vfx',
          'fire_dragon',
          e.x,
          e.y - 24,
          clock,
          {
            angle:
              angle +
              ((this.clock - e.start) / (e.end - e.start)) *
                v.tuning.spiral.turns *
                360 +
              90,
            loop: true,
          },
        );
        for (let i = 1; i < 12; i++) {
          const p = Math.max(
              0,
              Math.min(
                1,
                (this.clock - e.start - i * 1.14) / (e.end - e.start),
              ),
            ),
            a =
              Math.atan2(e.fy, e.fx) + p * Math.PI * 2 * v.tuning.spiral.turns,
            r =
              v.tuning.spiral.startRadius +
              (v.tuning.spiral.radius - v.tuning.spiral.startRadius) * p;
          if (this.clock - e.start < i * 1.14) continue;
          this.cel(
            e.id + '_trail_' + i,
            'bac_cai_dragon_palms',
            'dragon_trail',
            e.origin.x + Math.cos(a) * r,
            e.origin.y + Math.sin(a) * r * v.tuning.spiral.yScale - 24,
            clock + i * 50,
            {
              sx: 0.42,
              angle: (a * 180) / Math.PI + 90,
              alpha: (1 - i / 13) * 0.4,
              loop: true,
            },
          );
        }
      } else if (e.kind === 'tether') {
        const a = state!.players.get(e.targetIds[0]!),
          b2 = state!.players.get(e.targetIds[1]!);
        if (!a || !b2) continue;
        const length = Math.hypot(b2.x - a.x, b2.y - a.y);
        this.cel(
          e.id,
          'bac_cai_rework_vfx',
          'pair_tether',
          (a.x + b2.x) / 2,
          (a.y + b2.y) / 2 - 25,
          clock,
          {
            sx: length / 132,
            sy: 0.4,
            angle: (Math.atan2(b2.y - a.y, b2.x - a.x) * 180) / Math.PI,
            depth: Math.max(a.y, b2.y) + 20,
            loop: true,
          },
        );
      } else
        this.cel(
          e.id,
          'bac_cai_ultimate',
          'final_dragon_burst',
          e.x,
          e.y,
          clock,
          { sx: 3.5, sy: 2.5, alpha: 0.6, depth: 25 },
        );
    }
    if (v.vote && !v.vote.outcome)
      for (let i = 0; i < v.vote.options.length; i++) {
        const o = v.vote.options[i]!;
        this.cel(
          'vote_' + i,
          'bac_cai_shared',
          'landing_warning',
          o.x,
          o.y,
          age(0),
          {
            sx: v.tuning.preferences.zoneSize / 110,
            sy: v.tuning.preferences.zoneHeight / 77,
            alpha: 0.7,
            depth: 12,
            loop: true,
          },
        );
        this.text(
          'vote_text_' + i,
          `${v.tuning.preferences.names[o.preference]} · ${v.vote.counts[i]}\n${Math.max(0, Math.ceil((v.vote.deadline - this.clock) / v.tickRate))}s`,
          o.x,
          o.y + 55,
        );
      }
    this.feedback.end();
    this.health.end();
    for (const [key, image] of this.images)
      if (!this.seen.has(key)) {
        image.destroy();
        this.images.delete(key);
      }
    for (const [key, label] of this.labels)
      if (!this.seen.has(key)) {
        label.destroy();
        this.labels.delete(key);
      }
  }
  inspect() {
    return {
      view: this.latest,
      feedback: this.feedback.inspect(),
      phase: this.latest?.phase,
      action: this.latest?.action?.ability,
      tick: this.latest?.tick,
      forms: this.latest?.forms,
      immune: this.latest?.immune,
      swaps: this.latest?.swaps,
      effects: this.latest?.effects,
      views: [...this.images].map(([key, v]) => ({
        key,
        texture: v.texture.key,
        frame: v.frame.name,
        x: v.x,
        y: v.y,
        origin: [v.originX, v.originY],
        scale: [v.scaleX, v.scaleY],
        alpha: v.alpha,
        depth: v.depth,
        angle: v.angle,
      })),
      observed: [...this.observed].map(([clip, frames]) => ({
        clip,
        frames: [...frames],
      })),
    };
  }
}
