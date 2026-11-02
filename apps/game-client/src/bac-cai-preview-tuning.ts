/** Presentation-only director feedback defaults. No server combat numbers. */
export const bacCaiPreviewTiming = {
  clones: {
    splitMs: 1500,
    moveMs: 1400,
    pairStaggerMs: 120,
    settleMs: 340,
    decideMs: 1000,
    resultMs: 1500,
    // Four crossing pairs per round. Entries address occupied corner slots.
    pairs: [
      [
        [0, 4],
        [1, 5],
        [2, 6],
        [3, 7],
      ],
      [
        [0, 3],
        [1, 6],
        [2, 5],
        [4, 7],
      ],
      [
        [0, 5],
        [1, 4],
        [2, 7],
        [3, 6],
      ],
      [
        [0, 4],
        [1, 5],
        [2, 6],
        [3, 7],
      ],
      [
        [0, 3],
        [1, 6],
        [2, 5],
        [4, 7],
      ],
    ],
  },
  beam: { warningMs: 350, activeMs: 440, recoverMs: 700 },
  spiral: { releaseMs: 400, castEndMs: 650, flightMs: 5600 },
  field: { impactMs: 360, recoverMs: 780, groundAlpha: 0.55 },
} as const;
const c = bacCaiPreviewTiming.clones;
export const cloneRoundMs = c.moveMs + 3 * c.pairStaggerMs + c.settleMs;
export const cloneShuffleEnd = c.splitMs + c.pairs.length * cloneRoundMs;
export const cloneDecisionAt = cloneShuffleEnd + c.decideMs;
export const clonePreviewDuration = cloneDecisionAt + c.resultMs;

export function cloneSlot(actor: number, completed: number): number {
  let slot = actor;
  for (const pairs of c.pairs.slice(0, completed)) {
    const pair = pairs.find((p) => p[0] === slot || p[1] === slot)!;
    slot = pair[0] === slot ? pair[1] : pair[0];
  }
  return slot;
}
