import Phaser from 'phaser';
import type { CombatEvent } from '@volam/game-core';
import type { LobbyState } from '@volam/game-protocol';
import { m1Config } from '@volam/game-data';
import raw from './renovation-feedback.generated.json';
import { renovationActionsEnabled } from './renovation-actions.js';
import { renovationRevisionEnabled } from './renovation-policy.js';

export const renovationFeedbackEnabled = () =>
  renovationActionsEnabled() &&
  new URLSearchParams(location.search).get('renovationSkills') !== 'v3';
export function preloadRenovationFeedback(scene: Phaser.Scene) {
  if (!renovationFeedbackEnabled()) return;
  for (const e of raw.effects) scene.load.atlas(e.key, e.url, e.atlas);
  scene.load.once(Phaser.Loader.Events.COMPLETE, () => {
    for (const e of raw.effects)
      scene.textures.get(e.key).setFilter(Phaser.Textures.FilterMode.LINEAR);
  });
}
type Flash = {
  sprite: Phaser.GameObjects.Image;
  owner: string;
  ability: string;
  start: number;
  life: number;
  fx: number;
  fy: number;
  follow: boolean;
  dx: number;
  dy: number;
  cel?: number | undefined;
};
/** Rendering only. Real cast/pulse/projectile messages retain all timing, targeting and damage. */
export class RenovationFeedback {
  private flashes = new Set<Flash>();
  private shots = new Map<string, Phaser.GameObjects.Image>();
  private pulses = new Map<string, number>();
  constructor(private scene: Phaser.Scene) {}
  private image(effect: string, ability: string) {
    return this.scene.add
      .image(0, 0, 'renovated-v4-' + effect, '0')
      .setOrigin(0.5, effect === 'earth_eruption' ? 212 / 256 : 0.5)
      .setScale(0.5)
      .setName('renovation-v4:' + ability)
      .setData('v4-ability', ability);
  }
  private orient(image: Phaser.GameObjects.Image, fx: number, fy: number) {
    const horizontal = Math.abs(fx) >= Math.abs(fy);
    image
      .setFlipX(horizontal && fx < 0)
      .setRotation(horizontal ? 0 : fy < 0 ? -Math.PI / 2 : Math.PI / 2);
    image.setData('source-heading', [1, 0]);
  }
  private flash(
    e: CombatEvent,
    effect: string,
    life: number,
    dx: number,
    dy: number,
    options: {
      follow?: boolean;
      upright?: boolean;
      cel?: number;
      scale?: number;
    } = {},
  ) {
    const sprite = this.image(effect, e.abilityId);
    if (!options.upright) this.orient(sprite, e.fx ?? 1, e.fy ?? 0);
    if (options.scale) sprite.setScale(options.scale);
    sprite
      .setPosition(e.x + dx, e.y + dy)
      .setDepth(effect === 'earth_eruption' ? e.y + dy - 0.3 : e.y + 0.6);
    this.flashes.add({
      sprite,
      owner: e.sourceId,
      ability: e.abilityId,
      start: this.scene.time.now,
      life,
      fx: e.fx ?? 1,
      fy: e.fy ?? 0,
      follow: options.follow ?? false,
      dx,
      dy,
      cel: options.cel,
    });
  }
  event(e: CombatEvent) {
    if (!renovationFeedbackEnabled()) return;
    if (
      renovationRevisionEnabled() &&
      ['liet_phong_dao', 'bach_liet_thien_kich', 'tru_ta'].includes(e.abilityId)
    )
      return;
    const fx = e.fx ?? 1,
      fy = e.fy ?? 0;
    if (e.kind === 'cast') {
      this.pulses.set(e.sourceId + e.abilityId, 0);
      if (e.abilityId === 'liet_phong_dao')
        this.flash(e, 'liet_phong_overhead', 1000, 0, -82, {
          upright: true,
          follow: true,
        });
      if (e.abilityId === 'vi_da_quyen') {
        const effect = m1Config.skillCatalogue![e.abilityId]!.effect;
        const offset = effect.mode === 'arc' ? (effect.originOffset ?? 0) : 0;
        this.flash(e, 'earth_eruption', 600, fx * offset, fy * offset, {
          upright: true,
        });
      }
      if (e.abilityId === 'tru_ta')
        this.flash(e, 'tru_ta_crescent', 420, fx * 32, fy * 32 - 24);
    }
    if (e.kind === 'pulse') {
      if (e.abilityId === 'liet_phong_dao' && e.stage === 'strike') {
        for (const f of this.flashes)
          if (f.owner === e.sourceId && f.ability === e.abilityId) {
            f.sprite.destroy();
            this.flashes.delete(f);
          }
        this.flash(e, 'earth_eruption', 650, fx * 44, fy * 44, {
          upright: true,
        });
        this.flash(e, 'bach_liet_slashes', 250, fx * 35, fy * 35 - 24, {
          scale: 0.6,
        });
      }
      if (
        ['bach_liet_thien_kich', 'that_tinh_kiem'].includes(e.abilityId) &&
        ['sweep', 'finisher'].includes(e.stage ?? '')
      ) {
        if (e.abilityId === 'that_tinh_kiem' && e.stage === 'finisher') return;
        const key = e.sourceId + e.abilityId,
          n = this.pulses.get(key) ?? 0;
        this.pulses.set(key, n + 1);
        this.flash(
          e,
          e.abilityId === 'that_tinh_kiem'
            ? 'that_tinh_slashes'
            : 'bach_liet_slashes',
          e.stage === 'finisher' ? 300 : 150,
          fx * 38,
          fy * 38 - 24,
          { cel: n % 4, scale: e.stage === 'finisher' ? 0.65 : 0.5 },
        );
      }
    }
  }
  sync(
    state: LobbyState | undefined,
    zone: string,
    position?: (id: string) => { x: number; y: number } | undefined,
  ) {
    if (!renovationFeedbackEnabled()) return;
    for (const f of this.flashes) {
      const h = state?.players.get(f.owner),
        age = this.scene.time.now - f.start;
      if (
        age >= f.life ||
        !h ||
        h.hp <= 0 ||
        h.zoneId !== zone ||
        (f.follow && h.castAbilityId !== f.ability) ||
        JSON.parse(h.statuses).some((s: { kind: string }) => s.kind === 'stun')
      ) {
        f.sprite.destroy();
        this.flashes.delete(f);
        continue;
      }
      if (f.follow) {
        const p = position?.(f.owner) ?? h;
        f.sprite.setPosition(p.x + f.dx, p.y + f.dy).setDepth(p.y + 0.6);
      }
      // Four source cels, held long enough to read each contact stroke.
      const frame = f.cel ?? Math.min(3, Math.floor((age / f.life) * 4));
      f.sprite.setFrame(String(frame));
      f.sprite.setAlpha(Math.min(1, (f.life - age) / 80));
    }
    const active = new Set<string>();
    state?.projectiles.forEach((p, id) => {
      if (renovationRevisionEnabled() && p.abilityId === 'luong_nghi_thu')
        return;
      if (
        !['luong_nghi_thu', 'nhu_lai_thien_diep'].includes(p.abilityId) ||
        p.zoneId !== zone
      )
        return;
      active.add(id);
      let image = this.shots.get(id);
      if (!image) {
        image = this.image(
          p.abilityId === 'luong_nghi_thu'
            ? 'luong_nghi_disc'
            : 'nhu_lai_blade',
          p.abilityId,
        );
        this.shots.set(id, image);
      }
      // The authored source travels right. Apply the server velocity exactly once.
      image
        .setFrame(String(Math.floor(this.scene.time.now / 90) % 4))
        .setPosition(p.x, p.y - 24)
        .setDepth(p.y + 0.6)
        .setFlipX(false)
        .setRotation(Math.atan2(p.vy, p.vx));
      image.setData('source-heading', [1, 0]);
      image.setData('projectile-id', id);
      image.setData('velocity', [p.vx, p.vy]);
    });
    for (const [id, image] of this.shots)
      if (!active.has(id)) {
        image.destroy();
        this.shots.delete(id);
      }
    // Keep existing native cast bodies and independent Buddha/buff fields. Suppress
    // only the replaced legacy layers after all retained providers have positioned them.
    for (const o of this.scene.children.list) {
      const b = o as Phaser.GameObjects.Image;
      if (!b.texture || b.texture.key.startsWith('renovated-v4-')) continue;
      const k = b.texture.key,
        n = String(b.frame.name),
        label = b.name;
      const hide =
        [
          'that_tinh_kiem_vfx',
          'tru_ta_vfx',
          'review3_tru_ta_vfx',
          'vi_da_quyen_vfx',
          'm3d_liet_phong_ground_vfx_r2',
          'review3_ts_ground',
        ].includes(k) ||
        (['m3d_thien_son_dao_vfx', 'review3_ts_dao_fx'].includes(k) &&
          /liet_phong|bach_liet/.test(n)) ||
        (['m3d_thieu_lam_skill_vfx', 'review3_shaolin_skill_fx'].includes(k) &&
          /vi_da/.test(n)) ||
        (k === 'nhu_lai_thien_diep_vfx' && /^travel/.test(n)) ||
        ['feedback-v2:vi_da_quyen', 'm3d-r2:vi_da_quyen'].includes(label);
      if (hide) b.setVisible(false);
    }
  }
  clear() {
    for (const f of this.flashes) f.sprite.destroy();
    for (const s of this.shots.values()) s.destroy();
    this.flashes.clear();
    this.shots.clear();
    this.pulses.clear();
  }
}
