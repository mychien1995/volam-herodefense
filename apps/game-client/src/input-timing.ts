import type { Command } from '@volam/game-core';
import type { InputTimingSample } from '@volam/game-protocol';

type Frame = { x: number; y: number; animation: string };
type Sample = {
  sequence: number;
  kind: 'move' | 'basic';
  inputAt: number;
  frame: Frame;
  patchAt?: number;
  renderedAt?: number;
  server?: InputTimingSample;
};

export class InputTiming {
  private samples = new Map<number, Sample>();
  private latest = new Map<Sample['kind'], Sample>();
  private movement = '';

  reset(): void {
    this.samples.clear();
    this.latest.clear();
    this.movement = '';
  }

  input(command: Command, sequence: number, frame: Frame | undefined): void {
    if (command.kind === 'move') {
      const vector = `${command.x},${command.y}`;
      if (this.movement === vector) return;
      this.movement = vector;
      if (!command.x && !command.y) return;
    } else if (command.kind !== 'basic') return;
    if (!frame) return;
    const sample = {
      sequence,
      kind: command.kind,
      frame,
      inputAt: performance.now(),
    };
    this.samples.set(sequence, sample);
    this.latest.set(command.kind, sample);
    if (this.samples.size > 120) {
      const oldest = this.samples.keys().next().value;
      if (oldest !== undefined) this.samples.delete(oldest);
    }
  }

  patch(sequence: number): void {
    const now = performance.now();
    for (const sample of this.samples.values())
      if (sample.sequence <= sequence && now - sample.inputAt < 1000)
        sample.patchAt ??= now;
  }

  server(data: InputTimingSample): void {
    const sample = this.samples.get(data.sequence);
    if (sample) sample.server = data;
  }

  render(frame: Frame | undefined, pose: string | undefined): void {
    if (!frame) return;
    const now = performance.now();
    for (const sample of this.latest.values()) {
      if (sample.renderedAt !== undefined || now - sample.inputAt >= 1000)
        continue;
      if (
        sample.kind === 'move'
          ? frame.x !== sample.frame.x || frame.y !== sample.frame.y
          : pose === 'basic_attack' &&
            frame.animation !== sample.frame.animation
      )
        sample.renderedAt = now;
    }
  }

  inspect() {
    return [...this.samples.values()].map(
      ({ sequence, kind, inputAt, patchAt, renderedAt, server }) => ({
        sequence,
        kind,
        inputToPatchMs: patchAt === undefined ? undefined : patchAt - inputAt,
        inputToRenderMs:
          renderedAt === undefined ? undefined : renderedAt - inputAt,
        patchToRenderMs:
          patchAt === undefined || renderedAt === undefined
            ? undefined
            : renderedAt - patchAt,
        server,
      }),
    );
  }
}
