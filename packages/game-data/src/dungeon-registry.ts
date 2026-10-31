import { creepDungeon } from './dungeon.js';
import { desertDungeon } from './desert.js';
import { beachDungeon } from './beach.js';
import { hellDungeon } from './hell.js';
export type DungeonDestination = 'forest' | 'desert' | 'sea' | 'hell';
export const creepDungeons = [
  creepDungeon,
  desertDungeon,
  beachDungeon,
  hellDungeon,
] as const;
export const dungeonForZone = (zone: string) => {
  const dungeon = creepDungeons.find(
    (d) => zone === `${d.id}_shared` || zone.startsWith(`${d.id}_private_`),
  );
  if (!dungeon) throw Error(`Unknown authoritative dungeon zone: ${zone}`);
  return dungeon;
};
