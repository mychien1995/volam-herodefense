import Phaser from 'phaser';
import type { LobbyState } from '@volam/game-protocol';
import type { CombatEvent, DongAbility, DongView } from '@volam/game-core';
import playback from './dong-playback.json';
const bundles = playback.bundles as Record<
  string,
  {
    origin: number[];
    clips: Array<{
      name: string;
      frames: string[];
      fps: number;
      repeat: number;
    }>;
  }
>;
const key = (id: string) => 'dt_' + id;
const actors: Record<string, string> = {
  dong_ta: 'dong',
  mai_sieu_phong: 'mai',
  hoang_dung: 'hoang',
};
const face = (x: number, y: number) =>
  Math.abs(x) > Math.abs(y)
    ? x < 0
      ? 'left'
      : 'right'
    : y < 0
      ? 'up'
      : 'down';
const body: Record<DongAbility, string> = {
  ta_kiem_lien_kich: 'thrust',
  lac_anh_normal: 'sword_flurry_cast',
  dan_chi_than_cong: 'finger_cast',
  lac_anh_kiem_phap: 'sword_flurry_cast',
  ngoc_tieu_hoi_phong: 'flute',
  trieu_hon_dong_hai: 'summon_cast',
  bach_cot_trao: 'claw_attack',
  ma_anh_troc_hon: 'claw_attack',
  am_phong_hap_luc: 'pull_cast',
  doc_cot_bao: 'poison_skull_throw',
  thanh_am_ho_tro: 'support_cast',
  linh_xa_bo: 'evade',
};
export const isDongArtActor = (id: string) => Object.hasOwn(actors, id);
export function preloadDongArt(scene: Phaser.Scene) {
  for (const id of Object.keys(bundles))
    scene.load.atlas(
      key(id),
      `/assets/dong_ta/${id}.png`,
      `/assets/dong_ta/${id}.json`,
    );
}
export function registerDongArt(scene: Phaser.Scene) {
  for (const [id, b] of Object.entries(bundles)) {
    scene.textures.get(key(id)).setFilter(Phaser.Textures.FilterMode.NEAREST);
    for (const c of b.clips)
      if (!scene.anims.exists(key(id) + ':' + c.name))
        scene.anims.create({
          key: key(id) + ':' + c.name,
          frames: c.frames.map((frame) => ({ key: key(id), frame })),
          frameRate: c.fps,
          repeat: c.repeat,
          skipMissedFrames: false,
        });
  }
}
/** Renders only server casts/effects. No client RNG, hit tests, HP changes or boss input. */
export class DongTaRenderer {
  private images = new Map<string, Phaser.GameObjects.Image>();
  private labels = new Map<string, Phaser.GameObjects.Text>();
  private frames = new Map<string, Set<string>>();
  private used = new Set<string>();
  private boundary: Phaser.GameObjects.Ellipse | undefined;
  private latest: DongView | undefined;
  private received = 0;
  private patch = -1;
  private poses = new Map<string, { token: string; start: number }>();
  private corpses = new Map<
    string,
    { bundle: string; direction: string; x: number; y: number; at: number }
  >();
  private contacts = new Map<
    number,
    { bundle: string; clip: string; x: number; y: number; at: number }
  >();
  constructor(private scene: Phaser.Scene) {}
  clear() {
    for (const v of this.images.values()) v.destroy();
    this.images.clear();
    for (const v of this.labels.values()) v.destroy();
    this.labels.clear();
    this.boundary?.destroy();
    this.boundary = undefined;
    this.latest = undefined;
    this.poses.clear();
    this.corpses.clear();
    this.contacts.clear();
  }
  event(event: CombatEvent) {
    if (event.kind === 'pulse' && event.abilityId === 'thanh_am_ho_tro')
      this.contacts.set(event.id, {
        bundle: 'hoangfx',
        clip: 'heal_aura',
        x: event.x,
        y: event.y,
        at: this.scene.time.now,
      });
    if (
      event.kind === 'hit' &&
      ['lac_anh_normal', 'lac_anh_kiem_phap'].includes(event.abilityId)
    )
      this.contacts.set(event.id, {
        bundle: 'fan',
        clip: 'blossom_impact',
        x: event.x,
        y: event.y,
        at: this.scene.time.now,
      });
    if (event.kind !== 'death' || !Object.hasOwn(actors, event.targetId))
      return;
    const v = this.images.get(event.targetId),
      a = this.latest?.casts.find((c) => c.actorId === event.targetId);
    this.corpses.set(event.targetId, {
      bundle: actors[event.targetId]!,
      direction: a
        ? face(a.fx, a.fy)
        : (this.poses.get(event.targetId)?.token.split(':')[1] ?? 'down'),
      x: v?.x ?? event.x,
      y: v?.y ?? event.y,
      at: this.scene.time.now,
    });
  }
  private cel(
    id: string,
    bundle: string,
    clip: string,
    x: number,
    y: number,
    age: number,
    scale = 1,
    angle = 0,
    depth = y + 0.1,
  ) {
    const b = bundles[bundle]!,
      c = b.clips.find((c) => c.name === clip);
    if (!c) throw Error(`Unapproved Đông Tà clip ${bundle}:${clip}`);
    const n = Math.floor(Math.max(0, age) * c.fps),
      frame =
        c.frames[
          c.repeat === -1
            ? n % c.frames.length
            : Math.min(c.frames.length - 1, n)
        ]!;
    let v = this.images.get(id);
    if (!v) {
      v = this.scene.add
        .image(x, y, key(bundle), frame)
        .setName('dong_ta:' + id);
      this.images.set(id, v);
    }
    v.setTexture(key(bundle), frame)
      .setOrigin(b.origin[0]!, b.origin[1]!)
      .setPosition(x, y)
      .setScale(scale)
      .setRotation(angle)
      .setDepth(depth)
      .setVisible(true);
    this.used.add(id);
    const observed = this.frames.get(bundle + ':' + clip) ?? new Set<string>();
    observed.add(frame);
    this.frames.set(bundle + ':' + clip, observed);
    return v;
  }
  sync(state: LobbyState | undefined, zone: string) {
    if (!state || zone !== 'arena' || !state.defense.dongTa) {
      this.clear();
      return;
    }
    const view = JSON.parse(state.defense.dongTa) as DongView;
    view.effects = [...state.bossEffects.entries()]
      .filter(
        ([, e]) => e.zoneId === 'arena' && Object.hasOwn(actors, e.ownerId),
      )
      .map(([id, e]) => ({
        ...e.toJSON(),
        id,
        origin: { x: e.originX, y: e.originY },
      })) as DongView['effects'];
    if (view.tick !== this.patch) {
      this.patch = view.tick;
      this.received = this.scene.time.now;
    }
    this.latest = view;
    this.used.clear();
    const tick =
      view.tick + Math.min(2, (this.scene.time.now - this.received) * 0.03);
    const statue = this.scene.children.getByName('art01:statue_male') as
      Phaser.GameObjects.Image | undefined;
    statue?.setVisible(!view.locked);
    if (view.locked) {
      if (!this.boundary)
        this.boundary = this.scene.add
          .ellipse(
            view.bounds.x,
            view.bounds.y,
            view.bounds.radiusX * 2,
            view.bounds.radiusY * 2,
          )
          .setStrokeStyle(2, 0xe6bb84, 0.65)
          .setDepth(95)
          .setName('dong_ta:boundary');
      this.boundary.setVisible(true);
    } else this.boundary?.setVisible(false);
    for (const actor of state.creeps.values()) {
      const bundle = actors[actor.archetypeId];
      if (!bundle || actor.zoneId !== zone) continue;
      const cast = view.casts.find((c) => c.actorId === actor.archetypeId);
      let pose =
        actor.hp <= 0
          ? 'death'
          : cast
            ? body[cast.abilityId]
            : actor.pose === 'walk'
              ? 'walk'
              : actor.pose === 'hurt'
                ? 'hurt'
                : 'idle';
      const useActions = pose === 'thrust' || pose === 'flute';
      const b = useActions ? 'actions' : bundle;
      if (
        !bundles[b]!.clips.some(
          (c) => c.name === pose + '_' + face(actor.fx, actor.fy),
        )
      )
        pose = 'idle';
      const direction = face(actor.fx, actor.fy),
        token = pose + ':' + direction;
      if (this.poses.get(actor.archetypeId)?.token !== token)
        this.poses.set(actor.archetypeId, { token, start: tick });
      const age =
        (tick - (cast?.startedAt ?? this.poses.get(actor.archetypeId)!.start)) /
        30;
      this.cel(
        actor.archetypeId,
        b,
        pose + '_' + direction,
        actor.x,
        actor.y,
        age,
        1,
        0,
        actor.y + 0.5,
      );
      let label = this.labels.get(actor.archetypeId);
      if (!label) {
        label = this.scene.add
          .text(0, 0, '', {
            fontFamily: 'Segoe UI',
            fontSize: '11px',
            color: '#ffebc5',
            backgroundColor: '#20180cba',
          })
          .setOrigin(0.5, 1);
        this.labels.set(actor.archetypeId, label);
      }
      label
        .setPosition(actor.x, actor.y - 65)
        .setDepth(actor.y + 1)
        .setText(
          `${bundle === 'dong' ? 'Đông Tà' : bundle === 'mai' ? 'Mai Siêu Phong' : 'Hoàng Dung'} ${Math.ceil(actor.hp)}/${actor.maxHp}`,
        );
    }
    for (const [id, c] of this.corpses) {
      const age = (this.scene.time.now - c.at) / 1000;
      if (age > 0.65) {
        this.corpses.delete(id);
        continue;
      }
      if (!this.used.has(id))
        this.cel(
          'corpse:' + id,
          c.bundle,
          'death_' + c.direction,
          c.x,
          c.y,
          age,
          1,
          0,
          c.y + 0.4,
        );
    }
    for (const [id, c] of this.contacts) {
      const age = (this.scene.time.now - c.at) / 1000;
      if (age > 0.5) {
        this.contacts.delete(id);
        continue;
      }
      this.cel(
        'contact:' + id,
        c.bundle,
        c.clip,
        c.x,
        c.y,
        age,
        1,
        0,
        c.y + 0.2,
      );
    }
    for (const e of view.effects) {
      const age = (tick - e.startedAt) / 30,
        angle = Math.atan2(e.fy, e.fx);
      let bundle = 'fx',
        clip = '',
        x = e.x,
        y = e.y - 20,
        scale = 1,
        rotation = angle,
        depth = e.y + 0.2;
      switch (e.kind) {
        case 'thrust':
          clip = 'thrust_streak';
          x += (e.fx * e.length) / 2;
          y += (e.fy * e.length) / 2;
          scale = 3;
          break;
        case 'fan':
          bundle = 'fan';
          clip = 'sword_fan_wave';
          x += e.fx * 75;
          y += e.fy * 75;
          scale = 2;
          break;
        case 'bead':
          clip = 'pebble';
          break;
        case 'slash':
          bundle = 'fan';
          clip = 'blossom_slash_wave';
          scale = 2;
          break;
        case 'petal':
          clip = tick < e.activeAt ? 'petal_patch' : 'petal_burst';
          y = e.y;
          rotation = 0;
          depth = tick < e.activeAt ? 100 : e.y + 0.2;
          break;
        case 'claw':
          bundle = 'maifx';
          clip = e.speed
            ? 'ranged_claw'
            : e.targetId === '0'
              ? 'claw_left'
              : 'claw_right';
          if (!e.speed) {
            x += e.fx * 58;
            y += e.fy * 58;
            rotation =
              angle + (e.targetId === '0' ? Math.PI / 2 : -Math.PI / 2);
            scale = 1.3;
            depth = 100;
          }
          break;
        case 'pull':
          bundle = 'maifx';
          clip = 'suction';
          scale = 2;
          rotation = 0;
          depth = 100;
          y = e.y;
          break;
        case 'pouch': {
          bundle = 'maifx';
          clip = 'poison_pouch';
          const t = Math.min(
            1,
            (tick - e.startedAt) / Math.max(1, e.activeAt - e.startedAt),
          );
          x = e.origin.x + (e.x - e.origin.x) * t;
          y =
            e.origin.y +
            (e.y - e.origin.y) * t -
            28 -
            Math.sin(t * Math.PI) * 95;
          rotation = 0;
          break;
        }
        case 'poison':
          bundle = 'maifx';
          clip = tick - e.startedAt < 12 ? 'poison_burst' : 'poison_pool';
          scale = 2;
          rotation = 0;
          y = e.y;
          depth = 100;
          break;
        case 'heal':
          clip = 'heal_palm';
          break;
        case 'summon':
          bundle = 'summon';
          clip = 'summon_column';
          rotation = 0;
          this.cel(
            e.id + ':circle',
            'summon',
            'summon_circle',
            x,
            e.y,
            age,
            1,
            0,
            100,
          );
          this.cel(
            e.id + ':spawn',
            'summon',
            e.targetId === 'mai_sieu_phong' ? 'mai_spawn' : 'hoang_spawn',
            x,
            e.y,
            age,
            1,
            0,
            e.y + 0.1,
          );
          break;
        case 'sprint': {
          bundle = 'hoangfx';
          clip = 'movement_trail';
          const owner = state.creeps.get(e.ownerId);
          if (owner) {
            x = owner.x;
            y = owner.y;
          }
          rotation = 0;
          break;
        }
      }
      if (clip)
        this.cel(
          e.id,
          bundle,
          clip,
          x,
          y,
          e.kind === 'petal' && tick >= e.activeAt
            ? (tick - e.activeAt) / 30
            : age,
          scale,
          rotation,
          depth,
        );
    }
    for (const [id, v] of this.images)
      if (!this.used.has(id)) {
        v.destroy();
        this.images.delete(id);
      }
    for (const [id, v] of this.labels)
      if (!this.used.has(id)) {
        v.destroy();
        this.labels.delete(id);
      }
  }
  inspect() {
    return {
      view: this.latest,
      observed: Object.fromEntries(
        [...this.frames].map(([k, v]) => [k, [...v]]),
      ),
      statueVisible: (
        this.scene.children.getByName('art01:statue_male') as
          Phaser.GameObjects.Image | undefined
      )?.visible,
      actors: [...this.images]
        .filter(([id]) => Object.hasOwn(actors, id))
        .map(([id, v]) => ({
          id,
          x: v.x,
          y: v.y,
          depth: v.depth,
          origin: [v.originX, v.originY],
          texture: v.texture.key,
          frame: v.frame.name,
        })),
      effects: this.images.size,
      boundaryVisible: this.boundary?.visible ?? false,
    };
  }
}
