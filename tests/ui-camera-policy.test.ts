import { describe, expect, it } from 'vitest';
import {
  cameraZoom,
  nativeGameplayZoom,
} from '../apps/game-client/src/camera-policy.js';
import { actionButton } from '../apps/game-client/src/ui-components.js';

describe('shared presentation contracts', () => {
  it.each([
    [959, 720, 1],
    [1280, 599, 1],
    [960, 600, 2],
    [1872, 800, 2],
  ])('retains Defense native scale at %sx%s', (width, height, zoom) => {
    expect(nativeGameplayZoom({ width, height })).toBe(zoom);
  });

  it('covers bounded maps without reducing native hero scale at wide/tall ratios', () => {
    for (const world of [
      { width: 836, height: 470 },
      { width: 1280, height: 720 },
      { width: 1120, height: 630 },
    ]) {
      for (const viewport of [
        { width: 1872, height: 800 },
        { width: 850, height: 480 },
        { width: 600, height: 1100 },
      ]) {
        const zoom = cameraZoom(viewport, world, 'cover');
        expect(zoom).toBeGreaterThanOrEqual(nativeGameplayZoom(viewport));
        expect(viewport.width / zoom).toBeLessThanOrEqual(world.width + 1e-9);
        expect(viewport.height / zoom).toBeLessThanOrEqual(world.height + 1e-9);
      }
    }
  });

  it('retains explicit overview framing and the Kim Luân zoom cap', () => {
    const viewport = { width: 2560, height: 1440 },
      world = { width: 836, height: 470 };
    expect(cameraZoom(viewport, world, 'overview')).toBe(
      Math.min(2560 / 836, 1440 / 470),
    );
    expect(cameraZoom(viewport, world, 'overview', 1.35)).toBe(1.35);
    expect(
      cameraZoom({ width: 850, height: 480 }, { width: 1600, height: 1200 }),
    ).toBe(1);
  });

  it('renders dynamic action text as text and preserves disabled, non-submit controls', () => {
    const html = actionButton(
      {
        label: '<img onerror="bad">',
        action: 'confirm" onclick="bad',
        disabled: true,
      },
      'data-practice',
    );
    expect(html).toContain('type="button"');
    expect(html).toContain(' disabled');
    expect(html).toContain('&lt;img onerror=&quot;bad&quot;&gt;');
    expect(html).toContain('data-practice="confirm&quot; onclick=&quot;bad"');
    expect(html).not.toContain('<img');
  });
});
