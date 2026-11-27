// Research fork of the frozen readiness-v2 runner; preserve that source and its historical hashes.
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import {
  withCampaignXpProfile,
  campaignXpProfiles,
  withoutTrialXpFields,
  type CampaignXpProfile,
} from './campaign-xp-profiles.js';
import {
  DungeonMatch,
  InvasionDirector,
  createWorld,
  initializeProgression,
  pointAccounting,
  transactMerchant,
  equippedAbility,
  blocked,
  type Hero,
  type MatchZone,
  type Point,
  type EquipmentSlot,
  type MerchantAction,
} from '@volam/game-core';
import {
  m1Config,
  campaignDefinition,
  campaignSchema,
  creepDungeon,
  creepCombatDefinition,
  createInvasionDefinition,
  arenaVariants,
} from '@volam/game-data';
import { findWalkPath } from '../packages/game-core/src/dungeon-navigation.js';
import {
  awardCampaignBoss,
  grantFarmReward,
} from '../packages/game-core/src/campaign.js';
import { grantCraftMaterial } from '../packages/game-core/src/economy.js';
import type { Creep } from '../packages/game-core/src/types.js';
const args = process.argv.slice(2);
const option = (key: string, fallback: string) =>
  args[args.indexOf('--' + key) + 1] && args.includes('--' + key)
    ? args[args.indexOf('--' + key) + 1]!
    : fallback;
const players = Number(option('players', '1'));
const seed = Number(option('seed', '42'));
const variant = option('variant', 'candidate');
const xpProfile = option('xp-profile', 'baseline') as CampaignXpProfile;
if (!Object.hasOwn(campaignXpProfiles, xpProfile))
  throw Error('Unknown XP profile: ' + xpProfile);
if (!['candidate'].includes(variant))
  throw Error('XP trials require the approved candidate pacing');
const mode = option('mode', 'forecast');
const basic = option('basic', 'cai_bang_chuong');
const maxSeconds = Number(option('max-seconds', '9000'));
const bossSeconds = Number(option('boss-seconds', '90'));
const endWave = Number(option('end-wave', '20'));
if (
  ![1, 6].includes(players) ||
  !['legacy', 'compressed', 'candidate'].includes(variant) ||
  !['natural', 'forecast'].includes(mode)
)
  throw Error('Invalid scenario');
const rate = m1Config.tickRate;
const c = {
  ...structuredClone(m1Config),
  campaign: structuredClone(campaignDefinition),
  creepCombat: structuredClone(creepCombatDefinition),
  creepSpawns: [],
  personalCraftLoot: true,
};
if (variant !== 'candidate') {
  c.campaign.dungeonXp = [3, 5, 8, 11, 14];
  c.campaign.dungeonGold = [0.8, 1.5, 2, 2.5, 3];
  c.campaign.chapterSeconds = variant === 'compressed' ? 600 : 900;
}
const productionCampaignHash = createHash('sha256')
  .update(JSON.stringify(withoutTrialXpFields(c.campaign)))
  .digest('hex');
const priceHash = createHash('sha256')
  .update(JSON.stringify(c.economy))
  .digest('hex');
c.campaign = campaignSchema.parse(withCampaignXpProfile(c.campaign, xpProfile));
if (
  createHash('sha256')
    .update(JSON.stringify(withoutTrialXpFields(c.campaign)))
    .digest('hex') !== productionCampaignHash
)
  throw Error('Trial changed non-XP campaign fields');
const invasion = createInvasionDefinition(
  variant === 'legacy' ? 180 : 120,
  2000,
  {
    portalCount: 4,
    rowsPerGate: variant === 'legacy' ? 1 : 2,
    restAfterStream: variant === 'candidate',
  },
);
const m = new DungeonMatch(
  c,
  structuredClone(creepDungeon),
  seed,
  mode === 'forecast' ? undefined : invasion,
);
const geometry = arenaVariants.dao_hoa_dao;
m.registerArenaCenter(geometry.circleCenter);
c.collision = geometry.collision.map((w) => ({ ...w }));
c.combatCollision = [];
m.arena.config.collision = [...c.collision, invasion.statue.collision];
m.arena.config.combatCollision = [invasion.statue.collision];
invasion.lanes.west.y = invasion.lanes.east.y = geometry.roadCenter.y;
if (invasion.lanes.north) invasion.lanes.north.x = geometry.roadCenter.x;
if (invasion.lanes.south) invasion.lanes.south.x = geometry.roadCenter.x;
const roster =
  players === 1
    ? [basic]
    : [
        'cai_bang_chuong',
        'cai_bang_bong',
        'thien_son_phien',
        'thien_son_dao',
        'vo_dang_kiem',
        'thieu_lam_quyen',
      ];
// Resolve canonical basic IDs instead of assuming abbreviated fan IDs.
for (let i = 0; i < roster.length; i++)
  if (!c.basics[roster[i]!]) {
    const school = roster[i]!.startsWith('thien_son') ? 'thien_son' : '';
    if (school)
      roster[i] = c.progression!.schools[school]!.basicIds[i === 2 ? 0 : 1]!;
    else throw Error('Unknown basic ' + roster[i]);
  }
interface Bot {
  hero: Hero;
  spentGear: number;
  spentPotion: number;
  usedPotions: number;
  deaths: number;
  farmXp: number;
  farmGold: number;
  invasionXp: number;
  invasionGold: number;
  bossXp: number;
  bossGold: number;
  lastLevel: number;
  shopUntil: number;
  path: Point[];
  pathAt: number;
  goal?: Point;
  zoneId: string;
  ticks: Record<string, number>;
  activity: string;
}
const bots: Bot[] = [];
for (let i = 0; i < players; i++) {
  const h = m.add('bot' + i, 'Bot ' + i);
  const school = Object.entries(c.progression!.schools).find(([, p]) =>
    p.basicIds.includes(roster[i]!),
  )?.[0];
  if (!school) throw Error('Unknown school ' + roster[i]);
  h.schoolId = school;
  initializeProgression(h, c, 'fixed', roster[i]);
  if (mode !== 'natural') h.invulnerable = true;
  bots.push({
    hero: h,
    spentGear: 0,
    spentPotion: 0,
    usedPotions: 0,
    deaths: 0,
    farmXp: 0,
    farmGold: 0,
    invasionXp: 0,
    invasionGold: 0,
    bossXp: 0,
    bossGold: 0,
    lastLevel: 0,
    shopUntil: 0,
    path: [],
    pathAt: -Infinity,
    zoneId: 'arena',
    ticks: {},
    activity: 'farm',
  });
}

const craftBranches = {
  boots: 'cleanse',
  armor: 'slow_aura',
  hat: 'recovery',
  weapon: 'penetration',
} as const;
function transact(b: Bot, action: MerchantAction) {
  const h = b.hero,
    z = m.zoneOf(h.id)!;
  const before = h.gold;
  const err = transactMerchant(
    h,
    z.config,
    { inArena: z === m.arena, matchTick: m.tick, worldTick: z.world.tick },
    h.inventory!.revision,
    action,
  );
  if (!err) {
    if (action.action === 'buy-potion') b.spentPotion += before - h.gold;
    else if (action.action === 'use-potion') b.usedPotions++;
    else b.spentGear += before - h.gold;
  }
  return !err;
}
let chapter = 0;
function shop(b: Bot) {
  const h = b.hero,
    inv = h.inventory!;
  if (h.hp <= 0 || m.zoneOf(h.id) !== m.arena) return;
  for (let attempt = 0; attempt < 30; attempt++) {
    const craft = (['boots', 'armor', 'hat', 'weapon'] as EquipmentSlot[]).find(
      (slot) => (inv.materials?.[slot] ?? 0) > 0 && !inv.crafted?.[slot],
    );
    if (craft) {
      const action: MerchantAction =
        inv.levels[craft] < 5
          ? { action: 'buy-basic', slot: craft }
          : { action: 'craft', slot: craft, branch: craftBranches[craft] };
      if (!transact(b, action)) break;
      continue;
    }
    const goal = [2, 3, 4, 5, 5][chapter]!;
    const slots: EquipmentSlot[] = ['weapon', 'hat', 'armor', 'boots'];
    const slot = slots
      .filter((s) => !inv.crafted?.[s] && inv.levels[s] < goal)
      .sort((a, b) => inv.levels[a] - inv.levels[b])[0];
    if (!slot || !transact(b, { action: 'buy-basic', slot })) break;
  }
  // Refill depleted small-potion stock, never grant gold or stock for free.
  for (const id of ['hp_small', 'mp_small'] as const) {
    const total = Object.values(inv.potions).reduce((n, v) => n + (v ?? 0), 0);
    if ((inv.potions[id] ?? 0) < 3 && total < 20 && h.gold >= 4)
      transact(b, {
        action: 'buy-potion',
        potionId: id,
        quantity: Math.min(
          3 - (inv.potions[id] ?? 0),
          20 - total,
          Math.floor(h.gold / 4),
        ),
      });
  }
}
function learn(b: Bot) {
  if (b.lastLevel === b.hero.level) return;
  b.lastLevel = b.hero.level;
  for (let pass = 0; pass < 4; pass++)
    for (const slot of [4, 0, 1, 2, 3]) {
      if (pointAccounting(b.hero, c).available <= 0) return;
      m.modifyBuild(
        b.hero.id,
        b.hero.lastSequence + 1,
        b.hero.progression!.revision,
        { action: 'upgrade-slot', slot },
      );
    }
}
function input(b: Bot, command: Parameters<DungeonMatch['input']>[2]) {
  m.input(b.hero.id, b.hero.lastSequence + 1, command);
}
function walk(b: Bot, z: MatchZone, goal: Point, stop = 10) {
  const h = b.hero;
  if (Math.hypot(h.x - goal.x, h.y - goal.y) <= stop) {
    input(b, { kind: 'move', x: 0, y: 0 });
    return;
  }
  if (
    b.zoneId !== z.id ||
    m.tick - b.pathAt >= 30 ||
    !b.goal ||
    Math.hypot(b.goal.x - goal.x, b.goal.y - goal.y) > 64
  ) {
    b.path = findWalkPath(
      h,
      goal,
      z.config.radius,
      z.config,
      z.config.collision,
    );
    b.pathAt = m.tick;
    b.goal = { ...goal };
    b.zoneId = z.id;
  }
  while (
    b.path.length &&
    Math.hypot(h.x - b.path[0]!.x, h.y - b.path[0]!.y) < 14
  )
    b.path.shift();
  const next = b.path[0] ?? goal;
  input(b, {
    kind: 'move',
    x: Math.abs(next.x - h.x) < 5 ? 0 : Math.sign(next.x - h.x),
    y: Math.abs(next.y - h.y) < 5 ? 0 : Math.sign(next.y - h.y),
  });
}
function fight(b: Bot, z: MatchZone) {
  const h = b.hero;
  const enemies = [...z.world.creeps.values()].filter(
    (e) => e.hp > 0 && !e.summonedBy,
  );
  const origin = z === m.arena ? m.arena.world.statue! : h;
  const target = enemies.sort(
    (a, e) =>
      Math.hypot(a.x - origin.x, a.y - origin.y) -
      Math.hypot(e.x - origin.x, e.y - origin.y),
  )[0];
  if (!target) {
    input(b, { kind: 'move', x: 0, y: 0 });
    return;
  }
  const a = z.config.basics[h.basicId]!;
  const range = 'range' in a.effect ? a.effect.range : 65;
  const desired = Math.max(35, Math.min(145, range * 0.65));
  if (Math.hypot(target.x - h.x, target.y - h.y) > desired) {
    let goal: Point = target;
    if (
      blocked(
        goal,
        z.config.radius,
        z.config.width,
        z.config.height,
        z.config.collision,
      )
    ) {
      goal =
        [-1, 1]
          .flatMap((x) =>
            [-1, 1].map((y) => ({
              x: target.x + x * 48,
              y: target.y + y * 48,
            })),
          )
          .find(
            (p) =>
              !blocked(
                p,
                z.config.radius,
                z.config.width,
                z.config.height,
                z.config.collision,
              ),
          ) ?? h;
    }
    walk(b, z, goal, desired * 0.7);
  } else input(b, { kind: 'move', x: 0, y: 0 });
  const slot = Math.floor(m.tick / 6) % 5;
  const skill = equippedAbility(h, slot, z.config);
  if (
    skill &&
    z.world.tick >= h.actionUntil &&
    z.world.tick >= (h.skillCooldowns[slot] ?? 0) &&
    h.mana >= skill.manaCost
  )
    input(b, { kind: 'cast', slot });
  else input(b, { kind: 'basic', targetId: target.id });
}
let forecastWave = 0;
let assumedInvasionCreeps = 0;
const defenseTailSeconds = Number(option('defense-tail-seconds', '30'));
const cpuSeconds = Number(option('cpu-seconds', '180'));
const checkpoints: unknown[] = [];
let wallExtraSeconds = 0;
let busyUntil = 0;
let busyBoss = '';
let finalUntil = 0;
let outcome = 'time_limit';
const waveBosses = ['dong_ta', 'tay_doc_boss', 'boss_nam_de', 'bac_cai'];
const dungeonBosses = [
  'boss_ly_mac_sau',
  'hong_liet_boss',
  'chu_ba_thong',
  'kim_luan_phap_vuong',
];
const goals = [
  { level: 6, gold: [450, 650], crafts: 0 },
  { level: 12, gold: [1500, 1800], crafts: 1 },
  { level: 18, gold: [2700, 3100], crafts: 2 },
  { level: 24, gold: [4000, 4600], crafts: 3 },
  { level: 26, gold: [5000, 5600], crafts: 4 },
];
function checkpoint(boss: string, targetIndex: number) {
  for (const b of bots) shop(b);
  const goal = goals[targetIndex]!;
  const row = {
    boss,
    invasionSeconds: m.arenaTick / rate,
    wallSeconds: m.tick / rate + wallExtraSeconds,
    wave: m.invasion?.wave ?? forecastWave,
    goal,
    players: bots.map((b) => ({
      id: b.hero.id,
      basic: b.hero.basicId,
      level: b.hero.level,
      xp: b.hero.xp,
      goldEarned: b.hero.gold + b.spentGear + b.spentPotion,
      goldHeld: b.hero.gold,
      farmXp: b.farmXp,
      farmGold: b.farmGold,
      invasionXp: b.invasionXp,
      invasionGold: b.invasionGold,
      bossXp: b.bossXp,
      bossGold: b.bossGold,
      farmXpRemainder: b.hero.farmXpRemainder ?? 0,
      farmGoldRemainder: b.hero.farmGoldRemainder ?? 0,
      gearSpent: b.spentGear,
      potionSpent: b.spentPotion,
      potionsUsed: b.usedPotions,
      deaths: b.deaths,
      levels: { ...b.hero.inventory!.levels },
      crafted: { ...b.hero.inventory!.crafted },
      materials: { ...b.hero.inventory!.materials },
      dragonBonus: b.hero.dragonBonus ?? 0,
      timeSeconds: Object.fromEntries(
        Object.entries(b.ticks).map(([k, v]) => [k, v / rate]),
      ),
      levelShortfall: Math.max(0, goal.level - b.hero.level),
      goldShortfall: Math.max(
        0,
        goal.gold[0]! - (b.hero.gold + b.spentGear + b.spentPotion),
      ),
      craftedShortfall: Math.max(
        0,
        goal.crafts - Object.keys(b.hero.inventory!.crafted ?? {}).length,
      ),
    })),
  };
  checkpoints.push(row);
  console.log(
    JSON.stringify({
      event: 'checkpoint',
      variant,
      players,
      seed,
      mode,
      boss,
      seconds: row.invasionSeconds,
      level: row.players.map((p) => p.level),
      earned: row.players.map((p) => p.goldEarned),
      gear: row.players.map((p) => p.levels),
      crafted: row.players.map((p) => Object.keys(p.crafted)),
    }),
  );
}
function assumedBossClear(bossId: string) {
  const boss = {
    id: bossId,
    damagedBy: new Set(bots.map((b) => b.hero.id)),
    campaignPlayers: players,
  } as Creep;
  const before = bots.map((b) => ({ xp: b.hero.xp, gold: b.hero.gold }));
  if (!awardCampaignBoss(m.arena.world, c, boss))
    throw Error('Unknown assumed boss ' + bossId);
  for (const [i, b] of bots.entries()) {
    b.bossXp += b.hero.xp - before[i]!.xp;
    b.bossGold += b.hero.gold - before[i]!.gold;
  }
  for (const slot of ['weapon', 'armor', 'hat', 'boots'] as EquipmentSlot[])
    if (c.economy!.recipes[slot].bossId === bossId)
      grantCraftMaterial(m.arena.world, c, boss, slot);
  for (const b of bots) shop(b);
}
let farmKills = 0,
  invasionKills = 0,
  naturalDamageToStatue = 0;
const started = performance.now();
if (mode === 'forecast') {
  const scheduleWorld = createWorld(c, seed);
  const schedule = new InvasionDirector(invasion, scheduleWorld);
  const pools = new Map<number, Array<{ xp: number; gold: number }>>();
  const settleAt = new Map<number, number>();
  let settledWave = 0;
  while (m.tick / rate + wallExtraSeconds < maxSeconds) {
    if ((performance.now() - started) / 1000 > cpuSeconds) {
      outcome = 'cpu_limit';
      break;
    }
    schedule.beforeStep(scheduleWorld, c, m.arenaTick, players);
    forecastWave = schedule.wave;
    for (const event of schedule.events)
      if (event.kind === 'wave')
        settleAt.set(
          event.wave,
          event.atTick + invasion.streamTicks! + defenseTailSeconds * rate,
        );
    for (const e of scheduleWorld.creeps.values()) {
      const wave = e.invasion!.wave;
      if (!pools.has(wave)) pools.set(wave, []);
      pools
        .get(wave)!
        .push({ xp: e.stats!.xp / players, gold: e.stats!.gold / players });
    }
    scheduleWorld.creeps.clear();
    for (const [wave, when] of settleAt)
      if (m.arenaTick >= when) {
        // Forecast assumption only: every player contributed to every invasion creep.
        for (const reward of pools.get(wave) ?? [])
          for (const b of bots) {
            const xp = b.hero.xp,
              gold = b.hero.gold;
            grantFarmReward(
              b.hero,
              reward.xp,
              reward.gold,
              c,
              m.arena.world.campaign!.chapter,
            );
            b.invasionXp += b.hero.xp - xp;
            b.invasionGold += b.hero.gold - gold;
          }
        assumedInvasionCreeps += pools.get(wave)?.length ?? 0;
        pools.delete(wave);
        settleAt.delete(wave);
        settledWave = wave;
      }
    if (busyBoss && m.tick >= busyUntil) {
      const index = waveBosses.indexOf(busyBoss);
      assumedBossClear(busyBoss);
      checkpoint(dungeonBosses[index]!, index);
      wallExtraSeconds += bossSeconds;
      assumedBossClear(dungeonBosses[index]!);
      chapter++;
      for (const b of bots) shop(b);
      busyBoss = '';
      if (chapter === 4) finalUntil = m.tick + 60 * rate;
    }
    const bossDue = chapter < 4 && settledWave >= (chapter + 1) * 5;
    if (
      !busyBoss &&
      !finalUntil &&
      bossDue &&
      bots.every((b) => m.zoneOf(b.hero.id) === m.arena)
    ) {
      checkpoint(waveBosses[chapter]!, chapter);
      busyBoss = waveBosses[chapter]!;
      busyUntil = m.tick + (bossSeconds + 10) * rate;
    }
    if (finalUntil && m.tick >= finalUntil) {
      checkpoint('vuong_trung_duong', 4);
      outcome = 'conditional_economy_complete';
      break;
    }
    const inDefense =
      ([...settleAt.values()].some((when) => m.arenaTick <= when) &&
        schedule.streaming) ||
      [...settleAt].some(
        ([, when]) =>
          m.arenaTick >= when - (60 + defenseTailSeconds + 30) * rate &&
          m.arenaTick <= when,
      );
    const returnNow =
      inDefense ||
      schedule.nextWaveTick - m.arenaTick <= 30 * rate ||
      !!busyBoss ||
      bossDue ||
      !!finalUntil;
    for (const b of bots) {
      const h = b.hero,
        z = m.zoneOf(h.id)!;
      if (m.tick % 6 === 0) {
        learn(b);
        b.activity = busyBoss
          ? 'assumed_wave_boss'
          : z === m.arena
            ? 'assumed_defense'
            : 'farm';
        if (busyBoss) input(b, { kind: 'move', x: 0, y: 0 });
        else if (z !== m.arena && returnNow) {
          b.activity = 'return';
          if (
            Math.hypot(h.x - creepDungeon.exit.x, h.y - creepDungeon.exit.y) <=
            creepDungeon.exitRange
          ) {
            if (!m.exit(h.id)) {
              b.shopUntil = m.tick + 5 * rate;
              b.path = [];
            }
          } else walk(b, z, creepDungeon.exit, creepDungeon.exitRange * 0.6);
        } else if (z === m.arena) {
          if (m.tick % rate === 0) shop(b);
          if (m.tick < b.shopUntil) {
            b.activity = 'shopping';
            input(b, { kind: 'move', x: 0, y: 0 });
          } else if (!returnNow) {
            m.enter(h.id, 'private', 'forest');
            b.path = [];
            b.activity = 'farm';
          }
        } else {
          if (h.mana < h.maxMana * 0.25)
            transact(b, { action: 'use-potion', potionId: 'mp_small' });
          fight(b, z);
        }
      }
      b.ticks[b.activity] = (b.ticks[b.activity] ?? 0) + 1;
    }
    const beforeFarm = bots.map((b) => ({ xp: b.hero.xp, gold: b.hero.gold }));
    m.step();
    for (const [i, b] of bots.entries()) {
      b.farmXp += b.hero.xp - beforeFarm[i]!.xp;
      b.farmGold += b.hero.gold - beforeFarm[i]!.gold;
    }
    for (const { zoneId, event } of m.events)
      if (event.kind === 'death' && zoneId.startsWith('forest')) farmKills++;
  }
} else
  while (m.tick / rate + wallExtraSeconds < maxSeconds) {
    if ((performance.now() - started) / 1000 > cpuSeconds) {
      outcome = 'cpu_limit';
      break;
    }
    const livingInvasion = [...m.arena.world.creeps.values()].some(
      (e) => e.hp > 0 && e.invasion,
    );
    const everyoneHome = bots.every((b) => m.zoneOf(b.hero.id) === m.arena);
    if (busyBoss && m.tick >= busyUntil) {
      const index = waveBosses.indexOf(busyBoss);
      assumedBossClear(busyBoss);
      checkpoint(dungeonBosses[index]!, index);
      // Conditional encounter cost: all enter the same dungeon boss, so the invasion clock pauses.
      wallExtraSeconds += bossSeconds;
      assumedBossClear(dungeonBosses[index]!);
      chapter++;
      for (const b of bots) shop(b);
      busyBoss = '';
      if (chapter === 4) finalUntil = m.tick + 60 * rate;
    }
    if (
      !busyBoss &&
      !finalUntil &&
      chapter < 4 &&
      everyoneHome &&
      ![...m.arena.world.creeps.values()].some(
        (e) => e.hp > 0 && e.invasion && e.invasion.wave <= (chapter + 1) * 5,
      ) &&
      ![...(m.arena.world.invasionPending ?? [])].some(
        (w) => w <= (chapter + 1) * 5,
      ) &&
      m.invasion!.wave >= (chapter + 1) * 5
    ) {
      checkpoint(waveBosses[chapter]!, chapter);
      if (mode === 'natural' || (m.invasion!.wave >= endWave && endWave < 20)) {
        outcome = 'reached_checkpoint';
        break;
      }
      busyBoss = waveBosses[chapter]!;
      busyUntil = m.tick + bossSeconds * rate;
    }
    if (finalUntil && m.tick >= finalUntil) {
      checkpoint('vuong_trung_duong', 4);
      outcome = 'conditional_economy_complete';
      break;
    }
    const returnNow =
      m.invasion!.streaming ||
      livingInvasion ||
      m.invasion!.nextWaveTick - m.arenaTick <= 30 * rate ||
      !!busyBoss ||
      !!finalUntil;
    for (const b of bots) {
      const h = b.hero,
        z = m.zoneOf(h.id)!;
      let activity = b.activity;
      if (h.hp <= 0) activity = 'dead';
      else if (busyBoss) {
        activity = 'assumed_wave_boss';
        if (m.tick % 6 === 0) input(b, { kind: 'move', x: 0, y: 0 });
      } else if (m.tick % 6 === 0) {
        learn(b);
        if (h.hp < h.maxHp * 0.45)
          transact(b, { action: 'use-potion', potionId: 'hp_small' });
        else if (h.mana < h.maxMana * 0.25)
          transact(b, { action: 'use-potion', potionId: 'mp_small' });
        if (z !== m.arena && returnNow) {
          activity = 'return';
          if (
            Math.hypot(h.x - creepDungeon.exit.x, h.y - creepDungeon.exit.y) <=
            creepDungeon.exitRange
          ) {
            if (!m.exit(h.id)) {
              b.shopUntil = m.tick + 5 * rate;
              b.path = [];
            }
          } else walk(b, z, creepDungeon.exit, creepDungeon.exitRange * 0.6);
        } else if (z === m.arena) {
          if (m.tick % rate === 0) shop(b);
          if (m.tick < b.shopUntil && !livingInvasion) {
            activity = 'shopping';
            input(b, { kind: 'move', x: 0, y: 0 });
          } else if (!returnNow && !finalUntil) {
            m.enter(h.id, 'private', 'forest');
            b.path = [];
            activity = 'farm';
          } else fight(b, z);
        } else fight(b, z);
      }
      b.activity = activity;
      b.ticks[activity] = (b.ticks[activity] ?? 0) + 1;
    }
    m.step();
    for (const { zoneId, event } of m.events) {
      if (event.kind === 'death' && event.targetId.startsWith('bot'))
        bots.find((b) => b.hero.id === event.targetId)!.deaths++;
      if (event.kind === 'death' && event.targetId.startsWith('invasion_'))
        invasionKills++;
      else if (event.kind === 'death' && zoneId.startsWith('forest'))
        farmKills++;
      if (event.kind === 'hit' && event.targetId === 'statue')
        naturalDamageToStatue += event.damage;
    }
    if (m.invasion!.defeated) {
      outcome = 'statue_defeated';
      break;
    }
    if (m.tick % (300 * rate) === 0)
      console.log(
        JSON.stringify({
          event: 'progress',
          variant,
          players,
          seed,
          mode,
          seconds: m.arenaTick / rate,
          wave: m.invasion?.wave ?? forecastWave,
          chapter,
          alive: [...m.arena.world.creeps.values()].filter((e) => e.hp > 0)
            .length,
          level: bots.map((b) => b.hero.level),
          farmKills,
          invasionKills,
          wallMs: Math.round(performance.now() - started),
        }),
      );
  }
const report = {
  version: 3,
  xpProfile,
  profileSourceHash: createHash('sha256')
    .update(readFileSync(new URL('./campaign-xp-profiles.ts', import.meta.url)))
    .digest('hex'),
  nonXpCampaignHash: productionCampaignHash,
  economyHash: priceHash,
  sourceHash: createHash('sha256')
    .update(readFileSync(new URL(import.meta.url)))
    .digest('hex'),
  coreHashes: Object.fromEntries(
    [
      'campaign',
      'combat',
      'simulation',
      'dungeons',
      'progression',
      'invasions',
    ].map((name) => [
      name,
      createHash('sha256')
        .update(
          readFileSync(
            new URL(
              '../packages/game-core/src/' + name + '.ts',
              import.meta.url,
            ),
          ),
        )
        .digest('hex'),
    ]),
  ),
  variant,
  players,
  seed,
  mode,
  roster,
  outcome,
  bossSecondsAssumed: bossSeconds,
  defenseTailSeconds,
  assumedInvasionCreeps,
  method:
    mode === 'forecast'
      ? 'Conditional economic forecast: full invasion rewards and successful boss clears are ASSUMED, not combat outcomes. Invasion spawn counts/pools come from the real director; per-creep EXP penalty, real private-dungeon combat, collisions, walking return, skill learning and shopping use core. Heroes are invulnerable. Each defense reserves stream + configured clear tail and a 30-second return lead; wave boss time advances the clock, dungeon boss time pauses it. No boss damage/potion/death cost is modeled. This is optimistic income/clear eligibility, not a campaign victory or optimal human farm rate.'
      : mode === 'natural'
        ? 'Real server-owned ticks, collision, travel, combat, gold/XP eligibility, potion costs and purchases. No invulnerability. Stops at statue loss or first wave-boss readiness; it does not fight the nine bosses.'
        : 'Conditional economy run: real regular-creep ticks/combat/travel/rewards/purchases with invulnerable heroes and statue. Boss actors/mechanics are NOT simulated. Each wave boss consumes an assumed duration while invasion clock advances; each dungeon boss consumes the same wall duration with invasion clock paused. Successful eligible first clears/materials/pearls are assumed and settled through core APIs. This is an optimistic readiness stress test, NOT a natural campaign clear.',
  config: {
    intervalSeconds: invasion.intervalTicks / rate,
    streamSeconds: invasion.streamTicks! / rate,
    restAfterStream: invasion.restAfterStream,
    rowsPerGate: invasion.rowsPerGate,
    chapterSeconds: c.campaign.chapterSeconds,
    invasionXp: c.campaign.invasionXp,
    bossXp: Object.fromEntries(
      Object.entries(c.campaign.bosses).map(([id, boss]) => [id, boss.xp]),
    ),
    dungeonXp: c.campaign.dungeonXp,
    xpThresholds: c.campaign.xpThresholds,
    dungeonGold: c.campaign.dungeonGold,
  },
  seconds: m.arenaTick / rate,
  wallSeconds: m.tick / rate + wallExtraSeconds,
  wallMs: Math.round(performance.now() - started),
  statueHp: m.arena.world.statue?.hp ?? null,
  naturalDamageToStatue,
  invasionKills,
  farmKills,
  checkpoints,
  finalPlayers: bots.map((b) => ({
    id: b.hero.id,
    basic: b.hero.basicId,
    level: b.hero.level,
    xp: b.hero.xp,
    goldEarned: b.hero.gold + b.spentGear + b.spentPotion,
    goldHeld: b.hero.gold,
    levels: b.hero.inventory!.levels,
    crafted: b.hero.inventory!.crafted,
    timeSeconds: Object.fromEntries(
      Object.entries(b.ticks).map(([k, v]) => [k, v / rate]),
    ),
  })),
};
const directory = new URL('../artifacts/campaign-xp-trial/', import.meta.url);
mkdirSync(directory, { recursive: true });
const name = `${xpProfile}-${mode}-${variant}-p${players}-${basic}-${seed}-boss${bossSeconds}-end${endWave}-tail${defenseTailSeconds}.json`;
writeFileSync(new URL(name, directory), JSON.stringify(report, null, 2) + '\n');
console.log(
  JSON.stringify({
    event: 'complete',
    variant,
    players,
    seed,
    mode,
    outcome,
    seconds: report.seconds,
    wallMs: report.wallMs,
    checkpoints: checkpoints.length,
    invasionKills,
    farmKills,
    file: name,
  }),
);
