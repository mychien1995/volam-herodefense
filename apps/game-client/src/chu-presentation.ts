import Phaser from 'phaser';
import { bossArenaScale as S, chuBaThongDungeon } from '@volam/game-data';
import type { LobbyState } from '@volam/game-protocol';
import type { ChuView } from '@volam/game-core';
import raw from './chu-art.generated.json' with { type: 'json' };
import wine from './chu-wine-art.generated.json' with { type: 'json' };
import { facing } from './facing.js';
interface Bundle {
  image: string;
  url: string;
  origin: number[];
  frames: Record<
    string,
    { frame: { x: number; y: number; w: number; h: number } }
  >;
  animations: Array<{
    name: string;
    frames: string[];
    frameRate: number;
    repeat: number;
  }>;
}
interface MapObject {
  name: string;
  x: number;
  y: number;
  type: string;
  properties: Array<{ name: string; value: string }>;
}
const art = raw as unknown as {
  bundles: Record<string, Bundle>;
  scenery: MapObject[];
};
art.bundles['wine'] = wine as Bundle;
export function preloadChu(scene: Phaser.Scene): void {
  scene.load.image('chu_wine_bottle', '/assets/m3d_followup/wine_bottle.png');
  for (const [key, b] of Object.entries(art.bundles))
    scene.load.atlas('chu_' + key, b.url, {
      frames: b.frames,
      meta: { image: b.url },
    });
  const scenery = new Set(
    art.scenery.map((o) =>
      o.properties
        .find((p) => p.name === 'asset')!
        .value.split('/')
        .at(-1)!,
    ),
  );
  for (const name of [
    'ancient_path_material.png',
    'bamboo_ground_material.png',
    ...scenery,
  ])
    scene.load.image('chu_prop_' + name, '/assets/chu/' + name);
}
export function registerChu(scene: Phaser.Scene): void {
  for (const [key, b] of Object.entries(art.bundles)) {
    scene.textures
      .get('chu_' + key)
      .setFilter(Phaser.Textures.FilterMode.NEAREST);
    for (const clip of b.animations)
      if (!scene.anims.exists('chu:' + key + ':' + clip.name))
        scene.anims.create({
          key: 'chu:' + key + ':' + clip.name,
          frames: clip.frames.map((frame) => ({ key: 'chu_' + key, frame })),
          frameRate: clip.frameRate,
          repeat: /^(death|defeat)_/.test(clip.name) ? 0 : -1,
        });
  }
}
export function createChuArena(
  scene: Phaser.Scene,
): Phaser.GameObjects.Image[] {
  scene.add
    .tileSprite(0, 0, 1280, 720, 'chu_prop_ancient_path_material.png')
    .setScale(S)
    .setOrigin(0)
    .setDepth(-10000)
    .setName('chu:ground');
  for (const x of [0, 1152])
    scene.add
      .tileSprite(x * S, 0, 128, 720, 'chu_prop_bamboo_ground_material.png')
      .setScale(S)
      .setOrigin(0)
      .setDepth(-9999);
  const trees: Phaser.GameObjects.Image[] = [];
  for (const o of art.scenery) {
    const name = o.properties
      .find((p) => p.name === 'asset')!
      .value.split('/')
      .at(-1)!;
    const image = scene.add
      .image(o.x * S, o.y * S, 'chu_prop_' + name)
      .setScale(S);
    image
      .setOrigin(0.5, o.type === 'ground' ? 0.5 : 1)
      .setDepth(o.type === 'ground' ? -9000 : o.y * S)
      .setName('chu:prop:' + o.name);
    if (o.name === 'bamboo_cluster') trees.push(image);
  }
  scene.add
    .image(
      chuBaThongDungeon.exit.x,
      chuBaThongDungeon.exit.y,
      'chu_prop_entrance_gate.png',
    )
    .setScale(S)
    .setOrigin(0.5, 0.8)
    .setDepth(chuBaThongDungeon.exit.y)
    .setAlpha(0.85)
    .setName('dungeon-exit');
  scene.add
    .text(
      chuBaThongDungeon.exit.x,
      chuBaThongDungeon.exit.y + 15,
      'Lối ra · Space',
      {
        fontFamily: 'Segoe UI',
        fontSize: '11px',
        backgroundColor: '#152a24',
        color: '#f5ebc7',
      },
    )
    .setOrigin(0.5)
    .setDepth(chuBaThongDungeon.exit.y + 1);
  return trees;
}
/** Displays authoritative zone state. No targeting/damage/movement calculations run here. */
export class ChuPresentation {
  private views = new Map<string, Phaser.GameObjects.Sprite>();
  private labels = new Map<string, Phaser.GameObjects.Text>();
  private observed = new Map<string, Set<string>>();
  private latest: ChuView | null = null;
  private fixtureUntil = 0;
  private spinHistory: Array<{ x: number; y: number; t: number }> = [];
  private previousHp = 0;
  private hitFlashUntil = 0;
  constructor(private scene: Phaser.Scene) {}
  clear() {
    this.views.clear();
    this.labels.clear();
    this.latest = null;
    this.fixtureUntil = 0;
    this.spinHistory = [];
    this.previousHp = 0;
    this.hitFlashUntil = 0;
  }
  private draw(
    id: string,
    bundle: string,
    name: string,
    x: number,
    y: number,
    time: number,
    scale = 1,
    alpha = 1,
    rotation = 0,
    ground = false,
  ) {
    const b = art.bundles[bundle]!,
      clip = b.animations.find((a) => a.name === name);
    if (!clip) throw Error('Missing Chu clip ' + bundle + ':' + name);
    let sprite = this.views.get(id);
    if (!sprite || !sprite.scene) {
      sprite = this.scene.add.sprite(x, y, 'chu_' + bundle, clip.frames[0]);
      this.views.set(id, sprite);
      const observe = () => {
        const key = sprite!.anims.currentAnim?.key;
        if (!key) return;
        const seen = this.observed.get(key) ?? new Set<string>();
        seen.add(String(sprite!.frame.name));
        this.observed.set(key, seen);
      };
      sprite.on(Phaser.Animations.Events.ANIMATION_UPDATE, observe);
      sprite.on(Phaser.Animations.Events.ANIMATION_START, observe);
    }
    if (sprite.texture.key !== 'chu_' + bundle)
      sprite.setTexture('chu_' + bundle, clip.frames[0]);
    sprite
      .setOrigin(b.origin[0]!, b.origin[1]!)
      .setPosition(Math.round(x), Math.round(y))
      .setScale(scale)
      .setAlpha(alpha)
      .setRotation(rotation)
      .setDepth(ground ? -100 : y + 0.3)
      .setVisible(true)
      .setData('chuActive', true);
    const key = 'chu:' + bundle + ':' + name;
    if (sprite.anims.currentAnim?.key !== key)
      sprite.play({
        key,
        startFrame: Math.floor(time * clip.frameRate) % clip.frames.length,
      });
    const seen = this.observed.get(key) ?? new Set<string>();
    seen.add(String(sprite.frame.name));
    this.observed.set(key, seen);
    return sprite;
  }
  private text(id: string, value: string, x: number, y: number) {
    let label = this.labels.get(id);
    if (!label || !label.scene) {
      label = this.scene.add
        .text(x, y, value, {
          resolution: 2,
          fontFamily: 'Segoe UI',
          fontSize: '11px',
          color: '#fff0cc',
          backgroundColor: '#142720cc',
          padding: { x: 3, y: 2 },
        })
        .setOrigin(0.5);
      this.labels.set(id, label);
    }
    label
      .setText(value)
      .setPosition(x, y)
      .setDepth(y + 100)
      .setVisible(true);
  }
  sync(state: LobbyState | undefined, zoneId: string): void {
    if (this.scene.time.now < this.fixtureUntil) return;
    for (const s of this.views.values()) s.setData('chuActive', false);
    for (const l of this.labels.values()) l.setVisible(false);
    const encoded = state?.dungeons.get(zoneId)?.encounter;
    this.latest =
      zoneId.startsWith('chu_ba_thong_') && encoded
        ? (JSON.parse(encoded) as ChuView)
        : null;
    const v = this.latest;
    if (v) {
      const t = v.elapsed,
        x = v.bossX,
        y = v.bossY,
        enemy = state?.creeps.get(zoneId + ':' + v.bossId),
        dir = facing(enemy?.fx ?? v.fx, enemy?.fy ?? v.fy);
      let bundle = 'base',
        tag = 'idle_' + dir;
      if (v.bossHp <= 0) tag = 'defeat_' + dir;
      else if (v.phase === 'sweep') {
        bundle = 'boss';
        tag = 'sweep';
      } else if (v.phase === 'fists') {
        bundle = 'boss';
        tag = Math.floor(t / 0.5) % 2 ? 'punch_right' : 'punch_left';
      } else if (v.phase === 'spin') {
        bundle = 'boss';
        tag = 'spin';
      } else if (v.phase === 'palm') tag = 'basic_palm_' + dir;
      else if (v.phase === 'hands') tag = 'dual_hand_' + dir;
      else if (v.phase === 'trap') tag = 'yin_yang_cast_' + dir;
      else if (v.phase === 'reflect') tag = 'counter_' + dir;
      else if (v.phase === 'ultimate') tag = 'ultimate_charge_' + dir;
      else if (v.phase === 'drink' && t > 6.5) tag = 'drink_' + dir;
      else if (enemy?.pose === 'walk') tag = 'walk_' + dir;
      const body = this.draw('boss', bundle, tag, x, y, v.bossHp <= 0 ? 0 : t);
      if (v.bossHp < this.previousHp && v.bossHp > 0)
        this.hitFlashUntil = this.scene.time.now + 150;
      this.previousHp = v.bossHp;
      if (this.scene.time.now < this.hitFlashUntil) body.setTint(0xffd0aa);
      else body.clearTint();
      if (v.phase !== 'spin') this.spinHistory = [];
      this.text(
        'boss',
        'Chu Bá Thông · ' + Math.ceil(v.bossHp) + ' / ' + v.bossMaxHp,
        x,
        y - 76,
      );
      if (v.bossHp > 0) {
        const angle = Math.atan2(v.fy, v.fx),
          impactT = this.scene.time.now / 1000;
        if (v.phase === 'sweep' && t % 1.6 > 0.14 && t % 1.6 < 0.8) {
          this.draw(
            'sweep:foot',
            'palm',
            'shockwave',
            x,
            y + 8,
            t,
            2.2,
            0.7,
            0,
            true,
          );
          this.draw(
            'sweep:front',
            'palm',
            'shockwave',
            x + v.fx * v.sweepFrontOffset,
            y + v.fy * v.sweepFrontOffset,
            t,
            3,
            0.85,
            0,
            true,
          );
        }
        if (v.phase === 'fists') {
          const age = t % 0.5;
          if (age > 0.1 && age < 0.46) {
            const reach = Math.min(1, (age - 0.1) / 0.3) * v.fistReach,
              side = Math.floor(t / 0.5) % 2 ? 1 : -1;
            for (let i = 3; i >= 0; i--) {
              const d = Math.max(20, reach - i * 48);
              this.draw(
                'fist:' + i,
                'palm',
                'palm_wave',
                x + v.fx * d - v.fy * side * 20,
                y + v.fy * d + v.fx * side * 20,
                age,
                0.8,
                1 - i * 0.2,
                angle,
              );
            }
            this.draw(
              'fist:impact',
              'palm',
              'impact',
              x + v.fx * reach,
              y + v.fy * reach,
              age,
              1.1,
            );
          }
        }
        for (const p of v.missiles)
          this.draw(
            'missile:' + p.id,
            'palm',
            'palm_wave',
            p.x,
            p.y,
            impactT,
            1,
            1,
            Math.atan2(p.vy, p.vx),
          );
        for (const h of v.hands) {
          if (h.id === 0 && h.stage === 'warning')
            this.draw(
              'hand:warning',
              'dual',
              'dual_telegraph',
              h.target.x,
              h.target.y,
              t,
              1.2,
              1,
              0,
              true,
            );
          const frame =
            h.stage === 'warning'
              ? 0
              : h.stage === 'travel'
                ? 1
                : h.stage === 'impact'
                  ? 2
                  : 3;
          const sprite = this.draw(
            'hand:' + h.id,
            'hands',
            h.id % 2 ? 'yang_hand' : 'yin_hand',
            h.x,
            h.y,
            t,
            v.handsScale,
            t > 3.35 ? Math.max(0, 1 - (t - 3.35) / 0.65) : 1,
            Math.atan2(h.fy, h.fx),
          );
          sprite.anims.stop();
          sprite.setFrame((h.id % 2 ? 'yang_hand_' : 'yin_hand_') + frame);
          const key = 'chu:hands:' + (h.id % 2 ? 'yang_hand' : 'yin_hand'),
            seen = this.observed.get(key) ?? new Set<string>();
          seen.add(String(sprite.frame.name));
          this.observed.set(key, seen);
        }
        if (v.trap && !v.trap.released) {
          this.draw(
            'trap',
            'trap',
            'rotating_ring',
            v.trap.x,
            v.trap.y,
            t,
            1.4,
            1,
            0,
            true,
          );
          this.draw(
            'trap:upright',
            'trap',
            'formation',
            v.trap.x,
            v.trap.y - 20,
            t,
            1.25,
            0.58,
          );
          this.text(
            'trap',
            v.trap.inside +
              '/' +
              v.trap.required.length +
              ' · ' +
              Math.ceil(Math.max(0, 30 - t)) +
              's',
            v.trap.x,
            v.trap.y + 75,
          );
        }
        if (v.phase === 'spin') {
          if (this.spinHistory.at(-1)?.t !== t) {
            if (t < (this.spinHistory.at(-1)?.t ?? 0)) this.spinHistory = [];
            this.spinHistory.push({ x, y, t });
            if (this.spinHistory.length > 6) this.spinHistory.shift();
          }
          for (const [i, p] of this.spinHistory.slice(0, -1).entries())
            this.draw(
              'spin:ghost:' + i,
              'boss',
              'spin',
              p.x,
              p.y,
              p.t,
              1,
              0.04 + i * 0.025,
            ).setDepth(p.y - 0.1);
          this.draw(
            'spin:ring',
            'palm',
            'shockwave',
            x,
            y + 3,
            t,
            v.spinRadius / 45,
            0.72,
            0,
            true,
          );
          this.draw(
            'spin:wind',
            'spinfx',
            'wind_trail',
            x,
            y,
            t,
            1.4,
            0.7,
            0,
            true,
          );
        }
        if (v.phase === 'reflect') {
          this.draw(
            'guard',
            'reflect',
            'defensive_field',
            x,
            y,
            t,
            2.4,
            0.8,
            0,
            true,
          );
          this.draw(
            'guard:warning',
            'reflect',
            'charge_warning',
            x,
            y,
            t,
            3.6,
            0.4,
            0,
            true,
          );
          this.text('guard', 'Phản toàn bộ sát thương · chạy ra xa', x, y + 50);
        }
        if (v.phase === 'ultimate') {
          for (const f of v.fields) {
            this.draw(
              'field:' + f.id,
              'trap',
              'rotating_ring',
              f.x,
              f.y,
              t,
              1.2,
              f.active ? 0.7 : 0.4,
              0,
              true,
            );
            if (f.active)
              this.draw(
                'field:impact:' + f.id,
                'ultimate',
                'ultimate_impact',
                f.x,
                f.y,
                t,
                1.3,
                0.65,
              );
          }
        }
        for (const d of v.disciples) {
          this.draw(
            'disciple:' + d.id,
            'disciple',
            d.tag + '_' + d.direction,
            d.x,
            d.y,
            t,
          );
          this.text(
            'disciple:' + d.id,
            'Tiểu đồng ' +
              (d.id + 1) +
              (d.hp !== undefined
                ? ' · ' + Math.ceil(d.hp) + '/' + d.maxHp
                : ''),
            d.x,
            d.y - 55,
          );
        }
        for (const bottle of v.wine ?? []) {
          const id = 'wine:' + bottle.id;
          let image = this.views.get(id);
          if (!image || !image.scene) {
            image = this.scene.add.sprite(
              bottle.x,
              bottle.y,
              'chu_wine_bottle',
            );
            this.views.set(id, image);
          }
          image
            .setPosition(bottle.x, bottle.y)
            .setOrigin(0.5, 0.85)
            .setScale(0.5)
            .setDepth(bottle.y)
            .setVisible(true)
            .setData('chuActive', true);
          this.draw(
            id + ':glow',
            'wine',
            'pickup_glow',
            bottle.x,
            bottle.y,
            t,
            0.5,
          );
          this.text(id, 'Space · Uống rượu', bottle.x, bottle.y + 18);
        }
        for (const h of v.wineDrinkers ?? []) {
          const age = (h.durationTicks - h.remainingTicks) / 30;
          this.draw(
            'wine-drink:' + h.id,
            'wine',
            age < 0.33 ? 'consume' : 'player_buff',
            h.x,
            h.y - 12,
            age,
            0.6,
          );
          this.text(
            'wine-buff:' + h.id,
            'Tửu lực · ' + Math.ceil(h.remainingTicks / 30) + 's',
            h.x,
            h.y - 54,
          );
        }
      }
    }
    for (const s of this.views.values())
      if (!s.getData('chuActive')) s.setVisible(false);
  }
  /** Explicit read-only art fixture; no server state, input or combat is changed. */
  review(
    bundle: string,
    tag: string,
    x: number,
    y: number,
    milliseconds: number,
  ): void {
    this.fixtureUntil = this.scene.time.now + milliseconds;
    for (const s of this.views.values()) s.setVisible(false);
    this.draw('fixture', bundle, tag, x, y, 0);
  }
  inspect() {
    return {
      state: this.latest,
      observed: Object.fromEntries(
        [...this.observed].map(([k, v]) => [k, [...v]]),
      ),
      clips: Object.entries(art.bundles).flatMap(([bundle, b]) =>
        b.animations.map((a) => ({
          bundle,
          name: a.name,
          frames: a.frames,
          fps: a.frameRate,
        })),
      ),
      sprites: [...this.views]
        .filter(([, s]) => s.scene && s.visible)
        .map(([id, s]) => ({
          id,
          texture: s.texture.key,
          frame: s.frame.name,
          x: s.x,
          y: s.y,
          depth: s.depth,
          origin: [s.originX, s.originY],
          scale: s.scale,
          playing: s.anims.isPlaying,
        })),
    };
  }
}
