import type { InvasionDirector } from './invasions.js';
import type { World } from './types.js';
export type WaveBossTestStage =
  'dong_ta' | 'tay_doc' | 'nam_de' | 'bac_cai' | 'complete';
export interface WaveBossTestOptions {
  readonly bossHitFraction: number;
  readonly runSpeedMultiplier: number;
  readonly firstRestTicks: number;
  readonly restTicks: number;
}
export interface WaveBossTestRuntime extends WaveBossTestOptions {
  stage: WaveBossTestStage;
}
export function validateWaveBossTest(o: WaveBossTestOptions): void {
  if (
    !Number.isFinite(o.bossHitFraction) ||
    o.bossHitFraction <= 0 ||
    o.bossHitFraction > 1 ||
    !Number.isFinite(o.runSpeedMultiplier) ||
    o.runSpeedMultiplier < 1 ||
    o.runSpeedMultiplier > 10 ||
    !Number.isSafeInteger(o.firstRestTicks) ||
    o.firstRestTicks < 1 ||
    !Number.isSafeInteger(o.restTicks) ||
    o.restTicks < 1
  )
    throw Error('Invalid wave boss test options');
}
/** Opens real gates; never kills actors or marks chapters complete. */
export function stepWaveBossTest(
  w: World,
  invasion: InvasionDirector,
  completed: {
    dongTa: boolean;
    tayDoc: boolean;
    namDe: boolean;
    bacCai: boolean;
  },
): void {
  const test = w.waveBossTest;
  if (!test) return;
  test.stage = !completed.dongTa
    ? 'dong_ta'
    : !completed.tayDoc
      ? 'tay_doc'
      : !completed.namDe
        ? 'nam_de'
        : !completed.bacCai
          ? 'bac_cai'
          : 'complete';
  invasion.wave = {
    dong_ta: 5,
    tay_doc: 10,
    nam_de: 15,
    bac_cai: 20,
    complete: 20,
  }[test.stage];
  invasion.events = [];
  invasion.notice = undefined;
  invasion.nextWaveTick = w.tick + invasion.definition.intervalTicks;
}
export const waveBossTestArchetypes = new Set([
  'dong_ta',
  'tay_doc',
  'nam_de',
  'bac_cai',
]);
