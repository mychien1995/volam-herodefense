import Phaser from 'phaser';
import { m1Config } from '@volam/game-data';
import type { PvpHazard, PvpMapDefinition } from '@volam/game-core';

/** Native raster sweep; a cropped copy of the floor marks the authoritative half-plane. */
export class PvpSwordArt {
  private readonly floor: Phaser.GameObjects.Image;
  private readonly region: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  private readonly reach: number;
  private readonly duration: number;
  private current: PvpHazard;
  private clockAt: number | undefined;
  private elapsed = 0;
  constructor(
    scene: Phaser.Scene,
    private readonly map: PvpMapDefinition,
    h: PvpHazard,
    private readonly blade: Phaser.GameObjects.Image,
  ) {
    this.current = h;
    this.duration = ((h.until - h.armedAt) * 1000) / m1Config.tickRate;
    this.region =
      Math.abs(h.nx) > 0.5
        ? {
            x: h.nx > 0 ? h.x : 0,
            y: 0,
            width: h.nx > 0 ? map.width - h.x : h.x,
            height: map.height,
          }
        : {
            x: 0,
            y: h.ny > 0 ? h.y : 0,
            width: map.width,
            height: h.ny > 0 ? map.height - h.y : h.y,
          };
    this.reach =
      (Math.abs(h.nx) * map.width) / 2 + (Math.abs(h.ny) * map.height) / 2;
    this.floor = scene.add
      .image(0, 0, 'standalone-pvp:kiem_ho-terrain.png')
      .setOrigin(0)
      .setDisplaySize(map.width, map.height)
      .setDepth(-100)
      .setName('pvp-sword-half:' + h.id)
      .setTintMode(Phaser.TintModes.FILL);
    const sx = this.floor.frame.width / map.width,
      sy = this.floor.frame.height / map.height;
    this.floor.setCrop(
      this.region.x * sx,
      this.region.y * sy,
      this.region.width * sx,
      this.region.height * sy,
    );
  }
  sync(h: PvpHazard, tick: number, now: number): void {
    this.current = h;
    if (tick >= h.armedAt && this.clockAt === undefined) this.clockAt = now;
    this.render(now);
  }
  /** Retain a received one-shot across late patches. Never skip an authored cel on a slow render. */
  retain(now: number): boolean {
    if (this.clockAt === undefined) return false;
    this.render(now);
    return this.elapsed < this.duration;
  }
  private render(now: number): void {
    const h = this.current,
      warning = this.clockAt === undefined;
    if (!warning) {
      this.elapsed = Math.min(
        this.duration,
        this.elapsed +
          Math.min(Math.max(0, now - this.clockAt!), this.duration / 3),
      );
      this.clockAt = now;
    }
    const progress = warning ? 0 : this.elapsed / this.duration;
    this.blade.setTexture(
      'standalone-pvp:sword-' +
        (warning ? 'warning' : Math.min(2, Math.floor(progress * 3 + 1e-7))) +
        '.png',
    );
    this.floor
      .setTint(warning ? 0xffb957 : 0xfff3bd)
      .setAlpha(warning ? 0.26 : 0.2 * (1 - progress));
    const scale = Math.min(
      1,
      Math.max(this.map.width, this.map.height) / this.blade.frame.width,
    );
    this.blade
      .setOrigin(0.5, 1)
      .setScale(scale)
      .setPosition(
        h.x + h.nx * this.reach * progress,
        h.y + h.ny * this.reach * progress,
      )
      .setRotation(Math.atan2(h.ny, h.nx) + Math.PI / 2)
      .setAlpha(warning ? 0.5 : Math.min(1, (1 - progress) * 2))
      .setDepth(warning ? -90 : 10000);
  }
  inspect() {
    return {
      region: this.region,
      scale: [this.blade.scaleX, this.blade.scaleY],
      width: this.blade.displayWidth,
      height: this.blade.displayHeight,
    };
  }
  destroy(): void {
    this.floor.destroy();
  }
}
