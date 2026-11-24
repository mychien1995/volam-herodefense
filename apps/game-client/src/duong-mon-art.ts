import Phaser from 'phaser';
import { duongMon, type CombatEvent } from '@volam/game-core';
import type { LobbyState } from '@volam/game-protocol';
import { setArtFilter } from './art-filter.js';
import { zoneTick } from './zone-tick.js';

const path = '/assets/duong-mon/';
const arts = [
  'tuan-sa-walk',
  'da-hanh-walk',
  'tuan-sa-action',
  'da-hanh-action',
  'tuan-sa-vertical',
  'da-hanh-vertical',
  'vfx',
  'co-quan-effects',
];
const keys = new Set<string>(Object.values(duongMon));
const key = (id: string) => 'duong-mon-' + id;
export const duongMonPivot = [0.5, 200 / 240] as const;
export const duongMonBody = (texture: string) =>
  texture === key('tuan-sa-walk') || texture === key('da-hanh-walk');
export const duongMonHandles = (id: string) => keys.has(id);
export const duongMonDummy = 'duong-mon-practice-dummy';
const flight = 'duong_mon_flight';
const shell = 'duong_mon_shell';
const evade = 'duong_mon_evade';
type Sprite = Phaser.GameObjects.Sprite;

export function preloadDuongMon(scene: Phaser.Scene) {
  if (!scene.textures.exists(duongMonDummy))
    scene.load.image(duongMonDummy, path + 'dummy.png');
  for (const id of arts)
    if (!scene.textures.exists(key(id)))
      scene.load.atlas(key(id), path + id + '.png', path + id + '.json');
}

export class DuongMonArt {
  private readonly objects = new Map<string, Phaser.GameObjects.Image>();
  private readonly temporary = new Set<Phaser.GameObjects.Image>();
  constructor(private readonly scene: Phaser.Scene) {
    for (const texture of [duongMonDummy, ...arts.map(key)])
      setArtFilter(
        scene.textures.get(texture),
        Phaser.Textures.FilterMode.LINEAR,
      );
  }

  body(
    sprite: Sprite,
    actor: {
      basicId?: string;
      castAbilityId?: string;
      actionStartedAt?: number;
      hp: number;
    },
    statuses: { kind: string }[],
    pose: string,
    facing: string,
    tick: number,
  ) {
    const tuan = actor.basicId === duongMon.coQuan;
    const art = tuan ? 'tuan-sa' : 'da-hanh';
    const vertical = facing === 'up' || facing === 'down';
    const age = Math.max(0, tick - (actor.actionStartedAt ?? tick));
    const flying = statuses.some((s) => s.kind === flight);
    let sheet = art + '-walk';
    let name =
      (pose === 'walk'
        ? ['step-a', 'idle', 'step-b', 'idle'][Math.floor(tick / 3) % 4]
        : 'idle') +
      '-' +
      facing;
    let flip = false;
    let action = '';
    if (actor.hp > 0) {
      const id = actor.castAbilityId;
      if (tuan && statuses.some((s) => s.kind === shell))
        action = age < 7 ? 'fold' : 'shell';
      else if (tuan && flying && (pose !== 'cast' || id === duongMon.flight))
        action =
          pose === 'walk' || pose === 'basic_attack' ? 'flight' : 'hover';
      else if (!tuan && statuses.some((s) => s.kind === 'dash'))
        action = 'dash';
      else if (pose === 'cast' || pose === 'basic_attack') {
        if (id === duongMon.flowers) action = age < 9 ? 'coil' : 'spin';
        else if (id === duongMon.flight) action = 'hover';
        else if (id === duongMon.storm)
          action =
            age < 9
              ? 'ready'
              : age < 25
                ? 'spin'
                : age < 48
                  ? 'alternate'
                  : 'lunge';
        else if (id === duongMon.trap) action = 'trap';
        else if (id === duongMon.knives)
          action = Math.floor(age / 3) % 2 ? 'alternate' : 'release';
        else if (id === duongMon.evade) action = 'dash';
        else if (id === duongMon.laser) action = age < 13 ? 'ready' : 'release';
        else action = 'release';
      }
    }
    if (action) {
      sheet = art + (vertical ? '-vertical' : '-action');
      const mapped = tuan
        ? (
            {
              ready: 'release',
              flight: 'hover',
              fold: 'shell',
              coil: 'spin',
            } as Record<string, string>
          )[action]
        : (
            { trap: 'ready', alternate: 'release', lunge: 'spin' } as Record<
              string,
              string
            >
          )[action];
      name = vertical ? (mapped ?? action) + '-' + facing : action;
      flip = facing === 'left';
    }
    if (sprite.texture.key !== key(sheet) || sprite.frame.name !== name)
      sprite.stop().setTexture(key(sheet), name);
    sprite
      .setOrigin(...duongMonPivot)
      .setScale(0.5)
      .setFlipX(flip)
      .setAlpha(actor.hp <= 0 ? 0.42 : 1);
    if (flying) sprite.y -= 14;
    if (statuses.some((s) => s.kind === evade)) sprite.setTint(0xd9f2ff);
    else sprite.clearTint();
  }

  sync(state: LobbyState | undefined, zoneId: string) {
    const live = new Set<string>();
    state?.projectiles.forEach((shot, id) => {
      if (
        shot.zoneId !== zoneId ||
        !keys.has(shot.abilityId) ||
        shot.abilityId === duongMon.laser
      )
        return;
      const stage = shot.stage;
      const frame = [
        'water',
        'wood',
        'metal',
        'earth',
        'fire',
        'feather',
      ].includes(stage)
        ? stage
        : shot.abilityId === duongMon.evade ||
            shot.abilityId === duongMon.knives ||
            shot.abilityId === duongMon.storm
          ? 'knife'
          : 'arrow';
      const image = this.track(live, id, 'vfx', frame);
      image
        .setPosition(shot.x, shot.y - (stage === 'feather' ? 31 : 21))
        .setDepth(shot.y + 4)
        .setRotation(Math.atan2(shot.vy, shot.vx))
        .setScale(shot.abilityId === duongMon.storm ? 0.34 : 0.55);
      image.setTint(stage === 'poison_knives' ? 0x93d49b : 0xffffff);
    });
    state?.areas.forEach((area, id) => {
      if (
        area.zoneId !== zoneId ||
        (area.abilityId !== duongMon.trap &&
          area.abilityId !== duongMon.flowers)
      )
        return;
      const flower = area.abilityId === duongMon.flowers;
      const image = this.track(live, id, 'vfx', flower ? 'flower' : 'trap');
      const owner = state.players.get(area.ownerId);
      const elapsed =
        (zoneTick(state, zoneId) ?? area.startedAt) - area.startedAt;
      const travel =
        flower && owner ? Phaser.Math.Clamp(elapsed / 10, 0, 1) : 1;
      image
        .setPosition(
          Phaser.Math.Linear(
            area.launchFx || area.launchFy
              ? area.launchX
              : (owner?.x ?? area.x),
            area.x,
            travel,
          ),
          Phaser.Math.Linear(
            (area.launchFx || area.launchFy
              ? area.launchY
              : (owner?.y ?? area.y)) - 20,
            area.y,
            travel,
          ) -
            Math.sin(travel * Math.PI) * 22,
        )
        .setScale(0.62)
        .setDepth(1)
        .setRotation(flower ? travel * Math.PI : 0)
        .setAlpha(
          flower
            ? area.ticks > 12
              ? 1
              : 0.75 + 0.25 * Math.sin(area.ticks)
            : 0.58,
        );
    });
    for (const [id, image] of this.objects)
      if (!live.has(id)) {
        image.destroy();
        this.objects.delete(id);
      }
  }

  event(e: CombatEvent) {
    if (!keys.has(e.abilityId)) return false;
    if (e.abilityId === duongMon.laser) {
      if (e.kind === 'cast')
        this.fx(
          'co-quan-effects',
          'charge',
          e.x + (e.fx ?? 0) * 16,
          e.y - 24 + (e.fy ?? 0) * 16,
          430,
          0.66,
        );
      if (e.stage === 'release' && e.radius) {
        const angle = Math.atan2(e.fy ?? 0, e.fx ?? 1);
        const length = e.radius;
        const x = e.x + (Math.cos(angle) * length) / 2;
        const y = e.y - 23 + (Math.sin(angle) * length) / 2;
        const beam = this.fx('co-quan-effects', 'laser', x, y, 230, 0.8);
        beam
          .setRotation(angle)
          .setScale(length / 192, 0.8)
          .setBlendMode(Phaser.BlendModes.SCREEN);
      }
      if (e.kind === 'hit')
        this.fx('co-quan-effects', 'contact', e.x, e.y - 16, 250, 0.45);
    }
    if (e.abilityId === duongMon.flowers && e.kind === 'pulse') {
      this.fx('co-quan-effects', 'blossom-blast', e.x, e.y - 9, 245, 0.51);
      const wave = this.fx('co-quan-effects', 'shockwave', e.x, e.y, 490, 0.35);
      this.scene.tweens.add({ targets: wave, scale: 0.76, duration: 490 });
      for (let i = 0; i < 11; i++) {
        const angle = (i * Math.PI * 2) / 11 + (e.id % 13) * 0.17;
        const needle = this.fx(
          'co-quan-effects',
          'needle',
          e.x,
          e.y - 7,
          570,
          0.46,
        ).setRotation(angle);
        this.scene.tweens.add({
          targets: needle,
          x: e.x + Math.cos(angle) * 66,
          y: e.y - 7 + Math.sin(angle) * 47,
          duration: 545,
        });
      }
    }
    if (e.abilityId === duongMon.trap && e.kind === 'pulse')
      this.fx('co-quan-effects', 'blossom-blast', e.x, e.y - 10, 410, 0.67);
    if (
      e.abilityId === duongMon.amKhi &&
      e.kind === 'pulse' &&
      e.stage === 'explosion'
    )
      this.fx('vfx', 'burst', e.x, e.y - 12, 280, 0.65).setTint(0xffad6d);
    if (
      e.kind === 'hit' &&
      e.abilityId !== duongMon.flowers &&
      e.abilityId !== duongMon.trap
    )
      this.fx(
        'vfx',
        e.abilityId === duongMon.laser ||
          e.abilityId === duongMon.arrows ||
          e.abilityId === duongMon.amKhi
          ? 'ice'
          : 'burst',
        e.x,
        e.y - 6,
        250,
        0.41,
      );
    return true;
  }

  inspect() {
    return [...this.objects.values(), ...this.temporary].map((image) => ({
      frame: image.frame.name,
      x: image.x,
      y: image.y,
      rotation: image.rotation,
    }));
  }

  clear() {
    for (const image of [...this.objects.values(), ...this.temporary]) {
      this.scene.tweens.killTweensOf(image);
      image.destroy();
    }
    this.objects.clear();
    this.temporary.clear();
  }

  private track(live: Set<string>, id: string, sheet: string, frame: string) {
    live.add(id);
    const existing = this.objects.get(id);
    if (existing) return existing.setFrame(frame);
    const image = this.scene.add.image(0, 0, key(sheet), frame);
    this.objects.set(id, image);
    return image;
  }

  private fx(
    sheet: string,
    frame: string,
    x: number,
    y: number,
    duration: number,
    scale: number,
  ) {
    const image = this.scene.add
      .image(x, y, key(sheet), frame)
      .setScale(scale)
      .setDepth(y + 30);
    this.temporary.add(image);
    this.scene.tweens.add({
      targets: image,
      alpha: 0,
      duration,
      onComplete: () => {
        this.temporary.delete(image);
        image.destroy();
      },
    });
    return image;
  }
}
