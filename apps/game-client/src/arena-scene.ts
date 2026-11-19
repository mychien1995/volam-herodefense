import { preloadHeroMotion, presentHeroMotion } from './hero-motion.js';
import { preloadDepthTerrain } from './world-depth-terrain.js';
import { WorldDepthEffects } from './world-depth-effects.js';
import markerArt from './controls-art/move-marker.png?url';
import { BossSkillAnnouncements } from './boss-skill-announcements.js';
import {
  preloadRuntimeArtReview,
  createRuntimeArtReview,
  productionArtBindings,
  runtimeArtReviewPaused,
} from './runtime-art-review.js';
import { WaveArenaPresentation } from './wave-boss-feedback-art.js';
import { TayDocRenderer, isTayDocActor } from './tay-doc-art.js';
import { revisedBasicBody, isRevisedHero } from './character-revision.js';
import type { FeedbackPose } from './feedback-vfx.js';
import { NamDePresentation } from './nam-de-presentation.js';
import { KimLuanRenderer, isKimActor } from './kim-luan-art.js';
import { drawKimXiangyang, isKimLuanZone } from './kim-xiangyang-art.js';
import { DongTaRenderer, isDongArtActor } from './dong-ta-art.js';
import { VuongArt } from './vuong-art.js';
import { BacCaiRenderer } from './bac-cai-art.js';
import { ChuPresentation } from './chu-presentation.js';
import { HongLietRenderer, isHongLietActor } from './hong-liet-art.js';
import {
  ConLuanArt,
  conLuanPivot,
  isConLuanBody,
  preloadConLuanArt,
} from './con-luan-art.js';
import Phaser from 'phaser';
import {
  DuongMonArt,
  duongMonBody,
  duongMonDummy,
  duongMonPivot,
  preloadDuongMon,
} from './duong-mon-art.js';
import { nguDoc } from '@volam/game-core';
import {
  NguDocArt,
  nguDocBody,
  nguDocHeadHeight,
  nguDocHeroPivot,
  nguDocMinionKind,
  nguDocMinionPivot,
  nguDocMinions,
  preloadNguDoc,
} from './ngu-doc-art.js';
import { previewCreepArt } from './creep-preview-art.js';
import { applyArenaPalette, applyNameLabel } from './visual-presentation.js';
import { m3dBambooPose } from './m3d-feedback.js';
import {
  CoMoEffects,
  coMoCreepArt,
  bossCastStates,
  isCoMoZone,
} from './co-mo-art.js';
import { hellCreepArt, hellStrikeEffect, isHellZone } from './hell-art.js';
import {
  arena,
  dungeonForZone,
  kimLuanXiangyangArena,
  type DungeonDestination,
  statueIntroduction,
  statueName,
} from '@volam/game-data';
import { desertCreepArt } from './desert-art.js';
import {
  beachCreepArt,
  beachStrikeEffect,
  isBeachZone,
  type BeachManifest,
} from './beach-art.js';
import {
  forestCreepArt,
  forestStrikeEffects,
  type ForestCreepManifest,
} from './forest-creeps.js';
import type { LobbyState } from '@volam/game-protocol';
import { loiDai, type CombatEvent } from '@volam/game-core';
import { zoneTick } from './zone-tick.js';
import { LocalMovement } from './local-movement.js';
import { loadRenovationActionFrames } from './renovation-actions.js';
export { loadRenovationActionFrames };
import {
  preloadLoiDai,
  drawLoiDai,
  fitLoiDaiCamera,
  celebrateLoiDai,
} from './loi-dai-art.js';
import { presentTamLienBody } from './thien-son-rework.js';
import { presentVoDangQuyenBody } from './vo-dang-quyen-art.js';
import { createRenovationWorld } from './renovation-world.js';
import { forestCombatBody, forestCombatOrigin } from './m3d-native-art.js';
import {
  M3dHitArt,
  markImpactTarget,
  impactTargetId,
  preloadM3dHitArt,
} from './m3d-hit-art.js';
import {
  approvedBossBody,
  approvedM3dPresentation,
  releaseBeat,
} from './m3d-approved-boss-body.js';
import {
  registerRenovation,
  presentRenovatedBody,
  usesRenovatedCreepPose,
  presentBongBasicBody,
  renovationActorId,
  renovationHeight,
  inspectRenovation,
} from './renovation-art.js';
import {
  arenaCreepArt,
  CreepPlayback,
  type ArenaCreepArt,
  type ArenaCreepManifest,
} from './arena-creeps.js';
import { FloatingDamage } from './floating-damage.js';
import { preloadShaolinDaoArt, ShaolinDaoMatchArt } from './shaolin-dao-art.js';
import { SkillVfx } from './skill-vfx.js';
import { ArenaCreepEffects } from './arena-creep-effects.js';
import {
  actorFootPivot,
  creepPlaceholderTexture,
  facing,
  heroTexture,
  preloadArt,
  preloadArtPack,
  registerArt,
  registerArtPack,
  type DeferredArtPack,
} from './art.js';

const isWaveBossActor = (id: string) =>
  isDongArtActor(id) ||
  isTayDocActor(id) ||
  ['nam_de', 'bac_cai', 'bc_form', 'bc_dog', 'vuong_trung_duong'].includes(id);

export function needsWaveArt(state: LobbyState): boolean {
  const defense = state.defense;
  if (defense.devWaveBosses || defense.devFinalBoss || defense.wave >= 1)
    return true;
  for (const actor of state.creeps.values())
    if (actor.zoneId === 'arena' && isWaveBossActor(actor.archetypeId))
      return true;
  return false;
}

interface EntityView {
  smoothX: number;
  smoothY: number;
  sprite: Phaser.GameObjects.Sprite;
  label: Phaser.GameObjects.Text;
  shadow: Phaser.GameObjects.Ellipse;
  bar: Phaser.GameObjects.Graphics;
  barWidth?: number;
  creepArt: ArenaCreepArt | undefined;
  playback: CreepPlayback;
  lastHp: number;
  lastLevel?: number;
}

const controlLabels: Record<string, string> = {
  silence: 'Câm lặng',
  disarm: 'Tước vũ khí',
  slow: 'Chậm',
  stun: 'Choáng',
  root: 'Định thân',
};

export class ArenaScene extends Phaser.Scene {
  private readonly localMovement = new LocalMovement();
  private readonly predictMovement =
    new URLSearchParams(location.search).get('movementPrediction') !== '0';
  private readonly shaolinDao = new ShaolinDaoMatchArt(this);
  private readonly hitArt = new M3dHitArt(this);
  private polished = true;
  private worldDepth?: WorldDepthEffects;
  onNpc: (menu: 'merchant' | 'pvp') => void = () => {};
  private zoneId = 'arena';
  private snapshot: LobbyState | undefined;
  private sessionId = '';
  protected actors = new Map<string, EntityView>();
  private vfx: SkillVfx | undefined;
  private kim: KimLuanRenderer | undefined;
  private dong: DongTaRenderer | undefined;
  private waveArena: WaveArenaPresentation | undefined;
  private bossShouts: BossSkillAnnouncements | undefined;
  private tayDoc: TayDocRenderer | undefined;
  private vuong: VuongArt | undefined;
  private bacCai: BacCaiRenderer | undefined;
  private hongLiet: HongLietRenderer | undefined;
  private coMoEffects: CoMoEffects | undefined;
  protected creepEffects: ArenaCreepEffects | undefined;
  protected creepCombatArt: CreepCombatArt | undefined;
  private trees: Phaser.GameObjects.Image[] = [];
  private namDe: NamDePresentation | undefined;
  private chu: ChuPresentation | undefined;
  private ready = false;
  private loadedPacks = new Set<DeferredArtPack>();
  private loadingPacks = new Map<DeferredArtPack, Promise<void>>();
  private artQueue = Promise.resolve();
  private pendingZone = '';
  private pendingCombat: Array<CombatEvent & { zoneId?: string }> = [];
  private retryWaveArtAt = 0;
  private bootArtFailed = false;
  waveArtAtBoot = false;
  onArtError = (error: unknown) => console.error(error);
  get presentationReady(): boolean {
    return this.ready;
  }
  get zoneReady(): boolean {
    return this.ready && !this.pendingZone;
  }
  private followed = '';
  private lastEvent = 0;
  private introducedSession = '';
  private story: Phaser.GameObjects.Text | undefined;
  private storyStartedAt = 0;
  private followOffsetY = 48;

  private presentStatueStory(): void {
    const player = this.snapshot?.players.get(this.sessionId);
    if (
      this.snapshot?.phase !== 'IN_GAME' ||
      !player?.confirmed ||
      this.zoneId !== 'arena'
    ) {
      this.story?.destroy();
      this.story = undefined;
      return;
    }
    const statue = this.children.getByName(
      'art01:statue_male',
    ) as Phaser.GameObjects.Image | null;
    if (!statue) return;
    if (this.introducedSession !== this.sessionId) {
      this.introducedSession = this.sessionId;
      this.storyStartedAt = this.time.now;
      const at = statue.getTopCenter();
      this.story = this.add
        .text(at.x, at.y + 62, '', {
          fontFamily: 'Segoe UI, sans-serif',
          fontSize: '10px',
          color: '#fff1c5',
          backgroundColor: '#192117',
          align: 'center',
          padding: { x: 7, y: 4 },
          wordWrap: { width: 290, useAdvancedWrap: true },
        })
        .setOrigin(0.5, 1)
        .setDepth(statue.y + 240)
        .setName('statue-introduction');
    }
    if (!this.story) return;
    const line =
      statueIntroduction[
        Math.floor((this.time.now - this.storyStartedAt) / 6500)
      ];
    if (line)
      this.story
        .setText(statueName + '\n' + line)
        .setVisible(
          statue.visible &&
            Math.hypot(player.x - arena.spawn.x, player.y - arena.spawn.y) <
              110,
        );
    else {
      this.story.destroy();
      this.story = undefined;
    }
  }

  inspectProgression() {
    const story = this.story;
    const view = this.cameras.main.worldView;
    return {
      statueIntroduction:
        story?.visible && view.contains(story.x, story.y - story.height)
          ? story.text
          : '',
      levelUpRings: this.children.list
        .filter((child) => child.name.startsWith('level-up:'))
        .map((child) => {
          const ring = child as Phaser.GameObjects.Image;
          return { name: ring.name, frame: ring.frame.name, y: ring.y };
        }),
    };
  }

  private levelUp(id: string, view: EntityView): void {
    const ring = this.add
      .image(
        view.sprite.x,
        view.sprite.y,
        'wave_feedback:nam_de_ring',
        'nam_de_ring_0',
      )
      .setName('level-up:' + id)
      .setScale(0.38)
      .setDepth(view.sprite.y + 0.4);
    const progress = { age: 0 };
    this.tweens.add({
      targets: progress,
      age: 1,
      duration: 850,
      onUpdate: () => {
        const age = progress.age;
        ring
          .setFrame('nam_de_ring_' + Math.min(3, Math.floor(age * 4)))
          .setPosition(view.sprite.x, view.sprite.y - 46 * age)
          .setDepth(view.sprite.y + 0.4)
          .setScale(0.38 - age * 0.14)
          .setAlpha(Math.min(1, (1 - age) * 3));
      },
      onComplete: () => ring.destroy(),
    });
  }
  private damage: FloatingDamage | undefined;
  protected completedAnimations: Array<{
    id: string;
    key: string;
    frame: string | number;
    at: number;
  }> = [];
  private impacts: Array<{ id: string; sourceId: string; targetId: string }> =
    [];
  protected observedCreepFrames = new Map<string, Set<string>>();
  private observedHeroFrames = new Map<string, Set<string>>();
  protected creepRepeats = new Map<string, number>();
  private creepFrameTimes = new Map<
    string,
    Array<{ id: string; frame: string; at: number }>
  >();
  constructor(private readonly eagerArt = true) {
    super('Arena');
  }
  panSpectator(x: number, y: number): void {
    if (!this.snapshot?.players.get(this.sessionId)?.bossSpectator) return;
    this.cameras.main.stopFollow();
    this.cameras.main.scrollX += x * 24;
    this.cameras.main.scrollY += y * 24;
  }
  worldClick(clientX: number, clientY: number) {
    const canvas = this.game.canvas.getBoundingClientRect();
    const camera = this.cameras.main;
    const position = camera.getWorldPoint(
      ((clientX - canvas.left) / canvas.width) * camera.width,
      ((clientY - canvas.top) / canvas.height) * camera.height,
    );
    const fighter = this.snapshot?.players.get(this.sessionId)?.loiDaiFighter;
    let targetId: string | undefined;
    let front = -Infinity;
    for (const view of this.children.list) {
      const id = impactTargetId(view);
      if (
        !id ||
        id === this.sessionId ||
        !(
          view instanceof Phaser.GameObjects.Sprite ||
          view instanceof Phaser.GameObjects.Image
        ) ||
        !view.visible ||
        view.alpha <= 0 ||
        view.depth < front
      )
        continue;
      const creep = this.snapshot?.creeps.get(id);
      const player = this.snapshot?.players.get(id);
      if (
        creep?.ownerId &&
        (creep.ownerId === this.sessionId ||
          !fighter ||
          !this.snapshot?.players.get(creep.ownerId)?.loiDaiFighter)
      )
        continue;
      const enemy =
        creep ?? (fighter && player?.loiDaiFighter ? player : undefined);
      if (!enemy || enemy.hp <= 0 || enemy.zoneId !== this.zoneId) continue;
      if (view.getBounds().contains(position.x, position.y)) {
        targetId = id;
        front = view.depth;
      }
    }
    return { position, targetId };
  }
  private moveMarker?: Phaser.GameObjects.Image;
  showMoveMarker({ x, y }: { x: number; y: number }): void {
    if (this.moveMarker?.active) this.moveMarker.destroy();
    const marker = this.add.image(x, y, 'click-move-marker').setDepth(y - 1);
    marker.setScale(0.8);
    this.moveMarker = marker;
    this.tweens.add({
      targets: marker,
      scale: 1.18,
      alpha: 0,
      duration: 420,
      ease: 'Quad.Out',
      onComplete: () => marker.destroy(),
    });
  }
  preload(): void {
    this.load.image('click-move-marker', markerArt);
    this.bootArtFailed = false;
    this.load.once(
      Phaser.Loader.Events.COMPLETE,
      (
        _loader: Phaser.Loader.LoaderPlugin,
        _loaded: number,
        failed: number,
      ) => {
        this.bootArtFailed = failed > 0;
      },
    );
    preloadRuntimeArtReview(this);
    preloadDepthTerrain(this);
    preloadHeroMotion(this);
    if (this.eagerArt) preloadLoiDai(this);
    preloadArt(this, this.eagerArt);
    if (!this.eagerArt && this.waveArtAtBoot)
      preloadArtPack(this, 'wave-bosses');
    preloadShaolinDaoArt(this);
    preloadM3dHitArt(this);
    preloadConLuanArt(this);
    preloadDuongMon(this);
    preloadNguDoc(this);
  }
  private conLuanArt?: ConLuanArt;
  private duongMonArt?: DuongMonArt;
  private nguDocArt?: NguDocArt;
  create(): void {
    if (this.bootArtFailed) return;
    this.shaolinDao.register();
    this.conLuanArt = new ConLuanArt(this);
    this.duongMonArt = new DuongMonArt(this);
    this.nguDocArt = new NguDocArt(this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () =>
      this.nguDocArt?.clear(),
    );
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () =>
      this.duongMonArt?.clear(),
    );
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () =>
      this.conLuanArt?.clear(),
    );
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.hitArt.clear());
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () =>
      this.shaolinDao.clear(),
    );
    this.creepCombatArt = new CreepCombatArt(this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () =>
      this.creepCombatArt?.clear(),
    );
    this.events.once(Phaser.Scenes.Events.DESTROY, () =>
      this.creepCombatArt?.clear(),
    );
    registerArt(this, this.eagerArt);
    if (!this.eagerArt && this.waveArtAtBoot) {
      registerArtPack(this, 'wave-bosses');
      this.loadedPacks.add('wave-bosses');
    }
    registerRenovation(this);
    this.chu = new ChuPresentation(this);
    this.namDe = new NamDePresentation(this);
    this.waveArena = new WaveArenaPresentation(this);
    this.bossShouts = new BossSkillAnnouncements(this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () =>
      this.bossShouts?.clear(),
    );
    this.hongLiet = new HongLietRenderer(this);
    this.tayDoc = new TayDocRenderer(this);
    this.kim = new KimLuanRenderer(this);
    this.dong = new DongTaRenderer(this);
    if (this.hasArt('wave-bosses')) this.createLateWaveBossRenderers();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.vuong?.clear());
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.bacCai?.clear());
    this.events.once(Phaser.Scenes.Events.DESTROY, () => this.bacCai?.clear());
    this.coMoEffects = new CoMoEffects(this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.hongLiet?.clear();
      this.tayDoc?.clear();
      this.kim?.clear();
      this.dong?.clear();
      this.coMoEffects?.clear();
    });
    this.events.once(Phaser.Scenes.Events.DESTROY, () => {
      this.kim?.clear();
      this.coMoEffects?.clear();
    });
    this.damage = new FloatingDamage(this);
    this.vfx = new SkillVfx(this);
    this.worldDepth = new WorldDepthEffects(this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.vfx?.clear());
    this.events.once(Phaser.Scenes.Events.DESTROY, () => this.vfx?.clear());
    this.creepEffects = new ArenaCreepEffects(
      this,
      {
        ...(this.cache.json.get('arena_creeps_manifest') as ArenaCreepManifest),
        effects: [
          ...(
            this.cache.json.get('arena_creeps_manifest') as ArenaCreepManifest
          ).effects,
          ...(this.cache.json.get('beach_manifest') as BeachManifest).effects,
          ...(this.cache.json.get('hell_manifest') as BeachManifest).effects,
        ],
      },
      this.cache.json.get('forest_creeps_manifest') as ForestCreepManifest,
    );
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () =>
      this.creepEffects?.clear(),
    );
    this.events.once(Phaser.Scenes.Events.DESTROY, () =>
      this.creepEffects?.clear(),
    );
    this.drawZone('arena');
    this.cameras.main
      .setBounds(0, 0, arena.width, arena.height)
      .setZoom(this.scale.width >= 960 && this.scale.height >= 600 ? 2 : 1)
      .setRotation(0);
    this.cameras.main.roundPixels = false;
    this.scale.on('resize', this.fitCamera);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () =>
      this.scale.off('resize', this.fitCamera),
    );
    this.cameras.main.centerOn(arena.spawn.x, arena.spawn.y);
    createRuntimeArtReview(this);
    this.ready = true;
    document.querySelector('#scene-status')?.setAttribute('data-ready', 'true');
    this.syncZone();
  }

  hasArt(pack: DeferredArtPack): boolean {
    return this.eagerArt || this.loadedPacks.has(pack);
  }

  private createLateWaveBossRenderers(): void {
    this.bacCai = new BacCaiRenderer(this);
    this.vuong = new VuongArt(this, () =>
      applyArenaPalette(this, this.polished),
    );
  }

  prepareArt(pack: DeferredArtPack): Promise<void> {
    if (this.hasArt(pack)) return Promise.resolve();
    const pending = this.loadingPacks.get(pack);
    if (pending) return pending;
    const load = this.artQueue
      .then(() => loadRenovationActionFrames(pack))
      .then(
        () =>
          new Promise<void>((resolve, reject) => {
            preloadRuntimeArtReview(this);
            preloadDepthTerrain(this);
            preloadHeroMotion(this);
            preloadArtPack(this, pack);
            this.load.once(
              Phaser.Loader.Events.COMPLETE,
              (
                _loader: Phaser.Loader.LoaderPlugin,
                _loaded: number,
                failed: number,
              ) => {
                try {
                  if (failed)
                    throw Error(
                      `Không tải được ${failed} file hình ảnh (${pack}).`,
                    );
                  registerArtPack(this, pack);
                  registerRenovation(this);
                  if (pack === 'wave-bosses')
                    this.createLateWaveBossRenderers();
                  createRuntimeArtReview(this);
                  this.loadedPacks.add(pack);
                  resolve();
                } catch (error) {
                  reject(error);
                }
              },
            );
            this.load.start();
          }),
      )
      .finally(() => this.loadingPacks.delete(pack));
    this.loadingPacks.set(pack, load);
    this.artQueue = load.catch(() => {});
    return load;
  }
  private fitCamera = (): void => {
    if (this.zoneId === loiDai.id) fitLoiDaiCamera(this);
    else if (isKimLuanZone(this.zoneId)) {
      const { width, height } = kimLuanXiangyangArena;
      this.cameras.main
        .setZoom(
          Math.min(this.scale.width / width, this.scale.height / height, 1.35),
        )
        .centerOn(width / 2, height / 2);
    } else
      this.cameras.main.setZoom(
        this.scale.width >= 960 && this.scale.height >= 600 ? 2 : 1,
      );
  };

  setSnapshot(snapshot: LobbyState | undefined, sessionId = ''): void {
    if (runtimeArtReviewPaused(this)) return;
    const local = snapshot?.players.get(sessionId);
    if (
      this.sessionId !== sessionId ||
      snapshot?.phase !== 'IN_GAME' ||
      local?.zoneId !== 'arena' ||
      !local.connected ||
      local.hp <= 0
    )
      this.localMovement.reset();
    this.localMovement.patch(performance.now());
    if (this.sessionId !== sessionId) {
      this.pendingCombat.length = 0;
      this.pendingZone = '';
      this.hitArt.clear();
      this.shaolinDao.clear();
      this.coMoEffects?.clear();
      this.lastEvent = 0;
      this.vfx?.clear();
      this.creepEffects?.clear();
    }
    if (!snapshot) {
      this.hitArt.clear();
      this.story?.destroy();
      this.story = undefined;
      this.coMoEffects?.clear();
      this.vfx?.clear();
      this.creepEffects?.clear();
      this.damage?.clear();
    }
    this.snapshot = snapshot;
    this.sessionId = sessionId;
    this.syncZone();
    if (
      this.ready &&
      snapshot &&
      !this.hasArt('wave-bosses') &&
      !this.loadingPacks.has('wave-bosses') &&
      performance.now() >= this.retryWaveArtAt &&
      needsWaveArt(snapshot)
    ) {
      void this.prepareArt('wave-bosses').catch((error) => {
        this.retryWaveArtAt = performance.now() + 3000;
        this.onArtError(error);
      });
    }
  }

  moveLocal(x: number, y: number): void {
    if (this.predictMovement) this.localMovement.move(x, y, performance.now());
  }

  localFrame(): { x: number; y: number; animation: string } | undefined {
    const sprite = this.actors.get(this.sessionId)?.sprite;
    if (sprite)
      return {
        x: sprite.x,
        y: sprite.y,
        animation: sprite.anims.currentAnim?.key ?? '',
      };
  }

  private syncZone(): void {
    if (!this.ready) return;
    const zone = this.snapshot?.players.get(this.sessionId)?.zoneId ?? 'arena';
    if (zone === this.pendingZone) return;
    this.pendingZone = '';
    this.pendingCombat.length = 0;
    if (zone === this.zoneId) return;
    if (zone === 'arena' || this.eagerArt) {
      this.drawZone(zone);
      return;
    }
    const pack =
      zone === loiDai.id
        ? 'loi_dai'
        : (dungeonForZone(zone).id as DungeonDestination);
    if (this.hasArt(pack)) {
      this.drawZone(zone);
      return;
    }
    this.pendingZone = zone;
    const session = this.sessionId;
    void this.prepareArt(pack)
      .then(() => {
        if (this.sessionId !== session || this.pendingZone !== zone) return;
        this.drawZone(zone);
        this.pendingZone = '';
        for (const event of this.pendingCombat.splice(0)) this.combat(event);
      })
      .catch((error) => {
        if (this.sessionId !== session || this.pendingZone !== zone) return;
        this.onArtError(error);
        this.time.delayedCall(3000, () => {
          if (this.sessionId !== session || this.pendingZone !== zone) return;
          this.pendingZone = '';
          this.syncZone();
        });
      });
  }
  reviewWorldDepth(enabled: boolean): void {
    this.worldDepth?.setEnabled(enabled);
  }
  private drawZone(zoneId: string): void {
    this.worldDepth?.clear();
    this.hitArt.clear();
    this.shaolinDao.clear();
    this.story?.destroy();
    this.story = undefined;
    this.bossShouts?.clear();
    this.creepCombatArt?.clear();
    this.bacCai?.clear();
    this.vuong?.clear();
    this.waveArena?.clear();
    this.hongLiet?.clear();
    this.tayDoc?.clear();
    this.kim?.clear();
    this.dong?.clear();
    this.coMoEffects?.clear();
    this.cameras.main.stopFollow();
    this.tweens.killAll();
    this.damage?.clear();
    this.vfx?.clear();
    this.creepEffects?.clear();
    this.time.removeAllEvents();
    this.conLuanArt?.clear();
    this.duongMonArt?.clear();
    this.nguDocArt?.clear();
    for (const object of [...this.children.list]) object.destroy();
    this.chu?.clear();
    this.namDe?.clear();
    this.actors.clear();
    this.completedAnimations.length = 0;
    this.impacts.length = 0;
    this.observedCreepFrames.clear();
    this.observedHeroFrames.clear();
    this.creepRepeats.clear();
    this.creepFrameTimes.clear();
    this.followed = '';
    this.zoneId = zoneId;
    this.fitCamera();
    if (zoneId === 'arena') {
      this.trees = createRenovationWorld(this, zoneId);
      applyArenaPalette(this, this.polished);
      this.cameras.main
        .setBounds(0, 0, arena.width, arena.height)
        .centerOn(arena.spawn.x, arena.spawn.y);
    } else if (zoneId === loiDai.id) {
      this.trees = [];
      drawLoiDai(this);
    } else if (isKimLuanZone(zoneId)) {
      const { width, height } = kimLuanXiangyangArena;
      this.trees = drawKimXiangyang(this);
      this.cameras.main
        .setBounds(0, 0, width, height)
        .centerOn(width / 2, height / 2);
    } else {
      const dungeon = dungeonForZone(zoneId);
      this.trees = createRenovationWorld(this, zoneId);
      this.cameras.main
        .setBounds(0, 0, dungeon.width, dungeon.height)
        .centerOn(dungeon.spawn.x, dungeon.spawn.y);
    }
  }
  private createActor(
    id: string,
    x: number,
    y: number,
    enemy: boolean,
    texture: string,
    art?: ArenaCreepArt,
  ): EntityView {
    const shadow = this.add
      .ellipse(x, y - 3, 22, 8, 0x233e34, 0.35)
      .setDepth(-5);
    const sprite = this.add
      .sprite(
        x,
        y,
        texture,
        art?.animations.find((a) => a.state === 'idle')?.frames[0] ??
          (texture === duongMonDummy
            ? '__BASE'
            : texture === nguDocMinions
              ? 'jiangshi_idle'
              : duongMonBody(texture)
                ? 'idle-down'
                : texture.startsWith('desert_')
                  ? 'idle_down_0.png'
                  : 'idle_down_0'),
      )
      .setOrigin(
        ...(art?.footPivot ??
          (texture === duongMonDummy
            ? [0.5, 0.96]
            : duongMonBody(texture)
              ? duongMonPivot
              : isConLuanBody(texture)
                ? conLuanPivot
                : nguDocBody(texture)
                  ? nguDocHeroPivot
                  : texture === nguDocMinions
                    ? nguDocMinionPivot
                    : actorFootPivot(this, texture))),
      )
      .setName('actor:' + id);
    const label = this.add
      .text(x, y + 5, '', {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: enemy ? '#ffce9f' : '#f5e8b9',
        backgroundColor: '#283e3c',
        padding: { x: 2, y: 1 },
      })
      .setOrigin(0.5, 0);
    applyNameLabel(label, this.polished);
    const view: EntityView = {
      smoothX: x,
      smoothY: y,
      sprite,
      label,
      shadow,
      bar: this.add.graphics(),
      creepArt: undefined,
      playback: new CreepPlayback(),
      lastHp: Infinity,
    };
    const observeFrame = () => {
      const creep =
        !!view.creepArt || sprite.texture.key === creepPlaceholderTexture;
      const key = sprite.anims.currentAnim?.key;
      if (!key) return;
      const observed = creep
        ? this.observedCreepFrames
        : this.observedHeroFrames;
      const frames = observed.get(key) ?? new Set<string>();
      frames.add(String(sprite.frame.name));
      observed.set(key, frames);
      if (creep) {
        const times = this.creepFrameTimes.get(key) ?? [];
        if (
          times.at(-1)?.id !== id ||
          times.at(-1)?.frame !== String(sprite.frame.name)
        )
          times.push({
            id,
            frame: String(sprite.frame.name),
            at: this.time.now,
          });
        if (times.length > 24) times.shift();
        this.creepFrameTimes.set(key, times);
      }
    };
    sprite.on(Phaser.Animations.Events.ANIMATION_START, observeFrame);
    sprite.on(Phaser.Animations.Events.ANIMATION_UPDATE, observeFrame);
    sprite.on(Phaser.Animations.Events.ANIMATION_REPEAT, () => {
      if (!view.creepArt) return;
      const key = sprite.anims.currentAnim?.key ?? '';
      this.creepRepeats.set(key, (this.creepRepeats.get(key) ?? 0) + 1);
    });
    sprite.on(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      if (!view.creepArt && sprite.texture.key !== creepPlaceholderTexture)
        return;
      this.completedAnimations.push({
        id,
        key: sprite.anims.currentAnim?.key ?? '',
        frame: sprite.frame.name,
        at: this.time.now,
      });
      if (this.completedAnimations.length > 120)
        this.completedAnimations.shift();
    });
    this.actors.set(id, view);
    return view;
  }
  override update(_time: number, delta: number): void {
    if (!this.zoneReady) return;
    const state = this.snapshot;
    const waveArtReady = this.hasArt('wave-bosses');
    this.shaolinDao.sync(state, this.zoneId);
    const active = new Set<string>();
    this.conLuanArt?.begin();
    this.nguDocArt?.begin();
    const render = (
      id: string,
      actor: {
        x: number;
        y: number;
        fx: number;
        fy: number;
        hp: number;
        maxHp: number;
        pose: string;
        basicId?: string;
        basicStage?: string;
        actionStartedAt?: number;
        actionActiveAt?: number;
        actionEndsAt?: number;
        schoolId?: string;
        invasionWave?: number;
        archetypeId?: string;
        castAbilityId?: string;
        statuses?: string;
      },
      enemy: boolean,
      name: string,
    ): void => {
      if (
        enemy &&
        !state?.defense.creepPreview &&
        ((!waveArtReady && isWaveBossActor(actor.archetypeId ?? '')) ||
          isTayDocActor(actor.archetypeId ?? '') ||
          actor.archetypeId === 'chu_wine_disciple' ||
          isHongLietActor(actor.archetypeId ?? '') ||
          isDongArtActor(actor.archetypeId ?? '') ||
          isKimActor(actor.archetypeId ?? ''))
      )
        return;
      active.add(id);
      const minion = enemy ? nguDocMinionKind(actor.archetypeId) : undefined;
      const previewArt =
        enemy && state?.defense.creepPreview
          ? previewCreepArt(this, actor.archetypeId)
          : undefined;
      const art =
        enemy && !minion
          ? (previewArt ??
            coMoCreepArt(this, actor.archetypeId, this.zoneId) ??
            forestCreepArt(
              this.cache.json.get(
                'forest_creeps_manifest',
              ) as ForestCreepManifest,
              actor.archetypeId,
              this.zoneId,
            ) ??
            beachCreepArt(this, actor.archetypeId, this.zoneId) ??
            hellCreepArt(this, actor.archetypeId, this.zoneId) ??
            desertCreepArt(this, actor.archetypeId, this.zoneId) ??
            arenaCreepArt(
              this.cache.json.get(
                'arena_creeps_manifest',
              ) as ArenaCreepManifest,
              actor.invasionWave,
              this.zoneId,
            ))
          : undefined;
      const states = JSON.parse(actor.statuses ?? '[]') as Array<{
        kind: string;
        ticks?: number;
      }>;
      const heroReaction =
        !enemy && actor.hp > 0
          ? states.some((status) => status.kind === 'stun')
            ? 'stun'
            : actor.pose === 'hurt'
              ? 'hurt'
              : undefined
          : undefined;
      const motionV08 =
        !!art &&
        !previewArt &&
        (
          this.registry.get('runtime-art-urls') as
            Map<string, string> | undefined
        )
          ?.get(art.id)
          ?.includes('/creep_motion_v08__');
      const actorZoneTick = zoneTick(state, this.zoneId);
      const tick = actorZoneTick ?? 0;
      const daoPose = enemy
        ? undefined
        : this.shaolinDao.pose(state, id, !!heroReaction, tick);
      const cast: FeedbackPose | undefined =
        daoPose ??
        (!enemy
          ? heroReaction
            ? undefined
            : revisedBasicBody(
                this,
                this.vfx?.actorCast(
                  id,
                  actor.castAbilityId ?? '',
                  actor.pose,
                  actor.fx,
                  actor.fy,
                  actor.hp,
                ),
              )
          : motionV08
            ? undefined
            : m3dBambooPose(
                actor.archetypeId,
                actor.hp <= 0 ? 'death' : actor.pose,
                actor.fx,
                actor.fy,
              ));
      const trainingDummy =
        enemy && actor.archetypeId === 'duong_mon_practice_dummy';
      const texture =
        cast?.texture ??
        (enemy
          ? minion
            ? nguDocMinions
            : (art?.id ??
              (trainingDummy ? duongMonDummy : creepPlaceholderTexture))
          : heroTexture(actor.basicId, actor.schoolId));
      const conLuanBody = !enemy && isConLuanBody(texture);
      const duongMonActor = !enemy && duongMonBody(texture);
      const nguDocActor = nguDocBody(texture) || !!minion;
      const highResBody = conLuanBody || duongMonActor || nguDocActor;
      const view =
        this.actors.get(id) ??
        this.createActor(
          id,
          actor.x,
          actor.y,
          enemy,
          enemy
            ? (art?.id ?? texture)
            : heroTexture(actor.basicId, actor.schoolId),
          art,
        );
      view.creepArt = art;
      markImpactTarget(view.sprite, id);
      if (actor.hp > 0 && view.lastHp <= 0) view.playback = new CreepPlayback();
      view.lastHp = actor.hp;
      const blinkAlpha = !enemy ? (this.vfx?.actorAlpha(id) ?? 1) : 1;
      const local = id === this.sessionId ? state?.players.get(id) : undefined;
      const predicted =
        local?.zoneId === 'arena' &&
        local.connected &&
        local.hp > 0 &&
        state?.phase === 'IN_GAME' &&
        blinkAlpha === 1 &&
        !cast &&
        !local.actionState &&
        !state.namDeControls.has(id) &&
        !state.defense.devWaveBosses &&
        (actor.pose === 'idle' || actor.pose === 'walk')
          ? this.localMovement.project(
              actor,
              local.build.stats.movementSpeed,
              states,
              performance.now(),
            )
          : undefined;
      // A confirmed blink snaps the rendered feet to replicated position before
      // fading in. It must not look like ordinary interpolated movement.
      const weight = blinkAlpha < 1 ? 1 : Math.min(1, delta / 45);
      // Preserve interpolation precision; feeding rounded pixels back into lerp
      // otherwise leaves a stationary actor permanently one pixel off its feet.
      // All player bodies share continuous reconciliation. Quantizing the older
      // bodies here (and their following camera below) exposed each server patch
      // as alternating short/long screen steps even at a steady render rate.
      if (highResBody || !enemy) {
        const target = predicted ?? actor;
        const snap =
          Math.hypot(view.smoothX - target.x, view.smoothY - target.y) > 80;
        const blend = snap ? 1 : -Math.expm1(-delta / 45);
        view.smoothX = Phaser.Math.Linear(view.smoothX, target.x, blend);
        view.smoothY = Phaser.Math.Linear(view.smoothY, target.y, blend);
      } else {
        view.smoothX =
          predicted?.x ?? Phaser.Math.Linear(view.smoothX, actor.x, weight);
        view.smoothY =
          predicted?.y ?? Phaser.Math.Linear(view.smoothY, actor.y, weight);
      }
      const x = highResBody || !enemy ? view.smoothX : Math.round(view.smoothX);
      const y = highResBody || !enemy ? view.smoothY : Math.round(view.smoothY);
      view.sprite.setPosition(x, y);
      if (view.sprite.depth !== y) view.sprite.setDepth(y);
      const renderFx = predicted?.fx ?? actor.fx;
      const renderFy = predicted?.fy ?? actor.fy;
      const direction = facing(renderFx, renderFy);
      const actorPose = predicted ? 'walk' : actor.pose;
      // Keep this prototype's authored one-shots complete across a short/late
      // network pose. This never changes movement, combat or server clocks.
      const authoredMonk =
        !enemy && !cast && texture.startsWith('hero_thieu_lam');
      const bossPose =
        actor.archetypeId === 'ly_mac_sau' &&
        actor.hp > 0 &&
        (!approvedBossBody('ly_mac_sau') ||
          actor.pose !== 'hurt' ||
          tick < (actor.actionEndsAt ?? 0))
          ? bossCastStates[actor.castAbilityId ?? '']
          : undefined;
      const pose = bossPose
        ? { state: bossPose, direction }
        : art || authoredMonk
          ? view.playback.resolve(
              actor.hp <= 0 ? 'death' : actorPose,
              direction,
              this.time.now,
              (state) => this.creepDuration(texture, state, direction),
            )
          : { state: actorPose, direction };
      const renovatedId = enemy
        ? previewArt
          ? undefined
          : renovationActorId(
              actor.archetypeId,
              actor.invasionWave,
              this.zoneId,
            )
        : heroTexture(actor.basicId, actor.schoolId);
      const activeAt = actor.actionActiveAt ?? 0;
      const specialInProgress =
        tick < (actor.actionEndsAt ?? 0) &&
        actor.castAbilityId?.endsWith('_special');
      const heldHurt =
        pose.state === 'hurt' &&
        this.time.now < (view.playback.hold?.until ?? 0);
      let bodyPose =
        heroReaction ??
        (actor.hp <= 0 ? 'death' : !enemy && cast ? 'action' : pose.state);
      if (
        enemy &&
        actor.hp > 0 &&
        usesRenovatedCreepPose(this, renovatedId, 'idle')
      ) {
        if (states.some((status) => status.kind === 'stun')) bodyPose = 'stun';
        else if (heldHurt) bodyPose = 'hurt';
        else if (actor.pose === 'cast' || specialInProgress) bodyPose = 'cast';
      }
      const nativeCreep =
        enemy && usesRenovatedCreepPose(this, renovatedId, bodyPose);
      const wasNativeCreep = view.sprite.getData('native-creep-pose') === true;
      view.sprite.setData('native-creep-pose', nativeCreep);
      let creepClock: { phase?: string; progress: number } | undefined;
      if (nativeCreep && bodyPose === 'cast' && activeAt > 0) {
        const secondStrike =
          actor.castAbilityId === 'creep_cua_khong_lo_special' &&
          tick >= activeAt + 12;
        const releaseAt = activeAt + (secondStrike ? 12 : 0);
        creepClock =
          tick < activeAt
            ? {
                phase: 'windup',
                progress:
                  1 -
                  (activeAt - tick) /
                    Math.max(1, activeAt - (actor.actionStartedAt ?? tick)),
              }
            : { phase: 'release', progress: (tick - releaseAt) / 8 };
      } else if (nativeCreep && bodyPose === 'hurt' && view.playback.hold) {
        creepClock = {
          progress:
            1 -
            (view.playback.hold.until - this.time.now) /
              Math.max(1, this.creepDuration(texture, 'hurt', pose.direction)),
        };
      }
      const forestBody =
        !previewArt && forestCombatBody(this, texture, bodyPose);
      const renderTexture = forestBody || texture;
      if (trainingDummy) {
        view.sprite.setScale(0.62).setAlpha(actor.hp > 0 ? 1 : 0.3);
      } else if (nguDocActor) {
        this.nguDocArt?.body(
          id,
          view.sprite,
          texture,
          { ...actor, pose: heroReaction ?? pose.state },
          states,
          pose.direction,
          tick,
          minion,
        );
      } else if (duongMonActor) {
        this.duongMonArt?.body(
          view.sprite,
          actor,
          states,
          heroReaction ?? pose.state,
          pose.direction,
          tick,
        );
      } else if (conLuanBody) {
        this.conLuanArt?.body(
          id,
          view.sprite,
          actor,
          states,
          heroReaction ?? pose.state,
          pose.direction,
        );
      } else {
        if (!nativeCreep && view.sprite.texture.key !== renderTexture) {
          if (daoPose) {
            view.sprite.setFlip(false, false).setRotation(0);
            view.sprite.setData('renovation', undefined);
            view.sprite.setData('renovation-action', undefined);
          }
          view.sprite
            .setTexture(
              renderTexture,
              cast
                ? cast.firstFrame
                : (art?.animations.find(
                    (a) =>
                      a.state === (forestBody ? bodyPose : 'idle') &&
                      (!forestBody || a.direction === pose.direction),
                  )?.frames[0] ??
                    (texture.startsWith('desert_')
                      ? 'idle_down_0.png'
                      : 'idle_down_0')),
            )
            .setOrigin(
              ...(cast?.origin ??
                art?.footPivot ??
                actorFootPivot(this, texture)),
            );
        }
        const key =
          cast?.animation ??
          this.creepAnimationKey(
            texture,
            pose.state === 'cast' && this.vfx?.suppressesCastPose(id)
              ? 'idle'
              : pose.state,
            pose.direction,
          );
        view.sprite.setScale(forestBody ? 0.5 : (cast?.scale ?? 1));
        if (forestBody) view.sprite.setOrigin(...forestCombatOrigin);
        if (enemy) view.sprite.setRotation(0);
        else view.sprite.setAlpha(blinkAlpha);
        if (previewArt?.previewScale)
          view.sprite
            .setScale(previewArt.previewScale)
            .setFlipX(!!previewArt.mirrorFacing && actor.fx < 0);
        if (art) {
          const alpha = view.playback.alpha(this.time.now, art.wave === 10);
          view.sprite.setAlpha(
            actor.castAbilityId === 'creep_sa_xa_special'
              ? alpha * 0.25
              : alpha,
          );
          view.shadow.setAlpha(alpha);
          view.label.setVisible(false);
          view.bar.setVisible(actor.hp > 0);
        }
        const newFeedback =
          cast?.token.startsWith('feedback:') &&
          view.sprite.getData('feedbackToken') !== cast.token;
        const actionToken =
          motionV08 && ['basic_attack', 'cast'].includes(pose.state)
            ? [actor.actionStartedAt, actor.castAbilityId, pose.state].join(':')
            : '';
        const newCreepAction =
          !!actionToken &&
          view.sprite.getData('creepActionToken') !== actionToken;
        if (
          !nativeCreep &&
          (view.sprite.anims.currentAnim?.key !== key ||
            newFeedback ||
            newCreepAction ||
            wasNativeCreep)
        )
          view.sprite.play({ key, startFrame: cast?.startFrame ?? 0 }, false);
        view.sprite.setData('creepActionToken', actionToken);
        view.sprite.anims.timeScale = cast?.timeScale ?? 1;
        view.sprite.setData('feedbackToken', cast?.token ?? '');
        if (!daoPose)
          presentRenovatedBody(
            this,
            view.sprite,
            renovatedId,
            bodyPose,
            renderFx,
            renderFy,
            cast?.abilityId ?? actor.castAbilityId ?? '',
            actor.archetypeId === 'ly_mac_sau' && bossPose && activeAt > 0
              ? { beat: releaseBeat(tick, activeAt) }
              : (creepClock ?? cast),
          );
        if (!enemy && !heroReaction) {
          const tick = actorZoneTick;
          presentTamLienBody(view.sprite, actor, tick);
          const player = state?.players.get(id);
          if (player) {
            if (
              tick !== undefined &&
              player.basicId === 'cai_bang_bong' &&
              player.pose === 'basic_attack'
            )
              presentBongBasicBody(
                view.sprite,
                player.basicStage,
                tick - player.actionStartedAt,
                actor.fx,
                actor.fy,
              );
            presentVoDangQuyenBody(view.sprite, player, tick);
            this.vfx?.voDangKiem.body(view.sprite, player, id, tick);
          }
        }
      }
      this.nguDocArt?.mark(id, view.sprite, states);
      if (!enemy)
        presentHeroMotion(
          this,
          view.sprite,
          actor.basicId,
          actor.hp <= 0
            ? 'death'
            : (heroReaction ??
                (cast &&
                !(
                  daoPose &&
                  /^(idle|walk)_/.test(daoPose.firstFrame) &&
                  ['idle', 'walk'].includes(actorPose)
                )
                  ? 'action'
                  : actorPose)),
          renderFx,
          renderFy,
          states,
          {
            tick,
            startedAt: actor.actionStartedAt ?? tick,
            until: state?.players.get(id)?.actionUntil ?? tick,
            ability: cast?.abilityId ?? actor.castAbilityId ?? '',
            basicStage: actor.basicStage ?? '',
            visualDurationTicks: ((cast?.durationMs ?? 0) * 30) / 1000,
          },
        );
      if (cast)
        this.vfx?.observeCharacter(
          texture,
          view.sprite.getData('renovation-action')?.sourceFrame ??
            String(view.sprite.frame.name),
        );
      view.label.setVisible(!enemy && actor.hp > 0);
      if (!enemy) {
        const controls = states
          .map((s) => controlLabels[s.kind])
          .filter((s): s is string => !!s);
        view.label.setText([name, ...new Set(controls)].join('\n'));
      }
      view.label.setPosition(view.sprite.x, view.sprite.y + 5);
      const labelDepth = view.sprite.y + 0.2;
      if (view.label.depth !== labelDepth) view.label.setDepth(labelDepth);
      view.shadow.setPosition(view.sprite.x, y - 3);
      if (art)
        view.shadow.setDisplaySize(
          Math.max(18, Math.round(art.bodyHeight * 0.6)),
          8,
        );
      const barOffset =
        (nguDocActor
          ? nguDocHeadHeight(minion)
          : renovationHeight(
              renovatedId ?? '',
              art?.bodyHeight ??
                (conLuanBody && states.some((s) => s.kind === 'con_luan_chaos')
                  ? 60
                  : enemy
                    ? 43
                    : 48),
            )) + 5;
      const barSize = minion === 'reaper' ? 32 : minion ? 22 : 28;
      view.bar.setPosition(
        view.sprite.x - barSize / 2,
        view.sprite.y - barOffset,
      );
      const barDepth = view.sprite.y + 0.1;
      if (view.bar.depth !== barDepth) view.bar.setDepth(barDepth);
      const barWidth = Math.round((barSize * actor.hp) / actor.maxHp);
      if (enemy && actor.archetypeId === 'ly_mac_sau')
        view.bar.setVisible(false);
      if (view.barWidth !== barWidth) {
        view.barWidth = barWidth;
        view.bar.clear().fillStyle(0x293c37).fillRect(0, 0, barSize, 3);
        view.bar
          .fillStyle(minion ? 0x96db6e : enemy ? 0xcc6e55 : 0x92c589)
          .fillRect(0, 0, barWidth, 3);
      }
      if (id === this.sessionId && state?.players.get(id)?.bossSpectator) {
        if (this.followed) this.cameras.main.stopFollow();
        this.followed = '';
      } else if (
        this.zoneId !== loiDai.id &&
        !isKimLuanZone(this.zoneId) &&
        id === this.sessionId &&
        this.followed !== id
      ) {
        this.cameras.main.startFollow(view.sprite, false, 1, 1, 0, 48);
        this.followed = id;
      }
    };
    state?.players?.forEach((hero, id) => {
      if (!hero.confirmed || hero.zoneId !== this.zoneId) return;
      render(id, hero, false, hero.nickname);
      const view = this.actors.get(id);
      if (!view) return;
      if (
        view.lastLevel !== undefined &&
        hero.level > view.lastLevel &&
        hero.hp > 0
      )
        this.levelUp(id, view);
      view.lastLevel = hero.level;
    });
    state?.creeps?.forEach((enemy, id) => {
      if (['chu_ba_thong', 'nam_de'].includes(enemy.archetypeId)) return;
      if (enemy.zoneId === this.zoneId) render(id, enemy, true, 'Sơn tặc');
    });
    for (const [id, view] of this.actors)
      if (!active.has(id)) {
        if (view.playback.retain(this.time.now, view.creepArt?.wave === 10)) {
          const alpha = view.playback.alpha(
            this.time.now,
            view.creepArt?.wave === 10,
          );
          view.sprite.setAlpha(alpha);
          view.shadow.setAlpha(alpha);
          view.bar.setVisible(false);
          view.label.setVisible(false);
          continue;
        }
        view.sprite.destroy();
        view.label.destroy();
        view.shadow.destroy();
        view.bar.destroy();
        this.actors.delete(id);
        if (id === this.followed) {
          this.cameras.main.stopFollow();
          this.followed = '';
        }
      }
    const localBody = this.keepLocalHeroVisible(state);
    this.chu?.sync(state, this.zoneId);
    this.hongLiet?.sync(state, this.zoneId);
    this.kim?.sync(state, this.zoneId);
    if (waveArtReady) {
      this.namDe?.sync(state, this.zoneId);
      this.tayDoc?.sync(state, this.zoneId);
      this.dong?.sync(state, this.zoneId);
      this.bacCai?.sync(state, this.zoneId);
      this.vuong?.sync(state, this.zoneId);
    }
    this.waveArena?.sync(state, this.zoneId);
    this.bossShouts?.sync(state, this.zoneId);
    this.presentStatueStory();
    this.game.canvas
      .closest('#viewport')
      ?.toggleAttribute('data-statue-intro', !!this.story?.visible);
    const self = this.actors.get(this.sessionId)?.sprite;
    const camera = this.cameras.main;
    const introOffset =
      this.story?.visible && self
        ? Phaser.Math.Clamp(
            self.y -
              camera.height / 2 -
              (this.story.y - this.story.height - 46),
            48,
            150,
          )
        : 48;
    this.followOffsetY +=
      (introOffset - this.followOffsetY) * Math.min(1, delta / 85);
    camera.setFollowOffset(0, this.followOffsetY);
    this.vfx?.sync(state, this.zoneId, (id) => this.actors.get(id)?.sprite);
    this.conLuanArt?.sync(state, this.zoneId);
    this.duongMonArt?.sync(state, this.zoneId);
    this.nguDocArt?.sync(state, this.zoneId);
    this.coMoEffects?.sync(state, this.zoneId);
    this.creepEffects?.sync(
      state,
      this.zoneId,
      (id) => this.actors.get(id)?.sprite,
    );
    this.creepCombatArt?.sync(state, this.zoneId, localBody);
    this.hitArt.sync();
    this.worldDepth?.sync(state, this.zoneId, this.actors);
  }

  private keepLocalHeroVisible(
    state: LobbyState | undefined,
  ): Phaser.Geom.Rectangle | undefined {
    const hero = state?.players.get(this.sessionId);
    const view = this.actors.get(this.sessionId);
    if (!hero || !view || hero.hp <= 0 || hero.bossSpectator) return;

    const { sprite } = view;
    const height = renovationHeight(
      heroTexture(hero.basicId, hero.schoolId),
      44,
    );
    // Only the core figure matters here. A long staff or loose sleeve by
    // itself should not make the player jump to the front of the crowd.
    const left = sprite.x - 12;
    const right = sprite.x + 12;
    const top = sprite.y - height;
    let covered = false;
    for (const [id, enemy] of this.actors) {
      const body = enemy.sprite;
      if (
        body.y < sprite.y ||
        body.y > sprite.y + 112 ||
        !body.visible ||
        body.alpha < 0.15 ||
        !state?.creeps.has(id)
      )
        continue;

      const frame = body.frame;
      if (frame.trimmed && body.rotation === 0) {
        const sx = Math.abs(body.scaleX);
        const sy = Math.abs(body.scaleY);
        const frameX = body.flipX
          ? frame.realWidth - frame.x - frame.width
          : frame.x;
        const frameY = body.flipY
          ? frame.realHeight - frame.y - frame.height
          : frame.y;
        const x = body.x + (frameX - body.displayOriginX) * sx;
        const y = body.y + (frameY - body.displayOriginY) * sy;
        if (
          x >= right ||
          x + frame.width * sx <= left ||
          y >= sprite.y ||
          y + frame.height * sy <= top
        )
          continue;
      } else {
        const size = renovationHeight(
          body.getData('renovation')?.id ?? '',
          enemy.creepArt?.bodyHeight ?? 43,
        );
        const halfWidth = size * 0.65;
        if (
          body.x - halfWidth >= right ||
          body.x + halfWidth <= left ||
          body.y - size >= sprite.y
        )
          continue;
      }
      // Keep the player at world depth so walls and trees still occlude
      // normally. Reorder only the enemy sprites covering the player.
      const order = ((body.y - sprite.y) / 112) * 0.15;
      body.setDepth(sprite.y - 0.35 + order);
      enemy.bar.setDepth(sprite.y - 0.18 + order);
      covered = true;
    }
    if (covered)
      return new Phaser.Geom.Rectangle(left, top, right - left, height);
  }

  private creepAnimationKey(
    texture: string,
    state: string,
    direction: string,
  ): string {
    const key = `${texture}:${state}:${direction}`;
    const native = forestCombatBody(this, texture, state);
    const nativeKey = `${native}:${state}:${direction}`;
    if (native && this.anims.exists(nativeKey)) return nativeKey;
    const shared = `${texture}:${state}:shared`;
    if (
      state === 'cast' &&
      !this.anims.exists(key) &&
      !this.anims.exists(shared)
    )
      return this.creepAnimationKey(texture, 'basic_attack', direction);
    return !this.anims.exists(key) && this.anims.exists(shared) ? shared : key;
  }
  private creepDuration(
    texture: string,
    state: string,
    direction: string,
  ): number {
    const anim = this.anims.get(
      this.creepAnimationKey(texture, state, direction),
    );
    return anim
      ? anim.frames.reduce(
          (total, frame) => total + (frame.duration || 1000 / anim.frameRate),
          0,
        )
      : 0;
  }
  private creepAction(
    id: string,
    state: 'basic_attack' | 'hurt' | 'death',
  ): void {
    const view = this.actors.get(id);
    if (!view?.creepArt) return;
    const actor = this.snapshot?.creeps.get(id);
    const direction = actor
      ? facing(actor.fx, actor.fy)
      : (view.playback.hold?.direction ?? 'down');
    if (
      view.playback.begin(
        state,
        direction,
        this.time.now,
        this.creepDuration(view.creepArt.id, state, direction),
      ) &&
      !(state === 'hurt' && approvedBossBody(actor?.archetypeId ?? '')) &&
      !usesRenovatedCreepPose(
        this,
        renovationActorId(actor?.archetypeId, actor?.invasionWave, this.zoneId),
        state,
      )
    )
      view.sprite.play(
        this.creepAnimationKey(view.creepArt.id, state, direction),
      );
  }
  combat(event: CombatEvent & { zoneId?: string }): void {
    if (runtimeArtReviewPaused(this)) return;
    if (!this.ready || event.id <= this.lastEvent) return;
    if (this.pendingZone) {
      if (event.zoneId === this.pendingZone) {
        if (this.pendingCombat.length >= 60) this.pendingCombat.shift();
        this.pendingCombat.push(event);
      }
      return;
    }
    this.lastEvent = event.id;
    if (event.zoneId && event.zoneId !== this.zoneId) return;
    if (event.abilityId === nguDoc.counter) return;
    if (event.abilityId === 'loi_dai_victory') {
      celebrateLoiDai(this, event.x, event.y);
      return;
    }
    this.creepCombatArt?.event(event);
    if (this.bossShouts?.event(event)) return;
    if (this.zoneId === 'arena' && this.hasArt('wave-bosses'))
      this.dong?.event(event);
    if (isCoMoZone(this.zoneId)) this.coMoEffects?.event(event);
    if (event.kind === 'attack')
      this.creepAction(event.sourceId, 'basic_attack');
    const newImpact = this.hitArt.hit(event);
    if (event.kind === 'hit') {
      this.creepAction(event.targetId, 'hurt');
      if (!approvedM3dPresentation()) this.hongLiet?.flash(event.targetId);
      this.kim?.flash(event.targetId);
    }
    if (event.kind === 'death') this.creepAction(event.targetId, 'death');
    const source = this.snapshot?.creeps.get(event.sourceId);
    if (source && isHellZone(source.zoneId) && source.zoneId === this.zoneId) {
      const effect = hellStrikeEffect(
        source.archetypeId,
        event.kind,
        event.abilityId,
      );
      if (effect)
        this.creepEffects?.contact(effect, event.x, event.y, event.sourceId);
    }
    if (source && isBeachZone(source.zoneId) && source.zoneId === this.zoneId) {
      const effect = beachStrikeEffect(
        source.archetypeId,
        event.kind,
        event.abilityId,
      );
      if (effect)
        this.creepEffects?.contact(effect, event.x, event.y, event.sourceId);
    }
    const forest =
      source &&
      source.zoneId === this.zoneId &&
      forestCreepArt(
        this.cache.json.get('forest_creeps_manifest') as ForestCreepManifest,
        source.archetypeId,
        this.zoneId,
      );
    if (forest && source) {
      const direction = facing(event.fx ?? source.fx, event.fy ?? source.fy);
      for (const cue of forestStrikeEffects(
        forest.archetypeId,
        event.kind,
        event.abilityId,
        direction,
      )) {
        const point = cue.anchor === 'source' ? source : event;
        this.creepEffects?.contact(cue.id, point.x, point.y, event.sourceId);
      }
    }
    const impact =
      event.kind === 'hit' && source
        ? arenaCreepArt(
            this.cache.json.get('arena_creeps_manifest') as ArenaCreepManifest,
            source.invasionWave,
            source.zoneId,
          )?.impact
        : undefined;
    if (impact) {
      this.creepEffects?.contact(impact, event.x, event.y);
      this.impacts.push({
        id: impact,
        sourceId: event.sourceId,
        targetId: event.targetId,
      });
      if (this.impacts.length > 60) this.impacts.shift();
    } else if (
      !this.nguDocArt?.event(event, this.actors.get(event.sourceId)?.sprite) &&
      !this.duongMonArt?.event(event) &&
      !this.conLuanArt?.event(event, this.actors.get(event.sourceId)?.sprite) &&
      !this.shaolinDao.event(
        event,
        this.snapshot,
        this.actors.get(event.sourceId)?.sprite,
      )
    ) {
      this.vfx?.event(event, !newImpact);
    }
    // A fast school can begin another valid A before the old server pose
    // returns to idle. Restart only on a new authoritative attack, never hits.
    if (event.kind === 'attack' && !forest) {
      const sprite = this.actors.get(event.sourceId)?.sprite;
      if (sprite?.anims.currentAnim?.key.includes(':basic_attack:'))
        sprite.anims.restart();
    }
    if (event.kind === 'hit') {
      this.damage?.hit(
        event,
        !!this.snapshot?.players.has(event.targetId),
        event.targetId === 'statue'
          ? 160
          : this.actors.get(event.targetId)?.creepArt?.bodyHeight,
      );
      if (event.targetId === 'statue') {
        const statue = this.children.getByName(
          'art01:statue_male',
        ) as Phaser.GameObjects.Image | null;
        statue?.setTint(0xffd083);
        this.time.delayedCall(140, () => statue?.clearTint());
      }
    }
  }
  reviewClearTransientEffects(): void {
    this.conLuanArt?.clear();
    this.duongMonArt?.clear();
    this.nguDocArt?.clear();
    this.hitArt.clear();
    this.shaolinDao.clear();
    this.vfx?.clear();
    this.coMoEffects?.clear();
    this.damage?.clear();
  }
  reviewChu(
    bundle: string,
    tag: string,
    x: number,
    y: number,
    milliseconds: number,
  ) {
    this.chu?.review(bundle, tag, x, y, milliseconds);
  }
  reviewKim(bundle: string, clip: string) {
    return this.kim?.review(bundle, clip);
  }
  reviewVisualStyle(polished: boolean): void {
    this.polished = polished;
    applyArenaPalette(this, polished);
    for (const actor of this.actors.values())
      applyNameLabel(actor.label, polished);
    document
      .querySelector<HTMLElement>('#viewport')
      ?.setAttribute('data-visual-review', polished ? 'polished' : 'original');
  }
  inspect() {
    const origin = this.cameras.main.getWorldPoint(0, 0);
    const unit = this.cameras.main.getWorldPoint(1, 0);
    const coMoGround = this.children.getByName(
      'renovation:ground:co_mo',
    ) as Phaser.GameObjects.Image | null;
    return {
      renovation: inspectRenovation(this),
      namDe: this.namDe?.inspect(),
      bossShouts: this.bossShouts?.inspect(),
      waveArena: this.waveArena?.inspect(),
      chu: this.chu?.inspect(),
      ready: this.ready,
      polished: this.polished,
      worldDepth: this.worldDepth?.inspect(),
      heroMotionObserved: [
        ...(this.registry.get('hero-motion-observed') ?? []),
      ],
      artwork: productionArtBindings(this),
      animationTimings: {
        tayDocIdle: this.anims
          .get('tay:p1:idle_down')
          ?.frames.map((f) => f.duration),
      },
      sceneTime: this.time.now,
      r3Scenery: this.children.list
        .filter((o) => o.name.endsWith(':r3'))
        .map((o) => {
          const p = o as Phaser.GameObjects.Image;
          return {
            name: p.name,
            frame: p.frame.name,
            texture: p.texture.key,
            x: p.x,
            y: p.y,
            depth: p.depth,
            origin: [p.originX, p.originY],
            scale: [p.scaleX, p.scaleY],
          };
        }),
      zoneId: this.zoneId,
      hongLiet: this.hongLiet?.inspect(),
      tayDoc: this.tayDoc?.inspect(),
      kim: this.kim?.inspect(),
      kimArena: this.trees
        .filter((image) => image.name === 'kim_luan:xiangyang-court')
        .map((image) => ({
          width: image.displayWidth,
          height: image.displayHeight,
          scaleX: image.scaleX,
          scaleY: image.scaleY,
          camera: this.cameras.main.getBounds(),
        }))[0],
      dong: this.dong?.inspect(),
      bacCai: this.bacCai?.inspect(),
      vuong: this.vuong?.inspect(),
      kimFrame: this.kim?.reviewState(),
      damage: this.damage?.inspect(),
      hitArt: this.hitArt.inspect(),
      skills: this.vfx?.inspect(),
      conLuan: this.conLuanArt?.inspect(),
      duongMon: this.duongMonArt?.inspect(),
      nguDoc: this.nguDocArt?.inspect(),
      shaolinDao: {
        effects: this.shaolinDao.inspect(),
        lotusRings: this.children.list
          .filter((node) => node.name === 'leaf-halo')
          .map((node) => node as Phaser.GameObjects.Image)
          .filter((node) => node.frame.name === 'lotus_ring')
          .map(({ x, y, depth }) => ({ x, y, depth })),
      },
      creepEffects: this.creepEffects?.inspect(),
      creepCombat: this.creepCombatArt?.inspect(),
      coMoEffects: this.coMoEffects?.inspect(),
      coMoArena: coMoGround
        ? {
            camera: this.cameras.main.getBounds(),
            ground: {
              width: coMoGround.displayWidth,
              height: coMoGround.displayHeight,
            },
          }
        : undefined,
      coMoScenery: this.children.list
        .filter(
          (o) => o.name.startsWith('co_mo:') && !o.name.includes(':layer:'),
        )
        .map((o) => {
          const image = o as Phaser.GameObjects.Image;
          return {
            name: image.name,
            x: image.x,
            y: image.y,
            depth: image.depth,
            origin: [image.originX, image.originY],
          };
        }),
      interactions: this.children.list
        .filter((o) => o.name === 'dungeon-exit')
        .map((o) => {
          const image = o as Phaser.GameObjects.Image;
          return { id: image.name, x: image.x, y: image.y };
        }),
      rotation: Math.atan2(unit.y - origin.y, unit.x - origin.x),
      loiDaiView:
        this.zoneId === loiDai.id
          ? {
              center: this.cameras.main.getWorldPoint(
                this.cameras.main.width / 2,
                this.cameras.main.height / 2,
              ),
              layers: this.children.list
                .filter((node) => node.name.startsWith('loi-dai:'))
                .map((node) => node.name),
              skillArt: this.children.list.flatMap((node) => {
                const image = node as Phaser.GameObjects.Image;
                return image.visible &&
                  image.alpha > 0 &&
                  image.texture &&
                  image.frame
                  ? [image.texture.key + ':' + image.frame.name]
                  : [];
              }),
            }
          : undefined,
      loiDaiFireworks: this.children.list
        .filter((object) => object.name === 'loi-dai:victory')
        .map((object) => (object as Phaser.GameObjects.Sprite).frame.name),
      zoom: this.cameras.main.zoom,
      roundPixels: this.cameras.main.roundPixels,
      camera: { x: this.cameras.main.scrollX, y: this.cameras.main.scrollY },
      cameraMatrix: {
        origin: { x: origin.x, y: origin.y },
        step: unit.x - origin.x,
      },
      moveMarker: this.moveMarker?.active
        ? {
            x: this.moveMarker.x,
            y: this.moveMarker.y,
            scale: this.moveMarker.scaleX,
            alpha: this.moveMarker.alpha,
          }
        : undefined,
      completedAnimations: this.completedAnimations.map((a) => ({ ...a })),
      observedHeroFrames: Object.fromEntries(
        [...this.observedHeroFrames].map(([key, frames]) => [key, [...frames]]),
      ),
      observedCreepFrames: Object.fromEntries(
        [...this.observedCreepFrames].map(([key, frames]) => [
          key,
          [...frames],
        ]),
      ),
      creepRepeats: Object.fromEntries(this.creepRepeats),
      creepFrameTimes: Object.fromEntries(this.creepFrameTimes),
      impacts: this.impacts.map((a) => ({ ...a })),
      arenaCreeps: (
        this.cache.json.get('arena_creeps_manifest') as
          ArenaCreepManifest | undefined
      )?.assets.map((a) => ({
        id: a.id,
        wave: a.wave,
        texture: this.textures.exists(a.id),
        animations: a.animations.map(
          (v) => `${a.id}:${v.state}:${v.direction}`,
        ),
      })),
      forestCreeps: (
        this.cache.json.get('forest_creeps_manifest') as
          ForestCreepManifest | undefined
      )?.assets.map((a) => ({
        id: a.id,
        archetypeId: a.archetypeId,
        texture: this.textures.exists(a.id),
        status: a.status,
      })),
      actors: [...this.actors].map(([id, view]) => ({
        id,
        x: view.sprite.x,
        y: view.sprite.y,
        depth: view.sprite.depth,
        animation: view.sprite.anims.currentAnim?.key,
        frame: view.sprite.frame.name,
        texture: view.sprite.texture.key,
        source: (
          this.registry.get('runtime-art-urls') as
            Map<string, string> | undefined
        )?.get(view.sprite.texture.key),
        filterMode: view.sprite.texture.source[0]?.scaleMode,
        artStatus: isRevisedHero(view.sprite.texture.key)
          ? 'approved'
          : view.sprite.texture.key === creepPlaceholderTexture
            ? 'placeholder'
            : view.creepArt?.status,
        origin: [view.sprite.originX, view.sprite.originY],
        scale: [view.sprite.scaleX, view.sprite.scaleY],
        alpha: view.sprite.alpha,
        playing: view.sprite.anims.isPlaying,
        wave: view.creepArt?.wave,
        hp: view.lastHp,
        pose: view.sprite.getData('renovation')?.pose,
        label: {
          text: view.label.text,
          visible: view.label.visible,
          resolution: view.label.style.resolution,
          fontFamily: view.label.style.fontFamily,
        },
        healthBarVisible: view.bar.visible,
        healthBarY: view.bar.y,
        healthBarFill: view.barWidth,
      })),
      trees: this.trees.map((tree) => ({
        x: tree.x,
        y: tree.y,
        depth: tree.depth,
      })),
      bambooScenery: this.children.list
        .filter(
          (o) =>
            o.name.startsWith('bamboo:') && !o.name.startsWith('bamboo:layer:'),
        )
        .map((o) => {
          const image = o as Phaser.GameObjects.Image;
          return {
            name: image.frame.name,
            texture: image.texture.key,
            x: image.x,
            y: image.y,
            depth: image.depth,
            origin: [image.originX, image.originY],
            scale: [image.scaleX, image.scaleY],
          };
        }),
      desertScenery: this.children.list
        .filter(
          (o) =>
            o.name.startsWith('desert:') && !o.name.startsWith('desert:layer:'),
        )
        .map((o) => {
          const image = o as Phaser.GameObjects.Image;
          return {
            name: image.frame.name,
            x: image.x,
            y: image.y,
            depth: image.depth,
            origin: [image.originX, image.originY],
            scale: [image.scaleX, image.scaleY],
          };
        }),
      beachWaterPhases: this.zoneId.startsWith('sea_')
        ? this.registry.get('beachWaterPhases')
        : [],
      hellLavaPhases: isHellZone(this.zoneId)
        ? this.registry.get('hellLavaPhases')
        : [],
      hellLavaTile: isHellZone(this.zoneId)
        ? (
            this.children.list.find((o) => o.name === 'hell:layer:ground') as
              Phaser.Tilemaps.TilemapLayer | undefined
          )?.getTileAt(0, 0)?.index
        : undefined,
      hellScenery: this.children.list
        .filter(
          (o) =>
            o.name.startsWith('hell:') && !o.name.startsWith('hell:layer:'),
        )
        .map((o) => {
          const image = o as Phaser.GameObjects.Image;
          return {
            name: image.frame.name,
            x: image.x,
            y: image.y,
            depth: image.depth,
            origin: [image.originX, image.originY],
            scale: [image.scaleX, image.scaleY],
          };
        }),
      beachWaterTile: this.zoneId.startsWith('sea_')
        ? (
            this.children.list.find((o) => o.name === 'beach:layer:ground') as
              Phaser.Tilemaps.TilemapLayer | undefined
          )?.getTileAt(0, 0)?.index
        : undefined,
      beachScenery: this.children.list
        .filter(
          (o) =>
            o.name.startsWith('beach:') && !o.name.startsWith('beach:layer:'),
        )
        .map((o) => {
          const image = o as Phaser.GameObjects.Image;
          return {
            name: image.frame.name,
            x: image.x,
            y: image.y,
            depth: image.depth,
            origin: [image.originX, image.originY],
            scale: [image.scaleX, image.scaleY],
          };
        }),
      animations: this.anims.getAnimsFromTexture('hero_cai_bang'),
      art01: {
        textures: [
          'arena_ground_art01',
          'arena_world_art01',
          'arena_garden_art01',
          'arena_ambient_art01',
        ].map((key) => ({
          key,
          exists: this.textures.exists(key),
          frames: this.textures.get(key).getFrameNames(),
        })),
        objects: this.children.list
          .filter((object) => object.name.startsWith('art01:'))
          .map((object) => {
            const view = object as Phaser.GameObjects.Sprite;
            return {
              name: view.name,
              x: view.x,
              y: view.y,
              depth: view.depth,
              frame: view.frame?.name,
              animation: view.anims?.currentAnim?.key,
            };
          }),
        statueCollision: this.snapshot?.defense.enabled
          ? 'Authoritative pedestal footprint: x760,y548,w80,h28'
          : 'M1 marker only; no authoritative solid statue collider',
      },
    };
  }
  reviewFeedback(asset: string, tag: string, x: number, y: number) {
    return this.vfx?.reviewFeedback(asset, tag, x, y);
  }
}
import { CreepCombatArt } from './creep-combat-art.js';
