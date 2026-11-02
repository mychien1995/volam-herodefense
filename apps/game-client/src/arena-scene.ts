import { KimLuanRenderer, isKimActor } from './kim-luan-art.js';
import { DongTaRenderer, isDongArtActor } from './dong-ta-art.js';
import { ChuPresentation } from './chu-presentation.js';
import { HongLietRenderer, isHongLietActor } from './hong-liet-art.js';
import Phaser from 'phaser';
import {
  CoMoEffects,
  coMoCreepArt,
  bossCastStates,
  isCoMoZone,
} from './co-mo-art.js';
import { arena, dungeonForZone } from '@volam/game-data';
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
import type { CombatEvent } from '@volam/game-core';
import { createArenaArt } from './arena-art01.js';
import {
  arenaCreepArt,
  CreepPlayback,
  type ArenaCreepArt,
  type ArenaCreepManifest,
} from './arena-creeps.js';
import { FloatingDamage } from './floating-damage.js';
import { SkillVfx } from './skill-vfx.js';
import { ArenaCreepEffects } from './arena-creep-effects.js';
import { createCreepDungeonArt } from './dungeon-presentation.js';
import {
  actorFootPivot,
  creepPlaceholderTexture,
  facing,
  heroTexture,
  preloadArt,
  registerArt,
} from './art.js';
interface EntityView {
  sprite: Phaser.GameObjects.Sprite;
  label: Phaser.GameObjects.Text;
  shadow: Phaser.GameObjects.Ellipse;
  bar: Phaser.GameObjects.Graphics;
  creepArt: ArenaCreepArt | undefined;
  playback: CreepPlayback;
  lastHp: number;
}
export class ArenaScene extends Phaser.Scene {
  onNpc: (menu: 'merchant' | 'pvp') => void = () => {};
  private zoneId = 'arena';
  private snapshot: LobbyState | undefined;
  private sessionId = '';
  protected actors = new Map<string, EntityView>();
  private vfx: SkillVfx | undefined;
  private kim: KimLuanRenderer | undefined;
  private dong: DongTaRenderer | undefined;
  private hongLiet: HongLietRenderer | undefined;
  private coMoEffects: CoMoEffects | undefined;
  protected creepEffects: ArenaCreepEffects | undefined;
  private trees: Phaser.GameObjects.Image[] = [];
  private chu: ChuPresentation | undefined;
  private ready = false;
  private followed = '';
  private lastEvent = 0;
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
  constructor() {
    super('Arena');
  }
  preload(): void {
    preloadArt(this);
  }
  create(): void {
    registerArt(this);
    this.chu = new ChuPresentation(this);
    this.hongLiet = new HongLietRenderer(this);
    this.kim = new KimLuanRenderer(this);
    this.dong = new DongTaRenderer(this);
    this.coMoEffects = new CoMoEffects(this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.hongLiet?.clear();
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
      .setZoom(1)
      .setRotation(0);
    this.cameras.main.roundPixels = true;
    this.cameras.main.centerOn(arena.spawn.x, arena.spawn.y);
    this.ready = true;
    document.querySelector('#scene-status')?.setAttribute('data-ready', 'true');
  }
  setSnapshot(snapshot: LobbyState | undefined, sessionId = ''): void {
    if (this.sessionId !== sessionId) {
      this.coMoEffects?.clear();
      this.lastEvent = 0;
      this.vfx?.clear();
      this.creepEffects?.clear();
    }
    if (!snapshot) {
      this.coMoEffects?.clear();
      this.vfx?.clear();
      this.creepEffects?.clear();
      this.damage?.clear();
    }
    this.snapshot = snapshot;
    this.sessionId = sessionId;
    const zoneId = snapshot?.players.get(sessionId)?.zoneId ?? 'arena';
    if (this.ready && zoneId !== this.zoneId) this.drawZone(zoneId);
  }
  private drawZone(zoneId: string): void {
    this.hongLiet?.clear();
    this.kim?.clear();
    this.dong?.clear();
    this.coMoEffects?.clear();
    this.cameras.main.stopFollow();
    this.tweens.killAll();
    this.damage?.clear();
    this.vfx?.clear();
    this.creepEffects?.clear();
    this.time.removeAllEvents();
    for (const object of [...this.children.list]) object.destroy();
    this.chu?.clear();
    this.actors.clear();
    this.completedAnimations.length = 0;
    this.impacts.length = 0;
    this.observedCreepFrames.clear();
    this.observedHeroFrames.clear();
    this.creepRepeats.clear();
    this.creepFrameTimes.clear();
    this.followed = '';
    this.zoneId = zoneId;
    if (zoneId === 'arena') {
      this.trees = createArenaArt(this);
      this.cameras.main
        .setBounds(0, 0, arena.width, arena.height)
        .centerOn(arena.spawn.x, arena.spawn.y);
    } else {
      const dungeon = dungeonForZone(zoneId);
      this.trees = createCreepDungeonArt(this, dungeon.id);
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
  ): EntityView {
    const shadow = this.add
      .ellipse(x, y - 3, 22, 8, 0x233e34, 0.35)
      .setDepth(-5);
    const sprite = this.add
      .sprite(
        x,
        y,
        texture,
        texture.startsWith('desert_') ? 'idle_down_0.png' : 'idle_down_0',
      )
      .setOrigin(...actorFootPivot(this, texture));
    const label = this.add
      .text(x, y + 5, '', {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: enemy ? '#ffce9f' : '#f5e8b9',
        backgroundColor: '#283e3c',
        padding: { x: 2, y: 1 },
      })
      .setOrigin(0.5, 0);
    const view: EntityView = {
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
      if (!creep && !sprite.texture.key.startsWith('hero_thieu_lam')) return;
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
    if (!this.ready) return;
    const state = this.snapshot;
    const active = new Set<string>();
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
        (isHongLietActor(actor.archetypeId ?? '') ||
          isDongArtActor(actor.archetypeId ?? '') ||
          isKimActor(actor.archetypeId ?? ''))
      )
        return;
      active.add(id);
      const art = enemy
        ? (coMoCreepArt(this, actor.archetypeId, this.zoneId) ??
          forestCreepArt(
            this.cache.json.get(
              'forest_creeps_manifest',
            ) as ForestCreepManifest,
            actor.archetypeId,
            this.zoneId,
          ) ??
          beachCreepArt(this, actor.archetypeId, this.zoneId) ??
          desertCreepArt(this, actor.archetypeId, this.zoneId) ??
          arenaCreepArt(
            this.cache.json.get('arena_creeps_manifest') as ArenaCreepManifest,
            actor.invasionWave,
            this.zoneId,
          ))
        : undefined;
      const cast = !enemy
        ? this.vfx?.actorCast(
            id,
            actor.castAbilityId ?? '',
            actor.pose,
            actor.fx,
            actor.fy,
            actor.hp,
          )
        : undefined;
      const texture =
        cast?.texture ??
        (enemy
          ? (art?.id ?? creepPlaceholderTexture)
          : heroTexture(actor.basicId, actor.schoolId));
      const view =
        this.actors.get(id) ??
        this.createActor(
          id,
          actor.x,
          actor.y,
          enemy,
          enemy ? texture : heroTexture(actor.basicId, actor.schoolId),
        );
      view.creepArt = art;
      if (actor.hp > 0 && view.lastHp <= 0) view.playback = new CreepPlayback();
      view.lastHp = actor.hp;
      const weight = Math.min(1, delta / 45);
      view.sprite
        .setPosition(
          Math.round(Phaser.Math.Linear(view.sprite.x, actor.x, weight)),
          Math.round(Phaser.Math.Linear(view.sprite.y, actor.y, weight)),
        )
        .setDepth(view.sprite.y);
      if (view.sprite.texture.key !== texture)
        view.sprite
          .setTexture(
            texture,
            cast
              ? cast.firstFrame
              : texture.startsWith('desert_')
                ? 'idle_down_0.png'
                : 'idle_down_0',
          )
          .setOrigin(...(cast?.origin ?? actorFootPivot(this, texture)));
      const direction = facing(actor.fx, actor.fy);
      // Keep this prototype's authored one-shots complete across a short/late
      // network pose. This never changes movement, combat or server clocks.
      const authoredMonk =
        !enemy && !cast && texture.startsWith('hero_thieu_lam');
      const bossPose =
        actor.archetypeId === 'ly_mac_sau' && actor.hp > 0
          ? bossCastStates[actor.castAbilityId ?? '']
          : undefined;
      const pose = bossPose
        ? { state: bossPose, direction }
        : art || authoredMonk
          ? view.playback.resolve(
              actor.hp <= 0 ? 'death' : actor.pose,
              direction,
              this.time.now,
              (state) => this.creepDuration(texture, state, direction),
            )
          : { state: actor.pose, direction };
      const key =
        cast?.animation ??
        `${texture}:${pose.state === 'cast' && this.vfx?.suppressesCastPose(id) ? 'idle' : pose.state}:${pose.direction}`;
      if (!enemy) view.sprite.setScale(cast?.scale ?? 1);
      if (art) {
        const alpha = view.playback.alpha(this.time.now, art.wave === 10);
        view.sprite.setAlpha(alpha);
        view.shadow.setAlpha(alpha);
        view.label.setVisible(false);
        view.bar.setVisible(actor.hp > 0);
      }
      const newFeedback =
        cast?.token.startsWith('feedback:') &&
        view.sprite.getData('feedbackToken') !== cast.token;
      if (view.sprite.anims.currentAnim?.key !== key || newFeedback)
        view.sprite.play({ key, startFrame: cast?.startFrame ?? 0 });
      view.sprite.anims.timeScale = cast?.timeScale ?? 1;
      view.sprite.setData('feedbackToken', cast?.token ?? '');
      if (cast)
        this.vfx?.observeCharacter(texture, String(view.sprite.frame.name));
      const states = JSON.parse(actor.statuses ?? '[]') as Array<{
        kind: string;
      }>;
      const labels: Record<string, string> = {
        silence: 'Câm lặng',
        disarm: 'Tước vũ khí',
        slow: 'Chậm',
      };
      const controls = states
        .map((s) => labels[s.kind])
        .filter((s): s is string => !!s);
      view.label
        .setVisible(!enemy && actor.hp > 0)
        .setText(enemy ? '' : [name, ...new Set(controls)].join('\n'))
        .setPosition(view.sprite.x, view.sprite.y + 5)
        .setDepth(view.sprite.y + 0.2);
      view.shadow.setPosition(view.sprite.x, view.sprite.y - 3);
      if (art)
        view.shadow.setDisplaySize(
          Math.max(18, Math.round(art.bodyHeight * 0.6)),
          8,
        );
      const barOffset = art ? art.bodyHeight + 5 : enemy ? 43 : 48;
      view.bar.clear().setDepth(view.sprite.y + 0.1);
      view.bar
        .fillStyle(0x293c37)
        .fillRect(view.sprite.x - 14, view.sprite.y - barOffset, 28, 3);
      view.bar
        .fillStyle(enemy ? 0xcc6e55 : 0x92c589)
        .fillRect(
          view.sprite.x - 14,
          view.sprite.y - barOffset,
          Math.round((28 * actor.hp) / actor.maxHp),
          3,
        );
      if (id === this.sessionId && this.followed !== id) {
        this.cameras.main.startFollow(view.sprite, true, 1, 1, 0, 48);
        this.followed = id;
      }
    };
    state?.players?.forEach((hero, id) => {
      if (hero.confirmed && hero.zoneId === this.zoneId)
        render(id, hero, false, hero.nickname);
    });
    state?.creeps?.forEach((enemy, id) => {
      if (enemy.archetypeId === 'chu_ba_thong') return;
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
    this.chu?.sync(state, this.zoneId);
    this.hongLiet?.sync(state, this.zoneId);
    this.kim?.sync(state, this.zoneId);
    this.dong?.sync(state, this.zoneId);
    this.vfx?.sync(state, this.zoneId, (id) => this.actors.get(id)?.sprite);
    this.coMoEffects?.sync(state, this.zoneId);
    this.creepEffects?.sync(
      state,
      this.zoneId,
      (id) => this.actors.get(id)?.sprite,
    );
  }

  private creepDuration(
    texture: string,
    state: string,
    direction: string,
  ): number {
    const anim = this.anims.get(`${texture}:${state}:${direction}`);
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
      )
    )
      view.sprite.play(`${view.creepArt.id}:${state}:${direction}`);
  }
  combat(event: CombatEvent & { zoneId?: string }): void {
    if (!this.ready || event.id <= this.lastEvent) return;
    this.lastEvent = event.id;
    if (event.zoneId && event.zoneId !== this.zoneId) return;
    if (this.zoneId === 'arena') this.dong?.event(event);
    if (isCoMoZone(this.zoneId)) this.coMoEffects?.event(event);
    if (event.kind === 'attack')
      this.creepAction(event.sourceId, 'basic_attack');
    if (event.kind === 'hit') {
      this.creepAction(event.targetId, 'hurt');
      this.hongLiet?.flash(event.targetId);
      this.kim?.flash(event.targetId);
    }
    if (event.kind === 'death') this.creepAction(event.targetId, 'death');
    const source = this.snapshot?.creeps.get(event.sourceId);
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
    } else this.vfx?.event(event);
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
  inspect() {
    const origin = this.cameras.main.getWorldPoint(0, 0);
    const unit = this.cameras.main.getWorldPoint(1, 0);
    return {
      chu: this.chu?.inspect(),
      ready: this.ready,
      sceneTime: this.time.now,
      zoneId: this.zoneId,
      hongLiet: this.hongLiet?.inspect(),
      kim: this.kim?.inspect(),
      dong: this.dong?.inspect(),
      kimFrame: this.kim?.reviewState(),
      damage: this.damage?.inspect(),
      skills: this.vfx?.inspect(),
      creepEffects: this.creepEffects?.inspect(),
      coMoEffects: this.coMoEffects?.inspect(),
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
      zoom: this.cameras.main.zoom,
      roundPixels: this.cameras.main.roundPixels,
      camera: { x: this.cameras.main.scrollX, y: this.cameras.main.scrollY },
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
        artStatus:
          view.sprite.texture.key === creepPlaceholderTexture
            ? 'placeholder'
            : view.creepArt?.status,
        origin: [view.sprite.originX, view.sprite.originY],
        scale: [view.sprite.scaleX, view.sprite.scaleY],
        alpha: view.sprite.alpha,
        playing: view.sprite.anims.isPlaying,
        wave: view.creepArt?.wave,
        hp: view.lastHp,
        label: { text: view.label.text, visible: view.label.visible },
        healthBarVisible: view.bar.visible,
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
