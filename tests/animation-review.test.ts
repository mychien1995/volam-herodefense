import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { skillArt } from '@volam/game-data';
import { feedbackArt } from '../apps/game-client/src/feedback-art.js';
import {
  animationReviewPlan,
  reviewCounter,
  reviewFrameIndex,
  reviewMotion,
  reviewSkills,
} from '../apps/game-client/src/animation-review-plans.js';
import type { RasterComponent } from '../apps/game-client/src/skill-art-registry.js';

const json = (p: string) => JSON.parse(readFileSync(p, 'utf8'));
const manifest = json(
  'assets/exports/skills/animation-review-v01/manifest.json',
) as { assets: RasterComponent[] };
const assets = new Map(
  [...skillArt.assets, ...feedbackArt, ...manifest.assets].map((a) => [
    a.id,
    a,
  ]),
);

describe('animation review isolation and retained raster contracts', () => {
  it('resolves every storyboard and all four facings to real bounded atlas frames', () => {
    for (const [id] of reviewSkills)
      for (const branch of ['threshold', 'expiry'] as const) {
        const plan = animationReviewPlan(id, branch);
        for (const c of plan.clips) {
          expect(c.at).toBeGreaterThanOrEqual(0);
          expect(c.end).toBeGreaterThan(c.at);
          expect(c.end).toBeLessThanOrEqual(plan.duration);
          const asset = assets.get(c.asset)!;
          expect(asset, c.asset).toBeDefined();
          const path = asset.atlas.startsWith('assets/feedback_v2_runtime/')
            ? asset.atlas.replace('assets/', 'apps/game-client/public/assets/')
            : asset.atlas;
          const atlas = json(path);
          for (const d of ['right', 'down', 'left', 'up']) {
            const tag =
              asset.animations.find((t) => t.name === c.tag + '_' + d) ??
              asset.animations.find((t) => t.name === c.tag);
            expect(tag, `${id}:${c.asset}:${c.tag}:${d}`).toBeDefined();
            for (const name of tag!.frames) {
              const frame = atlas.frames[name]?.frame;
              expect(frame, name).toBeDefined();
              expect(frame.x).toBeGreaterThanOrEqual(0);
              expect(frame.y).toBeGreaterThanOrEqual(0);
              expect(frame.x + frame.w).toBeLessThanOrEqual(atlas.meta.size.w);
              expect(frame.y + frame.h).toBeLessThanOrEqual(atlas.meta.size.h);
            }
          }
        }
      }
  });
  it('uses retained variable frame durations at exact boundaries and during looping', () => {
    const durations = [45, 90, 30, 120];
    expect(
      [0, 44, 45, 134, 135, 164, 165, 284, 285, 330].map((t) =>
        reviewFrameIndex(durations, t, true),
      ),
    ).toEqual([0, 0, 1, 1, 2, 2, 3, 3, 0, 1]);
    expect(reviewFrameIndex(durations, 999, false)).toBe(3);
  });
  it('shows actual received damage after 70% reduction against 20% max HP', () => {
    const before = reviewCounter('threshold', 2200),
      after = reviewCounter('threshold', 2800);
    expect(before.received).toBe(180);
    expect(before.threshold).toBe(200);
    expect(after.reflect).toBe(210);
    expect(after.releaseAt).toBe(2800);
    expect(after.hits.reduce((sum, h) => sum + h.raw, 0)).toBe(700);
    expect(reviewCounter('expiry', 5000).reflect).toBe(150);
    expect(reviewCounter('expiry', 5000).releaseAt).toBe(5000);
    const p = animationReviewPlan('toa_sat_bac_do', 'expiry');
    expect(p.clips.filter((c) => c.phase === 'counter_release')[0]!.at).toBe(
      5000,
    );
  });
  it('keeps the lotus planted and reverses only the retreat storyboard', () => {
    const lotus = animationReviewPlan('lien_hoa_phien');
    expect(
      lotus.clips
        .filter((c) => c.asset === 'review_lotus')
        .every((c) => c.anchor === 'start'),
    ).toBe(true);
    expect(reviewMotion(lotus, 3000)).toBe(150);
    expect(reviewMotion(lotus, 4500)).toBe(0);
    expect(reviewMotion(animationReviewPlan('phong_anh_hoan_vi'), 600)).toBe(
      -140,
    );
    expect(reviewMotion(animationReviewPlan('phi_anh_tram'), 600)).toBe(140);
    const bursts = animationReviewPlan('van_kiem_quy_tong').clips.filter(
      (c) => c.phase === 'radial_release',
    );
    expect(new Set(bursts.map((c) => c.at)).size).toBe(13);
    expect(bursts).toHaveLength(104);
  });
  it('retains generated source provenance and isolates new assets from gameplay registries', () => {
    for (const asset of manifest.assets as (RasterComponent & {
      source: string;
      sourceSha256: string;
      status: string;
    })[]) {
      expect(
        createHash('sha256').update(readFileSync(asset.source)).digest('hex'),
      ).toBe(asset.sourceSha256);
      expect(asset.status).toBe('REVIEW_ONLY_PENDING_DIRECTOR');
      expect(skillArt.assets.some((a) => a.id === asset.id)).toBe(false);
      expect(feedbackArt.some((a) => a.id === asset.id)).toBe(false);
    }
    const scene = readFileSync(
      'apps/game-client/src/animation-review.ts',
      'utf8',
    );
    expect(scene).not.toMatch(/@colyseus|game-core|game-protocol|\.send\(/);
  });
});
