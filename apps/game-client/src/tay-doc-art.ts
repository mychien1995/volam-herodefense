import Phaser from 'phaser';
import type { LobbyState } from '@volam/game-protocol';
import type { TayDocView } from '@volam/game-core';
import { tayDocDefinition as tuning } from '@volam/game-data';
import playback from './tay-doc-playback.json';

type Clip = { frames: string[]; durationsMs: number[]; repeat: number };
type Bundle = {
  origin: number[];
  animations: Record<string, Clip>;
  bounds: Record<string, number[]>;
};
const bundles = playback as unknown as Record<string, Bundle>;
const key = (id: string) => 'tay:' + id;
const facing = (x: number, y: number) =>
  Math.abs(x) > Math.abs(y)
    ? x < 0
      ? 'left'
      : 'right'
    : y < 0
      ? 'up'
      : 'down';
export const isTayDocActor = (id: string) =>
  id === 'tay_doc' || id === 'tay_doc_pillar';
export function preloadTayDocArt(scene: Phaser.Scene): void {
  for (const id of Object.keys(bundles))
    scene.load.atlas(
      key(id),
      `/assets/tay_doc/${id}.png`,
      `/assets/tay_doc/${id}.json`,
    );
}
export function registerTayDocArt(scene: Phaser.Scene): void {
  for (const [id, bundle] of Object.entries(bundles)) {
    scene.textures.get(key(id)).setFilter(Phaser.Textures.FilterMode.NEAREST);
    for (const [tag, clip] of Object.entries(bundle.animations)) {
      // Phaser adds each frame's duration to its base frame duration (1ms here).
      if (!scene.anims.exists(key(id) + ':' + tag))
        scene.anims.create({
          key: key(id) + ':' + tag,
          frames: clip.frames.map((frame, i) => ({
            key: key(id),
            frame,
            duration: clip.durationsMs[i]! - 1,
          })),
          frameRate: 1000,
          repeat: clip.repeat,
        });
    }
  }
}
type View = {
  image: Phaser.GameObjects.Image;
  label?: Phaser.GameObjects.Text;
  bar?: Phaser.GameObjects.Graphics;
};
/** Timestamp-seekable projection only. Gameplay never reads pixels, animation or local time. */
export class TayDocRenderer {
  private views = new Map<string, View>();
  private active = new Set<string>();
  private frames = new Map<string, Set<string>>();
  private actions = new Set<string>();
  private patchTick = -1;
  private patchTime = 0;
  private tick = 0;
  private current: TayDocView | undefined;
  constructor(private scene: Phaser.Scene) {}
  clear(): void {
    for (const v of this.views.values()) {
      v.image.destroy();
      v.label?.destroy();
      v.bar?.destroy();
    }
    this.views.clear();
    this.current = undefined;
  }
  private cel(
    id: string,
    asset: string,
    tag: string,
    age: number,
    x: number,
    y: number,
    index?: number,
  ): View {
    const bundle = bundles[asset]!,
      clip = bundle.animations[tag]!;
    if (!clip) throw Error(`Missing Tây Độc clip ${asset}/${tag}`);
    const duration = clip.durationsMs.reduce((a, b) => a + b, 0);
    let elapsed = Math.max(0, (age * 1000) / 30),
      cel = clip.frames.length - 1;
    if (clip.repeat === -1) elapsed %= duration;
    for (let i = 0; i < clip.frames.length; i++) {
      if (elapsed < clip.durationsMs[i]!) {
        cel = i;
        break;
      }
      elapsed -= clip.durationsMs[i]!;
    }
    const frame =
      clip.frames[
        index === undefined
          ? cel
          : Math.max(0, Math.min(clip.frames.length - 1, index))
      ]!;
    let view = this.views.get(id);
    if (!view) {
      view = {
        image: this.scene.add
          .image(x, y, key(asset), frame)
          .setName('tay_doc:' + id),
      };
      this.views.set(id, view);
    }
    view.image
      .setTexture(key(asset), frame)
      .setPosition(x, y)
      .setDepth(y)
      .setOrigin(bundle.origin[0]!, bundle.origin[1]!)
      .setScale(1)
      .setRotation(0)
      .setAlpha(1);
    this.active.add(id);
    const seen = this.frames.get(asset) ?? new Set<string>();
    seen.add(frame);
    this.frames.set(asset, seen);
    return view;
  }
  /** Reshape floor art to the *server* circle footprint; alpha never defines a hitbox. */
  private circle(
    id: string,
    asset: string,
    tag: string,
    age: number,
    x: number,
    y: number,
    radius: number,
    alpha = 1,
  ): void {
    const v = this.cel(id, asset, tag, age, x, y),
      b = bundles[asset]!.bounds[v.image.frame.name]!;
    v.image
      .setOrigin(
        (b[0]! + b[2]!) / 2 / v.image.frame.realWidth,
        (b[1]! + b[3]!) / 2 / v.image.frame.realHeight,
      )
      .setScale((2 * radius) / (b[2]! - b[0]!), (2 * radius) / (b[3]! - b[1]!))
      .setDepth(-8000 + y / 10000)
      .setAlpha(alpha);
  }
  private health(
    v: View,
    x: number,
    y: number,
    hp: number,
    max: number,
    label: string,
    width: number,
  ): void {
    v.label ??= this.scene.add
      .text(0, 0, '', {
        fontSize: '11px',
        color: '#fff1bc',
        stroke: '#151b14',
        strokeThickness: 3,
      })
      .setOrigin(0.5, 1);
    v.label
      .setText(label)
      .setPosition(x, y)
      .setDepth(y + 200)
      .setVisible(true);
    v.bar ??= this.scene.add.graphics();
    v.bar
      .clear()
      .fillStyle(0x171419, 0.9)
      .fillRect(x - width / 2, y + 2, width, 5)
      .fillStyle(0x91c852)
      .fillRect(
        x - width / 2 + 1,
        y + 3,
        (width - 2) * Math.max(0, hp / max),
        3,
      )
      .setDepth(y + 200);
  }
  sync(state: LobbyState | undefined, zoneId: string): void {
    const raw =
      zoneId === 'arena' ? state?.tayDoc?.get('arena')?.json : undefined;
    if (!raw || raw === 'null') {
      this.clear();
      return;
    }
    const data = JSON.parse(raw) as TayDocView;
    this.current = data;
    if (data.phase === 'waiting') {
      this.clear();
      return;
    }
    if (this.patchTick !== data.tick) {
      this.patchTick = data.tick;
      this.patchTime = this.scene.time.now;
    }
    this.tick =
      data.tick +
      Math.min(2, ((this.scene.time.now - this.patchTime) * 30) / 1000);
    this.active.clear();
    const boss = state!.creeps.get(data.bossId),
      c = data.cast;
    if (boss) {
      const dir = facing(boss.fx, boss.fy),
        p2 = data.phase === 'phase2',
        age = c ? this.tick - c.startedAt : 0;
      let asset = p2 ? (dir === 'right' ? 'newactor' : 'directions') : 'p1',
        tag =
          (p2 ? 'crawl' : boss.pose === 'walk' ? 'walk' : 'idle') + '_' + dir,
        index: number | undefined;
      let clock = this.tick,
        lift = 0;
      if (data.phase === 'dead') {
        asset = data.transitionAt > 0 ? 'p2' : 'p1';
        tag = 'death_' + dir;
        clock = this.tick - data.deathAt;
      } else if (data.phase === 'transition') {
        asset = 'transition';
        const t = this.tick - data.transitionAt,
          spans = [18, 18, 19, 14],
          tags = [
            'staff_release',
            'cap_mo_crouch',
            'cap_mo_charge',
            'energy_eruption',
          ];
        let start = 0,
          i = 0;
        while (i < 3 && t >= start + spans[i]!) {
          start += spans[i]!;
          i++;
        }
        tag = tags[i] + '_' + dir;
        clock = t - start;
        this.circle(
          'transition',
          'fxt',
          'transition_circle_warning',
          t,
          boss.x,
          boss.y,
          100,
          0.75,
        );
      } else if (c) {
        this.actions.add(c.ability + ':' + dir);
        let pose = p2 ? 'palm_attack' : 'staff_sweep';
        if (c.ability === 'ngu_doc_than_chuong') pose = 'exhale';
        if (
          c.ability === 'van_doc_bao_phat' ||
          c.ability === 'cap_mo_chan_kich'
        )
          pose = 'hop';
        asset =
          dir === 'right'
            ? pose === 'hop' || pose === 'exhale'
              ? 'newactor'
              : 'actions'
            : 'directions';
        tag = pose + '_' + dir;
        clock = age;
        if (this.tick < c.activeAt)
          index = Math.min(
            1,
            Math.floor(age / Math.max(1, (c.activeAt - c.startedAt) / 2)),
          );
        else if (c.ability === 'ngu_doc_than_chuong')
          clock = this.tick - c.activeAt;
        else if (c.ability === 'van_doc_bao_phat') {
          const local =
              (this.tick - c.activeAt) % (tuning.jumpTicks + tuning.jumpRest),
            p = Math.min(1, local / tuning.jumpTicks);
          lift = Math.sin(p * Math.PI) * 48;
          index = Math.min(3, Math.floor(p * 4));
        } else index = this.tick - c.activeAt < 4 ? 2 : 3;
      } else if (p2 && boss.pose === 'idle') clock = this.tick * 0.35;
      const actor = this.cel(
        'boss',
        asset,
        tag,
        clock,
        boss.x,
        boss.y - lift,
        index,
      );
      actor.image.setDepth(boss.y);
      this.health(
        actor,
        boss.x,
        boss.y - 75 - lift,
        boss.hp,
        boss.maxHp,
        `Tây Độc · ${data.phase === 'phase2' ? 'Cáp Mô · ' : ''}${Math.ceil((100 * boss.hp) / boss.maxHp)}%`,
        90,
      );
      if (c) this.cast(c, boss.x, boss.y);
    }
    for (const p of data.pillars) {
      const age = this.tick - p.at,
        dead = p.deadAt !== undefined;
      const heading = state!.creeps.get(p.id),
        angle = heading ? Math.atan2(heading.fy, heading.fx) : 0;
      const i = ((Math.round(angle / (Math.PI / 4)) % 8) + 8) % 8;
      const v = this.cel(
        p.id,
        dead ? 'newfx' : age < 15 ? 'newfx' : 'snake8',
        dead ? 'snake_break' : age < 15 ? 'snake_rise' : 'snake_facing_8',
        dead ? this.tick - p.deadAt! : age,
        p.x,
        p.y,
        dead || age < 15 ? undefined : i,
      );
      v.image.setOrigin(0.5, 178 / 256).setDepth(p.y);
      this.health(
        v,
        p.x,
        p.y - 100,
        p.hp,
        p.maxHp,
        dead ? 'Đã phá' : `Cọc rắn ${Math.ceil(p.hp)}`,
        52,
      );
    }
    for (const p of data.pools) {
      this.circle(
        p.id + ':floor',
        'fx1',
        'cloud_warning',
        this.tick - p.activeAt,
        p.x,
        p.y,
        p.radius,
        0.65,
      );
      const v = this.cel(
        p.id,
        'fx1',
        'cloud_loop',
        this.tick - p.activeAt,
        p.x,
        p.y - 15,
      );
      v.image
        .setScale(0.75)
        .setAlpha(0.65)
        .setDepth(p.y - 1);
    }
    for (const m of data.marks) {
      const h = state!.players.get(m.targetId);
      if (!h || h.zoneId !== zoneId || h.hp <= 0) continue;
      this.circle(
        m.id + ':danger',
        'fx2',
        'eruption_circle_warning',
        this.tick - m.at,
        h.x,
        h.y,
        tuning.curseRadius,
        0.8,
      );
      const v = this.cel(
        m.id,
        'newfx',
        'curse_mark',
        this.tick - m.at,
        h.x,
        h.y - 58,
      );
      v.image.setScale(0.55).setDepth(h.y + 2);
      v.label ??= this.scene.add
        .text(0, 0, '', {
          fontSize: '15px',
          color: '#fff1a4',
          stroke: '#202016',
          strokeThickness: 3,
        })
        .setOrigin(0.5, 1);
      v.label
        .setText(
          `Độc nổ ${Math.max(0, (m.until - this.tick) / 30).toFixed(1)}s`,
        )
        .setPosition(h.x, h.y - 82)
        .setDepth(h.y + 3);
    }
    for (const p of data.poisons) {
      const h = state!.players.get(p.targetId);
      if (h && h.zoneId === zoneId && h.hp > 0)
        this.cel(
          'poison:' + p.targetId,
          'fx1',
          'poison_status',
          this.tick,
          h.x,
          h.y - 20,
        )
          .image.setScale(0.45)
          .setDepth(h.y + 1);
    }
    for (const s of data.projectiles) {
      const age = this.tick - s.startedAt,
        delta = Math.min(
          s.remaining / Math.hypot(s.vx, s.vy),
          (this.tick - data.tick) / 30,
        ),
        x = s.x + s.vx * delta,
        y = s.y + s.vy * delta;
      const needle = s.ability === 'van_doc_phi_cham',
        palm = [
          'doc_chuong',
          'ngu_doc_than_chuong',
          'van_doc_bao_phat',
        ].includes(s.ability);
      const v = this.cel(
        s.id,
        palm ? 'fx2' : 'fx1',
        palm
          ? 'giant_palm_projectile'
          : needle
            ? 'poison_needle'
            : 'poison_bolt',
        age,
        x,
        y,
      );
      v.image
        .setScale(palm ? 0.32 : needle ? 0.22 : 0.3)
        .setRotation(Math.atan2(s.vy, s.vx))
        .setDepth(y + 5);
    }
    for (const e of data.impacts) {
      const age = this.tick - e.at;
      if (age > 18) continue;
      if (e.ability === 'cap_mo_chan_kich')
        this.circle(
          e.id,
          'fxt',
          'transition_shockwave',
          age,
          e.x,
          e.y,
          e.radius,
          0.85,
        );
      else if (e.ability === 'co_doc_khoan_tam')
        this.circle(e.id, 'newfx', 'curse_burst', age, e.x, e.y, e.radius);
      else if (e.ability === 'van_doc_bao_phat')
        this.circle(e.id, 'fx2', 'circular_eruption', age, e.x, e.y, e.radius);
    }
    for (const [id, v] of this.views)
      if (!this.active.has(id)) {
        v.image.destroy();
        v.label?.destroy();
        v.bar?.destroy();
        this.views.delete(id);
      }
  }
  private cast(c: NonNullable<TayDocView['cast']>, x: number, y: number): void {
    const t = this.tick - c.startedAt,
      angle = Math.atan2(c.fy, c.fx),
      warning = this.tick < c.activeAt;
    if (c.ability === 'tay_doc_staff') {
      if (this.tick < c.activeAt + 12) {
        const v = this.cel(
          c.id,
          'staff180',
          warning ? 'staff_180_warning' : 'staff_180_sweep',
          warning ? t : this.tick - c.activeAt,
          c.origin.x,
          c.origin.y,
        );
        v.image.setRotation(angle).setDepth(warning ? -8000 : y + 1);
      }
    } else if (c.ability === 'van_doc_phi_cham' && warning) {
      const v = this.cel(
        c.id,
        'fx1',
        'needle_fan_warning',
        t,
        c.origin.x,
        c.origin.y,
      );
      v.image
        .setOrigin(48 / 256, 0.5)
        .setScale(tuning.attacks.van_doc_phi_cham.range / 180)
        .setRotation(angle)
        .setDepth(-8000)
        .setAlpha(0.65);
    } else if (c.ability === 'doc_vu_me_hon' && warning)
      for (let i = 0; i < c.points.length; i++) {
        const p = c.points[i]!;
        this.circle(
          c.id + i,
          'fx1',
          'cloud_warning',
          t,
          p.x,
          p.y,
          tuning.cloudRadius,
          0.8,
        );
      }
    else if (c.ability === 'hon_thien_phuc_long_chan' && warning)
      for (let i = 0; i < c.points.length; i++) {
        const p = c.points[i]!;
        this.circle(c.id + i, 'fx1', 'cloud_warning', t, p.x, p.y, 26, 0.8);
      }
    else if (c.ability === 'cap_mo_chan_kich' && warning)
      this.circle(
        c.id,
        'fxt',
        'transition_circle_warning',
        t,
        c.origin.x,
        c.origin.y,
        tuning.attacks.cap_mo_chan_kich.range,
        0.8,
      );
    else if (c.ability === 'van_doc_bao_phat')
      for (let i = c.landed; i < c.points.length; i++) {
        const p = c.points[i]!;
        this.circle(
          c.id + i,
          'fx2',
          'eruption_circle_warning',
          t,
          p.x,
          p.y,
          90,
          0.7,
        );
      }
    else if (c.ability === 'ngu_doc_than_chuong' && warning)
      this.circle(c.id, 'fx2', 'multi_palm_warning', t, x, y, 110, 0.8);
  }
  inspect() {
    return {
      phase: this.current?.phase,
      tick: this.current?.tick,
      actions: [...this.actions],
      frames: Object.fromEntries([...this.frames].map(([k, v]) => [k, [...v]])),
      entities: [...this.views].map(([id, v]) => ({
        id,
        asset: v.image.texture.key,
        frame: v.image.frame.name,
        x: v.image.x,
        y: v.image.y,
        depth: v.image.depth,
        rotation: v.image.rotation,
        scaleX: v.image.scaleX,
        scaleY: v.image.scaleY,
      })),
      candidateDirections: ['left', 'up', 'down'],
    };
  }
}
