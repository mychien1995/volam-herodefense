import Phaser from 'phaser';
import {
  nguDoc,
  type CombatEvent,
  type NguDocSummonKind,
} from '@volam/game-core';
import type { LobbyState } from '@volam/game-protocol';
import { setArtFilter } from './art-filter.js';
import { facing } from './facing.js';
import { bichCoPalms, effectClips } from './ngu-doc-preview-data.js';
import { zoneTick } from './zone-tick.js';

export const nguDocBichCo = 'ngu-doc-bich-co';
export const nguDocAmLinh = 'ngu-doc-am-linh';
export const nguDocMinions = 'ngu-doc-minions';
export const nguDocHeroPivot = [0.5, 118 / 144] as const;
export const nguDocMinionPivot = [0.5, 157 / 192] as const;
const effects = 'ngu-doc-effects';
const poison = 'ngu-doc-qw';
const ultimate = 'ngu-doc-ultimate';
const arts = [
  [nguDocBichCo, 'ngu-doc-preview-v01/bich-co'],
  [nguDocAmLinh, 'ngu-doc-preview-v01/am-linh'],
  [nguDocMinions, 'ngu-doc-preview-v01/minions'],
  [effects, 'ngu-doc-preview-v01/effects'],
  [poison, 'ngu-doc-qw-v02/tai-hiep-qw'],
  [ultimate, 'ngu-doc-feedback-v1/ultimate'],
] as const;

const scale = 0.5;
export const nguDocBody = (texture: string) =>
  texture === nguDocBichCo || texture === nguDocAmLinh;
export const nguDocMinionKind = (
  archetype = '',
): NguDocSummonKind | undefined => {
  if (archetype === 'ngu_doc_jiangshi') return 'jiangshi';
  if (archetype === 'ngu_doc_zombie') return 'zombie';
  if (archetype === 'ngu_doc_reaper') return 'reaper';
};
const minionHeight = { reaper: 145, jiangshi: 68, zombie: 63 };
export const nguDocHeadHeight = (kind?: NguDocSummonKind) =>
  (kind ? minionHeight[kind] : 88) * scale;
const ids = new Set<string>(Object.values(nguDoc));
export const nguDocHandles = (id: string) => ids.has(id);
type Sprite = Phaser.GameObjects.Sprite;
type Status = { kind: string; ticks?: number };
type Actor = {
  hp: number;
  pose: string;
  fx: number;
  castAbilityId?: string;
  actionStartedAt?: number;
};

export function preloadNguDoc(scene: Phaser.Scene): void {
  for (const [key, file] of arts)
    if (!scene.textures.exists(key))
      scene.load.atlas(
        key,
        '/assets/' + file + '.png',
        '/assets/' + file + '.json',
      );
}

function walkFrame(tick: number): number {
  return Math.floor(tick / 3.3) % 4;
}
const walking = {
  jiangshi: ['jiangshi_hop', 'jiangshi_land'],
  zombie: ['zombie_step_l', 'zombie_step_r'],
  reaper: ['reaper_glide'],
};
function summonFrame(
  kind: NguDocSummonKind,
  actor: Actor,
  tick: number,
): string {
  if (actor.pose === 'walk') {
    const frames = walking[kind];
    return frames[Math.floor(tick / 5) % frames.length]!;
  }
  if (actor.pose === 'basic_attack' || actor.pose === 'cast') {
    const phase = tick - (actor.actionStartedAt ?? tick);
    if (kind !== 'reaper') return kind + (phase < 3 ? '_idle' : '_attack');
    if (actor.castAbilityId === nguDoc.reaperSlam)
      return phase < 6 ? 'reaper_raise' : 'reaper_slam';
    return phase < 4 ? 'reaper_windup' : 'reaper_sweep';
  }
  return kind + '_idle';
}

const handPoses = ['hand_open', 'hand_fist', 'hand_grasp'] as const;
const smokePoses = [
  'smoke_rise',
  'smoke_dense',
  'smoke_drift',
  'smoke_dense',
] as const;
const smokeCenters = [
  [0, 0],
  [-0.38, -0.31],
  [0.38, -0.31],
  [-0.34, 0.37],
  [0.34, 0.37],
] as const;
const handCount = 21;
function fieldSeed(id: string): number {
  let hash = 2166136261;
  for (const char of id) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return hash >>> 0;
}
function handVariation(seed: number, i: number): number {
  let hash = Math.imul(seed ^ (i + 1), 0x45d9f3b);
  hash = Math.imul(hash ^ (hash >>> 16), 0x45d9f3b);
  return ((hash ^ (hash >>> 16)) >>> 0) / 4294967296;
}

export class NguDocArt {
  private readonly objects = new Map<string, Phaser.GameObjects.Image>();
  private readonly brief = new Set<Phaser.GameObjects.Image>();
  private readonly countdowns = new Map<string, Phaser.GameObjects.Text>();
  private readonly live = new Set<string>();
  private readonly returns = new Map<
    Phaser.GameObjects.Image,
    {
      owner: Sprite;
      x: number;
      y: number;
      start: number;
      duration: number;
    }
  >();
  constructor(private readonly scene: Phaser.Scene) {
    for (const [key] of arts)
      setArtFilter(scene.textures.get(key), Phaser.Textures.FilterMode.LINEAR);
  }
  begin(): void {
    this.live.clear();
  }
  body(
    id: string,
    sprite: Sprite,
    texture: string,
    actor: Actor,
    statuses: Status[],
    facing: string,
    tick: number,
    minion?: NguDocSummonKind,
  ): void {
    const frame = minion
      ? summonFrame(minion, actor, tick)
      : actor.pose === 'walk'
        ? 'walk_' + facing + '_' + walkFrame(tick)
        : texture === nguDocAmLinh &&
            actor.pose === 'cast' &&
            actor.castAbilityId === nguDoc.reaper
          ? 'ritual_down_0'
          : actor.pose === 'cast' || actor.pose === 'basic_attack'
            ? tick - (actor.actionStartedAt ?? tick) < 2
              ? 'idle_' + facing + '_0'
              : 'cast_' + facing + '_0'
            : 'idle_' + facing + '_0';
    if (sprite.texture.key !== texture || sprite.frame.name !== frame)
      sprite.stop().setTexture(texture, frame);
    sprite
      .setOrigin(...(minion ? nguDocMinionPivot : nguDocHeroPivot))
      .setScale(scale)
      .setFlipX(
        !!minion &&
          (actor.fx < -0.04 || (Math.abs(actor.fx) <= 0.04 && sprite.flipX)),
      )
      .setAlpha(actor.hp > 0 ? 1 : 0.36);
    if (actor.pose === 'hurt' && actor.hp > 0) sprite.setTint(0xffd0a5);
    else sprite.clearTint();
    if (
      texture !== nguDocBichCo ||
      actor.hp <= 0 ||
      !statuses.some((s) => s.kind === 'ngu_doc_palm')
    )
      return;
    bichCoPalms[frame]?.forEach(([x, y, behind], index) => {
      const frames = effectClips.flame;
      const f = frames[(Math.floor(tick / 3.15) + index) % frames.length]!;
      this.track('hand:' + id + ':' + index, poison, f)
        .setPosition(sprite.x + x * scale, sprite.y + y * scale)
        .setDepth(sprite.y + (behind ? -0.08 : 0.08))
        .setScale(scale)
        .setFlipX(index === 0);
    });
  }

  mark(id: string, sprite: Sprite, statuses: Status[]): void {
    const mark = statuses.find(
      (s) => s.kind === 'ngu_doc_mark' && (s.ticks ?? 0) > 0,
    );
    if (!mark) return;
    const key = 'mark:' + id;
    const height = Math.max(34, sprite.displayHeight * 0.52);
    this.track(key, effects, 'blood_grub')
      .setPosition(sprite.x, sprite.y - height * 0.52)
      .setDepth(sprite.y + 0.16)
      .setScale(0.44);
    let label = this.countdowns.get(key);
    if (!label) {
      label = this.scene.add
        .text(0, 0, '', {
          fontFamily: 'monospace',
          fontSize: '10px',
          color: '#efffbd',
          stroke: '#273416',
          strokeThickness: 3,
        })
        .setOrigin(0.5);
      this.countdowns.set(key, label);
    }
    label
      .setPosition(sprite.x, sprite.y - height - 10)
      .setDepth(sprite.y + 0.28)
      .setText(String(Math.ceil(mark.ticks! / 30)));
  }

  sync(state: LobbyState | undefined, zoneId: string): void {
    const tick = zoneTick(state, zoneId) ?? 0;
    this.updateReturns();
    state?.projectiles.forEach((shot, id) => {
      if (shot.zoneId !== zoneId) return;
      const frame =
        shot.abilityId === nguDoc.taiHiep
          ? shot.stage === 'ngu_doc_toxic'
            ? 'toxic_palm'
            : 'palm'
          : shot.abilityId === nguDoc.coSu
            ? 'staff_bolt'
            : shot.abilityId === nguDoc.worms
              ? 'grub'
              : shot.abilityId === nguDoc.mark
                ? 'blood_grub'
                : shot.abilityId === nguDoc.reaperWave
                  ? 'poison_wave'
                  : '';
      if (!frame) return;
      const staff = frame === 'staff_bolt';
      const heading = staff ? facing(shot.vx, shot.vy) : '';
      const muzzle =
        heading === 'left'
          ? -19
          : heading === 'right'
            ? 19
            : heading === 'up'
              ? -16
              : 16.5;
      const leavingStaff = staff
        ? Math.max(0, 1 - (tick - shot.startedAt) / 8)
        : 0;
      const height =
        frame === 'poison_wave'
          ? 9
          : 23 + leavingStaff * (heading === 'up' ? 21 : 16);
      const palm = shot.abilityId === nguDoc.taiHiep;
      const mirror = palm && shot.vx < 0;
      const rotation = mirror
        ? Math.atan2(-shot.vy, -shot.vx)
        : Math.atan2(shot.vy, shot.vx);
      this.track('shot:' + id, effects, frame)
        .setPosition(shot.x + muzzle * leavingStaff, shot.y - height)
        .setFlipX(mirror)
        .setRotation(rotation)
        .setScale(frame === 'poison_wave' ? 0.72 : 0.58)
        .setDepth(shot.y + 0.1);
    });
    state?.areas.forEach((area, id) => {
      if (area.zoneId !== zoneId) return;
      const phase = Math.max(0, tick - area.startedAt);
      if (area.abilityId === nguDoc.pool) {
        const frame =
          effectClips.pool[Math.floor(phase / 5.4) % effectClips.pool.length]!;
        this.track('area:' + id, poison, frame)
          .setPosition(area.x, area.y)
          .setAlpha(0.84 * Math.min(1, area.ticks / 10))
          .setDepth(-3)
          .setScale((area.radius * 2) / 177);
      } else if (area.abilityId === nguDoc.aura) {
        const frame =
          effectClips.ring[Math.floor(phase / 4.5) % effectClips.ring.length]!;
        this.track('area:' + id, effects, frame)
          .setPosition(area.x, area.y)
          .setDepth(-2)
          .setScale((area.radius * 2) / 195);
      } else if (area.abilityId === nguDoc.hands) {
        this.handsField(id, area.x, area.y, area.radius, phase, area.ticks);
      }
    });
    for (const [key, image] of this.objects)
      if (!this.live.has(key)) {
        image.destroy();
        this.objects.delete(key);
      }
    for (const [key, text] of this.countdowns)
      if (!this.live.has(key)) {
        text.destroy();
        this.countdowns.delete(key);
      }
  }

  private handsField(
    id: string,
    x: number,
    y: number,
    radius: number,
    phase: number,
    remaining: number,
  ): void {
    const power = Math.min(1, phase / 9, remaining / 16);
    const seed = fieldSeed(id);
    smokeCenters.forEach(([dx, dy], index) => {
      const frame =
        smokePoses[Math.floor((phase + index * 6) / 10) % smokePoses.length]!;
      this.track('ultimate-smoke:' + id + ':' + index, ultimate, frame)
        .setPosition(x + dx * radius, y + dy * radius)
        .setScale(radius / 235, radius / 180)
        .setAlpha((index === 0 ? 0.72 : 0.64) * power)
        .setDepth(-2);
    });
    for (let i = 0; i < handCount; i++) {
      const variation = handVariation(seed, i);
      const angle =
        i * 2.3999632297 + (seed / 4294967296) * Math.PI * 2 + variation * 0.45;
      const distance =
        Math.sqrt((i + 0.45) / handCount) * radius * (0.78 + variation * 0.17);
      const age = phase - 9 - Math.floor(variation * 20);
      if (age < 0) continue;
      const pattern =
        (Math.floor(age / 25) + i + Math.floor(variation * 3)) %
        handPoses.length;
      const rise = Math.min(1, age / 9, remaining / (13 + variation * 8));
      const px = x + Math.cos(angle) * distance;
      const py = y + Math.sin(angle) * distance;
      this.track('ultimate-hand:' + id + ':' + i, ultimate, handPoses[pattern]!)
        .setOrigin(0.5, 137 / 160)
        .setPosition(px, py + (1 - rise) * 20)
        .setDepth(py + 0.06)
        .setAlpha(rise * (0.82 + variation * 0.18))
        .setScale(0.34 + variation * 0.17)
        .setFlipX(variation < 0.5);
    }
  }

  private updateReturns(): void {
    for (const [image, flight] of this.returns) {
      const t = (this.scene.time.now - flight.start) / flight.duration;
      if (!flight.owner.active || t >= 1) {
        this.returns.delete(image);
        this.brief.delete(image);
        image.destroy();
        continue;
      }
      const x = Phaser.Math.Linear(flight.x, flight.owner.x, t);
      const y =
        Phaser.Math.Linear(flight.y, flight.owner.y - 23, t) -
        Math.sin(t * Math.PI) * 21;
      image
        .setFlipX(x < image.x)
        .setPosition(x, y)
        .setDepth(y + 35)
        .setAlpha(Math.min(1, (1 - t) * 4));
    }
  }

  event(e: CombatEvent, owner?: Sprite): boolean {
    if (!nguDocHandles(e.abilityId)) return false;
    if (e.abilityId === nguDoc.counter) return true;
    if (e.kind === 'effect' && e.stage === 'summoned') {
      const frame =
        e.abilityId === nguDoc.jiangshi
          ? 'charm_seal'
          : e.abilityId === nguDoc.zombie
            ? 'zombie_haze'
            : 'summon_plume';
      this.flash(
        frame,
        e.x,
        e.y - 14,
        520,
        e.abilityId === nguDoc.reaper ? 1 : 0.6,
      );
      if (e.abilityId === nguDoc.reaper && owner)
        this.flash('ritual_seal', owner.x, owner.y, 650, 0.8).setDepth(-2);
    } else if (
      e.kind === 'pulse' &&
      e.abilityId === nguDoc.mark &&
      e.stage === 'detonate'
    ) {
      this.flash('burst_open', e.x, e.y - 19, 390, 0.88);
    } else if (
      e.kind === 'effect' &&
      e.abilityId === nguDoc.mark &&
      e.stage === 'return' &&
      owner
    ) {
      const x = e.x,
        y = e.y - 20;
      const grub = this.scene.add
        .image(x, y, effects, 'blood_grub')
        .setScale(0.53)
        .setDepth(y + 35);
      this.brief.add(grub);
      const distance = Math.hypot(owner.x - x, owner.y - 23 - y);
      this.returns.set(grub, {
        owner,
        x,
        y,
        start: this.scene.time.now,
        duration: Phaser.Math.Clamp(distance * 1.9, 340, 850),
      });
    } else if (e.kind === 'effect' && e.abilityId === nguDoc.reaperSweep)
      this.flash(
        'scythe_arc',
        e.x + (e.fx ?? 1) * 45,
        e.y - 21 + (e.fy ?? 0) * 25,
        290,
        0.66,
      ).setFlipX((e.fx ?? 1) < 0);
    else if (e.kind === 'effect' && e.abilityId === nguDoc.reaperSlam)
      this.flash('slam_burst', e.x, e.y - 24, 410, 0.91);
    else if (e.kind === 'hit' && e.abilityId === nguDoc.worms)
      this.flash('burst_seed', e.x, e.y - 12, 230, 0.42);
    else if (
      e.kind === 'hit' &&
      (e.abilityId === nguDoc.taiHiep || e.abilityId === nguDoc.coSu)
    )
      this.flash('impact', e.x, e.y - 18, 170, 0.41);
    return true;
  }

  inspect() {
    return [...this.objects.values(), ...this.brief].map((image) => ({
      frame: image.frame.name,
      x: image.x,
      y: image.y,
      alpha: image.alpha,
      flipX: image.flipX,
      rotation: image.rotation,
      returning: this.returns.has(image),
    }));
  }
  clear(): void {
    for (const image of [...this.objects.values(), ...this.brief]) {
      this.scene.tweens.killTweensOf(image);
      image.destroy();
    }
    for (const text of this.countdowns.values()) text.destroy();
    this.objects.clear();
    this.brief.clear();
    this.returns.clear();
    this.countdowns.clear();
    this.live.clear();
  }
  private track(id: string, texture: string, frame: string) {
    this.live.add(id);
    const image = this.objects.get(id);
    if (image) return image.setFrame(frame);
    const created = this.scene.add.image(0, 0, texture, frame);
    this.objects.set(id, created);
    return created;
  }
  private flash(
    frame: string,
    x: number,
    y: number,
    milliseconds: number,
    size: number,
  ) {
    const image = this.scene.add
      .image(x, y, effects, frame)
      .setScale(size)
      .setDepth(y + 13);
    this.brief.add(image);
    this.scene.tweens.add({
      targets: image,
      alpha: 0,
      delay: milliseconds * 0.52,
      duration: milliseconds * 0.48,
      onComplete: () => {
        this.brief.delete(image);
        image.destroy();
      },
    });
    return image;
  }
}
