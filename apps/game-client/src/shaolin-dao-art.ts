import type Phaser from 'phaser';
import type { CombatEvent } from '@volam/game-core';
import type { LobbyState } from '@volam/game-protocol';
import type { FeedbackPose } from './feedback-vfx.js';
import { facing } from './facing.js';

export const shaolinDaoAtlas = 'shaolin-dao-review';
export const shaolinDaoAtlasPath = '/assets/shaolin-dao-preview-v01/review';
export const shaolinDaoPivot: [number, number] = [0.5, 116 / 144];
export const shaolinDaoScale = 0.5;
export const shaolinDaoSweep = {
  arhatBackX: 16,
  arhatBackY: 11,
  arhatLift: 12,
  frontX: 88,
  frontY: 75,
  lift: 10,
} as const;

const query = new URLSearchParams(location.search);
const skillReview =
  query.get('skillPreview') === '1' && query.get('shaolinDaoArt') === '1';
const enabled =
  query.get('shaolinDaoArt') !== '0' &&
  query.get('runtimeArtReview') !== '1' &&
  !query.has('renovationSkills');
const activeIn = (state: LobbyState | undefined) =>
  enabled && (state?.requiresBranch || (state?.devSkillLoadout && skillReview));
const basic = 'thieu_lam_dao';
const truTa = 'tru_ta';
export const lotusSkill = 'nhu_lai_thien_diep';
const reviewedCastFrames: Readonly<Record<string, 'lotus' | 'strike'>> = {
  kim_quang_ho_tran: 'lotus',
  bat_dong_minh_vuong: 'lotus',
  tam_gioi_quy_thien: 'strike',
};
// The last opaque cutting contour is at x=171.5 in the 174px review frame.
const sweepTipFromCenter = 84.5;
const vectors = {
  down: [0, 1],
  up: [0, -1],
  left: [-1, 0],
  right: [1, 0],
} as const;
type Direction = keyof typeof vectors;

export function preloadShaolinDaoArt(scene: Phaser.Scene): void {
  if (enabled)
    scene.load.atlas(
      shaolinDaoAtlas,
      shaolinDaoAtlasPath + '.png',
      shaolinDaoAtlasPath + '.json',
    );
}

export function usesShaolinDaoArt(
  scene: Phaser.Scene,
  state: LobbyState | undefined,
  ownerId: string,
): boolean {
  return (
    !!activeIn(state) &&
    state?.players.get(ownerId)?.basicId === basic &&
    scene.textures.exists(shaolinDaoAtlas)
  );
}

/** Plays review art from replicated events and areas on the match viewport. */
export class ShaolinDaoMatchArt {
  private readonly strikes = new Map<
    string,
    { end: number; ability: string; direction: Direction }
  >();
  private readonly casts = new Map<
    string,
    {
      ability: string;
      direction: Direction;
      start?: number;
      contactShown: boolean;
    }
  >();
  private readonly lotusOwners = new Set<string>();
  private readonly effects = new Map<Phaser.GameObjects.Image, string>();
  private readonly crescents = new Map<string, Phaser.GameObjects.Image>();

  constructor(private readonly scene: Phaser.Scene) {}

  register(): void {
    if (!this.scene.textures.exists(shaolinDaoAtlas)) return;
    for (const direction of Object.keys(vectors))
      for (const pose of ['idle', 'walk', 'strike', 'lotus']) {
        const frames =
          pose === 'walk'
            ? [`walk_1_${direction}`, `walk_2_${direction}`]
            : [`${pose}_${direction}`];
        this.scene.anims.create({
          key: `${shaolinDaoAtlas}:${pose}:${direction}`,
          frames: frames.map((frame) => ({ key: shaolinDaoAtlas, frame })),
          frameRate: pose === 'walk' ? 1000 / 120 : 1,
          repeat: pose === 'walk' ? -1 : 0,
        });
      }
  }

  sync(state: LobbyState | undefined, zone: string): void {
    if (!activeIn(state) || state?.phase !== 'IN_GAME') {
      this.clear();
      return;
    }
    const visible = (id: string) => {
      const player = state.players.get(id);
      return (
        player?.zoneId === zone && player.hp > 0 && player.basicId === basic
      );
    };
    for (const [id, crescent] of this.crescents) {
      const shot = state.projectiles.get(id);
      if (shot?.zoneId === zone && visible(shot.ownerId)) continue;
      this.crescents.delete(id);
      this.remove(crescent);
    }
    for (const [id, shot] of state.projectiles) {
      if (
        shot.abilityId !== basic ||
        shot.zoneId !== zone ||
        !visible(shot.ownerId) ||
        !usesShaolinDaoArt(this.scene, state, shot.ownerId)
      )
        continue;
      const y = shot.y - 37 * shaolinDaoScale;
      let crescent = this.crescents.get(id);
      if (!crescent) {
        crescent = this.add('crescent', shot.ownerId, shot.x, y, shot.y + 1);
        this.crescents.set(id, crescent);
      }
      const mirror = shot.vx < 0;
      crescent
        .setPosition(shot.x, y)
        .setFlipX(mirror)
        .setRotation(
          mirror
            ? Math.atan2(-shot.vy, -shot.vx)
            : Math.atan2(shot.vy, shot.vx),
        );
      if (crescent.depth !== shot.y + 1) crescent.setDepth(shot.y + 1);
    }
    this.lotusOwners.clear();
    state.areas.forEach((area) => {
      if (
        area.zoneId === zone &&
        area.abilityId === lotusSkill &&
        area.ticks > 0 &&
        visible(area.ownerId)
      )
        this.lotusOwners.add(area.ownerId);
    });
    for (const [id, strike] of this.strikes)
      if (!visible(id) || strike.end <= this.scene.time.now)
        this.strikes.delete(id);
    for (const [id, cast] of this.casts) {
      const expired =
        cast.start !== undefined && this.scene.time.now >= cast.start + 400;
      if (!visible(id) || (expired && cast.contactShown)) this.casts.delete(id);
    }
    for (const [sprite, id] of this.effects)
      if (!visible(id)) this.remove(sprite);
  }

  pose(
    state: LobbyState | undefined,
    id: string,
    reaction: boolean,
    tick: number,
  ): FeedbackPose | undefined {
    if (!usesShaolinDaoArt(this.scene, state, id)) return;
    const player = state?.players.get(id);
    if (!player || player.hp <= 0) return;
    const strike = this.strikes.get(id);
    const cast = this.casts.get(id);
    const direction = reaction
      ? facing(player.fx, player.fy)
      : ((strike ?? cast)?.direction ?? facing(player.fx, player.fy));
    const ability = cast?.ability ?? player.castAbilityId;
    const action = reviewedCastFrames[ability];
    if (cast) cast.start ??= this.scene.time.now;
    const age = cast
      ? (this.scene.time.now - cast.start!) * 0.03
      : tick - player.actionStartedAt;
    const reviewed = !!action && (cast || player.pose === 'cast') && age >= 0;
    let pose: string | undefined;
    if (reaction) {
      pose = 'idle';
      if (cast && age >= 12) this.casts.delete(id);
    } else if (strike) pose = 'strike';
    else if (reviewed) {
      const release = action === 'strike' ? 6 : 2;
      const contact =
        age >= release && (age < release + 5 || (cast && !cast.contactShown));
      pose = contact ? action : 'idle';
      if (contact && cast) cast.contactShown = true;
    } else if (player.pose === 'walk') pose = 'walk';
    else if (this.lotusOwners.has(id)) pose = 'lotus';
    else if (player.pose === 'idle') pose = 'idle';
    if (!pose) return;
    return {
      texture: shaolinDaoAtlas,
      firstFrame:
        pose === 'walk' ? `walk_1_${direction}` : `${pose}_${direction}`,
      animation: `${shaolinDaoAtlas}:${pose}:${direction}`,
      origin: shaolinDaoPivot,
      scale: shaolinDaoScale,
      abilityId: reviewed
        ? ability
        : (strike?.ability ?? (pose === 'lotus' ? lotusSkill : basic)),
      token: '',
      durationMs: 0,
      timeScale: 1,
      startFrame: 0,
    };
  }

  event(
    event: CombatEvent,
    state: LobbyState | undefined,
    point: { x: number; y: number } = event,
  ): boolean {
    if (!usesShaolinDaoArt(this.scene, state, event.sourceId)) return false;
    const isBasic = event.abilityId === basic;
    const isTruTa = event.abilityId === truTa;
    if (event.kind !== 'attack' && event.kind !== 'cast')
      return isBasic || isTruTa;
    this.strikes.delete(event.sourceId);
    this.casts.delete(event.sourceId);
    const direction = facing(event.fx ?? 1, event.fy ?? 0) as Direction;
    if (
      event.kind === 'cast' &&
      Object.hasOwn(reviewedCastFrames, event.abilityId)
    ) {
      this.casts.set(event.sourceId, {
        ability: event.abilityId,
        direction,
        contactShown: false,
      });
      // The original effect renderer still owns this skill's VFX.
      return false;
    }
    if (
      !(isBasic && event.kind === 'attack') &&
      !(isTruTa && event.kind === 'cast')
    )
      return false;
    this.strikes.set(event.sourceId, {
      end: this.scene.time.now + (isBasic ? 180 : 285),
      ability: event.abilityId,
      direction,
    });
    if (isBasic) return true;
    const [dx, dy] = vectors[direction];
    const { x, y } = point;
    const scale = shaolinDaoScale;
    const layout = shaolinDaoSweep;
    const arhat = this.add(
      'arhat',
      event.sourceId,
      x - dx * layout.arhatBackX * scale,
      y - (layout.arhatLift + dy * layout.arhatBackY) * scale,
      y - 1,
    )
      .setOrigin(0.5, 1)
      .setFlipX(dx < 0);
    const angle = Math.atan2(event.fy ?? 0, event.fx ?? 1);
    const forwardX = Math.cos(angle);
    const forwardY = Math.sin(angle);
    const mirror = forwardX < -0.0001;
    const radius = event.radius ?? 0;
    if (radius > 0) {
      // Fit the actual bright edge to the cast radius published by the server.
      // Ground placement uses the accepted cast origin, not interpolated feet.
      const sweepScale = radius / (layout.frontX + sweepTipFromCenter);
      const sweep = this.add(
        'sweep',
        event.sourceId,
        event.x + forwardX * layout.frontX * sweepScale,
        event.y + forwardY * layout.frontX * sweepScale - layout.lift * scale,
        y + 2,
      )
        .setScale(sweepScale)
        .setFlipX(mirror)
        .setRotation(mirror ? Math.atan2(-forwardY, -forwardX) : angle);
      this.fade(sweep, 120, 260);
    }
    this.scene.tweens.add({
      targets: arhat,
      x: arhat.x + dx * 12 * scale,
      y: arhat.y + dy * 8 * scale,
      duration: 140,
    });
    this.fade(arhat, 150, 330);
    return true;
  }

  private add(
    frame: string,
    owner: string,
    x: number,
    y: number,
    depth: number,
  ) {
    const sprite = this.scene.add
      .image(x, y, shaolinDaoAtlas, frame)
      .setScale(shaolinDaoScale)
      .setDepth(depth);
    this.effects.set(sprite, owner);
    return sprite;
  }

  private fade(
    sprite: Phaser.GameObjects.Image,
    delay: number,
    duration: number,
  ): void {
    this.scene.tweens.add({
      targets: sprite,
      delay,
      duration,
      alpha: 0,
      onComplete: () => this.remove(sprite),
    });
  }

  private remove(sprite: Phaser.GameObjects.Image): void {
    this.effects.delete(sprite);
    this.scene.tweens.killTweensOf(sprite);
    sprite.destroy();
  }

  clear(): void {
    for (const sprite of this.effects.keys()) this.remove(sprite);
    this.crescents.clear();
    this.strikes.clear();
    this.casts.clear();
    this.lotusOwners.clear();
  }

  inspect() {
    return [...this.effects].map(([sprite, owner]) => ({
      owner,
      frame: sprite.frame.name,
      x: sprite.x,
      y: sprite.y,
      rotation: sprite.rotation,
      depth: sprite.depth,
      scale: sprite.scaleX,
    }));
  }
}
