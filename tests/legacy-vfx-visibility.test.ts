import { EventEmitter } from 'node:events';
import { afterEach, expect, it, vi } from 'vitest';
import {
  hideReplacedLegacyVfx,
  trackLegacyVfx,
} from '../apps/game-client/src/legacy-vfx-visibility.js';

type Scene = Parameters<typeof hideReplacedLegacyVfx>[0];
type View = Parameters<typeof trackLegacyVfx>[0];

function sprite(scene: Scene, key: string, frame: string, name = '') {
  const events = new EventEmitter();
  const view = {
    scene,
    texture: { key },
    frame: { name: frame },
    name,
    once: events.once.bind(events),
    setVisible: vi.fn(),
  };
  return {
    ...view,
    register: () => trackLegacyVfx(view as unknown as View),
    destroy: () => events.emit('destroy'),
  };
}

afterEach(() => vi.unstubAllGlobals());

it('only hides replaced frames of shared atlases and drops destroyed views', () => {
  const scene = {} as Scene;
  const wind = sprite(scene, 'review3_ts_dao_fx', 'blade_right_0');
  const other = sprite(
    scene,
    'renovated-action-hero_thien_son_dao_actions',
    'bach_liet_0',
  );
  wind.register();
  other.register();
  hideReplacedLegacyVfx(scene);
  expect(wind.setVisible).not.toHaveBeenCalled();
  expect(other.setVisible).not.toHaveBeenCalled();
  wind.frame.name = 'bach_liet_right_0';
  hideReplacedLegacyVfx(scene);
  expect(wind.setVisible).toHaveBeenCalledOnce();
  expect(wind.setVisible).toHaveBeenCalledWith(false);
  wind.destroy();
  hideReplacedLegacyVfx(scene);
  expect(wind.setVisible).toHaveBeenCalledOnce();
});

it('keeps the current Hỏa Vân projectile and restores the comparison-mode policy', () => {
  const location = { search: '' };
  vi.stubGlobal('location', location);
  const scene = {} as Scene;
  const palm = sprite(
    scene,
    'retained_m3d_dragon_projectile',
    'travel_0',
    'feedback-v2:hoa_van_chuong',
  );
  const fan = sprite(
    scene,
    'wind_projectile',
    'travel_0',
    'feedback-v2:truy_hon_dao',
  );
  const guard = sprite(scene, 'la_han_quyen_vfx', 'guard_0');
  const staff = sprite(scene, 'review3_b3_pha_giap_vfx', 'impact_0');
  const unrelatedGround = sprite(
    scene,
    'bong_controls_v2_ground',
    'impact_0',
    'feedback-v2:truy_phong_bong',
  );
  for (const view of [palm, fan, guard, staff, unrelatedGround])
    view.register();
  hideReplacedLegacyVfx(scene);
  expect(palm.setVisible).not.toHaveBeenCalled();
  expect(fan.setVisible).toHaveBeenCalledOnce();
  expect(guard.setVisible).toHaveBeenCalledOnce();
  expect(staff.setVisible).toHaveBeenCalledOnce();
  expect(unrelatedGround.setVisible).not.toHaveBeenCalled();
  location.search = '?renovationSkills=v5';
  hideReplacedLegacyVfx(scene);
  expect(palm.setVisible).toHaveBeenCalledOnce();
  expect(fan.setVisible).toHaveBeenCalledTimes(2);
  expect(staff.setVisible).toHaveBeenCalledOnce();
  location.search = '?runtimeArtReview=1';
  hideReplacedLegacyVfx(scene);
  expect(palm.setVisible).toHaveBeenCalledOnce();
  expect(guard.setVisible).toHaveBeenCalledTimes(2);
});
