import Phaser from 'phaser';
import { queueArtPack } from './queue-art-pack.js';
import { renovationRevisionEnabled } from './renovation-policy.js';
import { replaceR3ArenaProp } from './m3d-r3-arena.js';
import { coMoDungeon, lyMacSauEncounter } from '@volam/game-data';
import type { CombatEvent } from '@volam/game-core';
import type { LobbyState } from '@volam/game-protocol';
import type { DesertManifest } from './desert-art.js';
import type { ArenaCreepArt } from './arena-creeps.js';
import { R3Painter, r3Tag } from './m3d-r3-art.js';

export const isCoMoZone = (zone: string) =>
  zone === 'co_mo_shared' || zone.startsWith('co_mo_private_');
export const bossCastStates: Record<string, string> = {
  ly_mac_sau_basic: 'basic_attack',
  bang_phach_ngan_cham: 'needle_cast',
  xich_luyen_chuong: 'palm_channel',
  phat_tran_cong: 'fast_sweep',
  co_mo_kiem_phap: 'summon_cast',
  ngu_doc_chuong: 'palm_channel',
};
export function coMoCreepArt(
  scene: Phaser.Scene,
  archetype: string | undefined,
  zone: string,
): ArenaCreepArt | undefined {
  if (!isCoMoZone(zone)) return undefined;
  const art = (
    scene.cache.json.get('co_mo_manifest') as DesertManifest
  ).assets.find((a) => a.archetypeId === archetype);
  if (!art) throw Error(`Unknown Cổ Mộ actor: ${archetype}`);
  return art;
}
export function preloadCoMo(scene: Phaser.Scene) {
  scene.load.atlas(
    'co_mo_needle_v3',
    '/assets/co_mo/co_mo_fx.png',
    '/assets/co_mo/co_mo_fx.json',
  );
  queueArtPack(scene, 'co_mo_pack', '/assets/co_mo/pack.json');
  scene.load.atlas(
    'co_mo_original_fx',
    '/assets/co_mo/co_mo_fx.png',
    '/assets/co_mo/co_mo_fx.json',
  );
  scene.load.image('co_mo_terrain', '/assets/co_mo/terrain.png');
  scene.load.atlas(
    'co_mo_scenery',
    '/assets/co_mo/scenery.png',
    '/assets/co_mo/scenery.json',
  );
  scene.load.tilemapTiledJSON('boss_co_mo', '/assets/boss_co_mo.tmj');
}
export function registerCoMoEffects(scene: Phaser.Scene) {
  for (const effect of (
    scene.cache.json.get('co_mo_manifest') as DesertManifest
  ).effects) {
    if (
      /^co_mo:(needle_|chilling_slow)/.test(effect.id) &&
      !scene.anims.exists(effect.id + ':renovated')
    )
      scene.anims.create({
        key: effect.id + ':renovated',
        frames: effect.frames.map((frame, i) => ({
          key: 'co_mo_needle_v3',
          frame,
          duration: effect.durations![i]!,
        })),
        frameRate: 1000,
        repeat: effect.repeat ?? 0,
      });
    const texture = effect.texture!;
    scene.textures.get(texture).setFilter(Phaser.Textures.FilterMode.NEAREST);
    for (const key of effect.id === 'co_mo:basic_hit'
      ? [texture, 'co_mo_original_fx']
      : [texture]) {
      scene.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
      const id = key === texture ? effect.id : effect.id + ':original';
      if (scene.anims.exists(id)) continue;
      scene.anims.create({
        key: id,
        frames: effect.frames.map((frame, i) => ({
          key,
          frame,
          duration: effect.durations![i]!,
        })),
        frameRate: 1000,
        repeat: effect.repeat ?? 0,
      });
    }
  }
}
export function createCoMoArt(scene: Phaser.Scene): Phaser.GameObjects.Image[] {
  for (const key of ['co_mo_terrain', 'co_mo_scenery'])
    scene.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
  const map = scene.make.tilemap({ key: 'boss_co_mo' });
  const S = coMoDungeon.width / map.widthInPixels;
  const tiles = map.addTilesetImage(
    'co_mo_terrain',
    'co_mo_terrain',
    32,
    32,
    0,
    0,
  );
  if (!tiles) throw Error('Missing Cổ Mộ tileset');
  for (const [i, name] of ['ground', 'details'].entries()) {
    const layer = map.createLayer(name, tiles);
    if (!layer) throw Error('Missing Cổ Mộ layer: ' + name);
    layer
      .setScale(S)
      .setDepth(-10000 + i)
      .setName(`co_mo:layer:${name}`);
  }
  const foreground: Phaser.GameObjects.Image[] = [];
  for (const p of map.getObjectLayer('scenery')?.objects ?? []) {
    const image = scene.add
      .image(p.x! * S, p.y! * S, 'co_mo_scenery', p.name)
      .setScale(S)
      .setOrigin(0.5, 168 / 192)
      .setDepth(p.y! * S)
      .setName(`co_mo:${p.name}`)
      .setData('world-depth-prop', true);
    replaceR3ArenaProp(image, 'co_mo', p.name, S);
    if (
      [
        'male_founder_statue',
        'female_founder_statue',
        'tomb_school_arch',
      ].includes(p.name)
    )
      foreground.push(image);
  }
  scene.add
    .zone(coMoDungeon.exit.x, coMoDungeon.exit.y, 32, 32)
    .setName('dungeon-exit');
  scene.add
    .text(coMoDungeon.exit.x, coMoDungeon.exit.y + 12, 'Lối Ra · Space', {
      fontFamily: 'Segoe UI',
      fontSize: '11px',
      color: '#e6dbc0',
      backgroundColor: '#182127',
    })
    .setOrigin(0.5, 0)
    .setDepth(coMoDungeon.exit.y + 1);
  return foreground;
}

/** The server owns warnings, releases and missiles. No local damage or trajectory simulation. */
export class CoMoEffects {
  private readonly r3: R3Painter;
  private readonly whisk = new Map<
    number,
    { owner: string; start: number; x: number; y: number }
  >();
  private warnings = new Map<string, Phaser.GameObjects.Sprite[]>();
  private shots = new Map<string, Phaser.GameObjects.Sprite>();
  private contacts = new Set<Phaser.GameObjects.Sprite>();
  private observed = new Set<string>();
  private played = new Set<string>();
  private completed = new Set<string>();
  constructor(private scene: Phaser.Scene) {
    this.r3 = new R3Painter(scene);
  }
  private edgeCue(x: number, y: number) {
    const view = this.scene.cameras.main.worldView;
    return {
      x: Phaser.Math.Clamp(x, view.x + 24, view.right - 24),
      y: Phaser.Math.Clamp(y, view.y + 64, view.bottom - 64),
    };
  }
  private make(
    name: string,
    x: number,
    y: number,
    rotation = 0,
    loop?: boolean,
  ) {
    const key =
      `co_mo:${name}` +
      (renovationRevisionEnabled() && /^(needle_|chilling_slow)/.test(name)
        ? ':renovated'
        : '');
    const anim = this.scene.anims.get(key);
    if (!anim) throw Error('Missing Cổ Mộ effect: ' + name);
    const first = anim.frames[0]!;
    const sprite = this.scene.add
      .sprite(x, y, String(first.textureKey), first.textureFrame)
      .setOrigin(0.5)
      .setDepth(y + 0.1)
      .setRotation(rotation);
    const observe = () =>
      this.observed.add(`${sprite.texture.key}:${sprite.frame.name}`);
    sprite.on(Phaser.Animations.Events.ANIMATION_START, observe);
    sprite.on(Phaser.Animations.Events.ANIMATION_UPDATE, observe);
    sprite.on(Phaser.Animations.Events.ANIMATION_COMPLETE, () =>
      this.completed.add(name),
    );
    sprite.play({
      key,
      ...(loop === undefined ? {} : { repeat: loop ? -1 : 0 }),
    });
    this.played.add(name);
    return sprite;
  }
  private contact(name: string, x: number, y: number, rotation = 0, scale = 1) {
    const sprite = this.make(name, x, y, rotation, false).setScale(scale);
    this.contacts.add(sprite);
    sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () =>
      sprite.destroy(),
    );
    sprite.once(Phaser.GameObjects.Events.DESTROY, () =>
      this.contacts.delete(sprite),
    );
  }
  event(event: CombatEvent) {
    const angle = Math.atan2(event.fy ?? 0, event.fx ?? 1);
    if (event.stage === 'summon_spawn')
      this.contact('co_mo_spawn', event.x, event.y - 18);
    if (event.kind === 'hit') {
      const effect = (
        {
          bang_phach_ngan_cham: 'needle_poison_impact',
          xich_luyen_chuong: 'palm_impact',
          ngu_doc_chuong: 'ngu_doc_impact',
          phat_tran_cong: 'melee_impact',
          ly_mac_sau_basic: 'basic_hit',
          co_mo_minion_needle: 'needle_poison_impact',
          creep_strike: 'melee_impact',
        } as Record<string, string>
      )[event.abilityId];
      if (effect)
        this.contact(
          event.abilityId === 'ly_mac_sau_basic'
            ? effect + ':original'
            : effect,
          event.x,
          event.y - 16,
        );
    }
    if (event.stage === 'release') {
      if (event.abilityId === 'ly_mac_sau_basic')
        this.whisk.set(event.id, {
          owner: event.sourceId,
          start: this.scene.time.now,
          x: event.x,
          y: event.y,
        });
      if (event.abilityId === 'phat_tran_cong')
        this.contact(
          'duster_sweep_trail',
          event.x + Math.cos(angle) * 55,
          event.y - 16 + Math.sin(angle) * 55,
          angle,
        );
      if (event.abilityId === 'ngu_doc_chuong')
        for (const p of lyMacSauEncounter.edgeEmitters)
          this.contact('edge_emission', p.x, p.y - 16, Math.atan2(p.fy, p.fx));
    }
  }
  sync(state: LobbyState | undefined, zone: string) {
    if (!state || state.phase === 'DEFEAT') {
      this.clear();
      return;
    }
    this.syncShots(state, zone);
    if (!isCoMoZone(zone)) return;
    const liveWarnings = new Set<string>();
    this.r3.begin();
    const sweepMs = r3Tag('r3_whisk_ring', 'sweep_billboard').tag
      .durationMsTotal;
    const outroMs = r3Tag('r3_whisk_ring', 'outro_billboard').tag
      .durationMsTotal;
    for (const [id, cast] of this.whisk) {
      const owner = state.creeps.get(cast.owner),
        age = this.scene.time.now - cast.start;
      if (!owner || owner.hp <= 0 || age >= sweepMs + outroMs) {
        this.whisk.delete(id);
        continue;
      }
      this.r3.draw(
        'whisk:' + id,
        'r3_whisk_ring',
        age < sweepMs ? 'sweep_billboard' : 'outro_billboard',
        undefined,
        cast.x,
        cast.y,
        age < sweepMs ? age : age - sweepMs,
        { scale: 1.2, depth: cast.y - 5 },
      );
    }
    state.creeps.forEach((actor, id) => {
      if (
        actor.zoneId !== zone ||
        actor.hp <= 0 ||
        actor.archetypeId !== 'ly_mac_sau' ||
        actor.castTicks <= 0
      )
        return;
      const token = id + ':' + actor.castAbilityId;
      liveWarnings.add(token);
      const existing = this.warnings.get(token);
      if (existing) {
        if (actor.castAbilityId === 'bang_phach_ngan_cham') {
          const target = state.players.get(actor.castTargetId);
          if (target) existing[0]?.setPosition(target.x, target.y);
        }
        if (actor.castAbilityId === 'ngu_doc_chuong')
          for (const [i, p] of lyMacSauEncounter.edgeEmitters.entries()) {
            const cue = this.edgeCue(p.x, p.y - 16);
            existing[i]?.setPosition(cue.x, cue.y).setDepth(cue.y + 0.1);
          }
        return;
      }
      const sprites: Phaser.GameObjects.Sprite[] = [];
      const add = (name: string, x: number, y: number, angle = 0) =>
        sprites.push(this.make(name, x, y, angle, true));
      const a = Math.atan2(actor.fy, actor.fx);
      if (actor.castAbilityId === 'xich_luyen_chuong') {
        add('palm_charge', actor.x, actor.y - 22);
        for (let i = 0; i < 8; i++) {
          const angle = (i * Math.PI) / 4;
          add(
            'palm_lane_warning',
            actor.x + Math.cos(angle) * 90,
            actor.y - 16 + Math.sin(angle) * 90,
            angle,
          );
        }
      } else if (actor.castAbilityId === 'co_mo_kiem_phap')
        for (const p of lyMacSauEncounter.summonSpawns)
          add('co_mo_sigil', p.x, p.y);
      else if (actor.castAbilityId === 'ngu_doc_chuong')
        for (const p of lyMacSauEncounter.edgeEmitters) {
          const cue = this.edgeCue(p.x, p.y - 16);
          add('edge_warning', cue.x, cue.y, Math.atan2(p.fy, p.fx));
        }
      else if (actor.castAbilityId === 'phat_tran_cong')
        add(
          'sweep_cone_warning',
          actor.x + actor.fx * 60,
          actor.y - 16 + actor.fy * 60,
          a,
        );
      else if (actor.castAbilityId === 'bang_phach_ngan_cham') {
        const target = state.players.get(actor.castTargetId);
        if (target) add('chilling_slow', target.x, target.y);
      }
      for (const sprite of sprites)
        sprite.setScale(
          actor.castAbilityId === 'bang_phach_ngan_cham' ? 0.45 : 0.8,
        );
      this.warnings.set(token, sprites);
    });
    for (const [token, sprites] of this.warnings)
      if (!liveWarnings.has(token)) {
        for (const sprite of sprites) sprite.destroy();
        this.warnings.delete(token);
      }
    this.r3.end();
  }
  private syncShots(state: LobbyState, zone: string): void {
    const liveShots = new Set<string>();
    state.projectiles.forEach((shot, id) => {
      if (
        shot.zoneId !== zone ||
        (!isCoMoZone(zone) && shot.abilityId !== 'gear_needle')
      )
        return;
      const tag = (
        {
          co_mo_minion_needle: 'needle_projectile',
          gear_needle: 'needle_projectile',
          bang_phach_ngan_cham: 'needle_projectile',
          xich_luyen_chuong: 'palm_projectile',
          ngu_doc_chuong: 'ngu_doc_projectile',
        } as Record<string, string>
      )[shot.abilityId];
      if (!tag) return;
      liveShots.add(id);
      let sprite = this.shots.get(id);
      if (!sprite) {
        sprite = this.make(tag, shot.x, shot.y - 28);
        if (shot.abilityId === 'co_mo_minion_needle')
          this.contact(
            'needle_spread',
            shot.x,
            shot.y - 16,
            Math.atan2(shot.vy, shot.vx),
            0.45,
          );
        sprite.setScale(
          shot.abilityId === 'gear_needle'
            ? 0.55
            : tag === 'needle_projectile'
              ? shot.abilityId === 'co_mo_minion_needle'
                ? 0.85
                : 1.2
              : 0.85,
        );
        this.shots.set(id, sprite);
      }
      sprite
        .setPosition(
          Math.round(shot.x),
          Math.round(
            shot.y -
              (['co_mo_minion_needle', 'gear_needle'].includes(shot.abilityId)
                ? 16
                : tag === 'needle_projectile'
                  ? 28
                  : 16),
          ),
        )
        .setRotation(Math.atan2(shot.vy, shot.vx))
        .setDepth(shot.y + 0.3);
    });
    for (const [id, sprite] of this.shots)
      if (!liveShots.has(id)) {
        sprite.destroy();
        this.shots.delete(id);
      }
  }
  clear() {
    this.r3.clear();
    this.whisk.clear();
    for (const sprites of this.warnings.values())
      for (const s of sprites) s.destroy();
    for (const s of this.shots.values()) s.destroy();
    for (const s of [...this.contacts]) s.destroy();
    this.warnings.clear();
    this.shots.clear();
    this.contacts.clear();
  }
  inspect() {
    return {
      observed: [...this.observed],
      played: [...this.played],
      completed: [...this.completed],
      warnings: this.warnings.size,
      shots: this.shots.size,
      contacts: this.contacts.size,
      r3: this.r3.inspect(),
    };
  }
}
