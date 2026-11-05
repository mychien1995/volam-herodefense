import Phaser from 'phaser';
import {
  renovationEnabled,
  renovationHeight,
  presentRenovatedBody,
} from './renovation-art.js';
import type { LobbyState } from '@volam/game-protocol';
import type { WaveArenaView } from '@volam/game-core';
import raw from './wave-boss-feedback-art.generated.json';
interface Bundle {
  texture: string;
  origin: [number, number];
  frames: Record<
    string,
    { frame: { x: number; y: number; w: number; h: number } }
  >;
  clips: Record<
    string,
    { frames: string[]; durations: number[]; repeat: number }
  >;
}
const bundles = raw.bundles as unknown as Record<string, Bundle>;
export function preloadWaveBossFeedback(scene: Phaser.Scene) {
  for (const id of [
    'nam_de_ring',
    'tay_doc_cloud_v2',
    'tay_doc_impact',
    'snake_bolt',
    'poison_bolt',
    'gold_bolt',
    'spotlight',
  ])
    scene.load.atlas(
      bundles[id]!.texture,
      `/assets/wave-boss-feedback/${id}.png`,
      `/assets/wave-boss-feedback/${id}.json`,
    );
}
/** Exact approved raster sampling. No animation callbacks can produce damage. */
export class WaveBossFeedbackArt {
  private images = new Map<string, Phaser.GameObjects.Image>();
  private used = new Set<string>();
  private observed = new Set<string>();
  private filtered = new Set<string>();
  constructor(private scene: Phaser.Scene) {}
  begin() {
    this.used.clear();
  }
  clear() {
    for (const s of this.images.values()) s.destroy();
    this.images.clear();
  }
  end() {
    for (const [id, s] of this.images)
      if (!this.used.has(id)) {
        s.destroy();
        this.images.delete(id);
      }
  }
  cel(
    id: string,
    asset: string,
    clip: string,
    x: number,
    y: number,
    age: number,
    o: {
      sx?: number;
      sy?: number;
      angle?: number;
      alpha?: number;
      depth?: number;
      origin?: [number, number];
      loop?: boolean;
    } = {},
  ) {
    const b = bundles[asset]!,
      c = b.clips[clip]!;
    if (!c) throw Error('Missing approved feedback clip ' + asset + ':' + clip);
    const duration = c.durations.reduce((a, b) => a + b, 0);
    let clock = Math.max(0, age) * 1000,
      index = c.frames.length - 1;
    if (o.loop ?? c.repeat === -1) clock %= duration;
    for (let i = 0; i < c.frames.length; i++) {
      if (clock < c.durations[i]!) {
        index = i;
        break;
      }
      clock -= c.durations[i]!;
    }
    const frame = c.frames[index]!;
    let s = this.images.get(id);
    if (!s) {
      s = this.scene.add
        .image(x, y, b.texture, frame)
        .setName('wave-feedback:' + id);
      this.images.set(id, s);
    }
    if (!this.filtered.has(b.texture)) {
      this.scene.textures
        .get(b.texture)
        .setFilter(Phaser.Textures.FilterMode.NEAREST);
      this.filtered.add(b.texture);
    }
    s.setTexture(b.texture, frame)
      .setCrop()
      .setPosition(Math.round(x), Math.round(y))
      .setOrigin(...(o.origin ?? b.origin))
      .setScale(o.sx ?? 1, o.sy ?? o.sx ?? 1)
      .setRotation(o.angle ?? 0)
      .setAlpha(o.alpha ?? 1)
      .setDepth(o.depth ?? y + 0.2);
    this.used.add(id);
    this.observed.add(asset + ':' + frame);
    if (asset === 'bc_boss')
      presentRenovatedBody(this.scene, s, 'bac_cai', 'action');
    return s;
  }
  ring(id: string, x: number, y: number, age: number) {
    if (age < 0 || age >= 0.7) return;
    this.cel(id, 'nam_de_ring', 'pulse', x, y, Math.min(age, 0.519), {
      depth: y + 0.15,
      alpha: 1 - Math.max(0, Math.min(1, (age - 0.48) / 0.22)),
    });
  }
  pool(id: string, x: number, y: number, age: number, phase = 0) {
    this.cel(id, 'tay_doc_cloud_v2', 'loop', x, y, age + phase, {
      sx: 0.9,
      sy: 0.9,
      depth: 20,
      origin: [0.5, 0.64],
      alpha: Math.min(1, Math.max(0, age / 0.25)),
    });
  }
  stomp(id: string, x: number, y: number, age: number) {
    if (age < 0 || age >= 0.9) return;
    this.cel(id + ':core', 'td_fx2', 'lunge_impact', x, y, age, {
      sx: 0.85 * 0.9,
      sy: 0.85 * 0.9,
      depth: 20,
      alpha: 1 - Math.max(0, Math.min(1, (age - 0.4) / 0.4)),
    });
    if (age >= 0.2)
      this.cel(id + ':rim', 'tay_doc_impact', 'rim', x, y, age, {
        sx: 0.9,
        sy: 0.9,
        depth: 15,
        alpha: Math.sin(Math.max(0, Math.min(1, (age - 0.2) / 0.65)) * Math.PI),
      });
    for (let i = 0; i < 24; i++) {
      const a = (i * Math.PI) / 12,
        r = (65 + (405 - 65) * Math.min(1, age / 0.6)) * 0.9;
      this.cel(
        id + ':fragment:' + i,
        'td_fx2',
        'toxic_particles',
        x + Math.cos(a) * r,
        y + Math.sin(a) * r * 0.6,
        age + i * 0.08,
        {
          sx: 0.45,
          sy: 0.45,
          angle: a,
          depth: 21,
          alpha: 1 - Math.max(0, Math.min(1, (age - 0.5) / 0.4)),
        },
      );
    }
  }
  ray(
    id: string,
    x: number,
    y: number,
    angle: number,
    length: number,
    age: number,
    warning = false,
  ) {
    const asset = warning ? 'nd_feedback02' : 'nd_feedback01',
      clip = warning ? 'line_warning' : 'thin_beam',
      b = bundles[asset]!,
      r = b.frames[b.clips[clip]!.frames[0]!]!.frame,
      step = warning ? Math.min(r.w, 24) : r.w;
    for (let d = 0; d < length; d += step) {
      const px = x + Math.cos(angle) * d,
        py = y + Math.sin(angle) * d;
      const rect = this.scene.cameras.main.worldView;
      if (
        px < rect.left - 24 ||
        px > rect.right + 24 ||
        py < rect.top - 24 ||
        py > rect.bottom + 24
      )
        continue;
      this.cel(id + ':' + d, asset, clip, px, py, age, {
        origin: [0, 0.5],
        angle,
        depth: y + 0.4,
        alpha: warning ? 0.65 : 1,
      }).setCrop(0, 0, Math.min(step, length - d), r.h);
    }
  }
  inspect() {
    return {
      observed: [...this.observed],
      images: [...this.images].map(([id, s]) => ({
        id,
        texture: s.texture.key,
        frame: s.frame.name,
        x: s.x,
        y: s.y,
        scale: [s.scaleX, s.scaleY],
        depth: s.depth,
        alpha: s.alpha,
        rotation: s.rotation,
        origin: [s.originX, s.originY],
      })),
    };
  }
}
/** Same overhead label and green five-pixel HP bar as Tây Độc. */
export class WaveBossHealth {
  private views = new Map<
    string,
    { text: Phaser.GameObjects.Text; bar: Phaser.GameObjects.Graphics }
  >();
  private used = new Set<string>();
  constructor(private scene: Phaser.Scene) {}
  begin() {
    this.used.clear();
  }
  clear() {
    for (const v of this.views.values()) {
      v.text.destroy();
      v.bar.destroy();
    }
    this.views.clear();
  }
  draw(
    id: string,
    name: string,
    x: number,
    y: number,
    hp: number,
    maxHp: number,
    width = 96,
  ) {
    if (renovationEnabled(this.scene))
      y -= Math.max(
        0,
        renovationHeight(
          id === 'vuong_trung_duong' ? 'vuong_trung_duong_p1' : id,
          60,
        ) - 60,
      );
    let v = this.views.get(id);
    if (!v) {
      v = {
        text: this.scene.add
          .text(0, 0, '', {
            fontSize: '11px',
            color: '#fff1bc',
            stroke: '#151b14',
            strokeThickness: 3,
          })
          .setOrigin(0.5, 1),
        bar: this.scene.add.graphics(),
      };
      this.views.set(id, v);
    }
    v.text
      .setText(name)
      .setPosition(x, y)
      .setDepth(y + 200);
    v.bar
      .clear()
      .fillStyle(0x171419, 0.9)
      .fillRect(x - width / 2, y + 2, width, 5)
      .fillStyle(0x91c852)
      .fillRect(
        x - width / 2 + 1,
        y + 3,
        (width - 2) * Math.max(0, hp / Math.max(1, maxHp)),
        3,
      )
      .setDepth(y + 200);
    this.used.add(id);
  }
  end() {
    for (const [id, v] of this.views)
      if (!this.used.has(id)) {
        v.text.destroy();
        v.bar.destroy();
        this.views.delete(id);
      }
  }
}
export class WaveArenaPresentation {
  private boundary: Phaser.GameObjects.Graphics;
  constructor(private scene: Phaser.Scene) {
    this.boundary = scene.add
      .graphics()
      .setName('wave-boss:boundary')
      .setDepth(30);
  }
  sync(state: LobbyState | undefined, zone: string) {
    const v = state?.defense.waveArena
      ? (JSON.parse(state.defense.waveArena) as WaveArenaView | null)
      : null;
    const locked = zone === 'arena' && !!v?.locked;
    (
      this.scene.children.getByName('art01:statue_male') as
        Phaser.GameObjects.Image | undefined
    )?.setVisible(!locked);
    this.boundary.clear().setVisible(locked);
    if (locked && v)
      for (const [width, alpha] of [
        [10, 0.04],
        [5, 0.08],
        [1, 0.22],
      ])
        this.boundary
          .lineStyle(width!, 0xc8dfc7, alpha!)
          .strokeEllipse(
            v.bounds.x,
            v.bounds.y,
            v.bounds.radiusX * 2,
            v.bounds.radiusY * 2,
          );
  }
  clear() {
    this.boundary.clear().setVisible(false);
  }
  inspect() {
    return { boundaryVisible: this.boundary.visible };
  }
}
