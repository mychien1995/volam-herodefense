import {
  blocked,
  kimAbilities,
  type KimDefinition,
  type CreepDungeonDefinition,
} from '@volam/game-core';
import { creepDungeon } from './dungeon.js';
import { m1Config } from './m1.js';
import { enlargeBossArena } from './boss-arena-geometry.js';
import map from './kim-map.json' with { type: 'json' };
const hz = m1Config.tickRate,
  t = (s: number) => Math.round(s * hz);
const marker = (name: string) => {
  const p = map.layers
    .find((l) => l.name === 'markers')!
    .objects!.find((o) => o.name === name);
  if (!p) throw Error('Missing Kim marker ' + name);
  return { x: p.x, y: p.y };
};
const p = (
  nameVi: string,
  damage: number,
  warning = 0.6,
  duration = 1.5,
  cooldown = 6,
) => ({ nameVi, damage, warning, duration, cooldown });
/** Trial combat tuning. Approved geometry stays separate from HP/damage/economy. */
export const kimLuanDefinition: KimDefinition = {
  wheelCount: 7,
  basicWheelSpeed: 620,
  actionRestSeconds: 0.2,
  crescent: { speed: 760, radius: 30, lifetime: 2 },
  actors: {
    hoac_do: { ...marker('hoac_do_spawn'), hp: 1100, defense: 10, speed: 180 },
    dat_nhi_ba: {
      ...marker('dat_nhi_ba_spawn'),
      hp: 1600,
      defense: 16,
      speed: 105,
    },
    kim_luan_phap_vuong: {
      ...marker('boss_spawn'),
      hp: 4200,
      defense: 18,
      speed: 145,
    },
  },
  bounds: { x: 150, y: 270, width: 980, height: 400 },
  emptyResetTicks: t(30),
  respawnTicks: t(45),
  xp: 1200,
  gold: 600,
  rollTicks: t(15),
  loot: [
    { id: 'kim_luan_tan_phien', nameVi: 'Kim Luân Tàn Phiến', sellGold: 120 },
  ],
  wardReduction: 0.6,
  wardSeconds: 4,
  cageHp: 90,
  cageSeconds: 4,
  soloReleaseSeconds: 2.2,
  stunSeconds: 0.35,
  slowSeconds: 1.4,
  slowFraction: 0.3,
  knockback: 50,
  triple: {
    rays: 4,
    gap: 0.5,
    speed: 440,
    lifetime: 2,
    radius: 10,
    halfWidth: 48,
  },
  gust: { rays: 5, spread: (Math.PI * 8) / 9, speed: 280, radius: 17 },
  nails: { speed: 620, radius: 5 },
  orbit: { radius: 145, angularSpeed: 6, seconds: 3, releaseSpeed: 680 },
  stomp: { radius: 280, speed: 900, gap: 0.28, thickness: 10, ellipseY: 0.4 },
  enrage: {
    threshold: 0.3,
    speedMultiplier: 1.6,
    interval: 1.8,
    wheelSpeed: 620,
  },
  elephants: {
    rocks: 5,
    speed: 480,
    halfWidth: 31,
    rockHalfWidth: 51,
    top: 160,
    bottom: 750,
    normal: { lanes: 12, rows: 3, rowGap: 0.45, volleyGap: 3.8, warning: 1.6 },
    enrage: { lanes: 14, rows: 4, rowGap: 0.32, volleyGap: 3.3, warning: 1.4 },
  },
  abilities: {
    thiet_phien_lien_hoan: p('Thiết Phiến Liên Hoàn', 12, 0.6, 1.1, 3.6),
    cuong_phong_tan_loi_cong: p('Cuồng Phong Tấn Lôi Công', 16, 0.5, 0.4, 5),
    phien_trung_doc_dinh: p('Phiến Trung Độc Đinh', 8, 0.5, 0.4, 6),
    cuong_phong_van_nhan: p('Cuồng Phong Vạn Nhận', 6, 0.7, 3.1, 9),
    dat_sweep: p('Quét chùy', 20, 0.35, 0.3, 1.5),
    dai_luc_pha_son: p('Đại Lực Phá Sơn', 28, 0.4, 0.9, 4),
    bat_dong_kim_cang: p('Bất Động Kim Cang', 0, 0.3, 0.4, 4),
    dai_luc_pha_son_boulder: p('Đại Lực Phá Sơn', 25, 0.35, 0.4, 3.2),
    hang_ma_tam_lien_chan: p('Hàng Ma Tam Liên Chấn', 18, 0.4, 2.3, 5),
    kim_sweep: p('Ngũ Luân', 15, 0.35, 0.4, 1.5),
    kim_hand_chop: p('Bán Nguyệt Đao Khí', 18, 0.35, 0.4, 1.8),
    kim_luan_truy_hon: p('Kim Luân Truy Hồn', 11, 0.7, 0.5, 24),
    ngu_luan_ho_the: p('Ngũ Luân Hộ Thể', 18, 0.6, 3.1, 9),
    ngu_luan_phong_toa: p('Ngũ Luân Phong Tỏa', 32, 0.8, 4.1, 12),
    long_tuong_chan_thien: p('Long Tượng Chấn Thiên', 18, 0.45, 1, 6),
    long_tuong_bat_nha_cong: p('Long Tượng Bát Nhã Công', 20, 0.8, 11.5, 18),
    long_tuong_bat_nha_thap_tang: p(
      'Long Tượng Bát Nhã Thập Tầng',
      20,
      0,
      11.5,
      12,
    ),
  },
};
export const kimLuanDungeon: CreepDungeonDefinition = enlargeBossArena({
  ...creepDungeon,
  id: 'kim_luan',
  kimBoss: kimLuanDefinition,
  width: 1280,
  height: 736,
  collision: map.layers
    .find((l) => l.name === 'collision_proposals')!
    .objects!.map((o) => ({
      x: o.x,
      y: o.y,
      width: 'width' in o ? o.width : 0,
      height: 'height' in o ? o.height : 0,
    })),
  spawn: marker('hero_spawn'),
  exit: marker('exit'),
  creepSpawns: [],
  creepRoster: [],
  hpPerAdditionalPlayer: 0,
  damagePerAdditionalPlayer: 0,
});
export function validateKimDefinition(d = kimLuanDefinition) {
  const visit = (value: unknown) => {
    if (typeof value === 'number' && (!Number.isFinite(value) || value < 0))
      throw Error('Invalid Kim tuning');
    if (value && typeof value === 'object')
      for (const child of Object.values(value)) visit(child);
  };
  visit(d);
  for (const a of Object.values(d.actors))
    if (a.hp <= 0 || a.speed <= 0) throw Error('Invalid Kim actor');
  if (
    d.cageHp <= 0 ||
    d.cageSeconds <= d.soloReleaseSeconds ||
    d.soloReleaseSeconds <= 0 ||
    d.stomp.ellipseY <= 0 ||
    d.stomp.ellipseY > 1 ||
    d.elephants.normal.lanes < 2 ||
    d.elephants.enrage.lanes < 2
  )
    throw Error('Invalid Kim geometry/lifecycle');
  for (const id of kimAbilities) {
    const a = d.abilities[id];
    if (
      !a ||
      ![a.damage, a.warning, a.duration, a.cooldown].every(
        (n) => Number.isFinite(n) && n >= 0,
      ) ||
      a.duration <= 0 ||
      a.cooldown <= 0
    )
      throw Error('Invalid Kim ability ' + id);
  }
  if (
    d.triple.rays !== 4 ||
    d.stomp.radius !== 280 ||
    d.enrage.interval !== 1.8 ||
    d.enrage.threshold !== 0.3 ||
    d.loot.length < 1 ||
    d.wardReduction < 0 ||
    d.wardReduction > 0.85
  )
    throw Error('Invalid approved Kim baseline');
  for (const pt of [
    kimLuanDungeon.spawn,
    kimLuanDungeon.exit,
    ...Object.values(d.actors),
  ])
    if (
      blocked(
        pt,
        20,
        kimLuanDungeon.width,
        kimLuanDungeon.height,
        kimLuanDungeon.collision,
      )
    )
      throw Error('Blocked Kim marker');
}
validateKimDefinition();
