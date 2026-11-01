import { hongLietDungeon } from './hong-liet.js';
import { creepDungeon } from './dungeon.js';
import { desertDungeon } from './desert.js';
import { beachDungeon } from './beach.js';
export type DungeonDestination = 'forest' | 'desert' | 'sea' | 'hong_liet';
export const creepDungeons = [
  creepDungeon,
  desertDungeon,
  beachDungeon,
  hongLietDungeon,
] as const;
export const dungeonForZone = (zone: string) => {
  const dungeon = creepDungeons.find(
    (d) => zone === `${d.id}_shared` || zone.startsWith(`${d.id}_private_`),
  );
  if (!dungeon) throw Error(`Unknown authoritative dungeon zone: ${zone}`);
  return dungeon;
};
