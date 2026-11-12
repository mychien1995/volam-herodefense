import { direction, moveCircle, type Point } from '@volam/game-core';
import { m1Config } from '@volam/game-data';

const tickMs = 1000 / m1Config.tickRate;
const maxLeadMs = 2 * tickMs;
const blocked = new Set(['stun', 'root', 'dash', 'guard_counter']);

export class LocalMovement {
  private input: Point | undefined;
  private changedAt = 0;
  private patchAt = 0;

  reset(): void {
    this.input = undefined;
    this.patchAt = 0;
  }

  move(x: number, y: number, now: number): void {
    const vector = direction(x, y);
    if (this.input?.x === vector.x && this.input.y === vector.y) return;
    this.input = vector;
    this.changedAt = now;
  }

  patch(now: number): void {
    this.patchAt = now;
  }

  project(
    origin: Point,
    speed: number,
    statuses: readonly { kind: string }[],
    now: number,
  ): (Point & { fx: number; fy: number }) | undefined {
    const vector = this.input;
    if (
      !vector ||
      !(vector.x || vector.y) ||
      !Number.isFinite(speed) ||
      speed <= 0 ||
      !this.patchAt ||
      now - this.patchAt > 4 * tickMs ||
      statuses.some((status) => blocked.has(status.kind))
    )
      return undefined;

    // Rebase on the latest server position each frame. The visual lead is
    // bounded even when a patch is late or the server rejects movement.
    const horizon = Math.min(
      maxLeadMs,
      Math.max(0, now - this.changedAt),
      tickMs + now - this.patchAt,
    );
    const point = { x: origin.x, y: origin.y };
    const distance = (speed * horizon) / 1000;
    moveCircle(
      point,
      { x: vector.x * distance, y: vector.y * distance },
      m1Config.radius,
      m1Config.width,
      m1Config.height,
      m1Config.collision,
    );
    return point.x === origin.x && point.y === origin.y
      ? undefined
      : { ...point, fx: vector.x, fy: vector.y };
  }
}
