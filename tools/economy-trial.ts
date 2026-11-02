import { mkdirSync, writeFileSync } from 'node:fs';
import {
  createWorld,
  addHero,
  initializeProgression,
  gainExperience,
  changeBuild,
  characterStats,
  pointAccounting,
  submitInput,
  stepWorld,
  transactMerchant,
  equipmentSlots,
} from '@volam/game-core';
import { m1Config, economyTrial } from '@volam/game-data';
import { hurt } from '../packages/game-core/src/combat.js';

const builds: Record<string, string[]> = {
  cai_bang: [
    'hoa_van_chuong',
    'hoanh_tao_bong',
    'pha_giap_bong',
    'khang_long_huu_hoi',
  ],
  thien_son: [
    'lien_hoa_phien',
    'truy_hon_dao',
    'liet_phong_dao',
    'chiet_mai_thu',
  ],
  vo_dang: [
    'luong_nghi_thu',
    'duong_khi_kich',
    'that_tinh_kiem',
    'thai_cuc_than_cong',
  ],
  thieu_lam: [
    'la_han_quyen',
    'vi_da_quyen',
    'dai_luc_kim_cuong_chuong',
    'kim_cang_bat_hoai',
  ],
};
const rows: Array<{
  school: string;
  level: number;
  basic: string;
  seed: number;
  gearLevel: number;
  stats: ReturnType<typeof characterStats>['total'];
  points: ReturnType<typeof pointAccounting>;
  spent: number;
  damage: number;
  dps: number;
  remainingHp: number;
  remainingMana: number;
}> = [];
for (const school of Object.keys(builds))
  for (const level of [1, 6, 15, 30])
    for (const basic of m1Config.progression!.schools[school]!.basicIds)
      for (const seed of [42, 1337, 9001])
        for (const gearLevel of [0, 1, 5]) {
          const config = structuredClone(m1Config);
          Object.assign(config, {
            width: 1200,
            height: 800,
            collision: [],
            spawn: { x: 300, y: 300 },
            creepSpawns: [
              { x: 340, y: 300 },
              { x: 345, y: 315 },
              { x: 365, y: 300 },
            ],
          });
          Object.assign(config.creep, {
            hp: 1000000,
            speed: 0,
            detectionRange: 1,
          });
          const world = createWorld(config, seed),
            h = addHero(world, 'bot', school, config);
          h.schoolId = school;
          initializeProgression(h, config, 'custom');
          gainExperience(h, (level - 1) * 60, config);
          const change = (action: Parameters<typeof changeBuild>[4]) =>
            changeBuild(world, h, config, h.progression!.revision, action);
          change({ action: 'loadout', ids: builds[school]! });
          change({ action: 'basic', basicId: basic });
          for (let rank = 0; rank < 4; rank++)
            for (const skillId of builds[school]!)
              change({ action: 'upgrade', skillId });
          h.gold = 10000;
          for (const slot of equipmentSlots)
            for (let rank = 0; rank < gearLevel; rank++) {
              const error = transactMerchant(
                h,
                config,
                { inArena: true, matchTick: 0, worldTick: 0 },
                h.inventory?.revision ?? 0,
                { action: 'buy-basic', slot },
              );
              if (error) throw new Error(error);
            }
          h.hp = h.maxHp;
          h.mana = h.maxMana;
          const stats = characterStats(h, config).total;
          let damage = 0;
          for (let tick = 0; tick < 360; tick++) {
            if (tick % 2 === 0)
              submitInput(world, h.id, h.lastSequence + 1, { kind: 'basic' });
            const index = [0, 20, 40, 70].indexOf(tick % 120);
            if (index >= 0)
              submitInput(world, h.id, h.lastSequence + 1, {
                kind: 'cast',
                slot: index,
              });
            stepWorld(world, config);
            for (const event of world.events)
              if (event.kind === 'hit' && event.sourceId === h.id)
                damage += event.damage;
            if (tick % 30 === 0)
              hurt(world, h, 'creep_0', 'trial_pressure', 8, config, {
                critChance: 0,
                critMultiplier: 1,
              });
          }
          rows.push({
            school,
            level,
            basic,
            seed,
            gearLevel,
            stats,
            points: pointAccounting(h, config),
            spent: 10000 - h.gold,
            damage,
            dps: damage / 12,
            remainingHp: h.hp,
            remainingMana: h.mana,
          });
        }
const ratios = rows
  .filter((r) => r.gearLevel === 5)
  .map((r) => {
    const base = rows.find(
      (b) =>
        b.school === r.school &&
        b.level === r.level &&
        b.basic === r.basic &&
        b.seed === r.seed &&
        b.gearLevel === 0,
    )!;
    return {
      school: r.school,
      level: r.level,
      basic: r.basic,
      seed: r.seed,
      ratio: base.dps ? r.dps / base.dps : null,
    };
  });
const results = {
  scope:
    '288 deterministic twelve-second legal mixed-build probes, four schools, both A styles, levels1/6/15/30, seeds42/1337/9001, three stationary armor5 targets, raw8 pressure per second, gear0/1/5. No potion use, boss AI, PvP, campaign/economy-rate or optimal-human balance claim.',
  catalogue: economyTrial,
  fullBasicSetGold: Object.values(economyTrial.basics).reduce(
    (sum, item) => sum + item.prices.reduce((a, b) => a + b, 0),
    0,
  ),
  firstBasicSetGold: Object.values(economyTrial.basics).reduce(
    (sum, item) => sum + item.prices[0]!,
    0,
  ),
  rows,
  ratios,
};
mkdirSync('artifacts', { recursive: true });
writeFileSync(
  'artifacts/economy-trial.json',
  JSON.stringify(results, null, 2) + '\n',
);
console.log(
  JSON.stringify({
    probes: rows.length,
    firstBasicSetGold: results.firstBasicSetGold,
    fullBasicSetGold: results.fullBasicSetGold,
    fullGearDpsRatioRange: [
      Math.min(...ratios.map((r) => r.ratio ?? Infinity)),
      Math.max(...ratios.map((r) => r.ratio ?? 0)),
    ],
    output: 'artifacts/economy-trial.json',
  }),
);
