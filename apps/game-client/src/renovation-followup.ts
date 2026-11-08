import Phaser from 'phaser';
import type { CombatEvent } from '@volam/game-core';
import type { LobbyState } from '@volam/game-protocol';
import { m1Config } from '@volam/game-data';
import { caiBangBongArtEnabled } from './bong-combo-review-art.js';
import {
  bongPhaGiapBody,
  bongPhaGiapEffects,
  bongPhaGiapPath,
  bongPhaGiapReachScale,
  bongPhaGiapSwingTip,
} from './bong-skill-review-art.js';
import raw from './renovation-followup.generated.json';
import coilArt from './renovation-coil.generated.json';
import reachArt from './renovation-reach.generated.json';
import { renovationFollowupEnabled } from './renovation-policy.js';
import {
  dragonTurnFrame,
  dragonCoilFrame,
  staffContact,
  staffFissureTransform,
} from './renovation-followup-model.js';
export function preloadRenovationFollowup(scene: Phaser.Scene) {
  if (caiBangBongArtEnabled)
    scene.load.atlas(
      bongPhaGiapEffects,
      bongPhaGiapPath + 'effects.png',
      bongPhaGiapPath + 'effects.json',
    );
  if (renovationFollowupEnabled())
    for (const a of [
      ...raw.assets.filter((a) => a.type !== 'body'),
      ...coilArt.assets,
      ...reachArt.assets.filter((a) => a.type !== 'body'),
    ])
      scene.load.atlas(a.key, a.url, a.atlas);
}
export function drawTurningDragon(
  image: Phaser.GameObjects.Image,
  fx: number,
  fy: number,
  ageMs: number,
  projectileId: string,
) {
  const pose = dragonTurnFrame(fx, fy, ageMs);
  const effect = m1Config.skillCatalogue!.hang_long_hoa_vu!.effect;
  const phase =
    effect.mode === 'projectile' && effect.dragonDive
      ? dragonCoilFrame((ageMs * m1Config.tickRate) / 1000, effect.dragonDive)
      : undefined;
  const origins = coilArt.assets.find((a) => a.id === 'dragon_coil_fire')!
    .origins as Record<string, number[]>;
  const origin = phase ? origins[String(phase.index)]! : pose.origin;
  image
    .setTexture(
      phase
        ? 'renovated-v7-dragon_coil_fire'
        : 'renovated-v7-dragon_forward_fire',
      phase ? String(phase.index) : pose.frame,
    )
    .setOrigin(origin[0]!, origin[1]!)
    .setRotation(0)
    .setFlipX(phase ? false : pose.flip)
    .setData('source-heading', undefined)
    .setData('authored-heading', phase ? undefined : pose.direction)
    .setData('v7-phase', phase?.phase ?? 'dragon_forward')
    .setData('v6-effect', phase?.phase ?? 'dragon_forward');
  const observed = image.scene.registry.get('renovation-observed') as
    Map<string, Set<string>> | undefined;
  if (observed) {
    const key = 'v7:dragon:' + projectileId;
    const frames = observed.get(key) ?? new Set<string>();
    frames.add((phase?.phase ?? 'dragon_forward') + ':' + image.frame.name);
    observed.set(key, frames);
  }
}
type Flash = {
  image: Phaser.GameObjects.Image;
  owner: string;
  effect: string;
  start: number;
  life: number;
  x: number;
  y: number;
  fx: number;
  fy: number;
  follow: boolean;
  windup: number;
  strikeAt?: number | undefined;
};
/** Cast/strike/impact clocks stay server-owned. This class only samples drawings. */
export class RenovationFollowup {
  private flashes = new Set<Flash>();
  constructor(private scene: Phaser.Scene) {}
  private flash(
    e: CombatEvent,
    effect: string,
    life: number,
    x: number,
    y: number,
    follow = false,
  ) {
    const arc = effect === 'staff_arc',
      contact = staffContact(e.fx ?? 1, e.fy ?? 0);
    const image = this.scene.add
      .image(
        x,
        y,
        caiBangBongArtEnabled
          ? bongPhaGiapEffects
          : arc
            ? 'renovated-v8-staff_long_sweep'
            : 'renovated-v8-staff_fissure',
        caiBangBongArtEnabled
          ? arc
            ? 'trail_0'
            : 'impact_0'
          : arc
            ? contact.direction + '_0'
            : '0',
      )
      .setName('renovation-v6:' + e.abilityId)
      .setData('v6-effect', effect)
      .setOrigin(
        caiBangBongArtEnabled ? 152 / 256 : 0.5,
        caiBangBongArtEnabled ? 170 / 224 : 819 / 1280,
      )
      .setScale(0.5)
      .setDepth(arc ? e.y + 0.8 : -2)
      .setVisible(false);
    const f = {
      image,
      owner: e.sourceId,
      effect,
      start: this.scene.time.now,
      life,
      x,
      y,
      fx: e.fx ?? 1,
      fy: e.fy ?? 0,
      follow,
      windup: 200,
      strikeAt: undefined as number | undefined,
    };
    this.flashes.add(f);
    return f;
  }
  event(e: CombatEvent) {
    if (!renovationFollowupEnabled() || e.abilityId !== 'pha_giap_bong') return;
    if (e.kind === 'cast') {
      const effect = m1Config.skillCatalogue!.pha_giap_bong!.effect,
        windup = 'windupTicks' in effect ? (effect.windupTicks ?? 6) : 6;
      const f = this.flash(
        e,
        'staff_arc',
        (windup * 1000) / m1Config.tickRate + 500,
        e.x,
        e.y,
        true,
      );
      f.windup = (windup * 1000) / m1Config.tickRate;
    }
    if (e.kind === 'pulse' && e.stage === 'strike') {
      for (const f of this.flashes)
        if (
          f.owner === e.sourceId &&
          f.effect === 'staff_arc' &&
          f.strikeAt === undefined
        ) {
          f.strikeAt = this.scene.time.now;
          f.follow = false;
          f.x = e.x;
          f.y = e.y;
        }
      if (caiBangBongArtEnabled) this.flash(e, 'staff_lava', 515, e.x, e.y);
      else this.flash(e, 'staff_crack', 700, e.x, e.y);
    }
  }
  sync(
    state: LobbyState | undefined,
    zone: string,
    position?: (id: string) => Phaser.GameObjects.Sprite | undefined,
  ) {
    if (!renovationFollowupEnabled()) return;
    for (const f of this.flashes) {
      const owner = state?.players.get(f.owner),
        age = this.scene.time.now - f.start,
        remaining =
          f.strikeAt === undefined
            ? f.life - age
            : 280 - (this.scene.time.now - f.strikeAt);
      if (remaining <= 0 || !owner || owner.hp <= 0 || owner.zoneId !== zone) {
        f.image.destroy();
        this.flashes.delete(f);
        continue;
      }
      const sprite = position?.(f.owner);
      if (f.follow) {
        const p = sprite ?? owner;
        f.x = p.x;
        f.y = p.y;
      }
      const arc = f.effect === 'staff_arc';
      if (caiBangBongArtEnabled) {
        const contact = staffContact(f.fx, f.fy);
        const contactX = f.x + contact.x * bongPhaGiapReachScale;
        const contactY = f.y + contact.y * bongPhaGiapReachScale;
        if (!arc) {
          const cel = age < 45 ? 0 : age < 145 ? 1 : age < 270 ? 2 : 3;
          f.image
            .setVisible(true)
            .setFrame('impact_' + cel)
            .setPosition(contactX, contactY)
            .setScale(contact.direction === 'left' ? -1 : 1, 1)
            .setDepth(-2)
            .setAlpha(Math.min(1, remaining / 170))
            .setData('staff-contact', [contactX, contactY]);
          continue;
        }
        const strikeAge =
          f.strikeAt === undefined ? 0 : this.scene.time.now - f.strikeAt;
        const swinging =
          sprite?.texture.key === bongPhaGiapBody &&
          sprite.frame.name === `slam_${contact.direction}_1`;
        // Use the rendered cel as the gate, so the trail cannot lead the staff.
        const visible = f.strikeAt === undefined ? swinging : strikeAge < 120;
        f.image.setVisible(visible);
        if (!visible) continue;
        const [tipX, tipY] = bongPhaGiapSwingTip[contact.direction];
        let cel = age < f.windup * 0.54 ? 0 : 1;
        if (f.strikeAt !== undefined) cel = strikeAge < 54 ? 2 : 3;
        const left = contact.direction === 'left';
        const horizontal =
          contact.direction === 'left' || contact.direction === 'right';
        f.image
          .setFrame('trail_' + cel)
          .setScale(left ? -1 : horizontal ? 1 : 0.62, 1)
          .setDepth(f.y - 0.1)
          .setPosition(
            swinging ? sprite.x + tipX : contactX,
            swinging ? sprite.y + tipY : contactY,
          )
          .setAlpha(f.strikeAt === undefined ? 1 : (120 - strikeAge) / 120)
          .setData('staff-contact', [contactX, contactY]);
        continue;
      }
      const visibleAt = arc ? f.windup * 0.5 : 0;
      f.image.setVisible(age >= visibleAt);
      if (age < visibleAt) continue;
      if (arc) {
        const contact = staffContact(f.fx, f.fy),
          cel =
            f.strikeAt === undefined
              ? age < f.windup * 0.65
                ? 0
                : 1
              : this.scene.time.now - f.strikeAt < 120
                ? 2
                : 3;
        f.image
          .setFrame(contact.direction + '_' + cel)
          .setRotation(0)
          .setDepth(f.y + (contact.direction === 'up' ? -0.3 : 0.8))
          .setData('staff-contact', [f.x + contact.x, f.y + contact.y]);
      } else {
        const contact = staffContact(f.fx, f.fy),
          transform = staffFissureTransform(f.fx, f.fy);
        f.image
          .setFrame(String(Math.min(3, Math.floor((age / f.life) * 4))))
          .setScale(transform.scaleX, transform.scaleY)
          .setRotation(transform.rotation)
          .setData('staff-contact', [f.x + contact.x, f.y + contact.y]);
      }
      f.image.setPosition(f.x, f.y).setAlpha(Math.min(1, remaining / 120));
      const observed = this.scene.registry.get('renovation-observed') as
        Map<string, Set<string>> | undefined;
      if (observed) {
        const key = 'v6:' + f.effect + ':' + f.owner + ':' + f.fx + ':' + f.fy,
          frames = observed.get(key) ?? new Set<string>();
        frames.add(String(f.image.frame.name));
        observed.set(key, frames);
      }
    }
    const observed = this.scene.registry.get('renovation-observed') as
      Map<string, Set<string>> | undefined;
    if (observed)
      for (const arc of this.flashes)
        if (
          arc.effect === 'staff_arc' &&
          arc.strikeAt !== undefined &&
          this.scene.time.now - arc.strikeAt < 120
        ) {
          const crack = [...this.flashes].find(
            (f) =>
              f.effect === 'staff_crack' &&
              f.owner === arc.owner &&
              this.scene.time.now - f.start < 150,
          );
          const a = arc.image.getData('staff-contact') as number[] | undefined,
            b = crack?.image.getData('staff-contact') as number[] | undefined;
          if (a && b) {
            const key =
                'v7:staff_alignment:' + arc.owner + ':' + arc.fx + ':' + arc.fy,
              values = observed.get(key) ?? new Set<string>();
            values.add(String(Math.hypot(a[0]! - b[0]!, a[1]! - b[1]!)));
            observed.set(key, values);
          }
        }
    for (const o of this.scene.children.list) {
      const im = o as Phaser.GameObjects.Image;
      if (!im.texture) continue;
      const key = im.texture.key;
      if (
        ['khang_long_huu_hoi_vfx', 'm3d_khang_long_huu_hoi_vfx'].includes(
          key,
        ) ||
        /b3_pha_giap_vfx|m3d_pha_giap_bong_vfx/.test(key) ||
        (key === 'bong_controls_v2_ground' && /pha_giap/.test(im.name))
      )
        im.setVisible(false);
    }
  }
  clear() {
    for (const f of this.flashes) f.image.destroy();
    this.flashes.clear();
  }
}
