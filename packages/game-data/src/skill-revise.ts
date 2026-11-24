import {
  conLuan,
  duongMon,
  type Ability,
  type SimulationConfig,
  type StatusSpec,
} from '@volam/game-core';
import { abilitySchema } from './ability-schema.js';

/** Integration trial values. Exact director numbers override these defaults. */
export const skillReviseTuning = {
  monkBeatTicks: 12,
  palmBasicRange: 112,
  shaolinBasicRange: 104,
  staffDamagePerCharge: [0.18, 0.21, 0.24, 0.27],
  lightningChance: [0.12, 0.16, 0.2, 0.24],
  lightningDamage: [18, 24, 30, 36],
  concealReduction: 0.35,
  manaSteal: 8,
  manaLessRefund: 3,
  retreatDistance: 78,
  retreatSpeed: 300,
  gatherRange: 360,
  gatherCenter: 180,
  windRange: 440,
  windRadius: 44,
  rainRange: 340,
  rainRadius: 42,
  rainScatter: 36,
  starSpread: 1.35,
  airBombDamageScale: 0.65,
  airBombRadius: 36,
  airLaserDistance: 180,
} as const;
const focus = new Set([
  'cuong_long_loan_vu',
  'phi_long_tai_thien',
  'hang_long_hoa_vu',
  'pha_giap_bong',
  'luong_nghi_thu',
  'huyen_am_chuong',
  'la_han_quyen',
  'vi_da_quyen',
  'dai_luc_kim_cuong_chuong',
  'toan_phong_thoai',
  'hoanh_tao_cuoc',
  'vo_anh_cuoc',
  conLuan.hammer,
  duongMon.arrows,
  duongMon.laser,
  duongMon.knives,
]);
const status = (
  kind: StatusSpec['kind'],
  durationTicks: number,
  magnitude: number,
): StatusSpec => ({ kind, durationTicks, magnitude });

export function reviseAbility(base: Ability, rank = 1): Ability {
  const a = JSON.parse(JSON.stringify(base)) as Ability,
    r = rank - 1,
    t = skillReviseTuning;
  let e = a.effect;
  if (focus.has(a.id)) {
    a.targeting = 'nearestEnemyAtCast';
    if (e.mode === 'projectile') e.useFacing = false;
  }
  switch (a.id) {
    case conLuan.monk:
      a.minIntervalTicks = t.monkBeatTicks;
      a.basicPoseTicks = t.monkBeatTicks;
      if (a.basicCombo) {
        const order = ['thrust', 'sweep', 'overhead'];
        a.basicCombo = a.basicCombo.filter((step) =>
          order.includes(step.stage),
        );
        a.basicCombo.sort(
          (x, y) => order.indexOf(x.stage) - order.indexOf(y.stage),
        );
      }
      break;
    case 'truy_phong_bong':
      a.nameVi = 'Phá Thạch Bổng';
      break;
    case 'khang_long_huu_hoi':
      if (e.mode === 'buff') {
        delete e.burnAura;
        a.selfStatuses = [
          ...(a.selfStatuses ?? []),
          status('mana_regen_buff', e.durationTicks, 8 + 2 * r),
        ];
      }
      break;
    case 'hoa_van_chuong':
      a.nameVi = 'Hỏa Long Xuyên Sơn';
      a.effect = {
        mode: 'dash',
        distance: 210 + 10 * r,
        speed: 420,
        radius: 28,
        damage: 42 + 10 * r,
        stunTicks: 0,
        endBlast: { damage: 64 + 14 * r, radius: 66 + 4 * r },
      };
      break;
    case 'hang_long_hoa_vu':
      if (e.mode === 'projectile' && e.dragonDive) {
        e.range = 320 + 20 * r;
        e.dragonDive.forwardTicks = 12;
      }
      break;
    case 'pha_giap_bong':
      if (e.mode === 'arc') {
        a.consumeStaffChargeScale = t.staffDamagePerCharge[r]!;
        e.statuses = (e.statuses ?? []).map((s) =>
          s.kind === 'stun' ? { ...s, durationTicks: 60 } : s,
        );
      }
      break;
    case 'thien_ha_vo_cau':
      if (e.mode === 'multi_hit') e.finisherStatuses = [status('stun', 60, 1)];
      break;
    case 'lien_hoa_phien':
      if (e.mode === 'area')
        e.ownerDamageReduction = [0.4, 0.47, 0.53, 0.6][r]!;
      break;
    case 'chiet_mai_thu':
      a.nameVi = 'Phong Quyển Tàn Vân';
      a.effect = {
        mode: 'dash',
        distance: t.retreatDistance,
        speed: t.retreatSpeed,
        radius: 18,
        damage: 0,
        stunTicks: 0,
        backward: true,
        gather: {
          range: t.gatherRange,
          halfAngle: Math.PI / 2,
          centerOffset: t.gatherCenter,
        },
        afterProjectile: {
          damage: 58 + 12 * r,
          range: t.windRange,
          speed: 490,
          radius: t.windRadius,
          count: 1,
          delayTicks: 6,
          radial: false,
          stage: 'wind_gust',
          attackPowerScale: 0.8,
        },
      };
      break;
    case 'bach_liet_thien_kich':
      if (e.mode === 'multi_hit') {
        e.detached = true;
        a.selfStatuses = [
          status('concealed', (e.durationTicks ?? 64) + 1, t.concealReduction),
          status(
            'damage_reduction',
            (e.durationTicks ?? 64) + 1,
            t.concealReduction,
          ),
        ];
      }
      break;
    case 'liet_phong_dao':
      if (e.mode === 'arc')
        e.statuses = [
          status('stun', 30, 1),
          { ...status('slow', 90, 0.2), delayTicks: 30 },
        ];
      break;
    case 'vo_dang_quyen':
      if (e.mode === 'arc') {
        e.range = t.palmBasicRange;
        e.manaSteal = { amount: t.manaSteal, manaLessRefund: t.manaLessRefund };
      }
      break;
    case 'duong_khi_kich':
      if (e.mode === 'fortune') e.blastRadius *= 1.4;
      break;
    case 'huyen_am_chuong':
      if (e.mode === 'projectile') {
        e.radius = 44;
        if (e.scatter) {
          e.scatter.centerOnTarget = true;
          e.scatter.stage = 'ink';
          e.scatter.statuses = [status('stun', 30, 1)];
        }
      }
      break;
    case 'thai_cuc_tran':
      if (e.mode === 'area') {
        e.radius *= Math.sqrt(0.85);
        if (e.radiusY) e.radiusY *= Math.sqrt(0.85);
      }
      break;
    case 'vo_dang_kiem':
      if (e.mode === 'arc' && e.projectileProc) e.projectileProc.chance = 0.15;
      break;
    case 'bat_quai_kiem_tran':
      if (e.mode === 'area') e.confines = true;
      break;
    case 'that_tinh_kiem':
      if (e.mode === 'multi_hit') {
        e.targetArea = {
          range: t.rainRange,
          radius: t.rainRadius,
          scatterRadius: t.rainScatter,
          fallTicks: 15,
        };
        e.spacingTicks = 2;
        e.durationTicks = 31;
        delete e.halfAngle;
      }
      break;
    case 'thieu_lam_quyen':
      if (e.mode === 'arc') e.range = t.shaolinBasicRange;
      break;
    case 'vi_da_quyen':
      if (e.mode === 'arc' && e.originOffset) e.originOffset *= 0.4;
      break;
    case 'nhu_lai_niet_ban':
      if (e.mode === 'arc') {
        e.damage *= 1.25;
        e.statuses = [...(e.statuses ?? []), status('slow', 90, 0.3)];
        if (e.residualArea) e.residualArea.statuses = [status('slow', 90, 0.3)];
      }
      break;
    case 'nhu_lai_thien_diep':
      if (e.mode === 'area')
        e.tickInterval = Math.max(1, Math.floor(e.tickInterval / 2));
      break;
    case 'kim_quang_ho_tran':
      if (e.mode === 'support')
        e.statuses = [
          status('defense_buff', e.tickInterval + 1, 34 + 8 * r),
          status('hp_regen_buff', e.tickInterval + 1, 6 + 2 * r),
        ];
      break;
    case 'bat_dong_minh_vuong':
      if (e.mode === 'support') {
        e.selfHeal = e.heal ?? 42;
        delete e.heal;
        e.statuses = [
          status('defense_buff', 180, 30 + 6 * r),
          status('attack_buff', 180, 0.15 + 0.03 * r),
        ];
      }
      break;
    case conLuan.stance:
      a.nameVi = 'Ngũ Lôi Chính Pháp';
      a.passive = true;
      a.cooldownTicks = 0;
      a.manaCost = 0;
      a.basicDamageBonus = 0;
      a.reactiveBlock = {
        chance: t.lightningChance[r]!,
        damage: t.lightningDamage[r]!,
        stunTicks: 15,
      };
      break;
    case conLuan.ring:
      a.nameVi = 'Lôi Đình Chấn Vực';
      break;
    case conLuan.star:
      a.nameVi = 'Thần Long Cửu Hiện';
      if (e.mode === 'area') {
        e.radius *= t.starSpread;
        e.radiusY = (e.radiusY ?? e.radius) * t.starSpread;
        e.expireBurst = { damage: 44.2 + 13 * r, radius: 53 + 4 * r };
      }
      break;
    case duongMon.arrows:
      if (e.mode === 'projectile')
        a.airborneEffect = {
          ...e,
          count: 1,
          laneOffsets: [0],
          windupTicks: 9,
          recoveryTicks: 6,
          scatter: {
            count: 3,
            appearanceTicks: 0,
            delayTicks: 20,
            innerRadius: 26,
            outerRadius: 44,
            radius: t.airBombRadius,
            damage: e.damage * t.airBombDamageScale,
            attackPowerScale: 0.3,
            centerOnTarget: true,
            replaceProjectiles: true,
            stage: 'ice_bomb',
            statuses: [status('slow', 90, 0.3)],
          },
        };
      break;
    case duongMon.laser:
      if (e.mode === 'projectile') {
        a.focusRange = e.range;
        a.airborneEffect = {
          mode: 'dash',
          windupTicks: 6,
          distance: t.airLaserDistance,
          speed: 450,
          radius: 18,
          damage: e.damage,
          damageOffset: 35,
          stunTicks: 0,
        };
      }
      break;
    case duongMon.trap:
      a.charges = [3, 4, 5, 5][r]!;
      break;
    case duongMon.evade:
      if (e.mode === 'dash')
        e.afterProjectile = {
          damage: 14 + 4 * r,
          range: 190,
          speed: 430,
          radius: 8,
          count: 8,
          delayTicks: 0,
          radial: true,
          stage: 'evade_dart',
          attackPowerScale: 0.25,
        };
      break;
  }
  if (a.targeting === 'nearestEnemyAtCast' && a.effect.mode === 'arc')
    a.focusRange = a.effect.range + (a.effect.originOffset ?? 0);
  return abilitySchema.parse(a);
}

const descriptions: Record<string, string> = {
  hoa_van_chuong:
    'Hỏa Long Xuyên Sơn: chưởng đầu rồng và lướt xuyên địch, nổ cuối đường. Vệt lửa không gây sát thương.',
  truy_phong_bong: 'Phá Thạch Bổng: vung bổng đập quanh người, gây choáng.',
  pha_giap_bong:
    'Tự ngắm địch gần nhất, gây choáng 2 giây. Tiêu toàn bộ tối đa 4 charge đánh thường cùng mục tiêu, kể cả đánh trượt.',
  chiet_mai_thu:
    'Phong Quyển Tàn Vân: lùi đồng thời gom địch phía trước, rồi phất projectile gió bán nguyệt xuyên vùng đã gom.',
  bach_liet_thien_kich:
    'Tàng hình và giảm sát thương nhận khi bóng chém; không thể bị chọn làm mục tiêu. Đánh thường hoặc dùng chiêu khác sẽ lộ.',
  liet_phong_dao: 'Chém đại đao gây choáng 1 giây, sau đó làm chậm nhẹ 3 giây.',
  huyen_am_chuong:
    'Sóng âm rộng tự ngắm địch gần nhất; 5 bãi mực ngẫu nhiên quanh vị trí target lúc thi triển, nổ gây choáng 1 giây.',
  that_tinh_kiem:
    'Gọi 7 kiếm rơi dồn dập xuống vùng mục tiêu đã chốt, gây nổ; không có vòng báo trước và không đuổi theo địch.',
  ngu_loi_chinh_phap_the:
    'Nội tại: có xác suất chặn hoàn toàn một đòn trực tiếp và phản sét choáng 0,5 giây. PVP chỉ chặn A; PVE chặn cả skill trực tiếp, không chặn DOT.',
  ngu_loi_chinh_phap_vong:
    'Lôi Đình Chấn Vực: vòng lôi điện lan rộng quanh người, giữ animation hiện tại.',
  con_luan_kiem_tran:
    'Thần Long Cửu Hiện: dựng 5 kiếm nối hình ngôi sao; hết trận, mỗi kiếm nổ như Q, không choáng ở vụ nổ cuối.',
  dia_diem_hoa:
    'Tích trữ 3/4/5/5 lượt; tối đa 5 bom tồn tại. Mỗi lần dùng đặt một bom.',
  bat_dong_minh_vuong:
    'Hồi máu một nhịp cho bản thân, sau đó tăng phòng thủ và sát thương cho bản thân cùng đồng đội.',
  luu_phong_bo:
    'E tung quạt; E khi đang bay để dừng; E khi đang xoay để thu về. Hết tầm tự dừng; vẫn hao nội lực khi duy trì.',
  khang_long_huu_hoi:
    'Tăng tỉ lệ và sát thương chí mạng, tăng hồi nội lực. Không tạo vòng lửa ở bậc 4.',
  thien_ha_vo_cau: 'Xoay bổng liên tục, thức đập cuối gây choáng 2 giây.',
  bat_quai_kiem_tran:
    'Dựng kiếm trận gây sát thương; địch ở trong có thể di chuyển nhưng không thể đi hoặc lướt vượt biên.',
  truy_tam_tu_tien:
    'Tự ngắm địch gần nhất. Khi bay: ném 3 bom băng ngẫu nhiên quanh vị trí mục tiêu, nổ gây chậm.',
  luu_tinh_truc_nguyet:
    'Tự ngắm địch gần nhất. Khi bay: chiếu laze xuống đất rồi lướt trên không, kéo đường laze gây sát thương.',
  thien_co_thiet_duc:
    'Thu cánh, vào trạng thái phòng thủ và hồi máu; dùng khi đang bay sẽ kết thúc trạng thái bay.',
};
export function applySkillRevisions(config: SimulationConfig): void {
  for (const [id, a] of Object.entries(config.basics))
    config.basics[id] = reviseAbility(a);
  for (const [id, a] of Object.entries(config.skillCatalogue ?? {}))
    config.skillCatalogue![id] = reviseAbility(a);
  config.skills = config.skills.map((a) => reviseAbility(a));
  const baseStar = config.skillCatalogue?.[conLuan.star]?.effect,
    baseQ = config.skillCatalogue?.[conLuan.detonate]?.effect;
  if (baseStar?.mode === 'area' && baseQ?.mode === 'area')
    baseStar.expireBurst = { damage: baseQ.damage, radius: baseQ.radius };
  for (const d of Object.values(config.progression?.skills ?? {})) {
    d.ranks = d.ranks.map((a, i) => reviseAbility(a, i + 1));
    if (descriptions[d.id]) d.descriptionVi = descriptions[d.id]!;
  }
  // End detonations use the exact Q damage/radius for the same rank, without Q's stun.
  for (let r = 0; r < 4; r++) {
    const star = config.progression?.skills[conLuan.star]?.ranks[r]?.effect,
      q = config.progression?.skills[conLuan.detonate]?.ranks[r]?.effect;
    if (star?.mode === 'area' && q?.mode === 'area')
      star.expireBurst = { damage: q.damage, radius: q.radius };
  }
}
