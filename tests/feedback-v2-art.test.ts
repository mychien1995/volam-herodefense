import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  feedbackArt,
  feedbackTag,
  headings,
  eightFacing,
} from '../apps/game-client/src/feedback-art.js';
import {
  feedbackBindings,
  basicFeedbackArt,
} from '../apps/game-client/src/feedback-bindings.js';
describe('supplied M3C3 v2 presentation contract', () => {
  it('resolves every supplied ordered frame, absolute duration, trim offset and source canvas', () => {
    const supplied = feedbackArt.filter(
      (a) => !a.id.startsWith('retained_m3d_'),
    );
    const retained = feedbackArt.filter((a) =>
      a.id.startsWith('retained_m3d_'),
    );
    expect(supplied).toHaveLength(45);
    expect(retained).toHaveLength(6);
    for (const alias of retained) {
      const original = supplied.find(
        (a) => a.id === alias.id.replace('retained_m3d_', ''),
      );
      expect(alias).toEqual({ ...original, id: alias.id });
    }
    let frames = 0,
      tags = 0;
    const keys = new Set<string>();
    for (const c of supplied) {
      const file = 'apps/game-client/public/' + c.atlas;
      const atlas = JSON.parse(readFileSync(file, 'utf8')) as {
        frames: Record<
          string,
          {
            frame: { x: number; y: number; w: number; h: number };
            sourceSize: { w: number; h: number };
            spriteSourceSize: { x: number; y: number; w: number; h: number };
            rotated: boolean;
            trimmed: boolean;
            duration: number;
          }
        >;
      };
      for (const a of c.animations) {
        expect(a.frameDurationsMs).toHaveLength(a.frames.length);
        expect(a.frameDurationsMs.reduce((n, t) => n + t, 0)).toBeCloseTo(
          a.durationMsTotal,
          2,
        );
        expect(a.repeat).toBe(a.loop ? -1 : 0);
        expect(a.origin).toEqual(
          c.role === 'character' ? [0.5, 0.8] : c.origin,
        );
        expect(keys.has(c.id + ':' + a.name)).toBe(false);
        keys.add(c.id + ':' + a.name);
        tags++;
        for (const [i, n] of a.frames.entries()) {
          const f = atlas.frames[n]!;
          expect(f, 'unresolved ' + c.id + ':' + n).toBeDefined();
          expect(f.rotated).toBe(false);
          expect(f.trimmed).toBe(true);
          expect([f.sourceSize.w, f.sourceSize.h]).toEqual(c.frameDimensions);
          expect(f.spriteSourceSize.x).toBeGreaterThanOrEqual(0);
          expect(f.spriteSourceSize.y).toBeGreaterThanOrEqual(0);
          expect(f.spriteSourceSize.x + f.frame.w).toBeLessThanOrEqual(
            f.sourceSize.w,
          );
          expect(f.spriteSourceSize.y + f.frame.h).toBeLessThanOrEqual(
            f.sourceSize.h,
          );
          expect(f.duration).toBeCloseTo(a.frameDurationsMs[i]!, 0);
          frames++;
        }
      }
    }
    expect(tags).toBe(571);
    expect(frames).toBe(2368);
  });
  it('binds only real tags for all cardinal directions and preserves server staff aliases', () => {
    const vectors = [
      [1, 0],
      [0, 1],
      [-1, 0],
      [0, -1],
    ] as const;
    for (const b of Object.values(feedbackBindings)) {
      const refs = [
        b.cast,
        b.projectile,
        b.control,
        ...(b.release ?? []),
        ...(b.impact ?? []),
        ...Object.values(b.pulses ?? {}).flat(),
        b.loopCharacter,
        b.endingCharacter,
        b.counterCharacter,
        b.finisherCharacter,
        b.area?.opening,
        b.area?.loop,
        b.area?.ending,
        b.empowered?.cast,
        b.empowered?.ground,
        ...(b.empowered?.release ?? []),
        ...(b.empowered?.impact ?? []),
        ...(b.sustain ?? []).flatMap((d) => [d.opening, d.loop, d.ending]),
      ].filter((r) => !!r);
      for (const ref of refs)
        for (const [x, y] of vectors)
          expect(
            feedbackTag(ref, x, y),
            ref.asset + ':' + ref.prefix,
          ).toBeDefined();
    }
    for (const [stage, tag] of Object.entries({
      thrust: 'thrust',
      sweep: 'sweep',
      lift: 'rising',
      smash: 'overhead',
    })) {
      const basic = basicFeedbackArt('cai_bang_bong', stage, 999)!;
      expect(basic.ref?.prefix).toBe('combo_' + tag);
      expect(basic.baseMs).toBe(600);
      expect(feedbackTag(basic.ref!)?.durationMsTotal).toBe(300);
    }
    expect(basicFeedbackArt('cai_bang_chuong', 'palm', 6)?.ref).toBeUndefined();
    expect(basicFeedbackArt('cai_bang_chuong', 'dragon', 1)?.ref?.prefix).toBe(
      'chuong_sixth_cast',
    );
  });
  it('keeps eight independent export headings and reduces empty GPU allocation without changing pixels', () => {
    expect(
      feedbackTag({
        asset: 'thien_son_fan_v2_projectile',
        prefix: 'storm_fan_down',
      })?.name,
    ).toBe('storm_fan_down');
    expect(
      feedbackTag({
        asset: 'thien_son_fan_v2_projectile',
        prefix: 'storm_fan_up',
      })?.name,
    ).toBe('storm_fan_up');
    for (const [x, y] of [
      [1, 0],
      [1, 1],
      [0, 1],
      [-1, 1],
      [-1, 0],
      [-1, -1],
      [0, -1],
      [1, -1],
    ])
      expect(headings[eightFacing(x!, y!)]).toBeDefined();
    const packing = JSON.parse(
      readFileSync(
        'apps/game-client/public/assets/feedback_v2_runtime/packing_manifest.json',
        'utf8',
      ),
    );
    expect(packing.components).toHaveLength(45);
    expect(packing.runtimePixels).toBeLessThan(packing.sourcePixels * 0.3);
    expect(
      packing.components.every(
        (c: {
          visiblePixelsIdentical: boolean;
          sourceSizePreserved: boolean;
        }) => c.visiblePixelsIdentical && c.sourceSizePreserved,
      ),
    ).toBe(true);
  });
});
