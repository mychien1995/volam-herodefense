import { fileURLToPath } from 'node:url';
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
} from '@volam/game-core';
import { m1Config } from '@volam/game-data';
import { hurt } from '../packages/game-core/src/combat.js';
const rows: Array<{
  school: string;
  level: number;
  basic: string;
  seed: number;
  combo: string;
  ranks: Record<string, number>;
  points: ReturnType<typeof pointAccounting>;
  stats: ReturnType<typeof characterStats>['total'];
  seconds: number;
  damage: number;
  dps: number;
  empowered: number;
  hp: number;
  mana: number;
}> = [];
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
for (const school of Object.keys(builds))
  for (const level of [1, 6, 15, 30])
    for (const basic of m1Config.progression!.schools[school]!.basicIds)
      for (const seed of [42, 1337, 9001])
        for (const combo of school === 'thieu_lam'
          ? ['a', 'b', 'wrong']
          : ['none']) {
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
          initializeProgression(h, config);
          gainExperience(h, (level - 1) * 60, config);
          const ids =
            combo === 'b'
              ? [
                  'toan_phong_thoai',
                  'hoanh_tao_cuoc',
                  'vo_anh_cuoc',
                  'kim_cang_bat_hoai',
                ]
              : builds[school]!;
          const change = (c: Parameters<typeof changeBuild>[4]) =>
            changeBuild(world, h, config, h.progression!.revision, c);
          change({ action: 'mode', mode: 'custom' });
          change({ action: 'loadout', ids });
          change({ action: 'basic', basicId: basic });
          for (let r = 0; r < 4; r++)
            for (const skillId of ids) change({ action: 'upgrade', skillId });
          const stats = characterStats(h, config).total;
          let damage = 0,
            empowered = 0;
          for (let t = 0; t < 360; t++) {
            if (t % 2 === 0)
              submitInput(world, h.id, h.lastSequence + 1, { kind: 'basic' });
            if (t % 120 === 0)
              submitInput(world, h.id, h.lastSequence + 1, {
                kind: 'cast',
                slot: combo === 'wrong' ? 2 : 0,
              });
            if (t % 120 === 20)
              submitInput(world, h.id, h.lastSequence + 1, {
                kind: 'cast',
                slot: 1,
              });
            if (t % 120 === 40)
              submitInput(world, h.id, h.lastSequence + 1, {
                kind: 'cast',
                slot: combo === 'wrong' ? 0 : 2,
              });
            if (t % 120 === 70)
              submitInput(world, h.id, h.lastSequence + 1, {
                kind: 'cast',
                slot: 3,
              });
            stepWorld(world, config);
            for (const e of world.events) {
              if (e.kind === 'hit' && e.sourceId === h.id) damage += e.damage;
              if (e.stage === 'combo_empowered') empowered++;
            }
            // Identical external pressure probe after combat; no AI/player-skill claim.
            if (t % 30 === 0)
              hurt(world, h, 'creep_0', 'pressure', 20, config, {
                critChance: 0,
                critMultiplier: 1,
              });
          }
          rows.push({
            school,
            level,
            basic,
            seed,
            combo,
            ranks: h.progression!.ranks,
            points: pointAccounting(h, config),
            stats,
            seconds: 12,
            damage,
            dps: damage / 12,
            empowered,
            hp: h.hp,
            mana: h.mana,
          });
        }
const output = fileURLToPath(new URL('../artifacts/', import.meta.url));
mkdirSync(output, { recursive: true });
writeFileSync(
  output + 'm3d-feedback-balance.json',
  JSON.stringify(
    {
      scope:
        'Legal four-school mixed builds; identical three stationary armor5 targets, 12s, periodic raw20 pressure; no economy, PvP, bosses, optimal-human or campaign balance claim',
      rows,
    },
    null,
    2,
  ),
);
console.log(
  JSON.stringify(
    {
      runs: rows.length,
      summary: Object.keys(builds).map((school) => ({
        school,
        levels: [1, 6, 15, 30].map((level) => {
          const r = rows.filter(
            (x) => x.school === school && x.level === level,
          );
          return {
            level,
            minDps: Math.min(...r.map((x) => x.dps)),
            maxDps: Math.max(...r.map((x) => x.dps)),
            maxHp: r[0]!.stats.maxHp,
            defense: r[0]!.stats.defense,
          };
        }),
      })),
    },
    null,
    2,
  ),
);
