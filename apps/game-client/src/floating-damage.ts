import Phaser from 'phaser';
import type { CombatEvent } from '@volam/game-core';

/** Hit coordinates/amount/critical identity come directly from the server event.
 * Each number remains at that world-space contact point if its target disappears. */
export class FloatingDamage {
  private bursts = new Map<
    string,
    { at: number; count: number; lane: number }
  >();
  private active = new Map<
    number,
    {
      text: Phaser.GameObjects.Text;
      event: CombatEvent;
      anchor: { x: number; y: number };
      offset: number;
    }
  >();
  private history: Array<{
    id: number;
    targetId: string;
    damage: number;
    critical: boolean;
    anchor: { x: number; y: number };
    offset: number;
  }> = [];
  constructor(private readonly scene: Phaser.Scene) {}
  hit(event: CombatEvent, heroTarget: boolean, targetHeight?: number): void {
    const now = this.scene.time.now,
      previous = this.bursts.get(event.targetId);
    const count = previous && now - previous.at < 320 ? previous.count + 1 : 0;
    const neighbours = new Set(
      [...this.active.values()]
        .filter(
          (n) =>
            n.event.targetId !== event.targetId &&
            Math.abs(n.anchor.x - event.x) < 24 &&
            Math.abs(n.anchor.y - event.y) < 30,
        )
        .map((n) => n.event.targetId),
    );
    const lane =
      previous && now - previous.at < 800
        ? previous.lane
        : [0, 14, -14][neighbours.size % 3]!;
    this.bursts.set(event.targetId, { at: now, count, lane });
    for (const [id, burst] of this.bursts)
      if (now - burst.at > 1000) this.bursts.delete(id);
    const offset = count % 4;
    const x = Math.round(event.x) + lane + [0, -9, 9, 0][offset]!;
    const y =
      Math.round(event.y) -
      (targetHeight ?? (heroTarget ? 59 : 54)) -
      offset * 14;
    const text = this.scene.add
      .text(
        x,
        y,
        `${event.stage === 'empowered' ? '◆' : ''}${event.critical ? '✦' : ''}${Number(event.damage.toFixed(2))}`,
        {
          fontFamily: '"Segoe UI", sans-serif',
          fontStyle: 'bold',
          fontSize: event.critical ? '14px' : '12px',
          color:
            event.stage === 'empowered'
              ? '#ffe078'
              : event.critical
                ? '#ffc85c'
                : '#fff4db',
          stroke: '#282017',
          strokeThickness: 3,
          padding: { x: 3, y: 2 },
        },
      )
      .setOrigin(0.5, 1)
      .setDepth(10000 + event.y)
      .setName(`damage:${event.id}`);
    const anchor = { x: event.x, y: event.y };
    this.active.set(event.id, { text, event: { ...event }, anchor, offset });
    this.history.push({
      id: event.id,
      targetId: event.targetId,
      damage: event.damage,
      critical: event.critical,
      anchor,
      offset,
    });
    if (this.history.length > 48) this.history.shift();
    this.scene.tweens.add({
      targets: text,
      y: y - 20,
      duration: 850,
      ease: 'Quad.Out',
    });
    this.scene.tweens.add({
      targets: text,
      alpha: 0,
      delay: 300,
      duration: 550,
      onComplete: () => {
        this.active.delete(event.id);
        text.destroy();
      },
    });
  }
  clear(): void {
    this.bursts.clear();
    this.active.clear();
    this.history = [];
  }
  inspect() {
    return {
      history: this.history.map((h) => ({ ...h })),
      active: [...this.active.values()].map(
        ({ text, event, anchor, offset }) => ({
          id: event.id,
          targetId: event.targetId,
          damage: event.damage,
          critical: event.critical,
          anchor,
          offset,
          x: text.x,
          y: text.y,
          alpha: text.alpha,
          text: text.text,
          color: text.style.color,
          fontSize: text.style.fontSize,
          background: text.style.backgroundColor,
          scrollFactor: text.scrollFactorX,
        }),
      ),
    };
  }
}
