import { markImpactTarget } from './m3d-hit-art.js';
import {
  approvedM3dPresentation,
  releaseBeat,
} from './m3d-approved-boss-body.js';
import Phaser from 'phaser';
import {
  presentRenovatedBody,
  renovationEnabled,
  renovationHeight,
} from './renovation-art.js';
import type { LobbyState } from '@volam/game-protocol';
import type { KimAbility, KimView } from '@volam/game-core';
import playback from './kim-playback.json';
import { kimLuanXiangyangArena } from '@volam/game-data';
import { preloadKimXiangyang } from './kim-xiangyang-art.js';
import {
  R3Painter,
  r3NailAxis,
  r3Tag,
  type R3Direction,
} from './m3d-r3-art.js';
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
const key = (id: string) => 'kl_' + id;
export const isKimActor = (id: string) =>
  ['hoac_do', 'dat_nhi_ba', 'kim_luan_phap_vuong', 'kim_cage'].includes(id);
export function preloadKimArt(scene: Phaser.Scene) {
  preloadKimXiangyang(scene);
  for (const id of Object.keys(bundles))
    scene.load.atlas(
      key(id),
      `/assets/kim_luan/${id}.png`,
      `/assets/kim_luan/${id}.json`,
    );
}
export function registerKimArt(scene: Phaser.Scene) {
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
const facing = (x: number, y: number) =>
  Math.abs(x) > Math.abs(y)
    ? x < 0
      ? 'left'
      : 'right'
    : y < 0
      ? 'up'
      : 'down';
const body: Record<KimAbility, string> = {
  thiet_phien_lien_hoan: 'triple_fan',
  cuong_phong_tan_loi_cong: 'gust',
  phien_trung_doc_dinh: 'nails',
  cuong_phong_van_nhan: 'spin',
  dat_sweep: 'sweep',
  dai_luc_pha_son: 'slam',
  bat_dong_kim_cang: 'transfer',
  dai_luc_pha_son_boulder: 'boulder',
  hang_ma_tam_lien_chan: 'slam',
  kim_sweep: 'sweep',
  kim_hand_chop: 'hand_chop',
  kim_luan_truy_hon: 'channel',
  ngu_luan_ho_the: 'channel',
  ngu_luan_phong_toa: 'channel',
  long_tuong_chan_thien: 'stomp',
  long_tuong_bat_nha_cong: 'invoke',
  long_tuong_bat_nha_thap_tang: 'invoke',
};
/** State projection only. It never predicts hits, target changes, RNG, or rewards. */
export class KimLuanRenderer {
  private readonly r3: R3Painter;
  private views = new Map<string, Phaser.GameObjects.Image>();
  private labels = new Map<string, Phaser.GameObjects.Text>();
  private used = new Set<string>();
  private frames = new Map<string, Set<string>>();
  private clips = new Set<string>();
  private warnings: Phaser.GameObjects.Graphics;
  private tick = 0;
  private patch = -1;
  private received = 0;
  private latest: KimView | undefined;
  private reviewSprite: Phaser.GameObjects.Sprite | undefined;
  private flashes = new Map<string, number>();
  constructor(private scene: Phaser.Scene) {
    this.r3 = new R3Painter(scene);
    this.warnings = scene.add.graphics().setDepth(200);
  }
  clear() {
    this.r3.clear();
    for (const v of this.views.values()) v.destroy();
    this.views.clear();
    for (const l of this.labels.values()) l.destroy();
    this.labels.clear();
    this.warnings.clear();
    this.latest = undefined;
    this.reviewSprite?.destroy();
    this.reviewSprite = undefined;
  }
  flash(id: string) {
    this.flashes.set(id, this.scene.time.now);
  }
  /** Samples the exact registered clip using server time; unrelated state patches cannot restart it. */
  cel(
    id: string,
    bundle: string,
    clip: string,
    x: number,
    y: number,
    age: number,
    scale = 1,
    angle = 0,
    alpha = 1,
  ) {
    const b = bundles[bundle];
    if (!b) throw Error('Missing Kim bundle ' + bundle);
    const c = b.clips.find((c) => c.name === clip);
    if (!c) throw Error('Missing Kim clip ' + bundle + ':' + clip);
    const index =
        c.repeat === -1
          ? Math.floor(Math.max(0, age) * c.fps) % c.frames.length
          : Math.min(c.frames.length - 1, Math.floor(Math.max(0, age) * c.fps)),
      frame = c.frames[index]!;
    let image = this.views.get(id);
    if (!image) {
      image = this.scene.add
        .image(x, y, key(bundle), frame)
        .setName('kim_luan:' + id);
      this.views.set(id, image);
    }
    image
      .setTexture(key(bundle), frame)
      .setOrigin(b.origin[0]!, b.origin[1]!)
      .setPosition(x, y)
      .setRotation(angle)
      .setScale(scale)
      .setAlpha(alpha)
      .setDepth(y + 0.1)
      .setVisible(true);
    this.used.add(id);
    this.clips.add(bundle + ':' + clip);
    const observed = this.frames.get(bundle) ?? new Set<string>();
    observed.add(frame);
    this.frames.set(bundle, observed);
    return image;
  }
  private label(id: string, x: number, y: number, text: string) {
    let l = this.labels.get(id);
    if (!l) {
      l = this.scene.add
        .text(x, y, text, {
          resolution: 2,
          fontFamily: 'Segoe UI',
          fontSize: '11px',
          color: '#fff2cf',
          backgroundColor: '#20180cba',
        })
        .setOrigin(0.5, 1);
      this.labels.set(id, l);
    }
    l.setPosition(x, y)
      .setText(text)
      .setDepth(y + 100)
      .setVisible(true);
  }
  sync(state: LobbyState | undefined, zoneId: string) {
    if (!state || !zoneId.startsWith('kim_luan_')) {
      if (this.views.size) this.clear();
      return;
    }
    const encoded = state.dungeons.get(zoneId)?.encounter;
    if (!encoded) return;
    if (!this.warnings.scene)
      this.warnings = this.scene.add.graphics().setDepth(200);
    const v = JSON.parse(encoded) as KimView;
    this.latest = v;
    v.effects = [...state.bossEffects.entries()]
      .filter(([, e]) => e.zoneId === zoneId)
      .map(([id, e]) => ({
        ...e.toJSON(),
        id,
        kind: e.kind as KimView['effects'][number]['kind'],
        abilityId: e.abilityId as KimAbility,
      })) as KimView['effects'];
    if (v.tick !== this.patch) {
      this.patch = v.tick;
      this.received = this.scene.time.now;
    }
    this.tick =
      v.tick + Math.min(1, ((this.scene.time.now - this.received) * 30) / 1000);
    const seconds = this.tick / 30;
    this.used.clear();
    this.r3.begin();
    this.warnings.clear();
    for (const l of this.labels.values()) l.setVisible(false);
    for (const [id, a] of state.creeps) {
      if (
        a.zoneId !== zoneId ||
        !isKimActor(a.archetypeId) ||
        a.archetypeId === 'kim_cage'
      )
        continue;
      const actor = a.archetypeId,
        who = actor === 'kim_luan_phap_vuong' ? 'kim_luan' : actor,
        cast = v.casts.find((c) => c.actorId === actor);
      let bundle = who + '_base',
        clip = (a.pose === 'walk' ? 'walk_' : 'idle_') + facing(a.fx, a.fy),
        age = seconds;
      const movingShot =
        v.enraged && actor === 'kim_luan_phap_vuong'
          ? v.effects
              .filter((e) => e.abilityId === 'kim_sweep')
              .sort((a, b) => b.startedAt - a.startedAt)[0]
          : undefined;
      if (a.hp <= 0) {
        clip = 'idle_' + facing(a.fx, a.fy);
      } else if (movingShot && this.tick - movingShot.startedAt < 12) {
        bundle = who + '_actions';
        clip = 'sweep';
        age = (this.tick - movingShot.startedAt) / 30;
      } else if (cast && (!v.enraged || actor !== 'kim_luan_phap_vuong')) {
        bundle = who + '_actions';
        clip = body[cast.abilityId];
        age = (this.tick - cast.startedAt) / 30;
        if (
          ['thiet_phien_lien_hoan', 'hang_ma_tam_lien_chan'].includes(
            cast.abilityId,
          )
        )
          age %= cast.abilityId === 'thiet_phien_lien_hoan' ? 0.5 : 0.75;
      }
      let sprite: Phaser.GameObjects.Image;
      if (cast?.abilityId === 'kim_hand_chop') {
        const windup = cast.activeAt - cast.startedAt,
          since = this.tick - cast.startedAt,
          after = this.tick - cast.activeAt;
        const phase =
          since < windup * 0.5
            ? 'anticipation'
            : since < windup
              ? 'raise'
              : after < 4
                ? 'chop'
                : 'recovery';
        const phaseStart =
          phase === 'anticipation'
            ? cast.startedAt
            : phase === 'raise'
              ? cast.startedAt + windup * 0.5
              : phase === 'chop'
                ? cast.activeAt
                : cast.activeAt + 4;
        const duration =
          phase === 'anticipation' || phase === 'raise'
            ? windup * 0.5
            : phase === 'chop'
              ? 4
              : Math.max(1, cast.endsAt - phaseStart);
        sprite = this.r3.draw(
          id,
          'r3_kim_hand_chop',
          phase,
          facing(cast.fx, cast.fy) as R3Direction,
          a.x,
          a.y,
          ((this.tick - phaseStart) * 1000) / 30,
          { duration: (duration * 1000) / 30 },
        );
      } else sprite = this.cel(id, bundle, clip, a.x, a.y, age);
      const locomotion = /^(idle|walk)_/.test(clip);
      const moving = clip === 'sweep' && movingShot;
      const action = locomotion ? undefined : moving || cast;
      const pose =
        a.hp <= 0
          ? 'death'
          : a.pose === 'hurt'
            ? 'hurt'
            : locomotion
              ? clip.slice(0, 4)
              : 'action';
      presentRenovatedBody(
        this.scene,
        sprite,
        who,
        pose,
        action?.fx ?? a.fx,
        action?.fy ?? a.fy,
        action?.abilityId ?? a.castAbilityId,
        action
          ? {
              beat: releaseBeat(
                this.tick,
                moving ? moving.startedAt : cast!.activeAt,
              ),
            }
          : undefined,
      );
      const rendered = this.frames.get(who + '_body') ?? new Set<string>();
      rendered.add(sprite.texture.key + ':' + sprite.frame.name);
      this.frames.set(who + '_body', rendered);
      markImpactTarget(sprite, id);
      if (
        sprite.texture.key === key('kim_luan_actions') &&
        clip === 'channel'
      ) {
        const pivots: Record<string, number[]> = {
          channel_0: [79.5, 133],
          channel_1: [89.5, 128],
          channel_2: [94.5, 128],
          channel_3: [97, 128],
        };
        const pivot = pivots[String(sprite.frame.name)],
          size = r3Tag('kim_luan_actions', 'channel').asset.frameDimensions;
        if (pivot) sprite.setOrigin(pivot[0]! / size[0], pivot[1]! / size[1]);
      }
      if (
        !approvedM3dPresentation() &&
        this.scene.time.now - (this.flashes.get(id) ?? -1000) < 100
      )
        sprite.setTint(0xffe8c3);
      else sprite.clearTint();
      if (a.hp > 0)
        this.label(
          id,
          a.x,
          a.y -
            (renovationEnabled(this.scene)
              ? renovationHeight(who, 48) + 10
              : 58),
          actor === 'hoac_do'
            ? 'Hoắc Đô'
            : actor === 'dat_nhi_ba'
              ? 'Đạt Nhĩ Ba'
              : 'Kim Luân Pháp Vương',
        );
      if (a.hp > 0 && v.wardId === actor)
        this.cel(
          id + ':ward',
          'dat_nhi_ba_fx',
          'ward',
          a.x,
          a.y,
          seconds,
          0.65,
        );
      if (a.hp > 0 && v.enraged && actor === 'kim_luan_phap_vuong')
        this.cel(
          id + ':empower',
          'kim_luan_fx',
          'empower',
          a.x,
          a.y,
          seconds,
          0.7,
        );
    }
    for (const e of v.effects) {
      const age = (this.tick - e.activeAt) / 30,
        warning = age < 0,
        angle = Math.atan2(e.fy, e.fx) - Math.PI / 2;
      if (e.kind === 'elephant') {
        if (warning) {
          if (e.activeAt - this.tick < 24) {
            const edge = e.fy > 0 ? kimLuanXiangyangArena.north : kimLuanXiangyangArena.south;
            this.warnings.lineStyle(2, 0xffc35a, 0.45);
            this.warnings.lineBetween(e.x, edge, e.x, edge + e.fy * 25);
          }
          continue;
        }
        const elephantBody = this.cel(
          e.id,
          e.fy > 0 ? 'elephant' : 'elephant_up',
          e.fy > 0 ? 'run_down' : 'run_up',
          e.x,
          e.y,
          age,
          0.55,
        );
        presentRenovatedBody(
          this.scene,
          elephantBody,
          'kim_elephant',
          'walk',
          0,
          e.fy,
        );
        continue;
      }
      if (e.kind === 'rock') {
        this.cel(
          e.id,
          'elephant',
          'shelter_rise',
          e.x,
          e.y,
          Math.min(0.25, (this.tick - e.startedAt) / 30),
          // The standing rock cel is about 130 opaque pixels wide.
          (2 * e.radius) / 130,
        );
        continue;
      }
      if (e.kind === 'cage') {
        const cage = state.creeps.get(zoneId + ':kim_cage');
        this.cel(e.id, 'kim_luan_fx', 'cage', e.x, e.y, age, 0.8);
        this.label(
          e.id,
          e.x,
          e.y - 70,
          'Phá luân xa · ' + Math.ceil(cage?.hp ?? 0) + ' HP',
        );
        continue;
      }
      if (e.kind === 'ring') {
        if (warning) {
          this.warnings
            .lineStyle(2, 0xffc35a, 0.65)
            .strokeEllipse(e.x, e.y, e.radius * 2, e.radius * 0.8);
          continue;
        }
        const elapsed = (this.tick - e.activeAt) / 30,
          fade = elapsed > (e.maxRadius ?? 280) / Math.max(1, e.speed),
          clip = fade ? 'fade' : 'wave';
        const cel =
          clip +
          '_' +
          (fade
            ? Math.min(
                1,
                Math.floor((elapsed - (e.maxRadius ?? 280) / e.speed) * 8),
              )
            : elapsed < 0.08
              ? 0
              : 1);
        const metrics =
          playback.stompFrames[cel as keyof typeof playback.stompFrames];
        const image = this.cel(
          e.id,
          'kim_stomp_fx',
          clip,
          e.x,
          e.y,
          clip === 'wave'
            ? elapsed < 0.08
              ? 0
              : 0.1
            : elapsed - (e.maxRadius ?? 280) / e.speed,
          Math.max(0.01, e.radius / metrics.radius),
          0,
          fade ? 0.45 : 0.7,
        );
        image.setOrigin(metrics.origin[0]!, metrics.origin[1]!).setDepth(-100);
        continue;
      }
      if (e.kind === 'line') {
        const color = warning ? 0xffc35a : 0xff7733;
        this.warnings
          .lineStyle(e.radius * 2, color, warning ? 0.18 : 0.28)
          .lineBetween(e.x, e.y, e.x + e.fx * e.length, e.y + e.fy * e.length);
        for (let n = 0; n < e.length; n += 70)
          this.cel(
            e.id + ':' + n,
            e.abilityId === 'dai_luc_pha_son' ? 'dat_nhi_ba_fx' : 'kim_luan_fx',
            e.abilityId === 'dai_luc_pha_son' ? 'fissure' : 'shockwave',
            e.x + e.fx * n,
            e.y + e.fy * n,
            Math.max(0, age),
            0.55,
            angle,
            warning ? 0.35 : 1,
          );
        continue;
      }
      if (e.kind === 'arc') {
        this.warnings.lineStyle(3, 0xffc35a, warning ? 0.55 : 0.8);
        this.warnings.beginPath();
        this.warnings.arc(
          e.x,
          e.y,
          e.radius,
          Math.atan2(e.fy, e.fx) - Math.PI / 2,
          Math.atan2(e.fy, e.fx) + Math.PI / 2,
        );
        this.warnings.strokePath();
        continue;
      }
      if (warning) continue;
      if (
        e.ownerId === 'kim_luan_phap_vuong' &&
        (e.kind === 'shot' || e.kind === 'orbit')
      ) {
        if (e.abilityId === 'kim_hand_chop') {
          const d = facing(e.fx, e.fy) as R3Direction,
            cardinal = {
              right: 0,
              down: Math.PI / 2,
              left: Math.PI,
              up: -Math.PI / 2,
            }[d];
          this.r3.draw(
            e.id,
            'r3_crescent_' + d,
            age < 0.1 ? 'birth' : 'travel',
            d,
            e.x,
            e.y - 30,
            Math.max(0, age) * 1000,
            {
              scale: 1.35,
              rotation: Math.atan2(e.fy, e.fx) - cardinal,
              loop: age >= 0.1,
            },
          );
        } else
          this.r3.draw(
            e.id,
            'r3_round_wheel',
            'spin_billboard',
            undefined,
            e.x,
            e.y - 30,
            Math.max(0, age) * 1000,
            { scale: 0.7, loop: true },
          );
        continue;
      }
      const hoac = e.ownerId === 'hoac_do',
        dat = e.ownerId === 'dat_nhi_ba';
      let bundle = hoac ? 'hoac_do_fx' : dat ? 'dat_nhi_ba_fx' : 'kim_luan_fx',
        clip = hoac
          ? e.abilityId === 'cuong_phong_tan_loi_cong'
            ? 'gust'
            : e.abilityId === 'thiet_phien_lien_hoan'
              ? 'slash'
              : 'nail'
          : dat
            ? 'boulder'
            : 'chakram';
      const scale = hoac
        ? clip === 'gust'
          ? 0.7
          : clip === 'slash'
            ? 0.75
            : 0.25
        : dat
          ? 0.6
          : 0.45;
      const image = this.cel(
        e.id,
        bundle,
        clip,
        e.x,
        e.y - (hoac ? 28 : 0),
        Math.max(0, age),
        scale,
        angle,
      );
      if (hoac && clip === 'nail') {
        const axis =
          r3NailAxis[String(image.frame.name) as keyof typeof r3NailAxis];
        if (!axis)
          throw Error('Unmeasured approved nail cel ' + image.frame.name);
        image
          .setOrigin(axis.pivot[0]! / 256, axis.pivot[1]! / 256)
          .setRotation(Math.atan2(e.fy, e.fx) + axis.rotationOffsetRadians);
        if (!image.getData('r3-brightness')) {
          image.enableFilters();
          image.filters!.internal.addColorMatrix().colorMatrix.brightness(1.6);
          image.setData('r3-brightness', true);
        }
      }
    }
    for (const cast of v.casts)
      if (cast.abilityId === 'cuong_phong_van_nhan') {
        const b = state.creeps.get(zoneId + ':' + cast.actorId);
        if (b)
          this.cel(
            cast.id + ':spin',
            'hoac_do_fx',
            'whirlwind',
            b.x,
            b.y,
            (this.tick - cast.startedAt) / 30,
            0.9,
          );
      }
    for (const [id, image] of this.views)
      if (!this.used.has(id)) {
        image.destroy();
        this.views.delete(id);
      }
    this.r3.end();
  }
  inspect() {
    return {
      frames: Object.fromEntries([...this.frames].map(([k, v]) => [k, [...v]])),
      clips: [...this.clips],
      phase: this.latest?.phase,
      enraged: this.latest?.enraged,
      r3: this.r3.inspect(),
      entities: [...this.views].map(([id, i]) => ({
        id,
        asset: i.texture.key,
        frame: i.frame.name,
        x: i.x,
        y: i.y,
        depth: i.depth,
        origin: [i.originX, i.originY],
        scale: i.scaleX,
      })),
    };
  }
  /** Reachable only through the test-service compile flag; no gameplay state changes. */
  review(bundle: string, clip: string) {
    this.reviewSprite?.destroy();
    this.reviewSprite = undefined;
    if (!bundle) return;
    const b = bundles[bundle],
      c = b?.clips.find((c) => c.name === clip);
    if (!b || !c) throw Error('Unselected clip');
    const s = this.scene.add
      .sprite(640, 520, key(bundle), c.frames[0])
      .setOrigin(b.origin[0]!, b.origin[1]!)
      .setDepth(10000)
      .setName('kim-frame-fixture');
    this.reviewSprite = s;
    s.play({ key: key(bundle) + ':' + clip, repeat: -1 });
    return { frames: c.frames, fps: c.fps };
  }
  reviewState() {
    return this.reviewSprite
      ? {
          frame: String(this.reviewSprite.frame.name),
          anim: this.reviewSprite.anims.currentAnim?.key,
          progress: this.reviewSprite.anims.getProgress(),
          origin: [this.reviewSprite.originX, this.reviewSprite.originY],
          rotation: this.reviewSprite.rotation,
          depth: this.reviewSprite.depth,
        }
      : null;
  }
}
