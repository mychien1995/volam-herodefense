const facings = ['right', 'down', 'left', 'up'] as const;

export function spinFacing(initial: string, quarterTurns: number) {
  const start = facings.findIndex((facing) => facing === initial);
  return facings[
    (Math.max(0, start) + Math.max(0, quarterTurns)) % facings.length
  ]!;
}
