import Phaser from 'phaser';
import { conLuan, fiveSwordPoints, type CombatEvent } from '@volam/game-core';
import { m1Config } from '@volam/game-data';
import type { LobbyState } from '@volam/game-protocol';
import { zoneTick } from './zone-tick.js';

const pack = '/assets/characters/con_luan_skill_preview/';
const conLuanBodyScale = 0.5;
const approved = '/assets/characters/con_luan_thien_su_v03/';
export const conLuanMonkTexture = 'hero_con_luan_thien_su';
export const conLuanSwordTexture = 'hero_con_luan_kiem_ton';
export const conLuanPivot: [number, number] = [0.5, 0.75];
const extra = 'con_luan_monk_extra';
const renovation = '/assets/characters/con_luan_skill_renovation/';
const chaosBody = 'con_luan_chaos_walk';
const melee = 'con_luan_monk_melee_v04';
const lightning = 'con_luan_lightning';
const effects = 'con_luan_spell_fx';
const monkFx = 'con_luan_thien_su_fx';
const sheets = {
  [conLuanMonkTexture]: approved + conLuanMonkTexture,
  [conLuanSwordTexture]: pack + 'kiem_ton',
  [extra]: pack + 'thien_su_extra',
  [effects]: pack + effects,
  [monkFx]: approved + monkFx,
  [chaosBody]: renovation + 'thien_su_chaos_walk',
  [lightning]: renovation + 'thien_su_lightning',
  [melee]: '/assets/characters/con_luan_hac_thiet_v04/thien_su_melee',
};
const socketKey = 'con-luan-hammer-sockets';
const ids = new Set<string>(Object.values(conLuan));
const beats = ['thrust', 'sweep', 'rising', 'overhead'];
const directions = ['down', 'left', 'right', 'up'] as const;
const swordOffset = {
  down: [-28, -22],
  left: [31, -19],
  right: [-31, -19],
  up: [23, -10],
} as const;

type Direction = (typeof directions)[number];
type Sprite = Phaser.GameObjects.Sprite;
type Point = { x: number; y: number };
type Atlas = {
  frames: Record<string, { duration: number }>;
  meta: { frameTags: Array<{ name: string; from: number; to: number }> };
};
interface Actor {
  basicId?: string;
  castAbilityId?: string;
  actionStartedAt?: number;
  basicStage?: string;
  hp: number;
}

export function isConLuanBody(texture: string): boolean {
  return (
    texture === conLuanMonkTexture ||
    texture === conLuanSwordTexture ||
    texture === extra
  );
}

export function preloadConLuanArt(scene: Phaser.Scene): void {
  for (const [id, path] of Object.entries(sheets))
    if (!scene.textures.exists(id))
      scene.load.aseprite(id, path + '.png', path + '.json');
  if (!scene.cache.json.exists(socketKey))
    scene.load.json(socketKey, approved + 'hammer-sockets.json');
}

export class ConLuanArt {
  private attached = new Map<string, Sprite>();
  private persistent = new Map<string, Sprite>();
  private temporary = new Set<Sprite>();
  private dragonRelease = new Map<string, Sprite>();
  private sockets: Record<string, [number, number]>;
  private lastRingTick = -1;
  private lastRingTickAt = 0;

  constructor(private readonly scene: Phaser.Scene) {
    this.sockets = scene.cache.json.get(socketKey);
    for (const id of Object.keys(sheets)) {
      scene.textures
        .get(id)
        .setFilter(
          id === lightning
            ? Phaser.Textures.FilterMode.LINEAR
            : Phaser.Textures.FilterMode.NEAREST,
        );
      const atlas = scene.cache.json.get(id) as Atlas;
      const names = Object.keys(atlas.frames);
      for (const tag of atlas.meta.frameTags) {
        const key = id + ':' + tag.name;
        if (tag.from === tag.to || scene.anims.exists(key)) continue;
        const duration = names
          .slice(tag.from, tag.to + 1)
          .reduce((sum, frame) => sum + atlas.frames[frame]!.duration, 0);
        const frames = names.slice(tag.from, tag.to + 1).map((frame) => ({
          key: id,
          frame,
          duration: atlas.frames[frame]!.duration,
        }));
        scene.anims.create({
          key,
          frames,
          duration,
          repeat: /^(idle_|walk_|chaos_walk_|coil$)/.test(tag.name) ? -1 : 0,
        });
      }
    }
  }

  body(
    id: string,
    sprite: Sprite,
    actor: Actor,
    states: Array<{ kind: string }>,
    pose: string,
    facing: string,
  ): void {
    const direction = directions.includes(facing as Direction)
      ? (facing as Direction)
      : 'down';
    const monk = actor.basicId === conLuan.monk;
    const chaos =
      monk && actor.hp > 0 && states.some((s) => s.kind === 'con_luan_chaos');
    const ranged = monk && states.some((s) => s.kind === 'con_luan_ranged');
    const casting = pose === 'cast' || pose === 'basic_attack';
    const ability = actor.castAbilityId;
    const previous = sprite.getData('con-luan-position') as Point | undefined;
    const moved =
      previous &&
      Math.hypot(sprite.x - previous.x, sprite.y - previous.y) > 0.35;
    sprite.setData('con-luan-position', { x: sprite.x, y: sprite.y });
    let texture = monk ? conLuanMonkTexture : conLuanSwordTexture;
    let tag = pose === 'walk' || (pose === 'hurt' && moved) ? 'walk' : 'idle';
    if (!monk && casting) tag = ability === conLuan.dash ? 'walk' : 'cast';
    if (monk && casting) {
      if (ability === conLuan.monk) {
        const beat = Math.max(0, beats.indexOf(actor.basicStage ?? ''));
        tag = 'melee_' + (beat + 1);
        if (beat < 2) texture = melee;
      } else if (ability === conLuan.slam) tag = 'melee_4';
      else if (ability === conLuan.bolt || ability === conLuan.ring)
        tag = 'ranged';
      else if (ability === conLuan.hammer) {
        texture = extra;
        tag = 'throw';
      }
    }
    if (chaos && (tag === 'idle' || tag === 'walk')) {
      texture = chaosBody;
      tag = tag === 'walk' ? 'chaos_walk' : 'chaos';
    }
    const name = tag + '_' + direction;
    const token =
      texture + ':' + name + (casting ? ':' + actor.actionStartedAt : '');
    const scale =
      conLuanBodyScale * (chaos && texture !== chaosBody ? 1.34 : 1);
    if (sprite.getData('con-luan-pose') !== token) {
      sprite.setData('con-luan-pose', token);
      this.setCel(sprite, texture, name);
    }
    sprite
      .setOrigin(...conLuanPivot)
      .setScale(scale)
      .setAlpha(actor.hp <= 0 ? 0.45 : 1);
    if (pose === 'hurt' || pose === 'stun') sprite.setTint(0xffb9a0);
    else sprite.clearTint();
    if (actor.hp <= 0) return;
    if (!monk) {
      const [x, y] = swordOffset[direction];
      this.attach(
        id + ':sword',
        effects,
        'jian',
        sprite.x + x * scale,
        sprite.y + (y + Math.sin(this.scene.time.now / 180) * 2) * scale,
        sprite.depth + (direction === 'up' ? 1 : -1),
        scale,
      );
    }
    if (chaos) {
      this.attach(
        id + ':chaos',
        effects,
        'chaos_aura',
        sprite.x,
        sprite.y - (texture === chaosBody ? 59 : 44) * scale,
        sprite.depth + 1,
        conLuanBodyScale,
      ).setAlpha(0.68 + 0.28 * Math.sin(this.scene.time.now / 69) ** 2);
    }
    const socket = this.sockets[String(sprite.frame.name)];
    if (ranged && texture === conLuanMonkTexture && socket)
      this.attach(
        id + ':coil',
        monkFx,
        'coil',
        sprite.x + socket[0] * scale,
        sprite.y + socket[1] * scale,
        sprite.depth + 1,
        scale,
      );
  }

  begin(): void {
    for (const sprite of this.attached.values()) sprite.setVisible(false);
  }

  sync(state: LobbyState | undefined, zoneId: string): void {
    for (const [id, sprite] of this.attached)
      if (!sprite.visible) {
        sprite.destroy();
        this.attached.delete(id);
      }
    const seen = new Set<string>();
    const keep = (
      id: string,
      tag: string,
      x: number,
      y: number,
      depth: number,
      sx = conLuanBodyScale,
      sy = sx,
      angle = 0,
      alpha = 1,
      texture = effects,
    ) => {
      seen.add(id);
      let sprite = this.persistent.get(id);
      if (!sprite) {
        sprite = this.make(texture, tag, x, y);
        this.persistent.set(id, sprite);
      }
      sprite
        .setPosition(x, y)
        .setDepth(depth)
        .setScale(sx, sy)
        .setRotation(angle)
        .setAlpha(alpha);
    };
    state?.projectiles.forEach((shot, id) => {
      if (shot.zoneId !== zoneId) return;
      const tag =
        shot.abilityId === conLuan.hammer
          ? 'hammer_' + directionFor(shot.vx, shot.vy)
          : shot.abilityId === conLuan.dragon
            ? 'dragon_head'
            : shot.abilityId === conLuan.sword
              ? shot.stage === 'sword'
                ? 'blade'
                : 'orb'
              : undefined;
      if (!tag) return;
      if (shot.abilityId === conLuan.dragon) {
        const release = this.dragonRelease.get(shot.ownerId);
        if (release) release.setVisible(false);
      }
      const angle = Math.atan2(shot.vy, shot.vx);
      const lead = shot.abilityId === conLuan.dragon ? 28 : 0;
      keep(
        id,
        tag,
        shot.x - lead * Math.cos(angle),
        shot.y - 23 - lead * Math.sin(angle),
        shot.y + 1,
        conLuanBodyScale,
        conLuanBodyScale,
        shot.abilityId === conLuan.hammer ? 0 : angle,
      );
    });
    const tick = zoneTick(state, zoneId) ?? 0;
    if (tick !== this.lastRingTick) {
      this.lastRingTick = tick;
      this.lastRingTickAt = this.scene.time.now;
    }
    const ringFraction = Math.min(
      1,
      ((this.scene.time.now - this.lastRingTickAt) * m1Config.tickRate) / 1000,
    );
    state?.areas.forEach((area, id) => {
      if (area.zoneId !== zoneId) return;
      const { x, y, radius, radiusY } = area;
      if (area.abilityId === conLuan.plant) {
        keep(
          id + ':field',
          'field',
          x,
          y,
          0,
          radius / 102.5,
          radiusY / 36,
          0,
          0.55,
        );
        keep(id, 'anchor', x, y, y + 1);
      } else if (area.abilityId === conLuan.star) {
        this.star(keep, id, fiveSwordPoints(x, y, radius, radiusY));
      } else if (area.abilityId === conLuan.ring) {
        const progress = Phaser.Math.Clamp(
          (tick - area.startedAt + 1 + ringFraction) / 14,
          0.08,
          1,
        );
        keep(
          id,
          'lightning_ring',
          x,
          y,
          0,
          (radius / 300) * progress,
          (radiusY / 166) * progress,
          0,
          1,
          lightning,
        );
      }
    });
    for (const [id, sprite] of this.persistent)
      if (!seen.has(id)) {
        this.persistent.delete(id);
        if (sprite.texture.key === lightning) {
          sprite.anims.stop();
          sprite.setFrame('lightning_ring_3');
          this.temporary.add(sprite);
          this.scene.tweens.add({
            targets: sprite,
            alpha: 0,
            duration: 145,
            onComplete: () => {
              if (this.temporary.delete(sprite)) sprite.destroy();
            },
          });
        } else sprite.destroy();
      }
  }

  event(e: CombatEvent, actor?: Sprite): boolean {
    if (!ids.has(e.abilityId)) return false;
    const dir = directionFor(e.fx ?? 0, e.fy ?? 1);
    const { x, y, radius = 0 } = e;
    const hit = e.kind === 'hit';
    const pulse = e.kind === 'pulse';
    if (
      e.kind === 'attack' &&
      e.abilityId === conLuan.monk &&
      e.stage &&
      beats.includes(e.stage)
    )
      this.flash(monkFx, 'trail_' + e.stage + '_' + dir, x, y, {
        depth: y + (dir === 'up' ? -0.1 : 0.1),
      });
    if (e.abilityId === conLuan.monk && pulse && e.stage === 'area_tick')
      this.flash(monkFx, 'slam', x, y);
    if (e.abilityId === conLuan.bolt && pulse)
      this.flash(monkFx, 'bolt', x, y - 21);
    if (e.abilityId === conLuan.ring && hit)
      this.flash(effects, 'gold_ember', x, y - 4);
    if (e.abilityId === conLuan.slam && pulse && e.stage === 'hammer_contact')
      this.flash(lightning, 'hammer_contact', x, y, {
        scale: radius / 130,
        depth: y + 4,
      });
    if (e.abilityId === conLuan.hammer && pulse && e.stage === 'explosion')
      this.flash(effects, 'gold_burst', x, y);
    if ((e.abilityId === conLuan.slam || e.abilityId === conLuan.hammer) && hit)
      this.flash(effects, 'gold_stagger', x, y - 43);
    if (e.abilityId === conLuan.chaos && e.kind === 'cast')
      this.flash(effects, 'gold_ember', x, y - 28, { scale: 1 });
    if (e.abilityId === conLuan.dragon && e.kind === 'cast') {
      // A point-blank collision can resolve before the first projectile patch.
      const angle = Math.atan2(e.fy ?? 0, e.fx ?? 1);
      const release = this.flash(
        effects,
        'dragon_head',
        x - 12 * Math.cos(angle),
        y - 23 - 12 * Math.sin(angle),
        { angle, duration: 120 },
      );
      this.dragonRelease.set(e.sourceId, release);
      release.once('destroy', () => {
        if (this.dragonRelease.get(e.sourceId) === release)
          this.dragonRelease.delete(e.sourceId);
      });
    }
    if (e.abilityId === conLuan.plant && e.kind === 'cast')
      this.flash(effects, 'violet_impact', x, y);
    if (e.abilityId === conLuan.detonate && pulse) {
      this.flash(effects, 'violet_bolt', x, y);
      this.flash(effects, 'violet_ring', x, y, { depth: 0 });
    }
    if (e.abilityId === conLuan.dash && e.kind === 'cast')
      this.flash(effects, 'dash', x, y - 9, {
        angle: Math.atan2(e.fy ?? 0, e.fx ?? 1),
      });
    if (e.abilityId === conLuan.dash && e.stage === 'reset')
      this.flash(effects, 'violet_ring', x, y, { depth: 0 });
    if (e.abilityId === conLuan.fan && pulse && e.stage === 'sweep') {
      const heading = Math.atan2(e.fy ?? 0, e.fx ?? 1);
      const angle = heading + (((e.hitIndex ?? 0) - 2) * Math.PI) / 8;
      const sprite = this.flash(effects, 'blade', x, y - 21, {
        angle,
        duration: 180,
      });
      if (sprite)
        this.scene.tweens.add({
          targets: sprite,
          x: x + Math.cos(angle) * radius,
          y: y - 21 + Math.sin(angle) * radius,
          duration: 160,
        });
    }
    if (
      (e.abilityId === conLuan.sword ||
        e.abilityId === conLuan.dragon ||
        e.abilityId === conLuan.star) &&
      hit
    )
      this.flash(effects, 'violet_impact', x, y - 20);
    if (e.abilityId === conLuan.sword && pulse && e.stage === 'explosion')
      this.flash(effects, 'violet_impact', x, y, { scale: 0.8 });
    if (e.abilityId === conLuan.dragon && hit)
      this.flash(effects, 'violet_stagger', x, y - 43);
    if (e.abilityId === conLuan.star && e.kind === 'cast') {
      const effect = m1Config.skillCatalogue![conLuan.star]!.effect;
      if (effect.mode === 'area') {
        const start = { x: actor?.x ?? x, y: (actor?.y ?? y) - 28 };
        fiveSwordPoints(x, y, effect.radius, effect.radiusY!).forEach(
          (point, index) => {
            const sprite = this.flash(effects, 'anchor', start.x, start.y, {
              delay: index * 47,
              duration: 500 - index * 47,
              hold: true,
            });
            if (sprite)
              this.scene.tweens.add({
                targets: sprite,
                x: point.x,
                y: point.y,
                delay: index * 47,
                duration: 500 - index * 47,
              });
          },
        );
      }
    }
    if (e.abilityId === conLuan.star && pulse) {
      if (e.stage === 'area_open')
        this.flash(effects, 'violet_bolt', x, y, { scale: 0.65 });
      const effect = m1Config.skillCatalogue![conLuan.star]!.effect;
      if (effect.mode === 'area')
        for (const point of fiveSwordPoints(x, y, radius, effect.radiusY!))
          this.flash(effects, 'violet_impact', point.x, point.y, {
            scale: 0.28,
          });
    }
    return true;
  }

  clear(): void {
    for (const sprite of [
      ...this.attached.values(),
      ...this.persistent.values(),
      ...this.temporary,
    ]) {
      this.scene.tweens.killTweensOf(sprite);
      sprite.destroy();
    }
    this.attached.clear();
    this.persistent.clear();
    this.temporary.clear();
    this.dragonRelease.clear();
  }

  inspect() {
    return [
      ...this.attached.values(),
      ...this.persistent.values(),
      ...this.temporary,
    ]
      .filter((sprite) => sprite.visible)
      .map((sprite) => ({
        frame: sprite.frame.name,
        texture: sprite.texture.key,
        x: sprite.x,
        y: sprite.y,
        depth: sprite.depth,
      }));
  }

  private star(
    keep: (
      id: string,
      tag: string,
      x: number,
      y: number,
      depth: number,
      sx?: number,
      sy?: number,
      angle?: number,
    ) => void,
    id: string,
    points: Point[],
  ): void {
    points.forEach((p, index) => {
      const q = points[(index + 2) % points.length]!;
      keep(id + ':sword:' + index, 'anchor', p.x, p.y, p.y + 0.1);
      keep(
        id + ':edge:' + index,
        'edge',
        (p.x + q.x) / 2,
        (p.y + q.y) / 2,
        0,
        Math.hypot(q.x - p.x, q.y - p.y) / 168,
        0.35,
        Math.atan2(q.y - p.y, q.x - p.x),
      );
    });
  }

  private attach(
    id: string,
    texture: string,
    tag: string,
    x: number,
    y: number,
    depth: number,
    scale: number,
  ): Sprite {
    let sprite = this.attached.get(id);
    if (!sprite) {
      sprite = this.make(texture, tag, x, y);
      this.attached.set(id, sprite);
    }
    return sprite
      .setVisible(true)
      .setPosition(x, y)
      .setDepth(depth)
      .setScale(scale);
  }

  private setCel(sprite: Sprite, texture: string, tag: string): void {
    sprite.anims.stop();
    sprite.setTexture(texture, tag + '_0');
    const key = texture + ':' + tag;
    if (this.scene.anims.exists(key)) sprite.play(key);
  }

  private make(texture: string, tag: string, x: number, y: number): Sprite {
    const sprite = this.scene.add.sprite(x, y, texture, tag + '_0');
    this.setCel(sprite, texture, tag);
    return sprite;
  }

  private flash(
    texture: string,
    tag: string,
    x: number,
    y: number,
    options: {
      depth?: number;
      delay?: number;
      angle?: number;
      scale?: number;
      duration?: number;
      hold?: boolean;
    } = {},
  ): Sprite {
    const {
      depth = y + 0.2,
      delay = 0,
      angle = 0,
      scale = conLuanBodyScale,
      duration = 310,
      hold = false,
    } = options;
    const sprite = this.make(texture, tag, x, y)
      .setDepth(depth)
      .setScale(scale)
      .setRotation(angle);
    this.temporary.add(sprite);
    const dispose = () => {
      if (this.temporary.delete(sprite)) sprite.destroy();
    };
    if (delay) {
      sprite.setVisible(false);
      this.scene.time.delayedCall(delay, () => {
        if (this.temporary.has(sprite)) sprite.setVisible(true);
      });
    }
    if (sprite.anims.isPlaying) sprite.once('animationcomplete', dispose);
    else if (hold) this.scene.time.delayedCall(duration + delay, dispose);
    else
      this.scene.tweens.add({
        targets: sprite,
        alpha: 0,
        duration,
        delay,
        onComplete: dispose,
      });
    return sprite;
  }
}

function directionFor(x: number, y: number): Direction {
  return Math.abs(x) >= Math.abs(y) && x !== 0
    ? x > 0
      ? 'right'
      : 'left'
    : y < 0
      ? 'up'
      : 'down';
}
