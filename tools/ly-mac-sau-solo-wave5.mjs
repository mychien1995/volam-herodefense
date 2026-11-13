import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import {
  changeBuild,
  DungeonMatch,
  equipmentSlots,
  experienceAtLevel,
  gainExperience,
  initializeProgression,
  transactMerchant,
} from '@volam/game-core';
import {
  campaignDefinition,
  coMoDungeon,
  createInvasionDefinition,
  creepCombatDefinition,
  creepDungeon,
  m1Config,
} from '@volam/game-data';

const output = process.argv[2];
if (!output) throw Error('Supply an output JSON path');

function probe(seed, policy) {
  const config = {
    ...structuredClone(m1Config),
    campaign: structuredClone(campaignDefinition),
    creepCombat: creepCombatDefinition,
    creepSpawns: [],
  };
  const hz = config.tickRate;
  const invasion = createInvasionDefinition(180, 2000, { portalCount: 4 });
  const match = new DungeonMatch(config, creepDungeon, seed, invasion, [
    coMoDungeon,
  ]);
  const hero = match.add('hero', 'Probe');
  hero.schoolId = 'thien_son';
  initializeProgression(hero, config, 'fixed', 'thien_son_phien');
  gainExperience(hero, experienceAtLevel(7, config), config);
  for (const slot of [0, 0, 0, 0, 1, 2, 4]) {
    const error = changeBuild(
      match.arena.world,
      hero,
      config,
      hero.progression.revision,
      { action: 'upgrade-slot', slot },
    );
    if (error) throw Error(JSON.stringify(error));
  }
  hero.gold = 10000;
  for (const slot of equipmentSlots) {
    for (let rank = 0; rank < 2; rank++) {
      const error = transactMerchant(
        hero,
        config,
        { inArena: true, matchTick: 0, worldTick: 0 },
        hero.inventory.revision,
        { action: 'buy-basic', slot },
      );
      if (error) throw Error(JSON.stringify(error));
    }
  }
  hero.hp = hero.maxHp;
  hero.mana = hero.maxMana;
  // Resume immediately before the fifth scheduled invasion; let the director start it.
  match.invasion.wave = 4;
  match.invasion.nextWaveTick = invasion.intervalTicks * 5;
  match.arenaTick = match.invasion.nextWaveTick - 1;
  match.step();
  if (match.invasion.wave !== 5) throw Error('Fifth invasion did not start');
  const error = match.enter(hero.id, 'shared', 'co_mo');
  if (error) throw Error(error);
  const zone = match.zoneOf(hero.id);
  const boss = zone.world.creeps.get(zone.world.boss.actorId);
  const send = (command) =>
    match.input(hero.id, hero.lastSequence + 1, command);
  let deaths = 0;
  let lowestLivingHp = hero.hp;
  let bossHits = 0;
  let summonKills = 0;
  let stunHits = 0;
  let qCasts = 0;
  const specialCasts = {};
  const summons = new Set();
  const firingSummons = new Set();
  while (zone.world.tick < 240 * hz && boss.hp > 0 && deaths < 4) {
    const dx = boss.x - hero.x;
    const dy = boss.y - hero.y;
    const range = Math.hypot(dx, dy);
    if (hero.hp > 0) {
      const toward = range > 185 ? 1 : range < 140 ? -1 : 0;
      const orbit = zone.world.areas?.some(
        (a) => a.ownerId === hero.id && a.abilityId === 'lien_hoa_phien',
      )
        ? 0
        : 0.75;
      const x = dx * toward - dy * orbit;
      const y = dy * toward + dx * orbit;
      const axis = (v, other) =>
        Math.abs(v) >= Math.abs(other) * 0.45 ? Math.sign(v) || 0 : 0;
      send({ kind: 'move', x: axis(x, y), y: axis(y, x) });
      const ready = (slot) =>
        (hero.skillCooldowns[slot] ?? 0) <= zone.world.tick;
      if (policy !== 'A only' && hero.hp < hero.maxHp * 0.85 && ready(0))
        send({ kind: 'cast', slot: 0 });
      else if (policy === 'full build') {
        const slot = [4, 2, 1].find(
          (s) => ready(s) && range <= (s === 1 ? 100 : 185),
        );
        if (slot !== undefined) send({ kind: 'cast', slot });
      }
      if (zone.world.tick % 5 === 0) send({ kind: 'basic' });
    }
    match.step();
    if (hero.hp > 0) lowestLivingHp = Math.min(lowestLivingHp, hero.hp);
    for (const { event } of match.events) {
      const { abilityId, kind, sourceId, stage, targetId } = event;
      if (
        kind === 'cast' &&
        stage === 'warning' &&
        sourceId === boss.id &&
        abilityId !== 'ly_mac_sau_basic'
      )
        specialCasts[abilityId] = (specialCasts[abilityId] ?? 0) + 1;
      if (
        kind === 'cast' &&
        sourceId === hero.id &&
        abilityId === 'lien_hoa_phien'
      )
        qCasts++;
      if (kind === 'hit' && sourceId === boss.id && targetId === hero.id) {
        bossHits++;
        if (
          hero.statuses.some(
            (s) =>
              s.kind === 'stun' &&
              s.abilityId === abilityId &&
              s.until > zone.world.tick,
          )
        )
          stunHits++;
      }
      if (stage === 'summon_spawn') summons.add(targetId);
      if (kind === 'attack' && summons.has(sourceId))
        firingSummons.add(sourceId);
      if (kind === 'death' && summons.has(targetId)) summonKills++;
      if (kind === 'death' && targetId === hero.id) deaths++;
    }
  }
  return {
    seed,
    policy,
    wave: match.invasion.wave,
    level: hero.level,
    equipment: hero.inventory.levels,
    qRank: hero.progression.ranks.lien_hoa_phien,
    cleared: boss.hp <= 0,
    seconds: zone.world.tick / hz,
    bossHp: boss.hp,
    bossMaxHp: boss.maxHp,
    deaths,
    lowestLivingHp,
    bossHits,
    specialCasts,
    qCasts,
    stunHits,
    summoned: summons.size,
    firingSummons: firingSummons.size,
    summonKills,
  };
}

const rows = [42, 1337, 9001].flatMap((seed) =>
  ['A + Q', 'A only', 'full build'].map((policy) => probe(seed, policy)),
);
const report = {
  scenario:
    'Solo Thiên Sơn Phiến, level 7, four level-2 basics, wave 5 before Đông Tà, no pearls or potion use, 240-second cap.',
  controls:
    'Eight-direction orbit near boss, A every five ticks. Q below 85% HP when equipped. Full-build policy also casts T/E/W in range. Campaign revivals apply.',
  arena: { width: coMoDungeon.width, height: coMoDungeon.height },
  rows,
};
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
console.table(
  rows.map(
    ({ seed, policy, cleared, seconds, deaths, bossHp, firingSummons }) => ({
      seed,
      policy,
      cleared,
      seconds: seconds.toFixed(1),
      deaths,
      bossHp,
      firingSummons,
    }),
  ),
);
