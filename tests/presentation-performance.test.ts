import { describe, it, expect } from 'vitest';
import {
  emissionPoint,
  contourPixels,
} from '../apps/game-client/src/pixel-analysis.js';
import {
  actorStatuses,
  pvpSnapshot,
} from '../apps/game-client/src/presentation-state-cache.js';
import {
  setText,
  setProperty,
  setAttribute,
  setStyle,
} from '../apps/game-client/src/dom-updates.js';
// Retained pre-optimization pixel math: independent byte/point oracle, not a timing assertion.
function legacyEmission(data: Uint8ClampedArray, tone: string) {
  let peak = -1,
    px = 24,
    py = 24;
  for (let y = 2; y < 46; y += 2)
    for (let x = 2; x < 46; x += 2) {
      let value = 0;
      for (let dy = -2; dy <= 2; dy++)
        for (let dx = -2; dx <= 2; dx++) {
          const i = ((y + dy) * 48 + x + dx) * 4,
            r = data[i]!,
            g = data[i + 1]!,
            b = data[i + 2]!;
          if (
            tone === 'warm'
              ? r > 145 && g > 65 && r > b * 1.18
              : Math.max(r, g, b) > 165 &&
                (tone === 'poison'
                  ? g > r * 1.02 || b > g * 1.05
                  : b > r * 0.95 || Math.min(r, g, b) > 205)
          )
            value += ((r + g + b * 0.3) * data[i + 3]!) / 255;
        }
      if (value > peak) {
        peak = value;
        px = x;
        py = y;
      }
    }
  return {
    x: (px + 0.5) / 48,
    y: (py + 0.5) / 48,
    strength: Math.min(1, Math.max(0, peak) / 7000),
  };
}
function legacyContour(
  source: Uint8ClampedArray,
  width: number,
  height: number,
  padding: number,
) {
  const edge = new Uint8ClampedArray(source.length);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4,
        original = source[i + 3]!;
      if (original === 255) continue;
      let a = original;
      for (
        let dy = Math.max(0, y - padding);
        dy <= Math.min(height - 1, y + padding);
        dy++
      )
        for (
          let dx = Math.max(0, x - padding);
          dx <= Math.min(width - 1, x + padding);
          dx++
        )
          a = Math.max(a, source[(dy * width + dx) * 4 + 3]!);
      if (a === original) continue;
      edge[i] = 255;
      edge[i + 1] = 223;
      edge[i + 2] = 156;
      edge[i + 3] = Math.round((a - original) * 0.75);
    }
  return edge;
}
let seed = 42;
function bytes(n: number) {
  return Uint8ClampedArray.from({ length: n }, () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed >>> 24;
  });
}
describe('presentation performance without changed pixels or state', () => {
  it('matches legacy emission coordinates, FP tie order and strength exactly for every tone', () => {
    const blank = new Uint8ClampedArray(48 * 48 * 4),
      solid = blank.slice();
    solid.fill(255);
    const inputs = [
      blank,
      solid,
      ...Array.from({ length: 80 }, () => bytes(blank.length)),
    ];
    for (const data of inputs)
      for (const tone of ['warm', 'cool', 'poison'])
        expect(emissionPoint(data, tone)).toEqual(legacyEmission(data, tone));
  });
  it('matches every outline byte for translucent/opaque edges, clipped windows and padding', () => {
    for (const [width, height] of [
      [1, 1],
      [3, 8],
      [19, 13],
      [80, 112],
    ])
      for (const padding of [0, 1, 2, 5, 12]) {
        const data = bytes(width! * height! * 4);
        data[3] = 255;
        data[data.length - 1] = 0;
        expect(contourPixels(data, width!, height!, padding)).toEqual(
          legacyContour(data, width!, height!, padding),
        );
      }
  });
  it('reuses only the same raw actor projection and invalidates statuses immediately', () => {
    const actor = { statuses: '[{"kind":"stun","ticks":18}]' },
      first = actorStatuses(actor);
    expect(actorStatuses(actor)).toBe(first);
    actor.statuses = '[]';
    expect(actorStatuses(actor)).toEqual([]);
    expect(actorStatuses({ statuses: '[]' })).not.toBe(actorStatuses(actor));
  });
  it('shares PvP decoding between HUD and renderer and invalidates on patch, disable and replacement', () => {
    const state = {
      pvp: { enabled: true, json: '{"tick":1,"phase":"fighting"}' },
    };
    const first = pvpSnapshot(state);
    expect(pvpSnapshot(state)).toBe(first);
    state.pvp.json = '{"tick":2,"phase":"fighting"}';
    expect(pvpSnapshot(state)?.tick).toBe(2);
    state.pvp.enabled = false;
    expect(pvpSnapshot(state)).toBeUndefined();
    state.pvp = { ...state.pvp, enabled: true };
    expect(pvpSnapshot(state)).not.toBe(first);
  });
  it('suppresses redundant text/property/attribute writes and applies changed values synchronously', () => {
    let writes = 0,
      text = 'A',
      hidden = false,
      label = 'A';
    const node = {
      get textContent() {
        return text;
      },
      set textContent(v: string) {
        writes++;
        text = v;
      },
      get hidden() {
        return hidden;
      },
      set hidden(v: boolean) {
        writes++;
        hidden = v;
      },
      getAttribute() {
        return label;
      },
      setAttribute(_key: string, value: string) {
        writes++;
        label = value;
      },
    };
    for (let i = 0; i < 30; i++) {
      setText(node as unknown as Element, 'A');
      setProperty(node, 'hidden', false);
      setAttribute(node as unknown as Element, 'title', 'A');
    }
    expect(writes).toBe(0);
    setText(node as unknown as Element, 'B');
    setProperty(node, 'hidden', true);
    setAttribute(node as unknown as Element, 'title', 'B');
    expect(writes).toBe(3);
  });
  it('retains normalized CSS shorthand and detects outside changes', () => {
    let writes = 0,
      value = '';
    const style = {
      get background() {
        return value;
      },
      set background(v: string) {
        writes++;
        value = v.replace('center /', 'center center /');
      },
    } as CSSStyleDeclaration;
    for (let i = 0; i < 30; i++)
      setStyle(style, 'background', 'url("a.png") center / contain no-repeat');
    expect(writes).toBe(1);
    value = 'none';
    setStyle(style, 'background', 'url("a.png") center / contain no-repeat');
    expect(writes).toBe(2);
  });
});
