import Phaser from 'phaser';
import {
  directions,
  skills,
  type Branch,
  type Point,
  type Skill,
  type TargetMode,
} from './ngu-doc-preview-data';
import { at, NguDocStage } from './ngu-doc-preview-stage';
import './ngu-doc-preview.css';

const cue = document.querySelector<HTMLOutputElement>('#cue')!;
const slots = document.querySelector<HTMLElement>('#slots')!;
const controls = [
  ...document.querySelectorAll<HTMLButtonElement>('[data-branch]'),
];
const rank = document.querySelector<HTMLSelectElement>('#rank')!;
const rankOption = document.querySelector<HTMLElement>('#rank-option')!;
const targetSelect = document.querySelector<HTMLSelectElement>('#target')!;
const reset = document.querySelector<HTMLButtonElement>('#reset')!;
const help = 'Mũi tên để đi · Bấm nút hoặc phím tương ứng để diễn chiêu';
type Sprite = Phaser.GameObjects.Sprite;

class NguDocPreview extends NguDocStage {
  private handFlames: Sprite[] = [];
  private venomRing: Sprite | undefined;
  private armor: Sprite | undefined;

  override create(): void {
    super.create();
    for (const button of controls) {
      button.addEventListener('click', () => {
        const branch = button.dataset['branch'] as Branch;
        if (this.branch === branch) return;
        this.branch = branch;
        this.resetPreview();
      });
    }
    reset.addEventListener('click', () => this.resetPreview());
    targetSelect.addEventListener('change', () => {
      this.setTargets(targetSelect.value as TargetMode);
      targetSelect.blur();
    });
    rank.addEventListener('change', () => rank.blur());
    const keyDown = (event: KeyboardEvent) => {
      if (!this.shouldCastFromKeydown(event)) return;
      const skill = event.code.slice(3) as Skill;
      if (
        event.code.startsWith('Key') &&
        Object.hasOwn(skills[this.branch], skill)
      ) {
        event.preventDefault();
        this.cast(skill);
      }
    };
    const keyUp = (event: KeyboardEvent) => this.keys.delete(event.code);
    window.addEventListener('keydown', keyDown);
    window.addEventListener('keyup', keyUp);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener('keydown', keyDown);
      window.removeEventListener('keyup', keyUp);
    });
    this.resetPreview();
    Object.assign(window, {
      __nguDocPreview: {
        read: () => ({
          ...this.stats(),
          q: this.handFlames.length > 0,
          e: Boolean(this.venomRing),
        }),
      },
    });
  }

  private resetPreview(): void {
    this.clearStage();
    this.handFlames = [];
    this.venomRing = undefined;
    this.armor = undefined;
    this.keys.clear();
    this.setTargets(targetSelect.value as TargetMode);
    for (const button of controls)
      button.setAttribute(
        'aria-pressed',
        String(button.dataset['branch'] === this.branch),
      );
    rankOption.hidden = this.branch !== 'am-linh';
    this.renderSlots();
    cue.value = help;
  }

  private renderSlots(): void {
    slots.replaceChildren();
    for (const [key, name] of Object.entries(skills[this.branch])) {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset['skill'] = key;
      const hotkey = document.createElement('kbd');
      hotkey.textContent = key;
      const label = document.createElement('span');
      label.textContent = name;
      button.append(hotkey, label);
      if (this.branch === 'bich-co' && (key === 'Q' || key === 'E')) {
        button.setAttribute(
          'aria-pressed',
          String(
            key === 'Q' ? this.handFlames.length > 0 : Boolean(this.venomRing),
          ),
        );
      }
      button.onclick = () => this.cast(key as Skill);
      slots.append(button);
    }
  }

  private cast(skill: Skill): void {
    this.track(this.branch + ':' + skill);
    cue.value = skills[this.branch][skill];
    if (skill === 'P') {
      const from = at(this.actor, 0, -38);
      this.fx('impact', from, { duration: 280, scale: 0.44 });
      this.shot('soul', from, at(from, 0, -60), 700);
      cue.value += ' · Tăng máu tối đa, hồi máu và hồi mana';
    } else if (this.branch === 'bich-co') this.taiHiep(skill);
    else this.coSu(skill);
  }

  private muzzle(staff = false): Point {
    const direction = directions[this.facing];
    if (staff) {
      const x = direction.x
        ? direction.x * 38
        : this.facing === 'up'
          ? -32
          : 33;
      return at(this.actor, x, this.facing === 'up' ? -88 : -78);
    }
    return at(
      this.actor,
      direction.x * 29 + (direction.x ? 0 : 12),
      -40 + direction.y * 13,
    );
  }

  private poison(point: Point, slow: boolean, ticks = 3): void {
    if (slow)
      this.fx('ankles', point, { duration: ticks * 470 + 310, under: true });
    for (let tick = 0; tick < ticks; tick++) {
      this.later(tick * 470, () =>
        this.fx('motes', at(point, 0, -25), { duration: 420 }),
      );
    }
  }

  private taiHiep(skill: Exclude<Skill, 'P'>): void {
    if (skill === 'Q') {
      if (this.handFlames.length) {
        for (const flame of this.handFlames) this.release(flame);
        this.handFlames = [];
      } else {
        this.handFlames = [
          this.fx('flame_low', this.actor, { clip: 'flame' }),
          this.fx('flame_high', this.actor, { clip: 'flame' }),
        ];
      }
      this.toggleLabel('Q', this.handFlames.length > 0);
      return;
    }
    if (skill === 'E') {
      if (this.venomRing) {
        this.release(this.venomRing);
        this.venomRing = undefined;
      } else {
        this.venomRing = this.fx('ring_one', this.actor, {
          clip: 'ring',
          under: true,
        });
      }
      this.toggleLabel('E', Boolean(this.venomRing));
      return;
    }
    if (skill === 'R') {
      this.demoCounter();
      return;
    }

    const target = this.target(skill === 'W', skill === 'W' ? 300 : 375);
    const point = target ?? this.front(skill === 'A' ? 260 : 130);
    this.face(point);
    this.castPose();
    if (skill === 'A') {
      const toxic = this.handFlames.length > 0;
      this.later(70, () => {
        this.shot(
          toxic ? 'toxic_palm' : 'palm',
          this.muzzle(),
          at(point, 0, -42),
          380,
          () => {
            if (!target) return;
            this.fx('impact', at(point, 0, -42), {
              duration: 200,
              scale: 0.72,
            });
            if (toxic) this.poison(point, true);
          },
        );
      });
    } else if (skill === 'W') {
      this.later(135, () => {
        this.fx('pool_seed', at(point, 0, -19), {
          clip: 'pool',
          under: true,
          duration: 3100,
        });
        this.track('W:' + (target?.type ?? 'front'));
        if (target) this.poison(point, false, 6);
      });
    } else {
      const offsets = [
        [-82, -33],
        [59, -46],
        [-42, 25],
        [78, 26],
        [13, 12],
      ] as const;
      this.later(170, () => {
        offsets.forEach(([x, y], i) =>
          this.later(i * 62, () => {
            const stem = at(point, x, y);
            this.fx('hand_seed', at(stem, 0, -31), {
              clip: 'grasp',
              duration: 790,
            }).setDepth(stem.y);
          }),
        );
        if (target) this.later(440, () => this.poison(point, false, 5));
      });
    }
  }

  private toggleLabel(skill: 'Q' | 'E', on: boolean): void {
    slots
      .querySelector('[data-skill="' + skill + '"]')!
      .setAttribute('aria-pressed', String(on));
    cue.value += on ? ' · Bật' : ' · Tắt';
  }

  private demoCounter(): void {
    if (this.armor) this.release(this.armor);
    this.armor = this.fx('armor', at(this.actor, 0, -37)).setAlpha(0.43);
    this.armor.setDepth(this.actor.y + 1);
    const target = this.target(true);
    const point = target ?? this.front(125);
    const chest = at(this.actor, 0, -39);
    this.face(point);
    cue.value += ' · Diễn khi nhận đòn';
    if (target) {
      this.shot('impact', at(target, 0, -44), chest, 220).setScale(0.48);
    }
    this.later(220, () => {
      if (!this.armor) return;
      this.fx('impact', chest, { duration: 250, scale: 0.84 });
      this.armor.setAlpha(0.9);
      this.tweens.add({ targets: this.armor, alpha: 0.43, duration: 720 });
      this.shot('toxic_palm', chest, at(point, 0, -37), 260, () => {
        if (target) this.poison(point, true);
      }).setScale(0.62);
    });
  }

  private coSu(skill: Exclude<Skill, 'P'>): void {
    const target = this.target(skill !== 'A' && skill !== 'R');
    const destination = target ?? this.front(240);
    this.face(destination);
    this.castPose(skill === 'T');
    switch (skill) {
      case 'A':
      case 'R':
        this.later(70, () =>
          this.shot(
            'staff_bolt',
            this.muzzle(true),
            at(destination, 0, -48),
            340,
            () => {
              if (target)
                this.fx('impact', at(destination, 0, -48), {
                  duration: 210,
                  scale: 0.61,
                });
            },
          ),
        );
        if (skill === 'R') {
          cue.value += ' · Diễn một lần đánh thường gọi zombie';
          const origin = at(this.actor, -38, 15);
          this.later(170, () => {
            this.fx('zombie_haze', at(origin, 0, -22), { duration: 640 });
            const actor = this.minion(
              'zombie',
              origin,
              at(destination, -74, 29),
              5500,
            );
            this.minionHits(actor, 'zombie');
            this.track('R:zombie');
          });
        }
        break;
      case 'Q': {
        const from = this.muzzle(true);
        const angle = Phaser.Math.Angle.BetweenPoints(
          from,
          at(destination, 0, -39),
        );
        const distance = Math.max(
          130,
          Phaser.Math.Distance.BetweenPoints(from, destination),
        );
        for (const [i, offset] of [-0.23, -0.08, 0.08, 0.23].entries()) {
          const end = at(
            from,
            Math.cos(angle + offset) * distance,
            Math.sin(angle + offset) * distance,
          );
          this.later(75 + i * 25, () =>
            this.shot('grub', from, end, 420, () => {
              this.fx('burst_seed', end, {
                clip: 'burst',
                duration: 500,
                scale: 0.63,
              });
            }),
          );
        }
        break;
      }
      case 'W':
        this.demoJiangshi(destination);
        break;
      case 'E':
        if (!target) {
          cue.value += ' · Chọn mục tiêu trong tầm để xem trùng bám';
          break;
        }
        this.later(80, () =>
          this.shot(
            'blood_grub',
            this.muzzle(true),
            at(destination, 0, -42),
            380,
            () => {
              const crest = at(destination, 0, -42);
              this.fx('blood_grub', crest, { duration: 3000 });
              this.count(destination);
              this.track('E:attached');
              this.later(3000, () => {
                this.track('E:burst');
                this.fx('burst_seed', crest, { clip: 'burst', duration: 550 });
                this.fx('stun', at(destination, 0, -99), { duration: 750 });
                this.shot('soul', crest, at(this.actor, 0, -48), 430, () =>
                  this.fx('impact', at(this.actor, 0, -44), {
                    duration: 250,
                    scale: 0.6,
                  }),
                );
              });
            },
          ),
        );
        break;
      case 'T':
        this.demoReaper(destination);
        break;
    }
  }

  private demoJiangshi(destination: Point): void {
    const count = Number(rank.value);
    const heading = Math.sign(destination.x - this.actor.x) || 1;
    const base = at(this.actor, 49 * heading, 25);
    this.track('W:jiangshi-' + count);
    for (let i = 0; i < count; i++) {
      const origin = at(
        base,
        (i % 2) * 41 * heading,
        (Math.floor(i / 2) - 0.5) * 46,
      );
      this.later(150 + i * 67, () => {
        this.fx('charm_seal', at(origin, 0, -22), { duration: 570 });
        this.fx('summon_plume', at(origin, 0, -24), {
          duration: 740,
          scale: 0.65,
        });
        const end = at(
          destination,
          heading * (-53 - 23 * (i % 2)),
          (i - (count - 1) / 2) * 34,
        );
        const actor = this.minion('jiangshi', origin, end, 5650);
        this.minionHits(actor, 'jiangshi');
      });
    }
  }

  private demoReaper(destination: Point): void {
    const seal = at(this.actor, -9, 27);
    const heading = Math.sign(destination.x - seal.x) || 1;
    const end = at(destination, -heading * 92, 19);
    this.fx('ritual_seal', seal, { under: true, duration: 1350 });
    this.later(330, () => {
      this.fx('summon_plume', at(seal, 0, -43), { duration: 800, scale: 1.45 });
      const reaper = this.minion('reaper', seal, end, 6500);
      this.track('T:reaper');
      const sweep = () => {
        this.track('T:scythe');
        reaper.play('reaper-hit');
        this.later(170, () => {
          this.fx('scythe_arc', at(end, 57 * heading, -44), {
            duration: 350,
          }).setFlipX(heading < 0);
          this.fx('ankles', destination, { duration: 810, under: true });
        });
      };
      this.later(720, sweep);
      this.later(1750, () => {
        this.track('T:wave');
        reaper.play('reaper-hit');
        this.later(170, () =>
          this.shot(
            'poison_wave',
            at(end, 32 * heading, -31),
            at(destination, 121 * heading, -31),
            620,
          ),
        );
      });
      this.later(2850, () => {
        this.track('T:slam');
        reaper.play('reaper-slam');
        this.later(310, () => {
          this.track('T:slam-impact');
          this.fx('slam_burst', at(destination, 0, -25), { duration: 480 });
          this.fx('stun', at(destination, 0, -91), { duration: 780 });
          this.later(350, () =>
            this.fx('slam_fade', at(destination, 0, -15), {
              under: true,
              duration: 580,
            }),
          );
        });
      });
      this.later(4290, sweep);
    });
  }

  protected override onMovement(): void {
    const direction = directions[this.facing];
    const horizontal = direction.x !== 0;
    for (const [index, flame] of this.handFlames.entries()) {
      const side = index === 0 ? -1 : 1;
      flame.setPosition(
        this.actor.x + side * (horizontal ? 17 : 25) + direction.x * 3,
        this.actor.y - 44 + (horizontal ? side * 6 * direction.x : 0),
      );
    }
    this.venomRing?.setPosition(this.actor.x, this.actor.y);
    if (this.venomRing) {
      const touching = this.target(false, 96);
      if (
        touching &&
        this.time.now >= Number(this.venomRing.getData('tick') ?? 0)
      ) {
        this.venomRing.setData('tick', this.time.now + 620);
        this.poison(touching, true, 1);
      }
    }
    this.armor
      ?.setPosition(this.actor.x, this.actor.y - 39)
      .setDepth(this.actor.y + 1);
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'arena',
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: '#17231a',
  scene: NguDocPreview,
  render: { roundPixels: true, antialias: true },
  scale: { mode: Phaser.Scale.RESIZE },
});
