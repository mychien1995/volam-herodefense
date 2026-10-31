import Phaser from 'phaser';
import { arena, creepDungeon } from '@volam/game-data';
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
  onDungeonExit: () => void = () => {};
  private zoneId = 'arena';
  private snapshot: LobbyState | undefined;
  private sessionId = '';
  private actors = new Map<string, EntityView>();
  private vfx: SkillVfx | undefined;
  private creepEffects: ArenaCreepEffects | undefined;
  private trees: Phaser.GameObjects.Image[] = [];
  private ready = false;
  private followed = '';
  private lastEvent = 0;
  private damage: FloatingDamage | undefined;
  private completedAnimations: Array<{
    id: string;
    key: string;
    frame: string | number;
    at: number;
  }> = [];
  private impacts: Array<{ id: string; sourceId: string; targetId: string }> =
    [];
  private observedCreepFrames = new Map<string, Set<string>>();
  private observedHeroFrames = new Map<string, Set<string>>();
  constructor() {
    super('Arena');
  }
  preload(): void {
    preloadArt(this);
  }
  create(): void {
    registerArt(this);
    this.damage = new FloatingDamage(this);
    this.vfx = new SkillVfx(this);
    this.creepEffects = new ArenaCreepEffects(
      this,
      this.cache.json.get('arena_creeps_manifest') as ArenaCreepManifest,
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
      this.lastEvent = 0;
      this.vfx?.clear();
      this.creepEffects?.clear();
    }
    if (!snapshot) {
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
    this.cameras.main.stopFollow();
    this.tweens.killAll();
    this.damage?.clear();
    this.vfx?.clear();
    this.creepEffects?.clear();
    this.time.removeAllEvents();
    for (const object of [...this.children.list]) object.destroy();
    this.actors.clear();
    this.completedAnimations.length = 0;
    this.impacts.length = 0;
    this.observedCreepFrames.clear();
    this.observedHeroFrames.clear();
    this.followed = '';
    this.zoneId = zoneId;
    if (zoneId === 'arena') {
      this.trees = createArenaArt(this);
      this.cameras.main
        .setBounds(0, 0, arena.width, arena.height)
        .centerOn(arena.spawn.x, arena.spawn.y);
    } else {
      this.trees = createCreepDungeonArt(this, () => this.onDungeonExit());
      this.cameras.main
        .setBounds(0, 0, creepDungeon.width, creepDungeon.height)
        .centerOn(creepDungeon.spawn.x, creepDungeon.spawn.y);
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
      .sprite(x, y, texture, 'idle_down_0')
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
      if (!view.creepArt && !sprite.texture.key.startsWith('hero_thieu_lam'))
        return;
      const key = sprite.anims.currentAnim?.key;
      if (!key) return;
      const observed = view.creepArt
        ? this.observedCreepFrames
        : this.observedHeroFrames;
      const frames = observed.get(key) ?? new Set<string>();
      frames.add(String(sprite.frame.name));
      observed.set(key, frames);
    };
    sprite.on(Phaser.Animations.Events.ANIMATION_START, observeFrame);
    sprite.on(Phaser.Animations.Events.ANIMATION_UPDATE, observeFrame);
    sprite.on(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      if (!view.creepArt) return;
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
        castAbilityId?: string;
        statuses?: string;
      },
      enemy: boolean,
      name: string,
    ): void => {
      active.add(id);
      const art = enemy
        ? arenaCreepArt(
            this.cache.json.get('arena_creeps_manifest') as ArenaCreepManifest,
            actor.invasionWave,
            this.zoneId,
          )
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
          ? (art?.id ?? 'creep_outlaw')
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
          .setTexture(texture, cast ? cast.firstFrame : 'idle_down_0')
          .setOrigin(...(cast?.origin ?? actorFootPivot(this, texture)));
      const direction = facing(actor.fx, actor.fy);
      // Keep this prototype's authored one-shots complete across a short/late
      // network pose. This never changes movement, combat or server clocks.
      const authoredMonk =
        !enemy && !cast && texture.startsWith('hero_thieu_lam');
      const pose =
        art || authoredMonk
          ? view.playback.resolve(
              actor.hp <= 0 ? 'death' : actor.pose,
              direction,
              this.time.now,
              (state) => this.creepDuration(texture, state, direction),
            )
          : { state: actor.pose, direction };
      const key =
        cast?.animation ?? `${texture}:${pose.state}:${pose.direction}`;
      if (!enemy) view.sprite.setScale(cast?.scale ?? 1);
      if (art) {
        const alpha = view.playback.alpha(this.time.now, art.wave === 10);
        view.sprite.setAlpha(alpha);
        view.shadow.setAlpha(alpha);
        view.label.setVisible(false);
        view.bar.setVisible(actor.hp > 0);
      }
      if (view.sprite.anims.currentAnim?.key !== key) view.sprite.play(key);
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
    this.vfx?.sync(state, this.zoneId, (id) => this.actors.get(id)?.sprite);
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
    return anim ? (anim.frames.length * 1000) / anim.frameRate : 0;
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
  combat(event: CombatEvent): void {
    if (!this.ready || event.id <= this.lastEvent) return;
    this.lastEvent = event.id;
    if (event.kind === 'attack')
      this.creepAction(event.sourceId, 'basic_attack');
    if (event.kind === 'hit') this.creepAction(event.targetId, 'hurt');
    if (event.kind === 'death') this.creepAction(event.targetId, 'death');
    const source = this.snapshot?.creeps.get(event.sourceId);
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
    if (event.kind === 'attack') {
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
    if (event.kind === 'attack' && event.abilityId === 'cai_bang_bong') {
      const hero = this.snapshot?.players.get(event.sourceId);
      if (hero) {
        const arc = this.add.graphics().setDepth(event.y + 0.4);
        const angle = Math.atan2(hero.fy, hero.fx);
        arc
          .lineStyle(2, 0xf1d39b, 0.8)
          .beginPath()
          .arc(event.x, event.y - 16, 35, angle - 1, angle + 1)
          .strokePath();
        this.time.delayedCall(160, () => arc.destroy());
      }
    }
  }
  inspect() {
    const origin = this.cameras.main.getWorldPoint(0, 0);
    const unit = this.cameras.main.getWorldPoint(1, 0);
    return {
      ready: this.ready,
      sceneTime: this.time.now,
      zoneId: this.zoneId,
      damage: this.damage?.inspect(),
      skills: this.vfx?.inspect(),
      creepEffects: this.creepEffects?.inspect(),
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
      actors: [...this.actors].map(([id, view]) => ({
        id,
        x: view.sprite.x,
        y: view.sprite.y,
        depth: view.sprite.depth,
        animation: view.sprite.anims.currentAnim?.key,
        frame: view.sprite.frame.name,
        texture: view.sprite.texture.key,
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
}
