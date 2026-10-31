import type { ArenaCreepArt, ArenaCreepManifest } from './arena-creeps.js';
import approval from './forest-art-approval.generated.json' with { type: 'json' };

export const forestTypes = [
  'truc_xa',
  'doc_chu',
  'son_vien',
  'truc_lam_kiem_khach',
  'moc_linh',
  'truc_yeu',
] as const;
export type ForestType = (typeof forestTypes)[number];
export const forestArtStatus = (type: string): 'approved' | 'candidate' =>
  approval.approvedTypes.includes(type) ? 'approved' : 'candidate';
export function forestArtNotice(types: string[]): string {
  const known = types.filter((type) =>
    forestTypes.includes(type as ForestType),
  ).length;
  const label = types
    .filter((type) => forestTypes.includes(type as ForestType))
    .every((type) => forestArtStatus(type) === 'approved')
    ? 'approved art'
    : 'candidate';
  return known === 0
    ? 'Creep: placeholder · server chưa cấp loại Rừng Trúc'
    : known < types.length
      ? `Creep: ${label} + placeholder · thiếu loại server`
      : label === 'approved art'
        ? 'Creep: approved art · Rừng Trúc'
        : 'Creep: candidate · chưa được duyệt hình ảnh';
}
export interface ForestCreepManifest extends ArenaCreepManifest {
  assets: Array<
    ArenaCreepArt & { archetypeId: ForestType; displayScale: number }
  >;
}
export const isForestZone = (zone: string): boolean =>
  zone === 'forest_shared' || /^forest_private_.+/.test(zone);

/** Select only the authoritative type, never an instance ID or wave position. */
export function forestCreepArt(
  manifest: ForestCreepManifest | undefined,
  archetype: string | undefined,
  zone: string,
): ForestCreepManifest['assets'][number] | undefined {
  return isForestZone(zone)
    ? manifest?.assets.find((a) => a.archetypeId === archetype)
    : undefined;
}

const contacts: Record<ForestType, string> = {
  truc_xa: 'truc_xa_bite_contact',
  doc_chu: 'doc_chu_fang_contact',
  son_vien: 'son_vien_slam_impact',
  truc_lam_kiem_khach: 'truc_lam_kiem_khach_sword_contact',
  moc_linh: 'moc_linh_wood_impact',
  truc_yeu: 'truc_yeu_splinter_impact',
};
/** Only generic melee cues are currently supported by server creep_strike events.
 * Venom/web/root releases and flights deliberately have no inferred gameplay binding.
 */
export function forestStrikeEffects(
  type: ForestType,
  kind: string,
  abilityId: string,
  direction: string | undefined,
): Array<{ id: string; anchor: 'source' | 'contact' }> {
  if (abilityId !== 'creep_strike') return [];
  if (kind === 'attack')
    return type === 'son_vien'
      ? [{ id: 'forest_fx:son_vien_windup_dust', anchor: 'source' }]
      : [];
  if (kind !== 'hit') return [];
  const cues: Array<{ id: string; anchor: 'source' | 'contact' }> = [
    { id: 'forest_fx:' + contacts[type], anchor: 'contact' },
  ];
  if (
    ['truc_lam_kiem_khach', 'truc_yeu'].includes(type) &&
    direction &&
    ['down', 'left', 'right', 'up'].includes(direction)
  )
    cues.push({ id: `forest_fx:${type}_slash_${direction}`, anchor: 'source' });
  return cues;
}
