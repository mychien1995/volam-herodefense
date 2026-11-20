/** Minimum-error overlap on retained material pixels, with a four-pixel seam feather.
 * No reflection, full-image blur, generated art or per-frame work. */
function wrapEdge(input: ImageData, horizontal: boolean): ImageData {
  const overlap = 64;
  const length = horizontal ? input.width : input.height;
  const rows = horizontal ? input.height : input.width;
  const period = length - overlap;
  const output = new ImageData(
    horizontal ? period : rows,
    horizontal ? rows : period,
  );
  const at = (x: number, row: number) =>
    horizontal ? (row * input.width + x) * 4 : (x * input.width + row) * 4;
  const parent = new Int16Array(rows * overlap);
  let previous = new Float64Array(overlap);
  previous.fill(Infinity);
  for (let row = 0; row < rows; row++) {
    const current = new Float64Array(overlap);
    current.fill(Infinity);
    for (let x = 8; x < overlap - 8; x++) {
      const a = at(x, row),
        b = at(x + period, row);
      let cost = 0;
      for (let c = 0; c < 3; c++)
        cost += Math.pow(input.data[a + c]! - input.data[b + c]!, 2);
      let best = x;
      if (row)
        for (const near of [x - 1, x + 1])
          if (previous[near]! < previous[best]!) best = near;
      current[x] = cost + (row ? previous[best]! : 0);
      parent[row * overlap + x] = best;
    }
    previous = current;
  }
  let best = 8;
  for (let x = 9; x < overlap - 8; x++)
    if (previous[x]! < previous[best]!) best = x;
  const cut = new Int16Array(rows);
  for (let row = rows - 1; row >= 0; row--) {
    cut[row] = best;
    best = parent[row * overlap + best]!;
  }
  for (let row = 0; row < rows; row++)
    for (let x = 0; x < period; x++) {
      const a = at(x, row),
        b = at(x + period, row);
      const target = horizontal
        ? (row * output.width + x) * 4
        : (x * output.width + row) * 4;
      const weight =
        x < overlap ? Math.max(0, Math.min(1, (x - cut[row]! + 2) / 4)) : 1;
      for (let c = 0; c < 4; c++)
        output.data[target + c] = Math.round(
          input.data[a + c]! * weight +
            (weight === 1 ? 0 : input.data[b + c]! * (1 - weight)),
        );
    }
  return output;
}

export function materialPattern(
  source: CanvasImageSource,
  sx: number,
  sy: number,
  size: number,
): HTMLCanvasElement {
  const tile = document.createElement('canvas');
  tile.width = tile.height = 512;
  const ctx = tile.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(source, sx, sy, size, size, 0, 0, 512, 512);
  const seamless = wrapEdge(
    wrapEdge(ctx.getImageData(0, 0, 512, 512), true),
    false,
  );
  tile.width = seamless.width;
  tile.height = seamless.height;
  tile.getContext('2d')!.putImageData(seamless, 0, 0);
  return tile;
}
