import Phaser from 'phaser';
import type { BossEffectState } from '@volam/game-protocol';
import fireSheet from '../../../assets/exports/bosses/hoan_nhan_hong_liet_vfx_v05/fire-effects.png?url';
import atlas from '../../../assets/exports/bosses/hoan_nhan_hong_liet_vfx_v05/fire-effects.json' with { type: 'json' };

const texture = 'hl_fire_v05';
const clamp = (n: number) => Math.max(0, Math.min(1, n));
type Frame = keyof typeof atlas.frames;
type Part = {
  key: string;
  frame: Frame;
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  alpha: number;
  angle?: number;
  depth: number;
  reveal?: number;
};

export function preloadHongLietVfx(scene: Phaser.Scene): void {
  scene.load.atlas(texture, fireSheet, atlas);
}

export class HongLietVfx {
  private readonly observed = new Set<Frame>();
  private readonly groups = new Map<
    string,
    Map<string, Phaser.GameObjects.Image>
  >();

  constructor(private readonly scene: Phaser.Scene) {}

  clear(): void {
    this.retain(new Set());
  }

  retain(active: ReadonlySet<string>): void {
    for (const [id, group] of this.groups) {
      if (active.has(id)) continue;
      for (const image of group.values()) image.destroy();
      this.groups.delete(id);
    }
  }

  draw(id: string, e: BossEffectState, tick: number): boolean {
    if (!this.scene.textures.exists(texture)) return false;
    let parts: Part[];
    if (e.kind === 'arc') parts = sweep(e, tick);
    else if (e.kind === 'lava') parts = trail(e, tick);
    else if (['meteor', 'stomp', 'volcano'].includes(e.kind))
      parts = eruption(e, tick);
    else return false;
    let group = this.groups.get(id);
    if (!group) {
      group = new Map();
      this.groups.set(id, group);
      this.scene.textures
        .get(texture)
        .setFilter(Phaser.Textures.FilterMode.LINEAR);
    }
    for (const image of group.values()) image.setVisible(false);
    for (const p of parts) {
      if (p.alpha <= 0) continue;
      this.observed.add(p.frame);
      const pivot = atlas.frames[p.frame].pivot;
      let image = group.get(p.key);
      if (!image) {
        image = this.scene.add
          .image(p.x, p.y, texture, p.frame)
          .setName('hong_liet_vfx:' + id + ':' + p.key)
          .setOrigin(pivot.x, pivot.y);
        group.set(p.key, image);
      }
      image
        .setPosition(p.x, p.y)
        .setScale(p.scaleX, p.scaleY)
        .setDepth(p.depth)
        .setRotation(p.angle ?? 0)
        .setAlpha(clamp(p.alpha))
        .setVisible(true);
      if (p.reveal !== undefined) image.setCrop(0, 0, 288, p.reveal);
    }
    return true;
  }

  inspect() {
    return [...this.groups].flatMap(([id, group]) =>
      [...group]
        .filter(([, image]) => image.visible)
        .map(([part, image]) => ({
          id,
          part,
          frame: image.frame.name,
          x: image.x,
          y: image.y,
          alpha: image.alpha,
          depth: image.depth,
          scaleX: image.scaleX,
          scaleY: image.scaleY,
        })),
    );
  }

  frames(): Frame[] {
    return [...this.observed];
  }
}

function eruption(e: BossEffectState, tick: number): Part[] {
  const { x, y, radius, activeAt } = e;
  const age = tick - activeAt;
  const charge = clamp(
    (tick - e.startedAt) / Math.max(1, activeAt - e.startedAt),
  );
  const stomp = e.kind === 'stomp';
  const meteor = e.kind === 'meteor';
  const size = radius / 116;
  const fade = clamp((e.expiresAt - tick) / 6);
  const heat = 0.83 + 0.17 * Math.sin(tick * 0.6 + x);
  const parts: Part[] = [
    {
      key: 'ground',
      frame: 'cracks',
      x,
      y,
      scaleX: size,
      scaleY: size,
      depth: -43,
      alpha:
        age < 0
          ? meteor
            ? 0.32 * clamp((age + 23) / 8)
            : 0.2 + 0.54 * charge * heat
          : 0.83 * fade,
    },
  ];
  if (age < 0) {
    if (meteor) {
      const travel = clamp((age + 18) / 18);
      if (travel > 0) {
        const drop = 1 - travel * travel;
        parts.push({
          key: 'meteor',
          frame: 'meteor',
          x: x - 104 * drop,
          y: y - 260 * drop,
          scaleX: 0.42,
          scaleY: 0.42,
          depth: y + 65,
          alpha: clamp(travel * 5),
        });
      }
    } else {
      for (let i = 0; i < (stomp ? 5 : 3); i++) {
        const angle = i * 2.4;
        const range = radius * (stomp ? 0.64 : 0.4);
        const lift = (tick * 0.13 + i * 0.37) % 1;
        parts.push({
          key: 'gather-' + i,
          frame: 'ember',
          x: x + Math.cos(angle) * range * (1 - charge * 0.78),
          y: y + Math.sin(angle) * range * (1 - charge * 0.78) - lift * 25,
          scaleX: 0.12,
          scaleY: 0.12,
          depth: y + 1,
          alpha: charge * Math.sin(lift * Math.PI),
        });
      }
    }
    return parts;
  }
  const progress = clamp(age / 18);
  const pulse = clamp(1 - age / (stomp ? 9 : 13));
  parts.push({
    key: 'burst',
    frame: 'burst',
    x,
    y,
    scaleX: size * (0.35 + 0.59 * (1 - (1 - progress) ** 3)),
    scaleY:
      size * (0.37 + 0.53 * Math.sin((Math.min(1, age / 10) * Math.PI) / 2)),
    depth: y + 1,
    alpha: pulse * fade,
  });
  if (!stomp) {
    const rise = clamp((age + 1) / 5);
    parts.push({
      key: 'eruption',
      frame: 'eruption',
      x,
      y,
      scaleX: size * 0.69,
      scaleY: size * (0.26 + 0.78 * rise),
      depth: y + 2,
      alpha: Math.min(rise, 1 - progress) * fade,
    });
  }
  for (let i = 0; i < (stomp ? 11 : 6); i++) {
    const angle = i * 2.4 + x * 0.01;
    const spread = radius * (0.38 + (i % 3) * 0.25) * (1 - (1 - progress) ** 2);
    const arc = Math.sin(Math.PI * progress) * (21 + (i % 4) * 13);
    const gy = y + Math.sin(angle) * spread;
    const rock = (0.12 + (i % 3) * 0.035) * (stomp ? 1.2 : 1);
    parts.push({
      key: 'debris-' + i,
      frame: 'ember',
      x: x + Math.cos(angle) * spread,
      y: gy - arc,
      depth: gy + 3,
      scaleX: rock,
      scaleY: rock,
      alpha: (1 - progress) * fade,
      angle: angle + progress * 2,
    });
  }
  return parts;
}

function trail(e: BossEffectState, tick: number): Part[] {
  if (tick < e.activeAt) return [];
  const parts: Part[] = [];
  const angle = Math.atan2(e.fy, e.fx);
  const cooling = clamp(
    (tick - e.damageUntil) / Math.max(1, e.expiresAt - e.damageUntil),
  );
  const width = e.radius / 116;
  const step = e.radius * 0.86;
  for (let i = 0; i * step < e.length; i++) {
    const along = i * step;
    const x = e.x + e.fx * along,
      y = e.y + e.fy * along;
    // Each patch keeps its own size; the authoritative distance only places new patches.
    const light = clamp((e.length - along) / (step * 0.9));
    parts.push({
      key: 'crust-' + i,
      frame: 'crust',
      x,
      y,
      angle: angle + i * 2.4,
      scaleX: width,
      scaleY: width,
      alpha: light * (1 - cooling),
      depth: -42,
    });
    const flicker = 0.84 + 0.16 * Math.sin(tick * 0.45 + i * 2.4);
    const side = ((i % 3) - 1) * e.radius * 0.22;
    const gy = y + e.fx * side;
    parts.push({
      key: 'flame-' + i,
      frame: 'flame',
      x: x - e.fy * side,
      y: gy,
      scaleX: 0.18 + (i % 3) * 0.04,
      scaleY: (0.21 + (i % 3) * 0.04) * flicker,
      alpha: light * (1 - cooling) ** 2 * flicker,
      depth: gy - 2,
    });
  }
  return parts;
}

function sweep(e: BossEffectState, tick: number): Part[] {
  const age = tick - e.activeAt;
  if (age < 0) return [];
  const angle = Math.atan2(e.fy, e.fx);
  const progress = clamp((age + 1) / 5);
  const alpha = clamp((e.expiresAt - tick) / 12);
  const bladeAngle = angle - Math.PI / 2 + progress * Math.PI;
  return [
    {
      key: 'blade',
      frame: 'crescent',
      x: e.x,
      y: e.y,
      scaleX: e.length / 143,
      scaleY: e.length / 115,
      angle,
      depth: e.y + 3,
      alpha,
      reveal: 288 * (0.5 - 0.5 * Math.cos(progress * Math.PI)),
    },
    {
      key: 'blade-edge',
      frame: 'ember',
      x: e.x + e.length * Math.cos(bladeAngle),
      y: e.y + e.length * Math.sin(bladeAngle),
      scaleX: 0.24,
      scaleY: 0.24,
      depth: e.y + 4,
      angle: bladeAngle,
      alpha: alpha * (1 - progress),
    },
  ];
}
