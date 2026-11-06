import Phaser from 'phaser';
import type { CombatEvent } from '@volam/game-core';
import type { LobbyState } from '@volam/game-protocol';
import { m1Config } from '@volam/game-data';
import raw from './renovation-followup.generated.json';
import { renovationFollowupEnabled } from './renovation-policy.js';
import { dragonTurnFrame } from './renovation-followup-model.js';
export function preloadRenovationFollowup(scene: Phaser.Scene) {
  if (renovationFollowupEnabled())
    for (const a of raw.assets.filter((a) => a.type !== 'body'))
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
  image
    .setTexture('renovated-v6-dragon_turns', pose.frame)
    .setOrigin(...pose.origin)
    .setRotation(0)
    .setFlipX(pose.flip)
    .setData('source-heading', undefined)
    .setData('authored-heading', pose.direction)
    .setData('v6-effect', 'dragon_turns');
  const observed = image.scene.registry.get('renovation-observed') as
    Map<string, Set<string>> | undefined;
  if (observed) {
    const key = 'v6:dragon_heading:' + projectileId;
    const headings = observed.get(key) ?? new Set<string>();
    headings.add(pose.direction);
    observed.set(key, headings);
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
    delay = 0,
  ) {
    const image = this.scene.add
      .image(x, y, 'renovated-v6-' + effect, '0')
      .setName('renovation-v6:' + e.abilityId)
      .setData('v6-effect', effect)
      .setScale(0.65)
      .setDepth(effect === 'staff_crack' ? -2 : e.y + 0.8);
    const f = {
      image,
      owner: e.sourceId,
      effect,
      start: this.scene.time.now + delay,
      life,
      x,
      y,
      fx: e.fx ?? 1,
      fy: e.fy ?? 0,
      follow,
    };
    this.flashes.add(f);
    return f;
  }
  event(e: CombatEvent) {
    if (!renovationFollowupEnabled() || e.abilityId !== 'pha_giap_bong') return;
    if (e.kind === 'cast') {
      const effect = m1Config.skillCatalogue!.pha_giap_bong!.effect,
        windup = 'windupTicks' in effect ? (effect.windupTicks ?? 6) : 6;
      this.flash(
        e,
        'staff_arc',
        300,
        e.x,
        e.y - 36,
        true,
        Math.max(0, (windup * 1000) / m1Config.tickRate - 90),
      );
    }
    if (e.kind === 'pulse' && e.stage === 'strike')
      this.flash(
        e,
        'staff_crack',
        700,
        e.x + (e.fx ?? 1) * 50,
        e.y + (e.fy ?? 0) * 50,
      );
    if (e.kind === 'hit')
      for (const f of this.flashes)
        if (
          f.owner === e.sourceId &&
          f.effect === 'staff_crack' &&
          this.scene.time.now - f.start < 150
        ) {
          f.x = e.x;
          f.y = e.y;
        }
  }
  sync(
    state: LobbyState | undefined,
    zone: string,
    position?: (id: string) => { x: number; y: number } | undefined,
  ) {
    if (!renovationFollowupEnabled()) return;
    for (const f of this.flashes) {
      const owner = state?.players.get(f.owner),
        age = this.scene.time.now - f.start;
      if (age >= f.life || !owner || owner.hp <= 0 || owner.zoneId !== zone) {
        f.image.destroy();
        this.flashes.delete(f);
        continue;
      }
      f.image.setVisible(age >= 0);
      if (age < 0) continue;
      if (f.follow) {
        const p = position?.(f.owner) ?? owner;
        f.x = p.x;
        f.y = p.y - 36;
      }
      if (f.effect === 'staff_arc') {
        const angle = Math.atan2(f.fy, f.fx),
          left = f.fx < 0;
        f.image
          .setFlipX(left)
          .setRotation(left ? angle - Math.PI : angle)
          .setOrigin(left ? 0.7 : 0.3, 0.35);
      }
      f.image
        .setPosition(f.x, f.y)
        .setFrame(String(Math.min(3, Math.floor((age / f.life) * 4))))
        .setAlpha(Math.min(1, (f.life - age) / 160));
      const observed = this.scene.registry.get('renovation-observed') as
        Map<string, Set<string>> | undefined;
      if (observed) {
        const key = 'v6:' + f.effect + ':' + f.owner + ':' + f.fx + ':' + f.fy,
          frames = observed.get(key) ?? new Set<string>();
        frames.add(String(f.image.frame.name));
        observed.set(key, frames);
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
