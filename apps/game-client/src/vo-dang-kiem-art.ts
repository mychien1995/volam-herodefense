import { zoneTick } from './zone-tick.js';
import { playVanKiemLandingSound } from './skill-sounds.js';
import Phaser from 'phaser';
import type { CombatEvent } from '@volam/game-core';
import { m1Config } from '@volam/game-data';
import type { LobbyPlayer, LobbyState } from '@volam/game-protocol';
import { facing } from './facing.js';
import { VanKiemVolley, vanKiemSky } from './van-kiem-volley.js';
import bodyUrl from '../../../assets/exports/vo-dang-kiem-rework/body.png?url';
import bodyAtlas from '../../../assets/exports/vo-dang-kiem-rework/body.json?url';
import effectsUrl from '../../../assets/exports/vo-dang-kiem-rework/effects.png?url';
import effectsAtlas from '../../../assets/exports/vo-dang-kiem-rework/effects.json?url';

export const kiem = {
  basic: 'vo_dang_kiem',
  sevenCuts: 'that_tinh_kiem',
  skyfall: 'van_kiem_quy_tong',
} as const;
export const voDangKiemHandled = (id: string) =>
  id === kiem.sevenCuts || id === kiem.skyfall;

const bodyKey = 'vdk-body';
const fxKey = 'vdk-effects';
const sevenCuts = m1Config.skillCatalogue![kiem.sevenCuts]!.effect;
const cutTicks = sevenCuts.mode === 'multi_hit' ? sevenCuts.spacingTicks : 3;
const poses = [
  'cut_up',
  'cut_down',
  'cut_right',
  'cut_down',
  'cut_up',
  'cut_left',
  'cut_right',
];
const basicCuts: Record<string, number> = {
  cut_left: 1,
  cut_right: 6,
  cut_down: 3,
  cut_up: 5,
};
const tickMs = 1000 / m1Config.tickRate;
type Image = Phaser.GameObjects.Image;
type Point = { x: number; y: number };
type BodyCue = {
  skill: string;
  pose: string;
  fx: number;
  fy: number;
  tick: number | undefined;
  ticks: number;
  shownAt?: number;
};

export function preloadVoDangKiemArt(scene: Phaser.Scene): void {
  scene.load.atlas(bodyKey, bodyUrl, bodyAtlas);
  scene.load.atlas(fxKey, effectsUrl, effectsAtlas);
}

export function registerVoDangKiemArt(scene: Phaser.Scene): void {
  for (const key of [bodyKey, fxKey])
    scene.textures.get(key).setFilter(Phaser.Textures.FilterMode.LINEAR);
}

export class VoDangKiemArt {
  private readonly skyfalls = new Map<string, VanKiemVolley>();
  private readonly bursts = new Set<Image>();
  private readonly motions = new Map<string, BodyCue>();
  private point: ((id: string) => Point | undefined) | undefined;
  private lastTick = -1;
  private sampledAt = 0;

  constructor(private readonly scene: Phaser.Scene) {}

  body(
    sprite: Phaser.GameObjects.Sprite,
    actor: LobbyPlayer,
    id: string,
    tick?: number,
  ): void {
    if (tick === undefined || actor.hp <= 0 || actor.pose === 'hurt') return;
    const age = Math.max(0, tick - actor.actionStartedAt);
    const cue = this.motions.get(id);
    let dir = facing(actor.fx, actor.fy);
    let pose: string;
    if (cue && (cue.tick === undefined || actor.actionStartedAt <= cue.tick)) {
      // A confirmed contact may arrive between two short-lived pose patches.
      cue.shownAt ??= this.scene.time.now;
      const elapsed = (this.scene.time.now - cue.shownAt) / tickMs;
      if (elapsed >= cue.ticks) {
        this.motions.delete(id);
        return;
      }
      if (cue.skill !== kiem.skyfall) dir = facing(cue.fx, cue.fy);
      pose = cue.skill === kiem.basic && elapsed >= 4 ? 'aim' : cue.pose;
    } else if (actor.pose === 'basic_attack' && actor.basicId === kiem.basic) {
      pose = age >= 4 ? 'aim' : actor.basicStage;
      if (
        pose !== 'thrust' &&
        pose !== 'aim' &&
        !Object.hasOwn(basicCuts, pose)
      )
        return;
    } else if (
      actor.pose === 'cast' &&
      actor.castAbilityId === kiem.sevenCuts
    ) {
      pose = poses[Math.floor(age / cutTicks)] ?? 'aim';
    } else if (actor.pose === 'cast' && actor.castAbilityId === kiem.skyfall)
      pose = 'aim';
    else return;
    sprite.anims.stop();
    sprite
      .setTexture(bodyKey, dir + '_' + pose)
      .setOrigin(0.5, 0.775)
      .setScale(0.5)
      .setFlip(false, false)
      .setRotation(0);
  }

  event(event: CombatEvent): boolean {
    const { abilityId, kind, stage } = event;
    const basic = abilityId === kiem.basic && kind === 'attack';
    if (kind === 'cast' || kind === 'attack')
      this.motions.delete(event.sourceId);
    if (basic) {
      const index = basicCuts[stage ?? ''];
      if (stage === 'thrust' || index !== undefined)
        this.motion(event, stage!, 6);
      if (index !== undefined) this.stroke(event, index, true);
      return true;
    }
    if (
      abilityId === kiem.sevenCuts &&
      kind === 'pulse' &&
      stage === 'sweep' &&
      event.hitIndex !== undefined
    ) {
      this.motion(event, poses[event.hitIndex] ?? 'aim', cutTicks);
      this.stroke(event, event.hitIndex, false);
    }
    if (abilityId === kiem.skyfall && kind === 'cast')
      this.motion(event, 'aim', vanKiemSky.aimTicks);
    return voDangKiemHandled(abilityId);
  }

  private motion(event: CombatEvent, pose: string, ticks: number): void {
    this.motions.set(event.sourceId, {
      skill: event.abilityId,
      pose,
      ticks,
      tick: event.tick,
      fx: event.fx ?? 1,
      fy: event.fy ?? 0,
    });
  }

  private stroke(event: CombatEvent, index: number, basic: boolean): void {
    const fx = event.fx ?? 1,
      fy = event.fy ?? 0;
    const dir = facing(fx, fy);
    const root = this.point?.(event.sourceId) ?? event;
    const front = (event.radius ?? 80) * (basic ? 0.4 : 0.55);
    const stroke = this.image(
      `cut_${index}`,
      basic ? 'basic:' + event.stage : 'seven:' + index,
    );
    stroke
      .setPosition(root.x + fx * front, root.y + fy * front - 18)
      .setRotation(
        dir === 'up' ? -Math.PI / 2 : dir === 'down' ? Math.PI / 2 : 0,
      )
      .setFlip(dir === 'left', basic && event.stage === 'cut_up')
      .setDepth(root.y + (dir === 'up' ? -0.3 : 0.7))
      .setScale(
        (basic ? 53 : index === 6 ? 101 : 89) /
          Math.max(stroke.width, stroke.height),
      )
      .setAlpha(basic ? 0.83 : 0.97);
    this.fade(
      stroke,
      basic ? 155 : cutTicks * tickMs - 10 + (index === 6 ? 55 : 0),
      44,
    );
  }

  private image(frame: string, name: string): Image {
    return this.scene.add.image(0, 0, fxKey, frame).setName('vdk:' + name);
  }

  private fade(image: Image, ms: number, delay: number): void {
    this.bursts.add(image);
    this.scene.tweens.add({
      targets: image,
      alpha: 0,
      delay,
      duration: ms - delay,
      onComplete: () => {
        this.bursts.delete(image);
        image.destroy();
      },
    });
  }

  sync(
    state: LobbyState | undefined,
    zone: string,
    point?: (id: string) => Point | undefined,
    sessionId?: string,
  ): void {
    this.point = point;
    const tick = zoneTick(state, zone);
    if (tick !== undefined && tick !== this.lastTick) {
      this.lastTick = tick;
      this.sampledAt = this.scene.time.now;
    }
    const active = new Set<string>();
    if (tick !== undefined)
      state?.areas.forEach((area, id) => {
        if (
          area.zoneId !== zone ||
          area.abilityId !== kiem.skyfall ||
          area.ticks <= 0
        )
          return;
        active.add(id);
        let view = this.skyfalls.get(id);
        if (!view) {
          view = new VanKiemVolley(
            this.scene,
            fxKey,
            id,
            {
              x: area.launchX,
              y: area.launchY,
              fx: area.launchFx,
              fy: area.launchFy,
            },
            area,
            0.5,
            area.ownerId === sessionId
              ? () => playVanKiemLandingSound(this.scene)
              : undefined,
          );
          this.skyfalls.set(id, view);
        }
        const elapsed = (tick - area.startedAt) * tickMs;
        const interpolation = Phaser.Math.Clamp(
          this.scene.time.now - this.sampledAt,
          0,
          tickMs - 0.01,
        );
        view.draw(elapsed + interpolation);
      });
    for (const [id, view] of this.skyfalls) {
      if (active.has(id)) continue;
      view.destroy();
      this.skyfalls.delete(id);
    }
    for (const id of this.motions.keys()) {
      const actor = state?.players.get(id);
      if (!actor || actor.zoneId !== zone || actor.hp <= 0)
        this.motions.delete(id);
    }
  }

  clear(): void {
    for (const volley of this.skyfalls.values()) volley.destroy();
    for (const burst of this.bursts) {
      this.scene.tweens.killTweensOf(burst);
      burst.destroy();
    }
    this.skyfalls.clear();
    this.bursts.clear();
    this.motions.clear();
    this.lastTick = -1;
    this.point = undefined;
  }
}
