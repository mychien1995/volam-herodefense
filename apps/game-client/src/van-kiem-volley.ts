import Phaser from 'phaser';
import { m1Config } from '@volam/game-data';

const effect = m1Config.skillCatalogue!['van_kiem_quy_tong']!.effect;
if (effect.mode !== 'area' || !effect.skyfall)
  throw Error('Vạn Kiếm Quy Tông requires a skyfall definition');
export const vanKiemSky = effect.skyfall;
const tickMs = 1000 / m1Config.tickRate;
const firstLaunch = 120;
const riseDuration = 520;
const burstDuration = 235;
const bladeWidthScale = 1.1;
const bladeLengthScale = 1.2;
const burstScale = Math.sqrt(1.1);
const quietAt = vanKiemSky.riseTicks * tickMs;
const fallAt = (vanKiemSky.riseTicks + vanKiemSky.quietTicks) * tickMs;
const fallDuration = vanKiemSky.firstFallTicks * tickMs;
const lastContact =
  (vanKiemSky.riseTicks + vanKiemSky.quietTicks + vanKiemSky.fallTicks) *
  tickMs;
const launchGap =
  (quietAt - firstLaunch - riseDuration) / (vanKiemSky.blades - 1);
const dropGap = (lastContact - fallAt - fallDuration) / (vanKiemSky.blades - 1);
const goldenAngle = Math.PI * (3 - Math.sqrt(5));
export const vanKiemTiming = {
  firstLaunch,
  quietAt,
  fallAt,
  completeAt: lastContact + burstDuration,
  blades: vanKiemSky.blades,
  baseRadius: effect.radius,
};

type Image = Phaser.GameObjects.Image;
type Point = { x: number; y: number };
type Launch = Point & { fx: number; fy: number };
type BladeCue = {
  id: number;
  launch: number;
  dropStart: number;
  impact: number;
  x: number;
  y: number;
  spread: number;
  scale: number;
  sword?: Image;
  trail?: Image;
  burst?: Image;
};

/** Both the standalone preview and live area use this same visual choreography. */
export class VanKiemVolley {
  private readonly marker: Image;
  private readonly cues: BladeCue[];
  private readonly back: Point;
  private readonly launchDepth: number;
  private landingSoundPlayed = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly texture: string,
    private readonly id: string,
    launch: Launch,
    landing: Point & { radius: number },
    private readonly density: number,
    private readonly onLandingSound?: () => void,
  ) {
    this.back = {
      x: launch.x - launch.fx * 24 * density,
      y: launch.y - (launch.fy * 24 + 57) * density,
    };
    this.launchDepth = launch.y - 1;
    const footprint = landing.radius / vanKiemTiming.baseRadius;
    this.marker = this.image('marker', 'marker')
      .setPosition(landing.x, landing.y)
      .setDepth(-0.3);
    this.marker.setScale((312 * density * footprint) / this.marker.width);
    this.cues = Array.from({ length: vanKiemTiming.blades }, (_, index) => {
      const order = (index * 13) % vanKiemTiming.blades;
      const distance = Math.sqrt(order / vanKiemTiming.blades);
      const angle = order * goldenAngle;
      const dropStart = fallAt + index * dropGap;
      return {
        id: index,
        launch: firstLaunch + index * launchGap,
        dropStart,
        impact: dropStart + fallDuration,
        x: landing.x + Math.cos(angle) * distance * 145 * density * footprint,
        y: landing.y + Math.sin(angle) * distance * 67 * density * footprint,
        spread: (((index * 29) % 47) - 23) * 4.8,
        scale: density * (0.39 + (index % 4) * 0.022),
      };
    });
  }

  draw(t: number): number {
    const firstImpact = fallAt + fallDuration;
    if (!this.landingSoundPlayed && t >= firstImpact - 100) {
      this.landingSoundPlayed = true;
      if (t < firstImpact) this.onLandingSound?.();
    }
    const phase = t < quietAt ? 'rise' : t < fallAt ? 'quiet' : 'fall';
    let landed = 0;
    for (const cue of this.cues) {
      const rise = (t - cue.launch) / riseDuration;
      const drop = (t - cue.dropStart) / fallDuration;
      if (rise >= 0 && rise < 1) {
        const x = this.back.x + cue.spread * rise ** 1.32 * this.density;
        const y =
          this.back.y - (418 + (cue.id % 3) * 18) * rise ** 1.09 * this.density;
        const alpha = Math.min(1, rise * 18, (1 - rise) * 8);
        this.blade(
          cue,
          x,
          y,
          (cue.spread / 410) * rise,
          alpha,
          this.launchDepth,
          13,
          'rise',
        );
      } else if (drop >= 0 && drop < 1) {
        const y = cue.y - 500 * this.density * (1 - drop ** 1.58);
        this.blade(
          cue,
          cue.x,
          y,
          Math.PI,
          Math.min(1, drop * 8),
          cue.y + 0.2,
          -18,
          'fall',
        );
      } else {
        cue.sword?.setVisible(false);
        cue.trail?.setVisible(false);
      }
      const impact = (t - cue.impact) / burstDuration;
      if (impact >= 0) landed++;
      if (impact >= 0 && impact < 1) {
        const burst = (cue.burst ??= this.image('impact', `impact:${cue.id}`)
          .setPosition(cue.x, cue.y)
          .setOrigin(0.5, 0.82)
          .setDepth(cue.y - 0.2)
          .setData('vdk-phase', 'impact'));
        const size = (41 + (cue.id % 3) * 4) * this.density;
        burst
          .setVisible(true)
          .setScale(
            (size / burst.width) *
              burstScale *
              (0.68 + 0.42 * (1 - (1 - impact) ** 3)),
          )
          .setAlpha(Math.min(1, ((1 - impact) / 0.85) ** 1.3));
      } else cue.burst?.setVisible(false);
    }
    this.marker
      .setVisible(t < lastContact)
      .setAlpha(
        (0.53 + 0.17 * Math.sin(t / 105) ** 2) *
          (1 - landed / (vanKiemTiming.blades * 1.25)),
      )
      .setData('vdk-phase', phase);
    return landed;
  }

  private blade(
    cue: BladeCue,
    x: number,
    y: number,
    angle: number,
    alpha: number,
    depth: number,
    tail: number,
    phase: 'rise' | 'fall',
  ): void {
    const sword = (cue.sword ??= this.image('blade', `sword:${cue.id}`)
      .setOrigin(0.5, 0.02)
      .setScale(cue.scale * bladeWidthScale, cue.scale * bladeLengthScale));
    const trail = (cue.trail ??= this.image('blade', `trail:${cue.id}`)
      .setOrigin(0.5, 0.02)
      .setScale(cue.scale * bladeWidthScale, cue.scale * bladeLengthScale)
      .setTint(0xa4c3ff));
    sword
      .setVisible(true)
      .setPosition(x, y)
      .setRotation(angle)
      .setAlpha(alpha)
      .setDepth(depth)
      .setData('vdk-phase', phase);
    trail
      .setVisible(true)
      .setPosition(x, y + tail * this.density)
      .setRotation(angle)
      .setAlpha(alpha * 0.22)
      .setDepth(depth - 0.1)
      .setData('vdk-phase', phase);
  }

  private image(frame: string, name: string): Image {
    return this.scene.add
      .image(0, 0, this.texture, frame)
      .setName(`vdk:${name}:${this.id}`);
  }

  snapshot() {
    return {
      marker: {
        x: this.marker.x,
        y: this.marker.y,
        visible: this.marker.visible,
      },
      swords: this.cues.map(({ sword, trail: _trail, burst, ...cue }) => ({
        ...cue,
        visible: !!sword?.visible && sword.alpha > 0,
        swordX: sword?.x,
        swordY: sword?.y,
        rotation: sword?.rotation,
        bursting: !!burst?.visible,
        burstX: burst?.x,
        burstY: burst?.y,
      })),
    };
  }

  destroy(): void {
    this.marker.destroy();
    for (const cue of this.cues) {
      cue.sword?.destroy();
      cue.trail?.destroy();
      cue.burst?.destroy();
    }
  }
}
