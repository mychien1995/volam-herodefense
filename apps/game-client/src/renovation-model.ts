import raw from './renovation-art.generated.json' with { type: 'json' };
export type RenovationActor = {
  id: string;
  name: string;
  group: string;
  biome: string;
  height: number;
  canvas: number[];
  pivot: number[];
  legacyRatio: number;
};
export const renovatedActors = raw.actors as RenovationActor[];
const definitions = new Map(renovatedActors.map((actor) => [actor.id, actor]));
const waves = renovatedActors.filter((actor) => actor.group === 'wave_creeps');
export const renovationHeight = (id: string, fallback: number) =>
  definitions.get(id)?.height ?? fallback;
export function renovationActorId(
  archetype: string | undefined,
  wave: number | undefined,
  zone: string,
): string | undefined {
  if (archetype && definitions.has(archetype)) return archetype;
  const aliases: Record<string, string> = {
    chu_wine_disciple: 'toan_chan_disciple',
    kim_luan_phap_vuong: 'kim_luan',
    enemy_ly_mac_sau: 'ly_mac_sau',
    kim_hoac_do: 'hoac_do',
    kim_dat_nhi_ba: 'dat_nhi_ba',
  };
  if (archetype && aliases[archetype]) return aliases[archetype];
  for (const prefix of ['forest', 'desert', 'beach', 'hell']) {
    const candidate = prefix + '_' + archetype;
    if (
      zone.startsWith((prefix === 'beach' ? 'sea' : prefix) + '_') &&
      definitions.has(candidate)
    )
      return candidate;
  }
  if (zone === 'arena' && wave && wave >= 1 && wave <= 20)
    return waves[wave - 1]?.id;
  return undefined;
}
