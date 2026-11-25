import type { World } from './types.js';
import { emit } from './combat.js';

export const bossSkillAnnouncementSeconds = 1.25;

/** Basic attack identity is shared by every authoritative boss adapter. */
export const bossNormalAbilities = new Set([
  'idle',
  'sweep',
  'fists',
  'palm',
  'ly_mac_sau_basic',
  'hong_liet_a1',
  'hong_liet_a2',
  'thiet_phien_lien_hoan',
  'dat_sweep',
  'kim_sweep',
  'kim_hand_chop',
  'ta_kiem_lien_kich',
  'lac_anh_normal',
  'bach_cot_trao',
  'tay_doc_staff',
  'tay_doc_gas',
  'doc_chuong',
  'nam_de_palm',
  'bc_staff',
  'bc_palms',
]);
export function announceBossSkill(
  world: World,
  actorId: string,
  abilityId: string,
): void {
  const actor = world.creeps.get(actorId);
  if (!actor || actor.hp <= 0 || bossNormalAbilities.has(abilityId)) return;
  actor.bossShoutTick = world.tick;
  emit(world, {
    kind: 'effect',
    sourceId: actorId,
    targetId: '',
    abilityId,
    stage: 'boss_shout',
    x: actor.x,
    y: actor.y,
    damage: 0,
    critical: false,
  });
}
