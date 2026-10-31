export function facing(x: number, y: number): string {
  return Math.abs(x) >= Math.abs(y)
    ? x < 0
      ? 'left'
      : 'right'
    : y < 0
      ? 'up'
      : 'down';
}
