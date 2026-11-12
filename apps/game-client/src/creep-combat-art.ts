import Phaser from 'phaser';
import { forestCombatEffect, nativeForestEffects } from './m3d-native-art.js';
import { creepProfiles } from '@volam/game-data';
import type { BossEffectState, LobbyState } from '@volam/game-protocol';
import type { CreepAttack } from '@volam/game-core';
import arrowUrl from '../../../assets/effects/dungeons/desert/arrow_right.png?url';
import { creepBodyVisible } from './creep-combat-visual.js';
import {
  preloadM3dReviewEffects,
  renderReviewedCreepCue,
  renderTrapCue,
  reviewFrame,
} from './m3d-review-effects.js';
import type { CombatEvent } from '@volam/game-core';

export function preloadCreepCombat(scene: Phaser.Scene): void {
  scene.load.image('creep_upgrade_arrow', arrowUrl);
  preloadM3dReviewEffects(scene);
}
const graphics: Record<string, [string, string]> = {
  arrow: ['arrow', 'metal_contact'],
  ice: ['arrow', 'beach_fx:magic_splash'],
  needle: ['co_mo:needle_projectile', 'co_mo:needle_poison_impact'],
  fire: ['fire_cultist_projectile', 'fire_cultist_contact'],
  lava: ['hell_molten_projectile', 'hell_lava_impact'],
  black_fire: ['hell_black_flame_projectile', 'hell_violet_black_impact'],
  blood: ['blood_projectile', 'blood_contact'],
  shadow: ['shadow_trail', 'shadow_contact'],
  spirit: ['blood_projectile', 'spectral_contact'],
  stone: ['beach_fx:cannon_projectile', 'stone_contact'],
  sand: ['beach_fx:cannon_projectile', 'hell_stone_fragments'],
  water: ['beach_fx:water_projectile', 'beach_fx:water_splash'],
  cannon: ['beach_fx:cannon_projectile', 'beach_fx:cannon_impact'],
  poison: [
    'forest_fx:truc_xa_venom_projectile_right',
    'forest_fx:truc_xa_venom_impact',
  ],
  web: [
    'forest_fx:doc_chu_web_projectile_right',
    'forest_fx:doc_chu_web_impact',
  ],
  wood: [
    'forest_fx:truc_yeu_thorn_projectile_right',
    'forest_fx:moc_linh_root_emerge',
  ],
  slash: ['arrow', 'metal_contact'],
  metal: ['arrow', 'metal_contact'],
  bite: ['arrow', 'demon_hound_contact'],
};
interface Fx {
  id: string;
  texture?: string;
  frames: string[];
  durations?: number[];
}
interface View {
  warning: Phaser.GameObjects.Sprite;
  body: Phaser.GameObjects.Sprite;
  label: Phaser.GameObjects.Text;
  frames: Set<string>;
}
/** Draws only authored PNGs. Server geometry and ticks own every warning, missile and area. */
export class CreepCombatArt {
  private views = new Map<string, View>();
  private defs = new Map<string, Fx>();
  private roots = new Map<string, Phaser.GameObjects.Sprite>();
  private impacts = new Set<Phaser.GameObjects.Sprite>();
  private observed = new Set<string>();
  private releases = new Map<
    string,
    { abilityId: string; frames: Set<string>; suppressed: boolean }
  >();
  constructor(private scene: Phaser.Scene) {
    for (const key of [
      'arena_creeps_manifest',
      'forest_creeps_manifest',
      'beach_manifest',
      'hell_manifest',
      'co_mo_manifest',
    ]) {
      const manifest = scene.cache.json.get(key) as
        { effects?: Fx[] } | undefined;
      for (const fx of manifest?.effects ?? []) this.defs.set(fx.id, fx);
    }
  }
  private frame(
    sprite: Phaser.GameObjects.Sprite,
    id: string,
    tick: number,
    loop = true,
  ) {
    if (id === 'arrow') {
      sprite.setTexture('creep_upgrade_arrow');
      return;
    }
    const def = this.defs.get(id);
    if (!def) throw Error(`Missing retained creep raster ${id}`);
    const f =
      def.frames[
        loop
          ? Math.floor(Math.max(0, tick) / 3) % def.frames.length
          : Math.min(def.frames.length - 1, Math.floor(Math.max(0, tick) / 3))
      ]!;
    // The approved replacement sheet adds a second, opposite-facing purple
    // shape to these cels. Use the retained original for this requested sweep
    // and green poison pool without changing the replacement used by bosses.
    const texture = [
      'co_mo:duster_sweep_trail',
      'co_mo:needle_poison_impact',
    ].includes(id)
      ? 'co_mo_original_fx'
      : (forestCombatEffect(this.scene, id) ??
        def.texture ??
        'arena_creep_impacts');
    if (sprite.texture.key !== texture) sprite.setTexture(texture, f);
    else sprite.setFrame(f);
    this.observed.add(`${texture}:${f}`);
  }
  event(e: CombatEvent): void {
    if (e.abilityId !== 'darts' || e.stage !== 'trap_impact') return;
    const sprite = this.scene.add.sprite(e.x, e.y, 'm3d_review_effects');
    this.impacts.add(sprite);
    reviewFrame(sprite, 'dart', 2, e.x, e.y - 12);
    this.scene.time.delayedCall(90, () => {
      if (this.impacts.has(sprite))
        reviewFrame(sprite, 'dart', 3, e.x, e.y - 12);
    });
    this.scene.time.delayedCall(180, () => {
      if (this.impacts.delete(sprite)) sprite.destroy();
    });
  }

  private renderRetainedReview(
    v: View,
    e: BossEffectState,
    tick: number,
    state: LobbyState,
  ): boolean {
    const age = tick - e.activeAt;
    if (e.abilityId === 'creep_hai_tac_hoa_phao_special' && age < 0) {
      const key = e.zoneId === 'arena' ? e.ownerId : e.zoneId + ':' + e.ownerId;
      const source = state.creeps.get(key);
      if (!source) return false;
      const ageFromStart = tick - e.startedAt;
      const x = source.x + e.fx * 19,
        y = source.y + e.fy * 19;
      const windup = e.activeAt - e.startedAt;
      const muzzleAt = Math.round(windup * 0.2);
      const flightAt = Math.round(windup * 0.45);
      if (ageFromStart < muzzleAt) return false;
      const flying = ageFromStart >= flightAt;
      const t = Math.max(
        0,
        (ageFromStart - flightAt) / Math.max(1, windup - flightAt),
      );
      this.frame(
        v.body,
        flying ? 'beach_fx:cannon_projectile' : 'beach_fx:muzzle_flash',
        ageFromStart,
        flying,
      );
      v.body
        .setVisible(true)
        .setOrigin(0.5)
        .setScale(0.65)
        .setPosition(
          x + (e.x - x) * t,
          y + (e.y - y) * t - 19 * (1 - t) - 100 * t * (1 - t),
        )
        .setDepth(y + 1);
      return true;
    }
    const release =
      e.kind === 'creep_projectile' &&
      age < 0 &&
      age >= -6 &&
      ['creep_truc_xa_basic', 'creep_truc_xa_special'].includes(e.abilityId);
    if (age < 0 && !release) return false;
    const effect = release
      ? 'forest_fx:truc_xa_venom_release'
      : e.kind !== 'creep_area'
        ? undefined
        : (
            {
              creep_son_vien_special: 'forest_fx:son_vien_slam_impact',
              creep_moc_linh_special: 'forest_fx:moc_linh_root_emerge',
              creep_hai_tac_hoa_phao_special: 'beach_fx:cannon_impact',
            } as Record<string, string>
          )[e.abilityId];
    if (!effect) return false;
    this.frame(v.body, effect, release ? 6 + age : age, false);
    v.body
      .setVisible(true)
      .setOrigin(0.5)
      .setPosition(
        e.x + (release ? e.fx * 17 : 0),
        e.y + (release ? e.fy * 17 - 14 : 0),
      )
      .setDepth(e.y + 0.1)
      .setDisplaySize(Math.max(32, e.radius * 2), Math.max(32, e.radius * 2));
    return true;
  }

  private observeRelease(
    id: string,
    v: View,
    e: BossEffectState,
    visible: boolean,
  ): void {
    let record = this.releases.get(id);
    if (!record) {
      record = {
        abilityId: e.abilityId,
        frames: new Set(),
        suppressed: !visible,
      };
      this.releases.set(id, record);
      if (this.releases.size > 200)
        this.releases.delete(this.releases.keys().next().value!);
    }
    if (!visible) return;
    record.suppressed = false;
    const frame = v.body.texture.key + ':' + v.body.frame.name;
    record.frames.add(frame);
    v.frames.add(frame);
    this.observed.add(frame);
  }

  private syncWebRoots(state: LobbyState, zone: string): void {
    const active = new Set<string>();
    state.players.forEach((hero, id) => {
      if (
        hero.zoneId !== zone ||
        hero.hp <= 0 ||
        !hero.statuses.includes('"creep_doc_chu_basic"')
      )
        return;
      const statuses = JSON.parse(hero.statuses) as Array<{
        kind: string;
        abilityId: string;
      }>;
      if (
        !statuses.some(
          (s) => s.kind === 'root' && s.abilityId === 'creep_doc_chu_basic',
        )
      )
        return;
      active.add(id);
      const sprite =
        this.roots.get(id) ??
        this.scene.add.sprite(hero.x, hero.y, 'forest_fx');
      this.roots.set(id, sprite);
      this.frame(sprite, 'forest_fx:doc_chu_web_impact', 6, false);
      sprite
        .setPosition(hero.x, hero.y - 2)
        .setScale(0.53 * (sprite.texture.key === nativeForestEffects ? 0.5 : 1))
        .setDepth(hero.y + 0.3)
        .setAlpha(0.85);
    });
    for (const [id, sprite] of this.roots) {
      if (active.has(id)) continue;
      sprite.destroy();
      this.roots.delete(id);
    }
  }

  sync(
    state: LobbyState | undefined,
    zone: string,
    localBody?: Phaser.Geom.Rectangle,
  ) {
    if (!state || state.phase === 'DEFEAT') {
      this.clear();
      return;
    }
    const tick =
      zone === 'arena'
        ? state.tick
        : (state.dungeons.get(zone)?.tick ?? state.tick);
    this.syncWebRoots(state, zone);
    const active = new Set<string>();
    const labels = new Set<string>();
    state.bossEffects.forEach((e, id) => {
      if (e.zoneId !== zone || !e.kind.startsWith('creep_')) return;
      const match = /^creep_(.+)_(basic|special|death)$/.exec(e.abilityId);
      const profile = match ? creepProfiles[match[1]!] : undefined;
      const parent: CreepAttack | undefined =
        match?.[2] === 'basic'
          ? profile?.basic
          : match?.[2] === 'death'
            ? profile?.death
            : profile?.special;
      const spec =
        e.kind === 'creep_area'
          ? (parent?.field ?? parent?.trail ?? parent)
          : parent;
      const trap = e.kind.startsWith('creep_trap_');
      if (!spec && !trap) return;
      active.add(id);
      let v = this.views.get(id);
      if (!v) {
        v = {
          warning: this.scene.add.sprite(e.x, e.y, 'hell_fx', 'dark_sigil_0'),
          body: this.scene.add.sprite(
            e.x,
            e.y,
            'arena_creep_impacts',
            'metal_contact_0',
          ),
          label: this.scene.add
            .text(e.x, e.y - 36, spec?.nameVi ?? '', {
              fontFamily: 'Arial',
              fontSize: '11px',
              color: '#ffe5a8',
              stroke: '#281307',
              strokeThickness: 3,
            })
            .setOrigin(0.5),
          frames: new Set(),
        };
        this.views.set(id, v);
      }
      if (trap) {
        v.warning.setVisible(false);
        v.label.setVisible(false);
        renderTrapCue(v.body, e, tick);
        this.observeRelease(id, v, e, v.body.visible);
        return;
      }
      if (!spec) return;
      const pending = tick < e.activeAt;
      const visual = spec.presentation;
      const sector = visual?.style === 'sector';
      const line =
        e.kind === 'creep_line' || (pending && e.kind === 'creep_dash');
      const footprint = e.kind === 'creep_arc' ? e.length * 2 : e.radius * 2;
      const x = line ? e.x + (e.fx * e.length) / 2 : e.x,
        y = line ? e.y + (e.fy * e.length) / 2 : e.y;
      // Universal creep policy: no purple circle/semicircle telegraphs. Actual
      // released purple bursts/drain rings below remain ability effects.
      const showWarning =
        pending && line && !sector && visual?.warning !== 'none';
      v.warning
        .setVisible(showWarning)
        .setPosition(x, y)
        .setDepth(y - 0.6)
        .setAlpha(0.55 + 0.2 * Math.sin((tick - e.startedAt) * 0.5));
      v.warning.setCrop();
      if (showWarning) {
        this.frame(v.warning, 'hell_crimson_weapon_trail', tick - e.startedAt);
        v.warning
          .setDisplaySize(Math.max(40, e.length), Math.max(16, e.radius * 2))
          .setRotation(Math.atan2(e.fy, e.fx));
      }
      const labelKey = `${e.ownerId}:${e.abilityId}:${e.startedAt}`;
      const labelY = e.y - 36;
      const halfWidth = v.label.width / 2;
      const halfHeight = v.label.height / 2;
      const coversPlayer =
        localBody &&
        e.x + halfWidth > localBody.left &&
        e.x - halfWidth < localBody.right &&
        labelY + halfHeight > localBody.top &&
        labelY - halfHeight < localBody.bottom;
      v.label
        .setVisible(pending && match?.[2] !== 'basic' && !labels.has(labelKey))
        .setPosition(
          e.x,
          coversPlayer ? localBody.top - halfHeight - 10 : labelY,
        )
        .setDepth(e.y + 100);
      labels.add(labelKey);
      if (
        renderReviewedCreepCue(v.body, e, tick) ||
        this.renderRetainedReview(v, e, tick, state)
      ) {
        v.warning.setVisible(false);
        this.observeRelease(id, v, e, v.body.visible);
        return;
      }
      const showBody = creepBodyVisible(e.kind, match?.[2] ?? '', spec);
      v.body.setVisible(!pending && showBody);
      if (pending) return;
      if (!showBody) {
        this.observeRelease(id, v, e, false);
        return;
      }
      const [projectile, impact] = graphics[spec.graphic] ?? graphics['metal']!;
      const graphic =
        e.kind === 'creep_projectile'
          ? projectile
          : sector
            ? 'co_mo:duster_sweep_trail'
            : visual?.style === 'purple_burst'
              ? 'hell_violet_black_impact'
              : visual?.style === 'drain'
                ? 'hell_dark_sigil'
                : visual?.style === 'poison_pool'
                  ? 'co_mo:needle_poison_impact'
                  : impact;
      this.frame(
        v.body,
        graphic,
        tick - e.activeAt,
        visual?.style !== 'purple_burst',
      );
      v.body
        .setOrigin(
          0.5,
          visual?.style === 'purple_burst' || visual?.style === 'ground_pool'
            ? 0.85
            : 0.5,
        )
        .setCrop()
        .setPosition(
          e.x,
          e.y +
            (e.kind === 'creep_projectile'
              ? (visual?.projectileOffsetY ?? 0)
              : 0),
        )
        .setDepth(e.y + (e.kind === 'creep_area' ? -0.5 : 0.5))
        .setRotation(
          e.kind === 'creep_projectile' ? Math.atan2(e.fy, e.fx) : 0,
        );
      if (e.kind === 'creep_projectile')
        v.body.setScale(
          graphic === 'arrow'
            ? 1
            : 0.55 * (v.body.texture.key === nativeForestEffects ? 0.5 : 1),
        );
      else if (sector) {
        // The retained C-shaped sweep opens to the right. Its curved edge is
        // left-facing in the source PNG, so rotate it into the captured front.
        v.body
          .setDisplaySize(e.length * 2, e.length * 2)
          .setRotation(Math.atan2(e.fy, e.fx) + Math.PI);
        const f = v.body.frame;
        v.body.setCrop(0, 0, f.realWidth / 2, f.realHeight);
      } else if (
        visual?.style === 'poison_pool' ||
        visual?.style === 'ground_pool'
      )
        v.body.setDisplaySize(e.radius * 2, e.radius);
      else if (visual?.style === 'contact')
        v.body.setDisplaySize(48, 48).setPosition(x, y);
      else if (line)
        v.body
          .setDisplaySize(Math.max(32, e.length), Math.max(20, e.radius * 2))
          .setPosition(x, y)
          .setRotation(Math.atan2(e.fy, e.fx));
      else if (spec.pattern === 'ring')
        v.body.setDisplaySize(
          Math.max(
            12,
            (e.radius * 2 * (tick - e.activeAt)) /
              Math.max(1, e.expiresAt - e.activeAt),
          ),
          Math.max(
            12,
            (e.radius * 2 * (tick - e.activeAt)) /
              Math.max(1, e.expiresAt - e.activeAt),
          ),
        );
      else
        v.body.setDisplaySize(Math.max(24, footprint), Math.max(24, footprint));
      this.observeRelease(id, v, e, true);
    });
    for (const [id, v] of this.views)
      if (!active.has(id)) {
        v.warning.destroy();
        v.body.destroy();
        v.label.destroy();
        this.views.delete(id);
      }
  }
  inspect() {
    return {
      active: this.views.size,
      observed: [...this.observed],
      releases: [...this.releases].map(([id, r]) => ({
        id,
        abilityId: r.abilityId,
        suppressed: r.suppressed,
        frames: [...r.frames],
      })),
      views: [...this.views].map(([id, v]) => ({
        id,
        warning: v.warning.visible,
        texture: v.body.texture.key,
        frame: v.body.frame.name,
        observedFrames: v.frames.size,
        bodyVisible: v.body.visible,
        x: v.body.x,
        y: v.body.y,
        rotation: v.body.rotation,
        width: v.body.displayWidth,
        height: v.body.displayHeight,
        warningFrame: v.warning.frame.name,
        warningX: v.warning.x,
        warningY: v.warning.y,
        warningRotation: v.warning.rotation,
      })),
    };
  }
  clear() {
    for (const v of this.views.values()) {
      v.warning.destroy();
      v.body.destroy();
      v.label.destroy();
    }
    this.views.clear();
    for (const sprite of this.roots.values()) sprite.destroy();
    this.roots.clear();
    for (const sprite of this.impacts) sprite.destroy();
    this.impacts.clear();
    this.releases.clear();
    this.observed.clear();
  }
}
