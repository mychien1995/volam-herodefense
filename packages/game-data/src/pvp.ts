import type { PvpDefinition, PvpMapDefinition } from '@volam/game-core';
const rect = (x: number, y: number, width: number, height: number) => [
  { x, y },
  { x: x + width, y },
  { x: x + width, y: y + height },
  { x, y: y + height },
];
const slots = (x: number, ys: number[]) => ys.map((y) => ({ x, y }));
const ellipse = (x: number, y: number, rx: number, ry: number) =>
  Array.from({ length: 32 }, (_, i) => ({
    x: x + rx * Math.cos((i * Math.PI) / 16),
    y: y + ry * Math.sin((i * Math.PI) / 16),
  }));
const maps: PvpDefinition['maps'] = {
  hong_moc: {
    id: 'hong_moc',
    name: 'Hồng Mộc',
    width: 836,
    height: 470,
    floor: [
      { x: 144, y: 169 },
      { x: 692, y: 169 },
      { x: 733, y: 333 },
      { x: 103, y: 333 },
    ],
    spawns: {
      chinh: slots(230, [193, 233, 273, 310]),
      ta: slots(606, [193, 233, 273, 310]),
    },
  },
  rung_truc: {
    id: 'rung_truc',
    name: 'Rừng Trúc',
    width: 1280,
    height: 720,
    floor: rect(104, 130, 1072, 472),
    spawns: {
      chinh: slots(270, [260, 330, 400, 470]),
      ta: slots(1010, [260, 330, 400, 470]),
    },
  },
  dia_nguc: {
    id: 'dia_nguc',
    name: 'Địa Ngục',
    width: 1120,
    height: 630,
    floor: rect(36, 36, 1048, 558),
    spawns: {
      chinh: slots(300, [235, 290, 345, 400]),
      ta: slots(820, [235, 290, 345, 400]),
    },
  },
  tuong_duong: {
    id: 'tuong_duong',
    name: 'Thành Tương Dương',
    width: 1120,
    height: 630,
    floor: [
      { x: 112, y: 218 },
      { x: 1008, y: 218 },
      { x: 1050, y: 540 },
      { x: 70, y: 540 },
    ],
    spawns: {
      chinh: slots(270, [285, 350, 415, 480]),
      ta: slots(850, [285, 350, 415, 480]),
    },
  },
  kiem_ho: {
    id: 'kiem_ho',
    name: 'Kiếm Hồ',
    width: 1120,
    height: 630,
    floor: ellipse(560, 340, 420, 220),
    spawns: {
      chinh: slots(330, [245, 310, 375, 440]),
      ta: slots(790, [245, 310, 375, 440]),
    },
  },
};
export const pvpDefinition: PvpDefinition = {
  maxPlayers: 8,
  teamCapacity: 4,
  wins: 3,
  historyLimit: 30,
  countdownTicks: 90,
  roundTicks: 5400,
  intermissionTicks: 60,
  resultTicks: 120,
  maps,
  // Trial hazard tuning; no separate PvP multiplier is applied to school skills.
  hazards: {
    dartInterval: 75,
    arrowInterval: 120,
    // +20% casts per second: previous intervals / 1.2, keeping warnings and damage intact.
    swordInterval: 300,
    lightningInterval: 225,
    warningTicks: 36,
    projectileSpeed: 420,
    dartFraction: 0.1,
    arrowFraction: 0.16,
    swordFraction: 0.4,
    lightningFraction: 0.22,
    lavaFractionPerSecond: 0.12,
    shrinkTicks: 4500,
    minimumSafeScale: 0.2,
  },
};
export const pvpMaps = Object.values(maps) as PvpMapDefinition[];
