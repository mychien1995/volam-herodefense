import type { CreepDungeonDefinition, ChuDefinition } from '@volam/game-core';
import { validateChuDefinition } from '@volam/game-core';
import { m1Config } from './m1.js';
import { creepDungeon } from './dungeon.js';
import { enlargeBossArena } from './boss-arena-geometry.js';
import { bossCadence, cadenceTicks } from './boss-cadence.js';
import map from './chu-ba-thong-map.json' with { type: 'json' };
const hz = m1Config.tickRate;
/** Director-approved choreography; damage/economy numbers remain provisional trial tuning. */
export const chuBaThongTuning: ChuDefinition = {
  movementSpeed: 110,
  basicPalmIntervalTicks: 33,
  spawn: { x: 640, y: 300 },
  hp: 6000,
  defense: 180,
  wineBuffTicks: hz * 12,
  wineArmorPenetration: 0.7,
  xp: 900,
  gold: 600,
  phases: [
    ['idle', 2],
    ['sweep', 2],
    ['fists', 2],
    ['palm', 3],
    ['hands', 4],
    ['trap', 31],
    ['spin', 24],
    ['reflect', 9],
    ['ultimate', 15],
    ['drink', 8.5],
  ].map(([id, seconds]) => ({
    id: id as ChuDefinition['phases'][number]['id'],
    ticks: Math.round(Number(seconds) * hz),
  })),
  damage: { sweep: 28, fist: 15, palm: 30, hand: 45, spin: 16, ultimate: 14 },
  sweepFootRadius: 112,
  sweepFrontRadius: 170,
  sweepFrontOffset: 80,
  fistReach: 340,
  fistHalfWidth: 65,
  spinSpeedX: 640,
  spinSpeedY: 400,
  spinRadius: 112,
  pullRadius: 210,
  pullSpeed: 120,
  handsScale: 1.2,
  trapRadius: 62,
  trapTicks: 30 * hz,
  emptyResetTicks: 30 * hz,
  bossRespawnTicks: 45 * hz,
  rollTicks: 15 * hz,
  // One original art-backed material per kill; no wine buff or equipment stats inferred.
  loot: [
    { id: 'toan_chan_tien_tuu', nameVi: 'Toàn Chân Tiên Tửu', sellGold: 120 },
  ],
};
chuBaThongTuning.basicPalmIntervalTicks = cadenceTicks(
  bossCadence.chu_ba_thong.basicPalmSeconds,
);
for (const p of chuBaThongTuning.phases) {
  const t = bossCadence.chu_ba_thong.phasesSeconds[p.id];
  if (t === undefined) throw Error('Missing Chu cadence ' + p.id);
  p.ticks = cadenceTicks(t);
}
validateChuDefinition(chuBaThongTuning, m1Config);
export const chuBaThongDungeon: CreepDungeonDefinition = enlargeBossArena({
  ...creepDungeon,
  id: 'chu_ba_thong',
  chuBoss: chuBaThongTuning,
  width: 1280,
  height: 720,
  collision: map.layers
    .find((l) => l.name === 'collision')!
    .objects!.map((o) => ({
      x: o.x,
      y: o.y,
      width: o.width,
      height: o.height,
    })),
  spawn: { x: 640, y: 610 },
  exit: { x: 640, y: 610 },
  creepSpawns: [],
  creepRoster: [],
  hpPerAdditionalPlayer: 0,
  damagePerAdditionalPlayer: 0,
});
