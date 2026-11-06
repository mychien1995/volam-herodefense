import Phaser from 'phaser';
import {
  presentRenovatedBody,
  renovationEnabled,
  renovationHeight,
} from './renovation-art.js';
import { replaceR3ArenaProp } from './m3d-r3-arena.js';
import {
  hongLietDefinition,
  hongLietDungeon,
  bossArenaScale as S,
} from '@volam/game-data';
import { r3Tag, r3Frame, type R3Direction } from './m3d-r3-art.js';
import type {
  BossEffectState,
  CreepState,
  LobbyState,
} from '@volam/game-protocol';
const assets = [
  'boss_locomotion',
  'boss_basics',
  'boss_thrust_vertical',
  'boss_casts',
  'minion_infantry',
  'minion_archer',
  'cannon_clean',
  'vfx_basics',
  'vfx_stomp',
  'vfx_volcano',
  'vfx_meteor',
  'vfx_meteor_safe',
  'vfx_lava_lane',
  'vfx_lava_lane_v03',
  'vfx_arrows',
];
const key = (id: string) => 'hl_' + id;
const dir = (x: number, y: number) =>
  Math.abs(x) > Math.abs(y)
    ? x < 0
      ? 'left'
      : 'right'
    : y < 0
      ? 'up'
      : 'down';
export const isHongLietActor = (id: string) =>
  ['hoan_nhan_hong_liet', 'mongol_archer', 'mongol_infantry'].includes(id);
export function preloadHongLietArt(scene: Phaser.Scene): void {
  for (const id of assets)
    scene.load.atlas(
      key(id),
      `/assets/bosses/hoan_nhan_hong_liet_v01/${id}.png`,
      `/assets/bosses/hoan_nhan_hong_liet_v01/${id}.json`,
    );
  scene.load.atlas(
    'hl_scenery',
    '/assets/hong_liet/scenery.png',
    '/assets/hong_liet/scenery.json',
  );
  scene.load.image('hong_liet_terrain', '/assets/hong_liet/terrain.png');
  scene.load.tilemapTiledJSON('hong_liet_map', '/assets/hong_liet/map.tmj');
  scene.load.json('hong_liet_manifest', '/assets/hong_liet/manifest.json');
}
export function registerHongLietArt(scene: Phaser.Scene): void {
  for (const id of [...assets.map(key), 'hl_scenery', 'hong_liet_terrain'])
    scene.textures.get(id).setFilter(Phaser.Textures.FilterMode.NEAREST);
  for (const id of ['boss_locomotion', 'minion_infantry', 'minion_archer'])
    for (const d of ['down', 'left', 'right', 'up'])
      for (const [pose, frames, ms] of [
        ['idle', ['idle_a', 'idle_b'], 400],
        [
          'walk',
          ['walk_a', 'walk_b', 'walk_c', 'walk_d'],
          id === 'boss_locomotion' ? 120 : 150,
        ],
      ] as const) {
        const names =
          id === 'boss_locomotion'
            ? frames
            : pose === 'idle'
              ? ['idle_0', 'idle_1']
              : ['walk_0', 'walk_1', 'walk_2', 'walk_3'];
        scene.anims.create({
          key: `hl:${id}:${pose}:${d}`,
          frames: names.map((f) => ({ key: key(id), frame: `${d}_${f}` })),
          frameRate: 1000 / ms,
          repeat: -1,
        });
      }
}
export function createHongLietArena(
  scene: Phaser.Scene,
): Phaser.GameObjects.Image[] {
  const map = scene.make.tilemap({ key: 'hong_liet_map' }),
    tiles = map.addTilesetImage(
      'hong_liet_terrain',
      'hong_liet_terrain',
      32,
      32,
      0,
      0,
    );
  if (!tiles) throw Error('Missing headquarters tiles');
  map
    .createLayer('ground', tiles)!
    .setScale(S)
    .setDepth(-10000)
    .setName('hong_liet:ground');
  const props: Phaser.GameObjects.Image[] = [];
  for (const o of map.getObjectLayer('scenery')?.objects ?? []) {
    const frame = o.name + '_0';
    if (!scene.textures.get('hl_scenery').has(frame))
      throw Error('Missing headquarters prop ' + frame);
    const ground = ['command_horn_carpet', 'boundary_lava_rock'].includes(
      o.name,
    );
    const image = scene.add
      .image((o.x ?? 0) * S, (o.y ?? 0) * S, 'hl_scenery', frame)
      .setScale(S)
      .setOrigin(0.5, 368 / 384)
      .setDepth(ground ? -9500 : (o.y ?? 0) * S)
      .setName('hong_liet:' + o.name);
    props.push(image);
    replaceR3ArenaProp(image, 'hong_liet', o.name, S);
  }
  scene.add
    .text(
      hongLietDungeon.exit.x,
      hongLietDungeon.exit.y + 12,
      'Lối ra · Space',
      { fontSize: '11px', color: '#ffe4af', backgroundColor: '#24180f' },
    )
    .setOrigin(0.5, 0)
    .setDepth(2000);
  return props;
}
type View = {
  image: Phaser.GameObjects.Image;
  label?: Phaser.GameObjects.Text;
  bar?: Phaser.GameObjects.Graphics;
  muzzle?: Phaser.GameObjects.Image;
};
/** Pure projection of room state. No collision, hits, RNG or gameplay movement here. */
export class HongLietRenderer {
  private flashes = new Map<string, number>();
  private views = new Map<string, View>();
  private tick = 0;
  private patchTick = -1;
  private patchTime = 0;
  private sampled = new Map<string, number>();
  private observed = new Map<string, Set<string>>();
  private actions = new Set<string>();
  private samples: Array<Record<string, unknown>> = [];
  constructor(private scene: Phaser.Scene) {}
  flash(id: string): void {
    this.flashes.set(id, this.scene.time.now);
  }
  clear(): void {
    for (const v of this.views.values()) this.destroy(v);
    this.views.clear();
  }
  private destroy(v: View) {
    v.image.destroy();
    v.label?.destroy();
    v.bar?.destroy();
    v.muzzle?.destroy();
  }
  private image(
    id: string,
    asset: string,
    frame: string,
    x: number,
    y: number,
    texture = key(asset),
  ): View {
    let v = this.views.get(id);
    if (!v) {
      v = {
        image: this.scene.add
          .image(x, y, texture, frame)
          .setName('hong_liet:' + id),
      };
      this.views.set(id, v);
    }
    v.image
      .setTexture(texture, frame)
      .setPosition(x, y)
      .setVisible(true)
      .setAlpha(1)
      .setRotation(0)
      .setScale(1)
      .setOrigin(0.5, 0.8)
      .setCrop();
    const set = this.observed.get(asset) ?? new Set<string>();
    set.add(frame);
    this.observed.set(asset, set);
    return v;
  }
  private flat(asset: string, index: number): string {
    return this.scene.textures.get(key(asset)).getFrameNames()[
      Math.min(
        index,
        this.scene.textures.get(key(asset)).getFrameNames().length - 1,
      )
    ]!;
  }
  sync(state: LobbyState | undefined, zoneId: string): void {
    if (!state || !zoneId.startsWith('hong_liet_')) {
      this.clear();
      return;
    }
    const serverTick = state.dungeons.get(zoneId)?.tick ?? 0;
    if (serverTick !== this.patchTick) {
      this.patchTick = serverTick;
      this.patchTime = this.scene.time.now;
    }
    this.tick =
      serverTick +
      Math.min(2, ((this.scene.time.now - this.patchTime) * 30) / 1000);
    const active = new Set<string>();
    for (const [id, a] of state.creeps)
      if (a.zoneId === zoneId && isHongLietActor(a.archetypeId)) {
        active.add(id);
        this.actor(id, a);
      }
    for (const [id, e] of state.bossEffects)
      if (e.zoneId === zoneId) {
        active.add(id);
        this.effect(id, e);
      }
    for (const [id, v] of this.views)
      if (!active.has(id)) {
        this.destroy(v);
        this.views.delete(id);
      }
  }
  private actor(id: string, a: CreepState): void {
    const d = dir(a.fx, a.fy),
      boss = a.archetypeId === 'hoan_nhan_hong_liet';
    let asset = boss
      ? 'boss_locomotion'
      : a.archetypeId === 'mongol_archer'
        ? 'minion_archer'
        : 'minion_infantry';
    let frame =
      d +
      '_' +
      (a.pose === 'walk'
        ? 'walk_' +
          (boss
            ? ['a', 'b', 'c', 'd'][Math.floor(this.tick / 3.6) % 4]
            : Math.floor(this.tick / 4.5) % 4)
        : 'idle_' +
          (boss
            ? Math.floor(this.tick / 12) % 2
              ? 'b'
              : 'a'
            : Math.floor(this.tick / 12) % 2));
    if (boss && a.castAbilityId && this.tick < a.actionEndsAt) {
      this.actions.add(a.castAbilityId);
      const warning = this.tick < a.actionActiveAt,
        age = this.tick - a.actionActiveAt;
      if (
        a.castAbilityId === 'hong_liet_a1' ||
        a.castAbilityId === 'hong_liet_a2'
      ) {
        const n = warning ? 0 : Math.min(3, Math.floor(age / 3.15));
        asset =
          a.castAbilityId === 'hong_liet_a1' &&
          ['up', 'down'].includes(d) &&
          n > 0 &&
          n < 3
            ? 'boss_thrust_vertical'
            : 'boss_basics';
        frame = `${d}_${a.castAbilityId === 'hong_liet_a1' ? 'thrust' : 'sweep'}_${n}`;
      } else if (a.castAbilityId === 'liet_diem_phong_toa') {
        asset = 'boss_basics';
        frame = `${d}_thrust_${warning ? 0 : age >= hongLietDefinition.lavaDashTicks ? 3 : 1 + (Math.floor(age / 3) % 2)}`;
      } else {
        asset = 'boss_casts';
        const n = warning
          ? Math.min(
              1,
              Math.floor(
                (this.tick - a.actionStartedAt) /
                  Math.max(1, (a.actionActiveAt - a.actionStartedAt) / 2),
              ),
            )
          : 2;
        frame = `${d}_${a.castAbilityId === 'dung_nham_liet_dia' ? 'stomp' : 'command'}_${n}`;
      }
    } else if (!boss && a.pose === 'basic_attack') {
      // Missing vertical contact drawings remain excluded: explicitly use approved side attack aliases.
      const side = d === 'up' || d === 'down' ? 'right' : d;
      frame = side + '_attack_' + (Math.floor(this.tick / 4) % 2);
    }
    if (a.hp <= 0) {
      asset = boss ? 'boss_locomotion' : asset;
      frame = d + '_idle_' + (boss ? 'a' : '0');
    }
    const v = this.image(id, asset, frame, a.x, a.y);
    v.image.setDepth(a.y);
    presentRenovatedBody(
      this.scene,
      v.image,
      a.archetypeId,
      a.hp <= 0
        ? 'death'
        : boss &&
            this.tick < a.actionEndsAt &&
            ['hong_liet_a2', 'liet_diem_phong_toa'].includes(a.castAbilityId)
          ? 'action'
          : asset === 'boss_locomotion' || (!boss && a.pose !== 'basic_attack')
            ? a.pose
            : 'action',
      a.fx,
      a.fy,
      a.castAbilityId,
    );
    if (!v.label) {
      v.label = this.scene.add
        .text(
          a.x,
          a.y,
          boss
            ? 'Hoàn Nhan Hồng Liệt'
            : a.archetypeId === 'mongol_archer'
              ? 'Cung thủ'
              : 'Thiết binh',
          {
            resolution: 2,
            fontSize: boss ? '12px' : '10px',
            color: '#ffe1a0',
            stroke: '#20110c',
            strokeThickness: 3,
          },
        )
        .setOrigin(0.5, 1);
      v.bar = this.scene.add.graphics();
    }
    v.image
      .setTint(
        a.hp <= 0
          ? 0x88766b
          : this.scene.time.now - (this.flashes.get(id) ?? -1000) < 120
            ? 0xffbb88
            : 0xffffff,
      )
      .setAlpha(a.hp <= 0 ? 0.3 : 1);
    v.label!.setPosition(
      a.x,
      a.y -
        (renovationEnabled(this.scene)
          ? renovationHeight(a.archetypeId, 78) + 10
          : boss
            ? 78
            : 52),
    )
      .setDepth(a.y + 0.5)
      .setVisible(a.hp > 0);
    v.bar!.clear().setDepth(a.y + 0.4);
    if (a.hp > 0) {
      const w = boss ? 66 : 32,
        y = a.y - (boss ? 74 : 48);
      v.bar!.fillStyle(0x24180f)
        .fillRect(a.x - w / 2, y, w, 4)
        .fillStyle(0xdf7137)
        .fillRect(a.x - w / 2, y, (w * a.hp) / a.maxHp, 4);
    }
  }
  private effect(id: string, e: BossEffectState): void {
    const warning = this.tick < e.activeAt,
      age = Math.max(0, this.tick - e.activeAt),
      angle = Math.atan2(e.fy, e.fx);
    let asset = 'vfx_basics',
      frame = 'thrust_0',
      x = e.x,
      y = e.y;
    if (e.abilityId === 'hong_liet_a1') {
      const d = dir(e.fx, e.fy) as R3Direction;
      if (warning) return; // Authoritative line telegraphs are drawn above; selected atlas has travel only.
      const { asset: c, tag } = r3Tag('r3_hhl_blade_' + d, 'travel', d);
      const frame = r3Frame(tag, (age * 1000) / 30, undefined, !warning);
      const v = this.image(id, c.id, frame, x, y - 28, c.id);
      const cardinal = {
        right: 0,
        down: Math.PI / 2,
        left: Math.PI,
        up: -Math.PI / 2,
      }[d];
      v.image
        .setOrigin(...tag.origin)
        .setScale(0.7)
        .setRotation(angle - cardinal)
        .setDepth(y + 2)
        .setAlpha(warning ? 0.3 : 1);
    } else if (e.kind === 'arc') {
      const n = warning ? 0 : Math.min(3, 1 + Math.floor(age / 3.9));
      frame = 'sweep_' + n;
      const v = this.image(id, asset, frame, x, y);
      v.image
        .setPosition(x, y - 28)
        .setOrigin(0.5, 140 / 320)
        .setScale(e.length / 112, (e.length / 82) * 0.6)
        .setRotation(angle - Math.PI / 2)
        .setDepth(-25)
        .setAlpha(warning ? 0.45 : 1)
        .setCrop(0, 140, 320, 180);
    } else if (e.kind === 'lava' || e.kind === 'line') {
      const lane = e.kind === 'lava';
      asset = lane ? 'vfx_lava_lane_v03' : 'vfx_lava_lane';
      const n = warning
        ? 0
        : lane && this.tick >= e.damageUntil
          ? 7
          : 4 + (Math.floor(age / 5.4) % 3);
      frame = this.flat(asset, n);
      const anchors = [
        [261.5, 332],
        [258, 331],
        [256, 319],
        [255, 325],
        [261.5, 272.5],
        [258, 274],
        [255.5, 274.5],
        [255.5, 278.5],
      ];
      const p = lane ? anchors[n]! : [261, 331.5];
      const v = this.image(
        id,
        asset,
        frame,
        x + (e.fx * e.length) / 2,
        y + (e.fy * e.length) / 2,
      );
      v.image
        .setOrigin(p[0]! / 512, p[1]! / 512)
        .setScale(
          e.length / (lane ? 320 : 308),
          lane ? (warning ? 1.65 : 1.2) : 0.55,
        )
        .setRotation(angle)
        .setDepth(-40)
        .setAlpha(
          warning
            ? 0.65
            : lane && this.tick >= e.damageUntil
              ? 0.92 *
                Math.max(
                  0,
                  (e.expiresAt - this.tick) / (e.expiresAt - e.damageUntil),
                )
              : 0.92,
        );
      const width = lane ? 320 : 308,
        half = (lane ? e.radius : 22) / v.image.scaleY;
      v.image.setCrop(p[0]! - width / 2, p[1]! - half, width, half * 2);
    } else if (e.kind === 'projectile') {
      const arrow = e.abilityId === 'hoa_tien_te_phat';
      asset = arrow ? 'vfx_arrows' : 'vfx_basics';
      frame = arrow ? 'right_' + (Math.floor(age / 3) % 4) : 'thrust_1';
      const v = this.image(id, asset, frame, x, y);
      v.image
        .setOrigin(arrow ? 0.5 : 258 / 320, arrow ? 0.65 : 175 / 320)
        .setScale(arrow ? 0.24 : 0.42, arrow ? 0.24 : 0.35)
        .setRotation(angle)
        .setDepth(y + 2);
    } else if (e.kind === 'cannon') {
      asset = 'cannon_clean';
      const d = dir(e.fx, e.fy),
        side = d === 'left' ? 'right' : d === 'right' ? 'left' : d;
      frame =
        d === 'left' || d === 'right'
          ? 'recoil_' + side
          : (warning ? 'rest_' : 'recoil_') + d;
      const v = this.image(id, asset, frame, x - e.fx * 22, y - e.fy * 22);
      v.image.setDepth(y - 1);
      const a = hongLietDefinition.abilities.hoa_phao_thien_la,
        fire = age < a.durationTicks && age % a.intervalTicks < 4 && !warning;
      if (!v.muzzle)
        v.muzzle = this.scene.add
          .image(x, y, key('vfx_basics'), 'thrust_1')
          .setOrigin(65 / 320, 175 / 320)
          .setScale(0.2);
      v.muzzle
        .setPosition(x, y)
        .setRotation(angle)
        .setDepth(y + 3)
        .setVisible(fire);
    } else {
      const n = warning
        ? Math.min(
            3,
            Math.floor(
              (this.tick - e.startedAt) /
                Math.max(1, (e.activeAt - e.startedAt) / 4),
            ),
          )
        : 4 + Math.min(3, Math.floor(age / 4.5));
      asset =
        e.kind === 'stomp'
          ? 'vfx_stomp'
          : e.kind === 'volcano'
            ? 'vfx_volcano'
            : 'vfx_meteor';
      if (e.kind === 'meteor' && warning && n >= 2) {
        asset = 'vfx_meteor_safe';
        frame = 'fall_' + (n - 2);
      } else frame = this.flat(asset, n);
      const v = this.image(id, asset, frame, x, y);
      const size = e.kind === 'volcano' ? 256 : 384;
      v.image
        .setOrigin(0.5, 0.65)
        .setScale((e.radius * 2) / (size * 0.68))
        .setDepth(warning ? -35 : y + 1)
        .setAlpha(warning ? 0.8 : 1);
    }
    // Readable exact telegraph outline uses the same server geometry and expires at contact.
    const v = this.views.get(id)!;
    v.bar ??= this.scene.add.graphics();
    const g = v.bar;
    g.clear().setDepth(-20);
    if (
      warning &&
      e.kind !== 'cannon' &&
      (e.kind !== 'projectile' || e.abilityId === 'hong_liet_a1')
    ) {
      g.lineStyle(2, 0xffca58, 0.85);
      if (
        e.kind === 'line' ||
        e.kind === 'lava' ||
        e.abilityId === 'hong_liet_a1'
      ) {
        const r = e.radius || 12,
          nx = -e.fy * r,
          ny = e.fx * r;
        g.strokePoints(
          [
            { x: x + nx, y: y + ny },
            { x: x + e.fx * e.length + nx, y: y + e.fy * e.length + ny },
            { x: x + e.fx * e.length - nx, y: y + e.fy * e.length - ny },
            { x: x - nx, y: y - ny },
          ].map((p) => new Phaser.Math.Vector2(p.x, p.y)),
          true,
        );
      } else if (e.kind === 'arc') {
        g.beginPath();
        g.arc(x, y, e.length, angle - Math.PI / 2, angle + Math.PI / 2, false);
        g.lineTo(x, y);
        g.closePath();
        g.strokePath();
      } else g.strokeCircle(x, y, e.radius);
    }
    const sampleKey = e.abilityId + ':' + e.kind + ':' + warning,
      bucket = Math.floor(this.tick / 6);
    if (this.sampled.get(sampleKey) !== bucket) {
      this.sampled.set(sampleKey, bucket);
      this.samples.push({
        tick: Math.floor(this.tick),
        kind: e.kind,
        ability: e.abilityId,
        warning,
        x,
        y,
        length: e.length,
        fx: e.fx,
        fy: e.fy,
      });
      if (this.samples.length > 800) this.samples.shift();
    }
  }
  inspect() {
    return {
      loadedAtlases: assets.length,
      actions: [...this.actions],
      frames: Object.fromEntries(
        [...this.observed].map(([k, v]) => [k, [...v]]),
      ),
      samples: this.samples,
      entities: [...this.views].map(([id, v]) => ({
        id,
        asset: v.image.texture.key,
        frame: v.image.frame.name,
        x: v.image.x,
        y: v.image.y,
        depth: v.image.depth,
        origin: [v.image.originX, v.image.originY],
      })),
      fallbacks: [
        'hurt: brief tint over current pose; death: dim idle, no new cel',
        'minion vertical attack: approved right-facing contact alias',
      ],
      cameraRotation: 0,
    };
  }
}
