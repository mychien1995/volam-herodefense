import type { PracticeDefinition } from '@volam/game-core';
/** Uses the approved Rừng Trúc arena's walkable floor, with no hazard system. */
export const practiceDefinition: PracticeDefinition = {
  width: 1280,
  height: 720,
  spawn: { x: 550, y: 360 },
  collision: [
    { x: 0, y: 0, width: 1280, height: 130 },
    { x: 0, y: 602, width: 1280, height: 118 },
    { x: 0, y: 130, width: 104, height: 472 },
    { x: 1176, y: 130, width: 104, height: 472 },
  ],
  targets: [
    { x: 645, y: 315 },
    { x: 680, y: 360 },
    { x: 645, y: 405 },
  ],
  targetHp: 10000,
};
