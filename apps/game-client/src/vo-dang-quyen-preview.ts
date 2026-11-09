import Phaser from 'phaser';
import groundUrl from '../../../assets/exports/visual-upgrade-2/ground.png?url';
import heroUrl from '../../../assets/exports/renovation-v1/runtime/hero_vo_dang.png?url';
import heroAtlas from '../../../assets/exports/renovation-v1/runtime/hero_vo_dang.json?url';
import dummyUrl from '../../../assets/exports/renovation-v1/runtime/creep_bandit_grunt.png?url';
import dummyAtlas from '../../../assets/exports/renovation-v1/runtime/creep_bandit_grunt.json?url';
import legacyHuyenUrl from '../../../assets/exports/visual-improvement-approved/vo_dang_hands_v2_projectile_3657f015.png?url';
import legacyHuyenAtlas from '../../../assets/exports/vo-dang-quyen-preview/legacy-huyen-am.json?url';
import fistWaveUrl from '../../../assets/m3d-feedback-visual/exported/m3d_vo_dang_sonic_vfx_r2/m3d_vo_dang_sonic_vfx_r2.png?url';
import fistWaveAtlas from '../../../assets/m3d-feedback-visual/exported/m3d_vo_dang_sonic_vfx_r2/m3d_vo_dang_sonic_vfx_r2.json?url';
import fistWaveClips from '../../../assets/m3d-feedback-visual/exported/m3d_vo_dang_sonic_vfx_r2/m3d_vo_dang_sonic_vfx_r2.animations.json';
import { m3dPresentation } from './m3d-feedback-policy.js';
import punchUrl from '../../../assets/exports/vo-dang-quyen-preview/punch.png?url';
import punchAtlas from '../../../assets/exports/vo-dang-quyen-preview/punch.json?url';
import castUrl from '../../../assets/exports/vo-dang-quyen-preview/casts.png?url';
import castAtlas from '../../../assets/exports/vo-dang-quyen-preview/casts.json?url';
import rimUrl from '../../../assets/exports/vo-dang-quyen-preview/formation-rim.png?url';
import sockets from '../../../assets/exports/vo-dang-quyen-preview/cast-sockets.json';
import effectUrl from '../../../assets/exports/vo-dang-quyen-preview/effects.png?url';
import effectAtlas from '../../../assets/exports/vo-dang-quyen-preview/effects.json?url';
import art from '../../../assets/exports/vo-dang-quyen-preview/placement.json';
import './vo-dang-quyen-preview.css';

type Facing = 'down' | 'left' | 'right' | 'up';
type SkillKey = 'KeyA' | 'KeyQ' | 'KeyW' | 'KeyE' | 'KeyR' | 'KeyT';
type Body = { pose: Pose; facing: Facing; start: number; frame: number };
type Point = { x: number; y: number };

const skills = new Set<string>([
  'KeyA',
  'KeyQ',
  'KeyW',
  'KeyE',
  'KeyR',
  'KeyT',
]);
const arrows = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);
const directions = {
  right: { x: 1, y: 0, angle: 0, huyenOrigin: [0.59, 0.5] },
  left: { x: -1, y: 0, angle: Math.PI, huyenOrigin: [0.41, 0.5] },
  down: { x: 0, y: 1, angle: Math.PI / 2, huyenOrigin: [0.5, 0.59] },
  up: { x: 0, y: -1, angle: -Math.PI / 2, huyenOrigin: [0.5, 0.41] },
} as const;
const readings = [
  ['can', 'Càn · Hồi máu và tăng tốc hồi máu'],
  ['khon', 'Khôn · Tăng sát thương và sát thương chí mạng'],
  ['doai', 'Đoài · Bùng nổ quanh chân'],
  ['ton', 'Tốn · Hồi mana và tăng tốc hồi mana'],
  ['kham', 'Khảm · Tăng nhẹ tốc chạy'],
  ['can-nui', 'Cấn · Vô sự'],
  ['chan', 'Chấn · Choáng 2 giây'],
  ['ly', 'Ly · Mất máu'],
] as const;
const fortuneBuffs = {
  can: { duration: 1000, y: 0, lift: 18, start: 0.84, end: 1.06 },
  khon: { duration: 950, y: -45, lift: 7, start: 0.72, end: 1.05 },
  ton: { duration: 1100, y: -39, lift: 5, start: 1.08, end: 0.78 },
  kham: { duration: 1400, y: -7, lift: 1, start: 0.83, end: 1 },
} as const;
type FortuneBuff = keyof typeof fortuneBuffs;
const rollMs = 5000;
const glyphMs = 180;
const inkDelay = 1000;
const bodyCues = {
  punch: [0, 62, 133, 216, 275],
  'luong-nghi': [0, 155, 295, 390],
  'huyen-am': [0, 145, 310, 425, 525],
  'tai-chi': [0, 130, 285, 450, 610, 780, 990],
} as const;
type Pose = keyof typeof bodyCues;
const heroHeight = 88;
const waveMs = 400;
const legacyHuyenTag = (facing: Facing) => 'huyen_am_travel_' + facing;

/** Isolated art scene. Inputs drive local poses and effects for visual review. */
class VoDangQuyenPreview extends Phaser.Scene {
  private hero!: Phaser.GameObjects.Image;
  private dummy!: Phaser.GameObjects.Sprite;
  private shield!: Phaser.GameObjects.Image;
  private glyph!: Phaser.GameObjects.Image;
  private buff!: Phaser.GameObjects.Image;
  private activeBuff: { id: FortuneBuff; start: number } | undefined;
  private formation!: Phaser.GameObjects.Image;
  private rim: Phaser.GameObjects.Image[] = [];
  private formationAt = 0;
  private status = document.querySelector<HTMLElement>('#quyen-status')!;
  private controls = new AbortController();
  private held = new Set<string>();
  private facing: Facing = 'right';
  private body: Body | undefined;
  private queuedPunch = false;
  private wet = false;
  private rollStart: number | undefined;
  private rollOffset = 0;
  private readingIndex = 0;
  private glyphUntil = 0;
  private stunUntil = 0;
  private speedUntil = 0;
  private groundSize = { x: 1478, y: 1064 };
  private active = new Set<
    Phaser.GameObjects.Image | Phaser.GameObjects.Sprite
  >();
  private traces: { name: string; x: number; y: number; at: number }[] = [];

  constructor() {
    super('VoDangQuyenPreview');
  }

  preload(): void {
    this.load.on('loaderror', (file: Phaser.Loader.File) => {
      this.status.textContent = `Không nạp được hình ${file.key}`;
      console.error('Võ Đang Quyền preview texture failed', file.key, file.url);
    });
    this.load.image('ground', groundUrl);
    this.load.atlas('hero', heroUrl, heroAtlas);
    this.load.atlas('dummy', dummyUrl, dummyAtlas);
    this.load.atlas('legacy-huyen-am', legacyHuyenUrl, legacyHuyenAtlas);
    this.load.atlas('fist-wave', fistWaveUrl, fistWaveAtlas);
    this.load.atlas('punch', punchUrl, punchAtlas);
    this.load.atlas('cast', castUrl, castAtlas);
    this.load.atlas('quyen-fx', effectUrl, effectAtlas);
    this.load.image('formation-rim', rimUrl);
  }

  create(): void {
    for (const key of [
      'ground',
      'hero',
      'dummy',
      'punch',
      'quyen-fx',
      'legacy-huyen-am',
      'fist-wave',
      'cast',
      'formation-rim',
    ])
      this.textures.get(key).setFilter(Phaser.Textures.FilterMode.LINEAR);
    const ground = this.add.image(0, 0, 'ground').setOrigin(0).setDepth(-2);
    this.groundSize = { x: ground.width, y: ground.height };
    const x = Math.round(ground.width / 2);
    const y = Math.round(ground.height / 2);
    this.hero = this.add
      .image(x, y, 'hero', 'idle_right_0')
      .setOrigin(0.5, 0.875);
    this.dummy = this.add
      .sprite(x + 148, y, 'dummy', 'idle_left_0')
      .setOrigin(0.5, 0.875);
    this.shield = this.makeEffect('shield', x, y).setVisible(false);
    this.glyph = this.makeEffect('can', x, y).setVisible(false);
    this.buff = this.makeEffect('buff-can', x, y).setVisible(false);
    this.formation = this.makeEffect('formation', x, y)
      .setDepth(-1)
      .setVisible(false);
    this.rim = Array.from({ length: 3 }, () => {
      const light = this.add.image(x, y, 'formation-rim');
      return light
        .setScale(134 / light.width)
        .setDepth(-0.9)
        .setVisible(false);
    });
    for (const clip of fistWaveClips.animations)
      this.anims.create({
        key: clip.name,
        frames: clip.frames.map((frame) => ({ key: 'fist-wave', frame })),
        duration: m3dPresentation.sonicMs,
      });
    for (const facing of Object.keys(directions) as Facing[]) {
      const tag = legacyHuyenTag(facing);
      this.anims.create({
        key: tag,
        frames: Array.from({ length: 4 }, (_, index) => ({
          key: 'legacy-huyen-am',
          frame: `${tag}_${index}`,
        })),
        duration: waveMs,
      });
    }
    this.cameras.main.startFollow(this.hero, false, 0.15, 0.15);
    this.fitCamera();
    this.scale.on('resize', this.fitCamera, this);
    this.bindControls();
    this.status.textContent = 'Sân duyệt hình ảnh · Dùng phím A/Q/W/E/R/T';
    if (new URLSearchParams(location.search).has('debug')) {
      Object.defineProperty(window, '__VO_DANG_QUYEN_PREVIEW__', {
        configurable: true,
        value: { snapshot: () => this.snapshot() },
      });
    }
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.controls.abort();
      this.scale.off('resize', this.fitCamera, this);
      Reflect.deleteProperty(window, '__VO_DANG_QUYEN_PREVIEW__');
    });
  }

  private fitCamera(): void {
    this.cameras.main
      .setBounds(0, 0, this.groundSize.x, this.groundSize.y)
      .setZoom(Math.min(1, this.scale.width / 850, this.scale.height / 520));
  }

  private bindControls(): void {
    const { signal } = this.controls;
    window.addEventListener(
      'keydown',
      (event) => {
        const { code } = event;
        if (
          event.ctrlKey ||
          event.metaKey ||
          event.altKey ||
          (event.target instanceof HTMLSelectElement && arrows.has(code)) ||
          (!arrows.has(code) && !skills.has(code))
        )
          return;
        event.preventDefault();
        this.held.add(code);
        if (!event.repeat && skills.has(code)) this.use(code as SkillKey);
      },
      { signal },
    );
    window.addEventListener('keyup', (event) => this.held.delete(event.code), {
      signal,
    });
    window.addEventListener('blur', () => this.held.clear(), { signal });
    for (const button of document.querySelectorAll<HTMLButtonElement>(
      '[data-skill]',
    ))
      button.addEventListener(
        'click',
        () => this.use(button.dataset['skill'] as SkillKey),
        { signal },
      );
    document.querySelector('#quyen-doai')!.addEventListener(
      'click',
      () => {
        this.finishReading(2);
      },
      { signal },
    );
    const buffPicker =
      document.querySelector<HTMLSelectElement>('#quyen-buff')!;
    buffPicker.addEventListener(
      'change',
      () => {
        const index = readings.findIndex(([id]) => id === buffPicker.value);
        if (index >= 0) this.finishReading(index);
        buffPicker.value = '';
        buffPicker.blur();
      },
      { signal },
    );
  }

  override update(time: number, delta: number): void {
    const horizontal =
      Number(this.held.has('ArrowRight')) - Number(this.held.has('ArrowLeft'));
    const vertical =
      Number(this.held.has('ArrowDown')) - Number(this.held.has('ArrowUp'));
    const moving =
      time >= this.stunUntil &&
      this.body?.pose !== 'tai-chi' &&
      (horizontal !== 0 || vertical !== 0);
    if (moving) {
      const step =
        ((time < this.speedUntil ? 210 : 180) * Math.min(delta, 50)) /
        1000 /
        Math.hypot(horizontal, vertical);
      this.hero.x = Phaser.Math.Clamp(
        this.hero.x + step * horizontal,
        205,
        this.groundSize.x - 205,
      );
      this.hero.y = Phaser.Math.Clamp(
        this.hero.y + step * vertical,
        190,
        this.groundSize.y - 160,
      );
      this.facing = horizontal
        ? horizontal > 0
          ? 'right'
          : 'left'
        : vertical > 0
          ? 'down'
          : 'up';
    }
    this.updateBody(time, moving);
    if (this.rollStart !== undefined) {
      const age = time - this.rollStart;
      if (age >= rollMs) {
        this.finishReading(this.readingIndex, true);
      } else {
        this.readingIndex =
          (this.rollOffset + Math.floor(age / glyphMs)) % readings.length;
        this.glyph.setFrame(readings[this.readingIndex]![0]).setVisible(true);
      }
    } else if (time >= this.glyphUntil) {
      this.glyph.setVisible(false);
    }
    const { x, y } = this.hero;
    this.hero.setDepth(y);
    this.dummy.setDepth(this.dummy.y);
    this.shield.setPosition(x, y - heroHeight / 2).setDepth(y + 1);
    this.glyph.setPosition(x, y - heroHeight - 24).setDepth(y + 2);
    this.updateFortuneBuff(time);
    this.updateFormationRim(time);
  }

  private updateBody(time: number, moving: boolean): void {
    const elapsed = this.body ? time - this.body.start : 0;
    if (this.body) {
      const action = this.body;
      const cues: readonly number[] = bodyCues[action.pose];
      const index = cues.findIndex((cue) => elapsed < cue);
      const frame = index < 0 ? cues.length - 2 : Math.max(0, index - 1);
      const tag =
        action.pose === 'tai-chi'
          ? `taichi_${frame}`
          : action.pose === 'punch'
            ? `${action.facing}_${frame}`
            : `palm_${action.facing}_${action.pose === 'luong-nghi' && frame > 0 ? frame + 1 : frame}`;
      this.hero
        .setTexture(action.pose === 'punch' ? 'punch' : 'cast', tag)
        .setOrigin(0.5, 0.775)
        .setScale(1);
      while (action.frame < frame) this.onBodyFrame(action, ++action.frame);
      if (index >= 0) return;
      const punch = this.queuedPunch || this.held.has('KeyA');
      this.body = undefined;
      this.queuedPunch = false;
      if (punch && time >= this.stunUntil) {
        this.startBody('punch');
        return;
      }
    }
    const frame = moving
      ? `walk_${this.facing}_${Math.floor(time / 105) % 4}`
      : `idle_${this.facing}_0`;
    this.hero.setTexture('hero', frame).setOrigin(0.5, 0.875).setScale(1);
  }

  private startBody(pose: Body['pose']): void {
    this.body = { pose, start: this.time.now, facing: this.facing, frame: -1 };
    this.queuedPunch = false;
  }

  private onBodyFrame(action: Body, frame: number): void {
    const { pose, facing } = action;
    if (pose === 'punch' && (frame === 1 || frame === 2))
      this.fistWave(facing, frame);
    if (pose === 'luong-nghi' && frame === 1)
      this.wave(facing, 2, 'legacy-huyen-am');
    if (pose === 'huyen-am' && (frame === 1 || frame === 2)) {
      this.wave(facing, frame, 'sonic');
      if (frame === 2) this.time.delayedCall(waveMs, () => this.spawnInk());
    }
    if (pose === 'tai-chi' && frame === 5) this.openFormation();
  }

  private use(key: SkillKey): void {
    if (key === 'KeyE' && this.rollStart !== undefined) {
      this.finishReading(this.readingIndex);
      return;
    }
    if (this.time.now < this.stunUntil) return;
    if (
      this.body &&
      this.body.pose !== 'punch' &&
      (key === 'KeyQ' || key === 'KeyW' || key === 'KeyT')
    )
      return;
    switch (key) {
      case 'KeyA':
        if (this.body) {
          this.queuedPunch = true;
        } else {
          this.startBody('punch');
          this.status.textContent = 'Đánh thường · Đấm trái, đấm phải';
        }
        break;
      case 'KeyQ':
        this.startBody('luong-nghi');
        this.prepareDummy(this.facing);
        this.status.textContent = 'Lưỡng Nghi Thủ · Làm chậm, giảm sát thương';
        break;
      case 'KeyW':
        if (this.wet) return;
        this.wet = true;
        this.startBody('huyen-am');
        this.prepareDummy(this.facing);
        this.status.textContent = 'Huyền Âm Chưởng · Hai đợt sóng đẩy lùi';
        break;
      case 'KeyE':
        this.rollStart = this.time.now;
        this.rollOffset = Phaser.Math.Between(0, readings.length - 1);
        this.readingIndex = this.rollOffset;
        this.glyph.setFrame(readings[this.readingIndex]![0]).setVisible(true);
        this.status.textContent =
          'Bói Toán Thiên Cơ · Bấm E để chốt quẻ trong 5 giây';
        break;
      case 'KeyR':
        this.shield.setVisible(!this.shield.visible).setAlpha(0.87);
        document
          .querySelector('[data-skill="KeyR"]')!
          .setAttribute('aria-pressed', String(this.shield.visible));
        this.status.textContent = this.shield.visible
          ? 'Thái Cực Thần Công · Bật cầu nội lực'
          : 'Thái Cực Thần Công · Tắt';
        break;
      case 'KeyT':
        this.startBody('tai-chi');
        this.status.textContent = 'Thái Cực Trận · Vận quyền';
        break;
    }
  }

  private prepareDummy(facing: Facing): void {
    const dir = directions[facing];
    const [first, second] = sockets.palm[facing];
    const across = dir.y ? (first!.x + second!.x) / 2 : 0;
    const opposite: Record<Facing, Facing> = {
      down: 'up',
      up: 'down',
      right: 'left',
      left: 'right',
    };
    this.tweens.killTweensOf(this.dummy);
    this.dummy
      .clearTint()
      .setFrame(`idle_${opposite[facing]}_0`)
      .setPosition(
        this.hero.x + dir.x * 148 + across,
        this.hero.y + dir.y * 148,
      );
  }

  private fistWave(facing: Facing, frame: 1 | 2): void {
    const dir = directions[facing];
    const offset = sockets.punch[facing][frame - 1]!;
    const { x, y } = this.hero;
    const hand = { x: x + offset.x, y: y + offset.y };
    const prefix = frame === 1 ? 'left_fist_wave' : 'right_fist_wave';
    const tag = `${prefix}_${facing}`;
    const wave = this.add
      .sprite(hand.x, hand.y, 'fist-wave', tag + '_0')
      .setScale(1.5)
      .setDepth(y + (facing === 'up' ? -1 : 1))
      .play(tag);
    this.track(wave, 'fist-wave', hand);
    const travel = m3dPresentation.sonicTravel * 2;
    this.tweens.add({
      targets: wave,
      x: hand.x + dir.x * travel,
      y: hand.y + dir.y * travel * 0.65,
      duration: m3dPresentation.sonicMs,
      onComplete: () => this.destroyEffect(wave),
    });
  }

  private wave(
    facing: Facing,
    frame: 1 | 2,
    kind: 'legacy-huyen-am' | 'sonic',
  ): void {
    const dir = directions[facing];
    const offset = sockets.palm[facing][frame - 1]!;
    const { x, y } = this.hero;
    const hand = { x: x + offset.x, y: y + offset.y };
    const tag = legacyHuyenTag(facing);
    const wave =
      kind === 'legacy-huyen-am'
        ? this.add
            .sprite(hand.x, hand.y, kind, tag + '_0')
            .setOrigin(...dir.huyenOrigin)
            .setScale(0.88)
            .play(tag)
        : this.makeEffect(kind, hand.x, hand.y).setRotation(dir.angle);
    this.track(wave, kind, hand);
    wave.setDepth(y + (facing === 'up' ? -1 : 1));
    let contacted = false;
    this.tweens.add({
      targets: wave,
      x: hand.x + dir.x * 242,
      y: hand.y + dir.y * 242,
      duration: waveMs,
      onUpdate: () => {
        const tip = kind === 'sonic' ? 35 : 22;
        if (
          !contacted &&
          Phaser.Math.Distance.Between(
            wave.x + dir.x * tip,
            wave.y + dir.y * tip,
            this.dummy.x,
            this.dummy.y + offset.y,
          ) < 45
        ) {
          contacted = true;
          this.reactDummy(dir, kind === 'sonic');
        }
      },
      onComplete: () => this.destroyEffect(wave),
    });
  }

  private reactDummy(dir: Point, knockback: boolean): void {
    this.dummy.setTint(knockback ? 0xe0d8fb : 0xa8d5f2);
    if (knockback) {
      this.tweens.killTweensOf(this.dummy);
      this.tweens.add({
        targets: this.dummy,
        x: this.dummy.x + dir.x * 33,
        y: this.dummy.y + dir.y * 33,
        duration: 130,
        ease: 'Quad.easeOut',
      });
    }
    this.time.delayedCall(knockback ? 180 : 900, () => this.dummy.clearTint());
  }

  private spawnInk(): void {
    const { x, y } = this.hero;
    const turn = Math.random() * Math.PI * 2;
    const seals = Array.from({ length: 5 }, (_, index) => {
      const angle =
        turn + index * Math.PI * 0.4 + Phaser.Math.FloatBetween(-0.13, 0.13);
      const radius = Phaser.Math.Between(126, 199);
      const at = {
        x: x + Math.cos(angle) * radius,
        y: y + Math.sin(angle) * radius * 0.73,
      };
      const seal = this.makeEffect('seal', at.x, at.y).setDepth(-0.5);
      this.track(seal, 'seal', at);
      this.tweens.add({
        targets: seal,
        alpha: { from: 0.42, to: 1 },
        duration: 245,
        yoyo: true,
        repeat: 1,
      });
      return seal;
    });
    this.status.textContent = 'Huyền Âm Chưởng · Năm ấn mực nổ sau 1 giây';
    this.time.delayedCall(inkDelay, () => {
      for (const seal of seals) {
        const { x, y } = seal;
        this.destroyEffect(seal);
        this.pulse('ink', x, y, 560, 0.38);
      }
      this.status.textContent = 'Huyền Âm Chưởng · Mực phun tại vị trí ấn';
      this.time.delayedCall(560, () => {
        this.wet = false;
      });
    });
  }

  private finishReading(index: number, automatic = false): void {
    this.rollStart = undefined;
    const [frame, description] = readings[index]!;
    this.glyph.setFrame(frame).setVisible(true);
    this.glyphUntil = this.time.now + 1300;
    this.status.textContent = (automatic ? 'Tự chốt · ' : '') + description;
    this.activeBuff = Object.hasOwn(fortuneBuffs, frame)
      ? { id: frame as FortuneBuff, start: this.time.now }
      : undefined;
    this.updateFortuneBuff(this.time.now);
    if (frame === 'doai')
      this.pulse('doai-ring', this.hero.x, this.hero.y, 510, 0.12);
    if (frame === 'chan') this.stunUntil = this.time.now + 2000;
    if (frame === 'kham') this.speedUntil = this.time.now + 2200;
  }

  private updateFortuneBuff(time: number): void {
    const active = this.activeBuff;
    if (!active) {
      this.buff.setVisible(false);
      return;
    }
    const cue = fortuneBuffs[active.id];
    const progress = Phaser.Math.Clamp(
      (time - active.start) / cue.duration,
      0,
      1,
    );
    if (progress === 1) {
      this.activeBuff = undefined;
      this.buff.setVisible(false);
      return;
    }
    const frame = `buff-${active.id}` as const;
    const { origin, width } = art[frame];
    const { x, y } = this.hero;
    const dir = directions[this.facing];
    const trailing = active.id === 'kham' ? 8 : 0;
    this.buff
      .setFrame(frame)
      .setOrigin(origin[0]!, origin[1]!)
      .setPosition(
        x - dir.x * trailing,
        y + cue.y - cue.lift * progress - dir.y * trailing,
      )
      .setDepth(y + 1.4)
      .setScale(
        (width / this.buff.width) *
          Phaser.Math.Linear(cue.start, cue.end, progress),
      )
      .setAlpha(0.88 * Math.min(1, progress * 11, (1 - progress) * 3))
      .setVisible(true);
  }

  private openFormation(): void {
    const { x, y } = this.hero;
    this.tweens.killTweensOf(this.formation);
    this.formation.setPosition(x, y).setVisible(true).setAlpha(0);
    this.formationAt = this.time.now;
    this.mark('formation', { x, y });
    this.tweens.add({ targets: this.formation, alpha: 0.96, duration: 240 });
    this.tweens.add({
      targets: this.formation,
      alpha: 0,
      delay: 5100,
      duration: 430,
      onComplete: () => {
        this.formation.setVisible(false);
      },
    });
    this.status.textContent = 'Thái Cực Trận · Khí lưu chuyển quanh trận đồ';
  }

  private updateFormationRim(time: number): void {
    const { x, y, displayWidth, displayHeight, alpha, visible } =
      this.formation;
    const rx = displayWidth * 0.457;
    const ry = displayHeight * 0.431;
    const progress = (time - this.formationAt) / 2500;
    for (const [index, light] of this.rim.entries()) {
      light.setVisible(visible);
      if (!visible) continue;
      const angle = (progress + index / this.rim.length) * Math.PI * 2;
      const sin = Math.sin(angle);
      const cos = Math.cos(angle);
      light
        .setPosition(x + rx * cos, y + ry * sin)
        .setRotation(Math.atan2(ry * cos, -rx * sin))
        .setAlpha(alpha * (0.64 + sin * 0.12));
    }
  }

  private makeEffect(
    frame: keyof typeof art,
    x: number,
    y: number,
  ): Phaser.GameObjects.Image {
    const { origin, width } = art[frame];
    const effect = this.add.image(x, y, 'quyen-fx', frame);
    return effect
      .setOrigin(origin[0]!, origin[1]!)
      .setScale(width / effect.width);
  }

  private pulse(
    frame: 'ink' | 'doai-ring',
    x: number,
    y: number,
    duration: number,
    start: number,
  ): void {
    const effect = this.makeEffect(frame, x, y).setDepth(
      frame === 'ink' ? y : -0.4,
    );
    const scale = effect.scaleX;
    effect.setScale(scale * start);
    this.track(effect, frame, { x, y });
    this.tweens.add({
      targets: effect,
      scale: { from: scale * start, to: scale },
      duration: Math.round(duration * 0.36),
      ease: 'Cubic.easeOut',
    });
    this.tweens.add({
      targets: effect,
      alpha: 0,
      delay: Math.round(duration * 0.36),
      duration: Math.round(duration * 0.64),
      onComplete: () => this.destroyEffect(effect),
    });
  }

  private mark(name: string, { x, y }: Point): void {
    if (this.traces.length >= 32) this.traces.shift();
    this.traces.push({ name, x, y, at: this.time.now });
  }

  private track(
    effect: Phaser.GameObjects.Image | Phaser.GameObjects.Sprite,
    name: string,
    point: Point,
  ): void {
    this.active.add(effect.setName(name));
    this.mark(name, point);
  }

  private destroyEffect(
    effect: Phaser.GameObjects.Image | Phaser.GameObjects.Sprite,
  ): void {
    this.active.delete(effect);
    this.tweens.killTweensOf(effect);
    effect.destroy();
  }

  private snapshot() {
    const sprite = (
      image: Phaser.GameObjects.Image | Phaser.GameObjects.Sprite,
    ) => ({
      x: image.x,
      y: image.y,
      scaleX: image.scaleX,
      scaleY: image.scaleY,
      visible: image.visible,
      frame: image.frame.name,
      key: image.texture.key,
    });
    return {
      hero: sprite(this.hero),
      dummy: sprite(this.dummy),
      glyph: sprite(this.glyph),
      buff: sprite(this.buff),
      shield: sprite(this.shield),
      formation: sprite(this.formation),
      rim: this.rim.map(sprite),
      traces: this.traces.slice(),
      active: [...this.active].map(sprite),
      rolling: this.rollStart !== undefined,
      status: this.status.textContent,
    };
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'quyen-game',
  backgroundColor: '#283925',
  scene: [VoDangQuyenPreview],
  scale: { mode: Phaser.Scale.RESIZE, width: '100%', height: '100%' },
  render: { antialias: true, antialiasGL: true, pixelArt: false },
  input: { keyboard: false, mouse: false, touch: false },
  audio: { noAudio: true },
});
