import Phaser from 'phaser';
import { conLuan, duongMon, type CombatEvent } from '@volam/game-core';
import type { LobbyPlayer, LobbyState } from '@volam/game-protocol';
import assets from './skill-revise-assets.generated.json';
import { zoneTick } from './zone-tick.js';

const key = (id: string) => 'skill-revise:' + id;
const dirs = [
  'right',
  'down_right',
  'down',
  'down_left',
  'left',
  'up_left',
  'up',
  'up_right',
];
const dir = (fx: number, fy: number) =>
  dirs[(Math.round(Math.atan2(fy, fx) / (Math.PI / 4)) + 8) % 8]!;
const replaced = new Set([
  'hoa_van_chuong',
  'chiet_mai_thu',
  'that_tinh_kiem',
  'huyen_am_chuong',
]);
export const revisedSkillVisual = (id: string) => replaced.has(id);
export function preloadSkillRevise(scene: Phaser.Scene) {
  for (const a of assets) scene.load.atlas(key(a.id), a.png, a.atlas);
}
type Image = Phaser.GameObjects.Image;
type Effect = {
  image: Image;
  frames: string[];
  at: number;
  ms: number;
  owner: string;
  impact: boolean;
  from?: { x: number; y: number };
  to?: { x: number; y: number };
  delay?: number;
  peakShown?: boolean;
  lateUntil?: number;
};
/** Presentation only. Cast locks, movement, hits and durations arrive from the server. */
export class SkillReviseArt {
  private objects = new Map<string, Image>();
  private bursts = new Set<Effect>();
  private trail = new Map<string, { x: number; y: number }>();
  private observations = new Set<string>();
  private parries = new Map<
    string,
    { until: number; fx: number; fy: number }
  >();
  private hammerTakes = new Map<
    string,
    {
      at?: number;
      cell: number;
      finishedAt?: number;
      stage: string;
      direction: string;
      impact?: CombatEvent;
      impactShown?: boolean;
    }
  >();
  private state: LobbyState | undefined;
  private zone = '';
  private airLasers = new Map<
    string,
    { x: number; y: number; fx: number; fy: number; shownAt?: number }
  >();
  constructor(private scene: Phaser.Scene) {
    for (const a of assets)
      scene.textures
        .get(key(a.id))
        .setFilter(Phaser.Textures.FilterMode.LINEAR);
  }
  private frames(pack: string, prefix: string) {
    return assets
      .find((a) => a.id === pack)!
      .frames.filter(
        (f) => !prefix || f === prefix || f.startsWith(prefix + '_'),
      );
  }
  private image(id: string, pack: string, frame: string, wanted: Set<string>) {
    wanted.add(id);
    let image = this.objects.get(id);
    if (!image) {
      image = this.scene.add
        .image(0, 0, key(pack), frame)
        .setName('revise:' + id);
      this.objects.set(id, image);
    } else image.setTexture(key(pack), frame);
    return image
      .setOrigin(0.5)
      .setRotation(0)
      .setFlip(false, false)
      .setAlpha(1);
  }
  private flash(
    pack: string,
    frames: string[],
    e: CombatEvent,
    ms = 400,
    scale = 0.5,
    from?: { x: number; y: number },
    delay = 0,
  ) {
    if (!frames.length) return;
    const ground =
      pack === 'fire-impact' ||
      pack === 'ink-impact' ||
      frames[0]?.startsWith('impact') ||
      frames[0]?.startsWith('blast');
    const image = this.scene.add
      .image(e.x, e.y, key(pack), frames[0])
      .setOrigin(0.5, ground ? 0.72 : 0.5)
      .setScale(scale)
      .setDepth(e.y + 0.4)
      .setName('revise:' + e.stage);
    if (pack === 'fire-impact')
      image
        .setOrigin(0.5)
        .setScale(scale, scale * 0.42)
        .setDepth(0);
    this.bursts.add({
      image,
      frames,
      at: this.scene.time.now,
      ms,
      owner: e.sourceId,
      impact: true,
      ...(from ? { from, to: { x: e.x, y: e.y } } : {}),
      delay,
    });
  }
  event(e: CombatEvent): boolean {
    const pulse = e.kind === 'pulse';
    if (
      (e.kind === 'cast' || e.kind === 'attack') &&
      e.abilityId !== duongMon.laser
    )
      this.airLasers.delete(e.sourceId);
    if (e.abilityId === duongMon.laser && e.stage === 'air_laser')
      this.airLasers.set(e.sourceId, {
        x: e.x,
        y: e.y,
        fx: e.fx ?? 1,
        fy: e.fy ?? 0,
      });
    if (e.abilityId === conLuan.monk && e.kind === 'attack')
      this.hammerTakes.set(e.sourceId, {
        cell: 0,
        stage: e.stage === 'overhead' ? 'slam' : (e.stage ?? 'thrust'),
        direction: dir(e.fx ?? 1, e.fy ?? 0),
      });
    if (e.abilityId === conLuan.monk && pulse && e.stage === 'area_tick') {
      const take = this.hammerTakes.get(e.sourceId);
      if (take?.stage === 'slam') take.impact = e;
      return true;
    }
    if (e.abilityId === 'hoa_van_chuong') {
      if (pulse && e.stage === 'dash_impact')
        this.flash(
          'fire-impact',
          this.frames('fire-impact', ''),
          e,
          430,
          (e.radius ?? 66) / 100,
        );
      return true;
    }
    if (e.abilityId === 'chiet_mai_thu') {
      if (pulse && e.stage === 'wind_gather')
        this.flash('wind-gather', this.frames('wind-gather', ''), e, 260, 1.45);
      return true;
    }
    if (e.abilityId === 'huyen_am_chuong') {
      if (pulse && e.stage === 'area_tick')
        this.flash(
          'ink-impact',
          this.frames('ink-impact', ''),
          e,
          500,
          (e.radius ?? 36) / 70,
        );
      return true;
    }
    if (e.abilityId === 'that_tinh_kiem') {
      if (pulse && e.stage === 'sword_rain_fall')
        this.flash(
          'sword-rain-impact',
          [0, 1, 2, 3].map((n) => 'sword' + n),
          e,
          500,
          0.55,
          { x: e.x - 24, y: e.y - 180 },
          ((e.hitIndex ?? 0) * 1000) / 15,
        );
      if (pulse && e.stage === 'sword_rain_impact')
        this.flash(
          'sword-rain-impact',
          Array.from({ length: 8 }, (_, n) => 'impact' + n),
          e,
          350,
          0.6,
        );
      return true;
    }
    if (e.stage === 'lightning_parry') {
      this.parries.set(e.sourceId, {
        until: (e.tick ?? 0) + 8,
        fx: e.fx ?? 1,
        fy: e.fy ?? 0,
      });
      this.flash(
        'lightning-parry',
        [0, 1, 2, 3].map((n) => 'parry' + n),
        e,
        240,
        0.5,
      );
      const target =
        this.state?.players.get(e.targetId) ??
        this.state?.creeps.get(e.targetId);
      if (target) {
        const from = { x: e.x, y: e.y - 20 },
          to = { x: target.x, y: target.y - 15 },
          frames = [0, 1, 2, 3].map((n) => 'bolt' + n);
        const image = this.scene.add
          .image(
            (from.x + to.x) / 2,
            (from.y + to.y) / 2,
            key('lightning-parry'),
            frames[0],
          )
          .setOrigin(0.5)
          .setRotation(Math.atan2(to.y - from.y, to.x - from.x))
          .setScale(Math.hypot(to.x - from.x, to.y - from.y) / 180, 0.65)
          .setDepth(target.y + 0.4);
        this.bursts.add({
          image,
          frames,
          at: this.scene.time.now,
          ms: 240,
          owner: e.sourceId,
          impact: true,
        });
      }
      return true;
    }
    if (
      e.abilityId === conLuan.star &&
      pulse &&
      e.stage === 'formation_burst'
    ) {
      // The retained Q bolt/ring is the approved explosion; deliberately no stun VFX.
      const texture = 'con_luan_spell_fx';
      for (const tag of ['violet_bolt', 'violet_ring']) {
        const frames = this.scene.textures
          .get(texture)
          .getFrameNames()
          .filter((f) => f.startsWith(tag + '_'));
        if (!frames.length) continue;
        const image = this.scene.add
          .image(e.x, e.y, texture, frames[0])
          .setScale(0.5)
          .setDepth(tag === 'violet_ring' ? 0 : e.y + 0.1);
        this.bursts.add({
          image,
          frames,
          at: this.scene.time.now,
          ms: 350,
          owner: e.sourceId,
          impact: true,
        });
      }
      return true;
    }
    if (e.abilityId === duongMon.arrows && pulse && e.stage === 'area_tick') {
      this.flash(
        'ice-bomb',
        Array.from({ length: 8 }, (_, n) => 'blast' + n),
        e,
        380,
        0.6,
      );
      return true;
    }
    if (
      e.abilityId === duongMon.laser &&
      (e.stage === 'air_laser' || e.stage === 'dash_end')
    )
      return true;
    return false;
  }
  body(
    sprite: Phaser.GameObjects.Sprite,
    a: LobbyPlayer,
    tick: number,
    id: string,
  ) {
    const d = dir(a.fx, a.fy),
      age = Math.max(0, tick - a.actionStartedAt),
      statuses = JSON.parse(a.statuses) as { kind: string }[];
    let pack = '',
      frame = '',
      scale = 0.5;
    const cast =
      (a.pose === 'cast' || a.pose === 'basic_attack') && tick < a.actionUntil;
    if (a.basicId === conLuan.monk) {
      let take = this.hammerTakes.get(id);
      if (
        a.hp <= 0 ||
        a.pose === 'walk' ||
        a.pose === 'hurt' ||
        statuses.some((s) => s.kind === 'stun') ||
        (cast && a.castAbilityId !== conLuan.monk) ||
        (take?.finishedAt !== undefined &&
          this.scene.time.now - take.finishedAt >= 100)
      ) {
        this.hammerTakes.delete(id);
        take = undefined;
      }
      const chaos = statuses.some((s) => s.kind === 'con_luan_chaos'),
        prefix = chaos ? 'chaos_' : '';
      pack = 'thien-su';
      if (a.hp <= 0)
        frame = prefix + 'death_' + Math.min(1, Math.floor(age / 5)) + '_' + d;
      else if (take || (cast && a.castAbilityId === conLuan.monk)) {
        const stage =
          take?.stage ??
          (a.basicStage === 'overhead' ? 'slam' : a.basicStage || 'thrust');
        const direction = take?.direction ?? d;
        const compactSweep =
          stage === 'sweep' &&
          this.scene.textures.exists(key('hammer-sweep-v8')) &&
          this.scene.textures
            .get(key('hammer-sweep-v8'))
            .has('sweep_0_' + direction);
        const comboPack = compactSweep
          ? 'hammer-sweep-v8'
          : this.scene.textures.exists(key('hammer-combo-v7'))
            ? 'hammer-combo-v7'
            : 'hammer-combo-v6';
        const revisedCombo =
          (stage === 'slam' || stage === 'sweep') &&
          this.scene.textures
            .get(key(comboPack))
            .has(stage + '_0_' + direction);
        const revisedSlam =
          !revisedCombo &&
          stage === 'slam' &&
          this.scene.textures
            .get(key('hammer-slam-v5'))
            .has('slam_0_' + direction);
        pack = revisedCombo
          ? comboPack
          : revisedSlam
            ? 'hammer-slam-v5'
            : 'hammer-coherent-v4';
        const durations = revisedCombo
          ? comboPack === 'hammer-combo-v7' || compactSweep
            ? stage === 'slam'
              ? [25, 65, 70, 45, 120, 50]
              : [25, 60, 85, 85, 80, 40]
            : stage === 'slam'
              ? [20, 50, 55, 35, 90, 35]
              : [20, 45, 65, 65, 60, 30]
          : revisedSlam
            ? [15, 20, 25, 25, 35, 25, 15, 45, 40, 25]
            : stage === 'thrust'
              ? [60, 65, 65, 70, 65, 50]
              : [50, 50, 50, 50, 50, 50];
        const last = durations.length - 1;
        // The current 375ms take fits the approved 400ms server beat.
        // Movement, damage, cooldown and new accepted inputs remain server-owned.
        if (take) {
          if (take.at !== undefined)
            take.cell = Math.min(
              last,
              take.cell +
                Math.min(
                  1,
                  (this.scene.time.now - take.at) /
                    durations[Math.min(last, Math.floor(take.cell))]!,
                ),
            );
          take.at = this.scene.time.now;
          if (take.cell >= last) take.finishedAt ??= this.scene.time.now;
        }
        // Keep authored cels readable on a slow renderer; never advance more
        // than one cel per drawn frame. A new accepted input interrupts this take.
        const index = Math.min(last, Math.floor(take?.cell ?? age / 3));
        if (
          ((revisedCombo && stage === 'slam') || revisedSlam) &&
          take?.impact &&
          index >= (revisedCombo ? 4 : 7) &&
          !take.impactShown
        ) {
          take.impactShown = true;
          const e = take.impact,
            texture = 'con_luan_thien_su_fx';
          const frames = this.scene.textures
            .get(texture)
            .getFrameNames()
            .filter((n) => n.startsWith('slam_'));
          const image = this.scene.add
            .image(e.x, e.y, texture, frames[0])
            .setScale(0.65)
            .setDepth(0)
            .setName('revise:hammer-ground-contact');
          this.bursts.add({
            image,
            frames,
            at: this.scene.time.now,
            ms: 260,
            owner: id,
            impact: true,
          });
        }
        frame = stage + '_' + index + '_' + direction;
        if (chaos) scale *= 1.34;
      } else if (cast) {
        frame =
          prefix +
          (a.castAbilityId === conLuan.hammer ? 'hammer_throw' : 'cast') +
          '_' +
          d;
      } else if ((this.parries.get(id)?.until ?? 0) > tick) {
        const p = this.parries.get(id)!;
        frame = prefix + 'parry_' + dir(p.fx, p.fy);
      } else if (a.pose === 'hurt')
        frame = prefix + 'hurt_' + Math.min(1, Math.floor(age / 3)) + '_' + d;
      else if (a.pose !== 'walk') {
        pack = 'hammer-coherent-v4';
        frame = 'idle_' + (Math.floor(tick / 21) % 4) + '_' + d;
        if (chaos) scale *= 1.34;
      } else if (['left', 'down_left', 'up_left'].includes(d)) {
        pack = 'hammer-coherent-v4';
        frame = 'walk_' + (Math.floor(tick / 3) % 4) + '_' + d;
        if (chaos) scale *= 1.34;
      } else
        frame =
          prefix +
          (a.pose === 'walk'
            ? 'walk_' + (Math.floor(tick / 3) % 4)
            : 'idle_' + (Math.floor(tick / 21) % 4)) +
          '_' +
          d;
    } else if (cast && a.castAbilityId === 'hoa_van_chuong') {
      pack = 'cai-bang-fire-body';
      frame =
        ['gather', 'palm', 'dash', 'recover'][
          age < 2 ? 0 : age < 4 ? 1 : tick < a.actionUntil - 2 ? 2 : 3
        ] +
        '_' +
        d;
    } else if (cast && a.castAbilityId === 'chiet_mai_thu') {
      const retreatTicks = 8;
      pack =
        age < retreatTicks ? 'thien-son-retreat-body' : 'thien-son-gust-body';
      frame =
        (age < retreatTicks
          ? ['brace', 'pushback', 'retreat', 'plant'][
              Math.min(3, Math.floor(age / 2))
            ]
          : ['fanback', 'sweep', 'release', 'recover'][
              Math.min(3, Math.floor((age - retreatTicks) / 2))
            ]) +
        '_' +
        d;
    } else if (
      a.basicId === duongMon.coQuan &&
      statuses.some((s) => s.kind === 'duong_mon_flight') &&
      cast
    ) {
      if (a.castAbilityId === duongMon.arrows) {
        pack = 'co-quan-air-q';
        frame =
          ['ready', 'windup', 'throw', 'recover'][
            age < 3 ? 0 : age < 7 ? 1 : age < 11 ? 2 : 3
          ] +
          '_' +
          d;
      }
      if (a.castAbilityId === duongMon.laser) {
        pack = 'co-quan-air-e';
        frame =
          ['aimdown', 'lean', 'dash', 'brake'][
            age < 3 ? 0 : age < 6 ? 1 : tick < a.actionUntil - 2 ? 2 : 3
          ] +
          '_' +
          d;
      }
    }
    if (pack && frame && this.scene.textures.get(key(pack)).has(frame)) {
      sprite
        .stop()
        .setTexture(key(pack), frame)
        .setOrigin(0.5, 320 / 448)
        .setScale(scale)
        .setFlip(false, false)
        .setRotation(0)
        .setAlpha(a.hp <= 0 ? 0.45 : 1)
        .clearTint();
      const token = pack + ':' + frame;
      this.observations.add(token);
      sprite.setData('skill-revise-frame', token);
    } else sprite.setData('skill-revise-frame', '');
    if (statuses.some((s) => s.kind === 'concealed')) sprite.setAlpha(0.22);
  }
  sync(
    state: LobbyState | undefined,
    zone: string,
    position?: (id: string) => { x: number; y: number } | undefined,
  ) {
    if (!state || zone !== this.zone) {
      this.clear();
      this.zone = zone;
      if (!state) return;
    }
    this.state = state;
    const wanted = new Set<string>(),
      tick = zoneTick(state, zone) ?? 0;
    state?.projectiles.forEach((p, id) => {
      if (p.zoneId !== zone) return;
      const pack =
        p.abilityId === 'chiet_mai_thu'
          ? 'wind-crescent'
          : p.abilityId === 'huyen_am_chuong'
            ? 'sonic-wave'
            : '';
      if (pack) {
        const frame =
          'travel' +
          (Math.floor((tick - p.startedAt) / 2) % 4) +
          '_' +
          dir(p.vx, p.vy);
        this.image(id, pack, frame, wanted)
          .setPosition(p.x, p.y - 22)
          .setScale(pack === 'wind-crescent' ? 0.65 : 0.65)
          .setDepth(p.y + 0.3);
      }
    });
    state?.areas.forEach((a, id) => {
      if (
        a.zoneId !== zone ||
        a.abilityId !== duongMon.arrows ||
        a.stage !== 'ice_bomb'
      )
        return;
      const t = Phaser.Math.Clamp((tick - a.startedAt) / 20, 0, 1),
        frame = 'bomb' + (Math.floor(t * 12) % 4);
      this.image(id, 'ice-bomb', frame, wanted)
        .setPosition(
          Phaser.Math.Linear(a.launchX, a.x, t),
          Phaser.Math.Linear(a.launchY - 40, a.y, t) -
            Math.sin(t * Math.PI) * 38,
        )
        .setScale(0.175)
        .setDepth(a.y + 0.4);
    });
    state?.players.forEach((a, id) => {
      const casting = a.pose === 'cast' && tick < a.actionUntil;
      let air = this.airLasers.get(id);
      if (
        air &&
        (a.basicId !== duongMon.coQuan ||
          a.castAbilityId !== duongMon.laser ||
          a.pose === 'walk' ||
          !JSON.parse(a.statuses).some(
            (s: { kind: string }) => s.kind === 'duong_mon_flight',
          ))
      ) {
        this.airLasers.delete(id);
        air = undefined;
      }
      const showAir =
        air &&
        (casting ||
          air.shownAt === undefined ||
          this.scene.time.now - air.shownAt < 400);
      if (a.zoneId !== zone || a.hp <= 0 || (!casting && !showAir)) {
        this.airLasers.delete(id);
        this.trail.delete(id);
        return;
      }
      const p = position?.(id) ?? a;
      if (a.castAbilityId === 'hoa_van_chuong') {
        const d = dir(a.fx, a.fy);
        this.image(
          'dragon:' + id,
          'fire-dragon',
          'travel' + (Math.floor(tick / 2) % 4) + '_' + d,
          wanted,
        )
          .setPosition(p.x + a.fx * 30, p.y + a.fy * 30 - 20)
          .setScale(0.5)
          .setDepth(p.y + 0.5);
        const prev = this.trail.get(id);
        if (!prev || Math.hypot(p.x - prev.x, p.y - prev.y) > 19) {
          this.trail.set(id, { x: p.x, y: p.y });
          this.flash(
            'fire-trail',
            this.frames('fire-trail', ''),
            {
              id: 0,
              kind: 'pulse',
              sourceId: id,
              targetId: '',
              abilityId: a.castAbilityId,
              x: p.x,
              y: p.y,
              damage: 0,
              critical: false,
            },
            300,
            0.5,
          );
        }
      }
      if (
        a.basicId === duongMon.coQuan &&
        a.castAbilityId === duongMon.laser &&
        JSON.parse(a.statuses).some(
          (s: { kind: string }) => s.kind === 'duong_mon_flight',
        )
      ) {
        if (tick - a.actionStartedAt < 5) return;
        if (air) air.shownAt ??= this.scene.time.now;
        const frame = 'beam' + (Math.floor(tick / 2) % 4);
        const hand = { x: p.x + a.fx * 16, y: p.y - 20 },
          contact = { x: p.x + a.fx * 35, y: p.y + 14 + a.fy * 35 };
        const beam = (
          name: string,
          from: { x: number; y: number },
          width: number,
        ) =>
          this.image(name + id, 'laser-ground', frame, wanted)
            .setPosition((from.x + contact.x) / 2, (from.y + contact.y) / 2)
            .setRotation(Math.atan2(contact.y - from.y, contact.x - from.x))
            .setScale(
              Math.hypot(contact.x - from.x, contact.y - from.y) / 116,
              width,
            )
            .setDepth(contact.y - 0.1);
        beam('beam:', hand, 0.9);
        const action = JSON.parse(a.actionState || '{}') as {
          originX?: number;
          originY?: number;
        };
        if (air) {
          action.originX ??= air.x;
          action.originY ??= air.y;
        }
        if (action.originX !== undefined && action.originY !== undefined)
          beam(
            'ground-rail:',
            { x: action.originX + a.fx * 35, y: action.originY + a.fy * 35 },
            0.6,
          );
        this.image(
          'contact:' + id,
          'laser-ground',
          'contact' + (Math.floor(tick / 2) % 4),
          wanted,
        )
          .setPosition(contact.x, contact.y)
          .setScale(0.55)
          .setDepth(contact.y + 0.2);
      }
    });
    for (const [id, image] of this.objects)
      if (!wanted.has(id)) {
        image.destroy();
        this.objects.delete(id);
      }
    for (const b of this.bursts) {
      if (b.lateUntil !== undefined) {
        if (this.scene.time.now >= b.lateUntil) {
          b.image.destroy();
          this.bursts.delete(b);
        }
        continue;
      }
      const elapsed = this.scene.time.now - b.at - (b.delay ?? 0),
        t = Phaser.Math.Clamp(elapsed / b.ms, 0, 1);
      if (elapsed >= b.ms) {
        // A slow/occluded client can receive a complete short burst between
        // rendered frames. Submit its readable contact cel once before cleanup.
        if (!b.peakShown) {
          b.image
            .setVisible(true)
            .setFrame(
              b.frames[
                b.from
                  ? b.frames.length - 1
                  : Math.floor((b.frames.length - 1) / 2)
              ]!,
            );
          if (b.to) b.image.setPosition(b.to.x, b.to.y);
          b.peakShown = true;
          b.lateUntil =
            this.scene.time.now + Math.min(120, b.ms / b.frames.length);
          continue;
        }
        b.image.destroy();
        this.bursts.delete(b);
        continue;
      }
      b.image
        .setVisible(elapsed >= 0)
        .setFrame(
          b.frames[
            Math.min(b.frames.length - 1, Math.floor(t * b.frames.length))
          ]!,
        );
      const index = Math.min(
        b.frames.length - 1,
        Math.floor(t * b.frames.length),
      );
      if (index === Math.floor((b.frames.length - 1) / 2)) b.peakShown = true;
      if (b.from && b.to)
        b.image.setPosition(
          Phaser.Math.Linear(b.from.x, b.to.x, t),
          Phaser.Math.Linear(b.from.y, b.to.y, t),
        );
    }
  }
  inspect() {
    return {
      bodies: [...this.observations],
      effects: [...this.objects].map(([id, i]) => ({
        id,
        frame: i.frame.name,
        texture: i.texture.key,
        x: i.x,
        y: i.y,
        scale: i.scaleX,
      })),
      burstFrames: [...this.bursts].map((b) => ({
        frame: b.image.frame.name,
        texture: b.image.texture.key,
        x: b.image.x,
        y: b.image.y,
        visible: b.image.visible,
        depth: b.image.depth,
        scaleX: b.image.scaleX,
        scaleY: b.image.scaleY,
      })),
      bursts: this.bursts.size,
    };
  }
  clear() {
    for (const i of this.objects.values()) i.destroy();
    for (const b of this.bursts) b.image.destroy();
    this.objects.clear();
    this.bursts.clear();
    this.trail.clear();
    this.parries.clear();
    this.hammerTakes.clear();
    this.airLasers.clear();
  }
}
