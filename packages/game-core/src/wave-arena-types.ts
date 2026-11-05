import type { EllipseBounds } from './dong-ta-types.js';
export type WaveArenaBoss = 'dong_ta' | 'tay_doc' | 'nam_de' | 'bac_cai' | 'vuong_trung_duong';
export interface WaveArenaView {
  bossId: WaveArenaBoss;
  phase: 'entry' | 'fighting' | 'retry';
  locked: boolean;
  attempt: number;
  phaseUntil: number;
  tick: number;
  bossHp: number;
  bossMaxHp: number;
  bounds: EllipseBounds;
}
