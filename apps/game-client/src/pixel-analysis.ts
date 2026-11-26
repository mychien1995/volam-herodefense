/** Pixel math only. Keep the retained Canvas sampling, alpha and tie order unchanged. */
export type EmissionTone = 'warm' | 'cool' | 'poison';
export type EmissionPoint = { x: number; y: number; strength: number };
const size = 48;
function bright(r: number, g: number, b: number, tone: string): boolean {
  return tone === 'warm'
    ? r > 145 && g > 65 && r > b * 1.18
    : Math.max(r, g, b) > 165 &&
        (tone === 'poison'
          ? g > r * 1.02 || b > g * 1.05
          : b > r * 0.95 || Math.min(r, g, b) > 205);
}

/** Summed integer weights rank windows exactly; ties retain the original FP sum/order. */
export function emissionPoint(
  data: Uint8ClampedArray,
  tone: string,
): EmissionPoint {
  const stride = size + 1;
  const sums = new Float64Array(stride * stride);
  for (let y = 0; y < size; y++) {
    let row = 0;
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const r = data[i]!,
        g = data[i + 1]!,
        b = data[i + 2]!;
      if (bright(r, g, b, tone))
        row += (10 * r + 10 * g + 3 * b) * data[i + 3]!;
      sums[(y + 1) * stride + x + 1] = sums[y * stride + x + 1]! + row;
    }
  }
  let best = -1,
    peak = -1,
    px = 24,
    py = 24;
  for (let y = 2; y < 46; y += 2)
    for (let x = 2; x < 46; x += 2) {
      const score =
        sums[(y + 3) * stride + x + 3]! -
        sums[(y - 2) * stride + x + 3]! -
        sums[(y + 3) * stride + x - 2]! +
        sums[(y - 2) * stride + x - 2]!;
      if (score < best || (score === 0 && best === 0)) continue;
      // Distinct integer scores differ by >= 1/2550, far above FP rounding.
      // Equal scores can differ in the legacy accumulation: evaluate those verbatim.
      let value = 0;
      if (score > 0)
        for (let dy = -2; dy <= 2; dy++)
          for (let dx = -2; dx <= 2; dx++) {
            const i = ((y + dy) * size + x + dx) * 4;
            const r = data[i]!,
              g = data[i + 1]!,
              b = data[i + 2]!;
            if (bright(r, g, b, tone))
              value += ((r + g + b * 0.3) * data[i + 3]!) / 255;
          }
      if (score > best || value > peak) {
        best = score;
        peak = value;
        px = x;
        py = y;
      }
    }
  return {
    x: (px + 0.5) / size,
    y: (py + 0.5) / size,
    strength: Math.min(1, Math.max(0, peak) / 7000),
  };
}

/** Two linear sliding maxima equal the old square alpha dilation, including clipped edges. */
export function contourPixels(
  source: Uint8ClampedArray,
  width: number,
  height: number,
  padding: number,
): Uint8ClampedArray {
  const horizontal = new Uint8Array(width * height);
  const edge = new Uint8ClampedArray(source.length);
  const queue = new Int32Array(Math.max(width, height));
  for (let y = 0; y < height; y++) {
    let head = 0,
      tail = 0,
      next = 0;
    for (let x = 0; x < width; x++) {
      while (next <= Math.min(width - 1, x + padding)) {
        const value = source[(y * width + next) * 4 + 3]!;
        while (
          tail > head &&
          source[(y * width + queue[tail - 1]!) * 4 + 3]! <= value
        )
          tail--;
        queue[tail++] = next++;
      }
      while (tail > head && queue[head]! < x - padding) head++;
      horizontal[y * width + x] = source[(y * width + queue[head]!) * 4 + 3]!;
    }
  }
  for (let x = 0; x < width; x++) {
    let head = 0,
      tail = 0,
      next = 0;
    for (let y = 0; y < height; y++) {
      while (next <= Math.min(height - 1, y + padding)) {
        const value = horizontal[next * width + x]!;
        while (
          tail > head &&
          horizontal[queue[tail - 1]! * width + x]! <= value
        )
          tail--;
        queue[tail++] = next++;
      }
      while (tail > head && queue[head]! < y - padding) head++;
      const i = (y * width + x) * 4,
        original = source[i + 3]!;
      const maximum = horizontal[queue[head]! * width + x]!;
      if (maximum === original) continue;
      edge[i] = 255;
      edge[i + 1] = 223;
      edge[i + 2] = 156;
      edge[i + 3] = Math.round((maximum - original) * 0.75);
    }
  }
  return edge;
}
