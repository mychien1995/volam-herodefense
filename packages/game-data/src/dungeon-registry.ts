import { kimLuanDungeon } from './kim-luan.js';
import { hongLietDungeon } from './hong-liet.js';
import { chuBaThongDungeon } from './chu-ba-thong.js';
import { creepDungeon } from './dungeon.js';
import { desertDungeon } from './desert.js';
import { beachDungeon } from './beach.js';
import { coMoDungeon } from './ly-mac-sau.js';
export type DungeonDestination =
  | 'forest'
  | 'desert'
  | 'sea'
  | 'chu_ba_thong'
  | 'hong_liet'
  | 'kim_luan'
  | 'co_mo';
export const creepDungeons = [
  creepDungeon,
  desertDungeon,
  beachDungeon,
  chuBaThongDungeon,
  hongLietDungeon,
  kimLuanDungeon,
  coMoDungeon,
] as const;
export const dungeonForZone = (zone: string) => {
  const dungeon = creepDungeons.find(
    (d) => zone === `${d.id}_shared` || zone.startsWith(`${d.id}_private_`),
  );
  if (!dungeon) throw Error(`Unknown authoritative dungeon zone: ${zone}`);
  return dungeon;
};
