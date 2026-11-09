import Phaser from 'phaser';
import type { CombatEvent } from '@volam/game-core';
import { dragonDivePose } from '@volam/game-core';
import type { LobbyState } from '@volam/game-protocol';
import { m1Config, skillArt } from '@volam/game-data';
import raw from './renovation-revision.generated.json';
import { renovationRevisionEnabled } from './renovation-policy.js';
import { renovationFollowupEnabled } from './renovation-policy.js';
import { drawTurningDragon } from './renovation-followup.js';
import {
  hangLongArt,
  hangLongEnabled,
  hangLongId,
  phiLongEnabled,
  phiLongId,
} from './cai-bang-palm-art.js';
const definitions = new Map(raw.assets.map((a) => [a.id, a]));
type Point = { x: number; y: number };
type Flash = {
  image: Phaser.GameObjects.Image;
  effect: string;
  ability: string;
  owner: string;
  start: number;
  life: number;
  x: number;
  y: number;
  fx: number;
  fy: number;
  follow: boolean;
  ox: number;
  oy: number;
  contact?: number;
  cel?: number;
};
export function preloadRenovationRevision(scene: Phaser.Scene) {
  if (!renovationRevisionEnabled()) return;
  for (const a of raw.assets.filter((a) => a.type !== 'body'))
    scene.load.atlas(a.key, a.url, a.atlas);
  const guard = skillArt.assets.find((a) => a.id === 'la_han_quyen_vfx')!;
  scene.load.atlas(
    'retained_m3d_lahan_guard',
    '/' + guard.sheet.replace('assets/exports/', 'assets/'),
    '/' + guard.atlas.replace('assets/exports/', 'assets/'),
  );
}
/** New pixels, retained server messages. Each projectile follows its authoritative state. */
export class RenovationRevision {
  private flashes = new Set<Flash>();
  private shots = new Map<
    string,
    { image: Phaser.GameObjects.Image; shadow?: Phaser.GameObjects.Image }
  >();
  private fields = new Map<string, Phaser.GameObjects.Image>();
  private counts = new Map<string, number>();
  constructor(private scene: Phaser.Scene) {}
  private make(effect: string, ability: string) {
    const a = definitions.get(effect);
    const key = a?.key ?? 'renovated-v4-' + effect;
    return this.scene.add
      .image(0, 0, key, '0')
      .setScale(0.5)
      .setName('renovation-v5:' + ability)
      .setData('v5-effect', effect);
  }
  private aim(
    image: Phaser.GameObjects.Image,
    fx: number,
    fy: number,
    pivot = 0.5,
  ) {
    const a = Math.atan2(fy, fx),
      left = fx < -0.0001;
    image
      .setFlipX(left)
      .setRotation(left ? a - Math.PI : a)
      .setOrigin(left ? 1 - pivot : pivot, 0.5)
      .setData('source-heading', [1, 0]);
  }
  private flash(
    e: CombatEvent,
    effect: string,
    life: number,
    ox = 0,
    oy = 0,
    options: {
      ground?: boolean;
      scale?: number;
      cel?: number;
      follow?: boolean;
      upright?: boolean;
    } = {},
  ) {
    const image = this.make(effect, e.abilityId);
    const fx = e.fx ?? 1,
      fy = e.fy ?? 0;
    if (!options.upright) this.aim(image, fx, fy);
    else if (effect === 'liet_phong_overhead' && Math.abs(fx) > Math.abs(fy))
      image.setFlipX(fx < 0);
    image
      .setScale(options.scale ?? 0.5)
      .setPosition(e.x + ox, e.y + oy)
      .setDepth(options.ground ? e.y + oy - 0.3 : e.y + 0.8);
    if (options.cel !== undefined) image.setFrame(String(options.cel));
    const f: Flash = {
      image,
      effect,
      ability: e.abilityId,
      owner: e.sourceId,
      start: this.scene.time.now,
      life,
      x: e.x,
      y: e.y,
      fx,
      fy,
      follow: options.follow ?? false,
      ox,
      oy,
      ...(options.cel === undefined ? {} : { cel: options.cel }),
    };
    this.flashes.add(f);
    return f;
  }
  event(e: CombatEvent) {
    if (!renovationRevisionEnabled()) return;
    const fx = e.fx ?? 1,
      fy = e.fy ?? 0;
    if (e.kind === 'cast') {
      this.counts.set(e.sourceId + e.abilityId, 0);
      if (e.abilityId === 'liet_phong_dao')
        this.flash(e, 'liet_phong_overhead', 1100, 0, -82, {
          upright: true,
          follow: true,
        });
      if (e.abilityId === 'pha_giap_bong' && !renovationFollowupEnabled())
        this.flash(e, 'staff_slam', 800, fx * 28, fy * 28 - 45, {
          upright: true,
          follow: true,
        });
      if (e.abilityId === 'tru_ta') {
        const range = e.radius || 180;
        this.flash(
          e,
          'tru_ta_crescent',
          650,
          fx * range * 0.72,
          fy * range * 0.72 - 24,
          { scale: range / 180 },
        );
      }
    }
    if (e.kind === 'pulse') {
      if (
        e.abilityId === hangLongId &&
        e.stage === 'dragon_impact' &&
        !hangLongEnabled()
      )
        this.flash(e, 'dragon_impact', 700, 0, -18, {
          ground: true,
          upright: true,
          scale: Math.max(0.5, (e.radius ?? 112) / 200),
        });
      if (e.abilityId === 'liet_phong_dao' && e.stage === 'strike') {
        for (const f of this.flashes)
          if (f.owner === e.sourceId && f.effect === 'liet_phong_overhead') {
            f.image.destroy();
            this.flashes.delete(f);
          }
        this.flash(e, 'blue_fissure', 800, fx * 115, fy * 115, {
          ground: true,
          scale: 0.65,
        });
        this.flash(e, 'bach_liet_slashes', 300, fx * 80, fy * 80 - 24, {
          scale: 1.2,
        });
      }
      if (e.abilityId === 'pha_giap_bong' && e.stage === 'strike')
        for (const f of this.flashes)
          if (f.owner === e.sourceId && f.effect === 'staff_slam') {
            f.contact = this.scene.time.now;
            f.follow = false;
            f.x = e.x;
            f.y = e.y;
            f.image.setFlipX(fx < 0).setRotation(0);
          }
      if (
        e.abilityId === 'bach_liet_thien_kich' &&
        ['sweep', 'finisher'].includes(e.stage ?? '')
      ) {
        const key = e.sourceId + e.abilityId,
          n = this.counts.get(key) ?? 0;
        this.counts.set(key, n + 1);
        this.flash(
          e,
          'blossom_slashes',
          e.stage === 'finisher' ? 300 : 170,
          fx * (renovationFollowupEnabled() ? 68 : 48),
          fy * (renovationFollowupEnabled() ? 68 : 48) - 24,
          {
            cel: n % 8,
            scale:
              e.stage === 'finisher'
                ? renovationFollowupEnabled()
                  ? 1
                  : 0.7
                : renovationFollowupEnabled()
                  ? 0.8
                  : 0.5,
          },
        );
      }
    }
    if (e.kind === 'hit' && e.abilityId === 'thieu_lam_quyen')
      this.flash(e, 'azure_crescent', 150, 0, -20, { scale: 0.25, cel: 2 });
  }
  sync(
    state: LobbyState | undefined,
    zone: string,
    position?: (id: string) => Point | undefined,
  ) {
    if (!renovationRevisionEnabled()) return;
    for (const f of this.flashes) {
      const h = state?.players.get(f.owner),
        age = this.scene.time.now - f.start;
      if (
        age >= f.life ||
        !h ||
        h.hp <= 0 ||
        h.zoneId !== zone ||
        (f.effect === 'liet_phong_overhead' && h.castAbilityId !== f.ability)
      ) {
        f.image.destroy();
        this.flashes.delete(f);
        continue;
      }
      if (f.follow) {
        const p = position?.(f.owner) ?? h;
        f.image.setPosition(p.x + f.ox, p.y + f.oy).setDepth(p.y + 0.8);
      }
      const total = (definitions.get(f.effect)?.grid ?? [2, 2]).reduce(
        (a, b) => a * b,
        1,
      );
      let frame =
        f.cel ?? Math.min(total - 1, Math.floor((age / f.life) * total));
      if (f.effect === 'staff_slam')
        frame =
          f.contact === undefined
            ? age < 100
              ? 0
              : 1
            : this.scene.time.now - f.contact < 110
              ? 2
              : 3;
      f.image
        .setFrame(String(frame))
        .setAlpha(Math.min(1, (f.life - age) / 100));
    }
    const active = new Set<string>();
    const showPhiLongWave = phiLongEnabled();
    const showHangLong = hangLongEnabled();
    state?.projectiles.forEach((p, id) => {
      if (
        p.zoneId !== zone ||
        (showPhiLongWave && p.abilityId === phiLongId) ||
        (renovationFollowupEnabled() && p.abilityId === 'hoa_van_chuong') ||
        ![
          'hoa_van_chuong',
          'phi_long_tai_thien',
          'hang_long_hoa_vu',
          'truy_hon_dao',
          'thieu_lam_quyen',
        ].includes(p.abilityId)
      )
        return;
      active.add(id);
      let v = this.shots.get(id);
      const dragon = p.abilityId === hangLongId;
      const age =
        (zone === 'arena'
          ? (state?.tick ?? 0)
          : (state?.dungeons.get(zone)?.tick ?? 0)) - p.startedAt;
      if (dragon && showHangLong) {
        const effect = m1Config.skillCatalogue![hangLongId]!.effect;
        if (effect.mode !== 'projectile' || !effect.dragonDive) return;
        const d = effect.dragonDive;
        const coilEnd = d.forwardTicks + d.orbitTicks;
        const riseEnd = coilEnd + d.riseTicks;
        const coiling = p.stage === 'dragon_coil';
        const rising = p.stage === 'dragon_rise';
        const stage = coiling
          ? 'dragon_coil'
          : rising
            ? 'dragon_rise'
            : 'dragon_dive';
        const progress = coiling
          ? (((age - d.forwardTicks) * (d.coilTurns ?? 1)) / d.orbitTicks) % 1
          : rising
            ? (age - coilEnd) / d.riseTicks
            : (age - riseEnd) / d.diveTicks;
        const clip = hangLongArt.animations.find((tag) => tag.name === stage)!;
        const index = Math.max(
          0,
          Math.min(
            clip.frames.length - 1,
            Math.floor(progress * clip.frames.length),
          ),
        );
        const frame = clip.frames[index]!;
        const point = position?.(p.ownerId) ?? p;
        const height =
          coiling || rising
            ? 0
            : d.height * (1 - Phaser.Math.Clamp(progress, 0, 1) ** 1.6);
        if (!v) {
          v = {
            image: this.scene.add
              .image(p.x, p.y, hangLongArt.id, frame)
              .setOrigin(...hangLongArt.origin),
          };
          this.shots.set(id, v);
        }
        v.image
          .setFrame(frame)
          .setFlipX(p.vx < 0)
          .setPosition(Math.round(point.x), Math.round(point.y - height))
          .setDepth(point.y + (coiling ? -0.3 : 0.8));
        return;
      }
      if (!v) {
        const effect = dragon
          ? 'dragon_flight'
          : ['hoa_van_chuong', 'phi_long_tai_thien'].includes(p.abilityId)
            ? 'dragon_head'
            : 'azure_crescent';
        v = { image: this.make(effect, p.abilityId) };
        if (dragon)
          v.shadow = this.make(effect, p.abilityId)
            .setTint(0x3b1c0c)
            .setData('v5-shadow', true)
            .setAlpha(0.18);
        this.shots.set(id, v);
      }
      let elevation = 22;
      if (dragon) {
        const d = m1Config.skillCatalogue!.hang_long_hoa_vu!.effect;
        if (d.mode === 'projectile' && d.dragonDive) {
          const s = d.dragonDive;
          const fake = dragonDivePose(
            { x: 0, y: 0 },
            { x: 0, y: 0 },
            1,
            0,
            age,
            s,
          );
          const descent = Math.max(
            0,
            (age - s.forwardTicks - s.orbitTicks - s.riseTicks) / s.diveTicks,
          );
          elevation = fake.height + 22 * (1 - Math.min(1, descent));
        }
      }
      const scale = dragon
        ? 0.65
        : p.abilityId === 'hoa_van_chuong'
          ? 0.15
          : p.abilityId === 'phi_long_tai_thien'
            ? 0.55
            : 0.5;
      if (dragon && renovationFollowupEnabled())
        drawTurningDragon(
          v.image,
          p.vx,
          p.vy,
          (age * 1000) / m1Config.tickRate,
          id,
        );
      else
        this.aim(
          v.image,
          p.vx,
          p.vy,
          dragon
            ? 0.75
            : p.abilityId === 'hoa_van_chuong' ||
                p.abilityId === 'phi_long_tai_thien'
              ? 0.75
              : 0.5,
        );
      if (!(dragon && renovationFollowupEnabled()))
        v.image.setFrame(
          String(Math.floor(this.scene.time.now / 75) % (dragon ? 8 : 4)),
        );
      v.image
        .setScale(scale)
        .setPosition(p.x, p.y - elevation)
        .setDepth(p.y + 0.8)
        .setData('velocity', [p.vx, p.vy])
        .setData('projectile-stage', p.stage);
      if (v.shadow) {
        v.shadow
          .setTexture(v.image.texture.key, v.image.frame.name)
          .setPosition(p.x, p.y)
          .setOrigin(v.image.originX, v.image.originY)
          .setFlipX(v.image.flipX)
          .setScale(scale, 0.1)
          .setDepth(p.y - 0.5)
          .setRotation(0);
      }
    });
    for (const [id, v] of this.shots)
      if (!active.has(id)) {
        v.image.destroy();
        v.shadow?.destroy();
        this.shots.delete(id);
      }
    const wanted = new Set<string>();
    const field = (
      key: string,
      effect: string,
      ability: string,
      x: number,
      y: number,
      scale: number,
      depth: number,
    ) => {
      wanted.add(key);
      let im = this.fields.get(key);
      if (!im) {
        im =
          effect === 'guard'
            ? this.scene.add.image(0, 0, 'retained_m3d_lahan_guard')
            : this.make(effect, ability);
        this.fields.set(key, im);
      }
      im.setPosition(x, y).setDepth(depth).setScale(scale);
      return im;
    };
    state?.players.forEach((h, id) => {
      if (h.hp <= 0 || h.zoneId !== zone) return;
      const p = position?.(id) ?? h;
      const statuses = JSON.parse(h.statuses) as {
        kind: string;
        abilityId: string;
      }[];
      if (
        statuses.some(
          (s) =>
            s.kind === 'damage_reduction' && s.abilityId === 'la_han_quyen',
        )
      ) {
        const im = field(
          'guard:' + id,
          'guard',
          'la_han_quyen',
          p.x,
          p.y,
          1,
          p.y - 0.3,
        );
        const frames = Object.keys(im.texture.frames).filter((n) =>
          /^guard/.test(n),
        );
        if (frames.length)
          im.setFrame(
            frames[Math.floor(this.scene.time.now / 90) % frames.length]!,
          );
        im.setOrigin(0.5).setScale(1, 0.35);
      }
    });
    state?.areas.forEach((a, id) => {
      if (
        renovationFollowupEnabled() ||
        a.zoneId !== zone ||
        a.abilityId !== 'thai_cuc_tran'
      )
        return;
      field(
        'dome:' + id,
        'tai_chi_dome',
        a.abilityId,
        a.x,
        a.y,
        (a.radius * 2) / 480,
        a.y - 50,
      )
        .setOrigin(0.5, 0.84)
        .setFrame(String(Math.floor(this.scene.time.now / 180) % 4))
        .setAlpha(0.7);
    });
    for (const [id, im] of this.fields)
      if (!wanted.has(id)) {
        im.destroy();
        this.fields.delete(id);
      }
    for (const o of this.scene.children.list) {
      const im = o as Phaser.GameObjects.Image;
      if (!im.texture) continue;
      const k = im.texture.key,
        n = String(im.frame.name),
        name = im.name;
      const replacedProjectile =
        [
          'hoa_van_chuong',
          'phi_long_tai_thien',
          'hang_long_hoa_vu',
          'truy_hon_dao',
        ]
          .filter((s) => !renovationFollowupEnabled() || s !== 'hoa_van_chuong')
          .some((s) => name === 'feedback-v2:' + s) &&
        k.endsWith('_projectile');
      if (
        replacedProjectile ||
        /^review3_r3_crescent_/.test(k) ||
        (k === 'la_han_quyen_vfx' && /^(guard|ending)/.test(n))
      )
        im.setVisible(false);
    }
  }
  clear() {
    for (const f of this.flashes) f.image.destroy();
    for (const v of this.shots.values()) {
      v.image.destroy();
      v.shadow?.destroy();
    }
    for (const im of this.fields.values()) im.destroy();
    this.flashes.clear();
    this.shots.clear();
    this.fields.clear();
    this.counts.clear();
  }
}
