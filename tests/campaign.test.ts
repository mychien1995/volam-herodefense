import { BacCaiEncounter } from '../packages/game-core/src/bac-cai.js';
import { VuongEncounter } from '../packages/game-core/src/vuong-trung-duong.js';
import { describe, it, expect } from 'vitest';
import {
  DungeonMatch,
  characterStats,
  initializeProgression,
  experienceAtLevel,
  gainExperience,
  InvasionDirector,
  createWorld,
  addHero,
  emptyInventory,
  transactMerchant,
  MainBossDirector,
  spawnNamDeIfReady,
  type Hero,
} from '@volam/game-core';
import {
  m1Config,
  campaignDefinition,
  campaignSchema,
  creepDungeon,
  coMoDungeon,
  hongLietDungeon,
  chuBaThongDungeon,
  kimLuanDungeon,
  createInvasionDefinition,
  dongTaDefinition,
  tayDocDefinition,
  namDeDefinition,
  bacCaiDefinition,
  vuongDefinition,
} from '@volam/game-data';
import { hurt } from '../packages/game-core/src/combat.js';
import { bossRetryActionSchema, PROTOCOL_VERSION } from '@volam/game-protocol';
function fixture(players = 1) {
  const c = {
    ...structuredClone(m1Config),
    campaign: structuredClone(campaignDefinition),
    personalCraftLoot: true,
  };
  c.campaign.revivalSeconds = 0.1;
  c.campaign.voteSeconds = 0.3;
  const m = new DungeonMatch(
    c,
    structuredClone(creepDungeon),
    42,
    createInvasionDefinition(180, 100000, { portalCount: 4 }),
    structuredClone([
      coMoDungeon,
      hongLietDungeon,
      chuBaThongDungeon,
      kimLuanDungeon,
    ]),
    structuredClone(dongTaDefinition),
    structuredClone(tayDocDefinition),
    structuredClone(namDeDefinition),
    structuredClone(bacCaiDefinition),
    undefined,
    structuredClone(vuongDefinition),
  );
  for (let i = 0; i < players; i++) {
    const h = m.add('p' + i, 'P' + i);
    initializeProgression(h, c, 'fixed', 'cai_bang_bong');
    h.invulnerable = true;
  }
  return { m, c, h: m.hero('p0')! };
}
const ticks = (m: DungeonMatch, n = 1) => {
  for (let i = 0; i < n; i++) m.step();
};
function kill(m: DungeonMatch, h: Hero) {
  const z = m.zoneOf(h.id)!;
  hurt(z.world, h, 'test_enemy', 'fatal', h.maxHp * 100, z.config, {
    critChance: 0,
    critMultiplier: 1,
    directHp: true,
    unavoidableHpLoss: true,
  });
  m.step();
}
function wipe(m: DungeonMatch) {
  const ids = [...m.membership.keys()].filter(
    (id) => !m.party.disconnected.has(id),
  );
  for (let n = 0; n < 4; n++) {
    for (const id of ids) kill(m, m.hero(id)!);
    if (n < 3) ticks(m, 4);
  }
}
describe('approved campaign progression and economy', () => {
  it('raises boss scaling on late joins without healing or lowering it after a disconnect', () => {
    const { m, h, c } = fixture();
    m.enter(h.id, 'shared', 'co_mo');
    const z = m.zoneOf(h.id)!;
    const boss = z.world.creeps.get('boss_ly_mac_sau')!;
    hurt(z.world, boss, h.id, 'real-hit', 1000, z.config, {
      critChance: 0,
      critMultiplier: 1,
    });
    const fraction = boss.hp / boss.maxHp;
    const late = m.add('late', 'Late');
    initializeProgression(late, c, 'fixed', 'vo_dang_kiem');
    late.invulnerable = true;
    m.step();
    expect(boss.maxHp).toBe(7200 * 2.1);
    expect(boss.hp / boss.maxHp).toBeCloseTo(fraction, 3);
    m.disconnect(late.id);
    m.step();
    expect(boss.maxHp).toBe(7200 * 2.1);
  });
  it('validates config and increases the real level thresholds, with no free ultimate rank', () => {
    expect(campaignSchema.parse(campaignDefinition)).toEqual(
      campaignDefinition,
    );
    const { c, h } = fixture();
    const levels = [1, 2, 3, 4, 5, 6, 12, 18, 24, 30];
    const thresholds = [0, 45, 135, 270, 450, 670, 3310, 7480, 12880, 19720];
    expect(levels.map((level) => experienceAtLevel(level, c))).toEqual(
      thresholds,
    );
    let previousCost = 0;
    for (let level = 2; level <= c.maxLevel; level++) {
      const threshold = experienceAtLevel(level, c);
      const cost = threshold - experienceAtLevel(level - 1, c);
      expect(cost).toBeGreaterThan(previousCost);
      previousCost = cost;
      gainExperience(h, threshold - h.xp - 1, c);
      expect(h.level).toBe(level - 1);
      gainExperience(h, 1, c);
      expect(h.level).toBe(level);
      expect(h.progression!.ranks).toEqual({});
    }
    gainExperience(h, 100, c);
    expect(h.xp).toBe(19720);
  });
  it('stocks new characters once and preserves the remaining potions through travel, respawn and reconnect', () => {
    const { m, h, c } = fixture();
    expect(h.inventory?.potions).toEqual({ hp_small: 5, mp_small: 5 });
    expect(h.gold).toBe(0);
    expect(m.enter(h.id, 'private', 'forest')).toBeUndefined();
    h.hp = 1;
    expect(
      transactMerchant(
        h,
        c,
        {
          inArena: false,
          matchTick: m.tick,
          worldTick: m.zoneOf(h.id)!.world.tick,
        },
        0,
        { action: 'use-potion', potionId: 'hp_small' },
      ),
    ).toBeUndefined();
    kill(m, h);
    expect(h.hp).toBe(0);
    ticks(m, creepDungeon.respawnTicks);
    expect(h.hp).toBe(h.maxHp);
    expect(m.zoneOf(h.id)?.access).toBe('arena');
    m.disconnect(h.id);
    m.reconnect(h.id);
    expect(m.hero(h.id)?.inventory?.potions).toEqual({
      hp_small: 4,
      mp_small: 5,
    });
    const late = m.add('late', 'Late');
    expect(late.inventory?.potions).toEqual({ hp_small: 5, mp_small: 5 });
  });
  it.each([1, 2, 6])(
    'budgets the same invasion per player at %i players with two/four gates',
    (players) => {
      const pools = [];
      for (const gates of [2, 4] as const) {
        const { c } = fixture(players),
          d = createInvasionDefinition(180, 100000, { portalCount: gates }),
          w = createWorld({ ...c, creepSpawns: [] }, 42),
          director = new InvasionDirector(d, w);
        for (let i = 0; i < players; i++) addHero(w, 'p' + i, 'P', c);
        director.beforeStep(w, c, d.intervalTicks, players);
        for (
          let t = d.intervalTicks + 1;
          t <= d.intervalTicks + d.streamTicks!;
          t++
        )
          director.beforeStep(w, c, t, players);
        const creeps = [...w.creeps.values()];
        pools.push(creeps.reduce((n, e) => n + e.stats!.xp, 0));
        expect(creeps.reduce((n, e) => n + e.stats!.gold, 0)).toBeCloseTo(
          70 * players,
          6,
        );
        expect(creeps[0]!.maxHp).toBeCloseTo(
          120 * (1 + 0.2 * (players - 1)),
          0,
        );
        expect(creeps.length).toBe(gates * 30 * (1 + 0.6 * (players - 1)));
      }
      expect(pools[0]).toBeCloseTo(100 * players, 6);
      expect(pools[1]).toBeCloseTo(pools[0]!, 6);
    },
  );
  it('uses actual damaging kills, carries fractional rewards and reduces over-level farming', () => {
    const { m, h, c } = fixture();
    m.enter(h.id, 'private', 'forest');
    const z = m.zoneOf(h.id)!;
    for (const e of z.world.creeps.values())
      hurt(z.world, e, h.id, 'farm', 100000, z.config, {
        critChance: 0,
        critMultiplier: 1,
      });
    expect(h.xp).toBe(18);
    expect(h.gold).toBe(4);
    expect(h.farmGoldRemainder).toBeCloseTo(0.8);
    gainExperience(h, experienceAtLevel(8, c) - h.xp, c);
    ticks(m, 61);
    const before = h.xp;
    for (const e of z.world.creeps.values())
      if (e.hp > 0)
        hurt(z.world, e, h.id, 'farm', 100000, z.config, {
          critChance: 0,
          critMultiplier: 1,
        });
    expect(h.xp - before).toBe(4);
    expect(h.farmXpRemainder).toBe(0.5);
  });
  it('reuses all six identities while time and room count increase private-dungeon threat', () => {
    const { m, h } = fixture(6);
    m.enter(h.id, 'private', 'forest');
    const z = m.zoneOf(h.id)!;
    expect(z.world.creeps.size).toBe(9);
    const initial = z.config.creep.hp;
    m.arenaTick = 900 * m.base.tickRate;
    for (let wave = 1; wave <= 6; wave++) {
      for (const e of z.world.creeps.values())
        if (e.hp > 0)
          hurt(z.world, e, h.id, 'farm', 100000, z.config, {
            critChance: 0,
            critMultiplier: 1,
          });
      ticks(m, 61);
    }
    expect(z.wave).toBe(7);
    expect(z.config.creep.hp).toBeGreaterThan(initial * 1.5);
    expect([...z.world.creeps.values()][0]!.archetypeId).toBe('truc_xa');
    const floor = z.config.creep.hp;
    Object.assign(h, z.dungeon!.exit);
    m.exit(h.id);
    m.enter(h.id, 'private', 'forest');
    expect(m.zoneOf(h.id)!.config.creep.hp).toBe(floor);
  });
  it('awards personal first-clear pearls once and scales only school HP/MP/attack/defense', () => {
    const { m, h, c } = fixture();
    m.enter(h.id, 'shared', 'co_mo');
    const z = m.zoneOf(h.id)!;
    h.inventory = emptyInventory();
    h.inventory.levels.weapon = 5;
    const before = characterStats(h, c);
    const b = z.world.creeps.get('boss_ly_mac_sau')!;
    hurt(z.world, b, h.id, 'boss-kill', 100000, z.config, {
      critChance: 0,
      critMultiplier: 1,
    });
    m.step();
    expect(h.campaignClears).toEqual(['boss_ly_mac_sau']);
    expect(h.dragonBonus).toBe(0.04);
    expect(h.xp).toBe(150);
    expect(h.gold).toBe(140);
    expect(h.inventory.materials?.boots).toBe(1);
    const after = characterStats(h, c);
    const sameLevel = characterStats({ ...h, dragonBonus: 0 }, c);
    expect(after.total.attackPower - sameLevel.total.attackPower).toBeCloseTo(
      (sameLevel.sources.base.attackPower +
        sameLevel.sources.growth.attackPower +
        sameLevel.sources.innate.attackPower) *
        0.04,
    );
    expect(after.total.movementSpeed).toBe(before.total.movementSpeed);
    m.resetCampaignDungeon(z);
    hurt(
      z.world,
      z.world.creeps.get(b.id)!,
      h.id,
      'boss-kill',
      100000,
      z.config,
      { critChance: 0, critMultiplier: 1 },
    );
    m.step();
    expect(h.xp).toBe(150);
    expect(h.gold).toBe(140);
    expect(h.dragonBonus).toBe(0.04);
    expect(h.inventory.materials?.boots).toBe(2);
  });
  it('requires actual Kim clear and a preparation minute before the final', () => {
    const { m, c } = fixture();
    const d = new MainBossDirector(bacCaiDefinition, vuongDefinition),
      w = m.arena.world;
    for (const id of ['dong_ta', 'tay_doc', 'nam_de', 'bac_cai'] as const)
      d.recordDefeat(id);
    d.step(w, c, m.invasion);
    expect(w.vuong).toBeUndefined();
    w.campaign!.cleared.add('kim_luan_phap_vuong');
    d.step(w, c, m.invasion);
    w.tick += 59 * c.tickRate;
    d.step(w, c, m.invasion);
    expect(w.vuong).toBeUndefined();
    w.tick += c.tickRate;
    d.step(w, c, m.invasion);
    expect(w.vuong?.state).toBe('fighting');
  });
});
describe('three revivals and server-owned retry ballots', () => {
  it('does not turn an offline eliminated wave member into a fresh fighter on a voted retry', () => {
    const { m } = fixture(3);
    m.dongTa!.restartCampaign(m.arena.world, m.arena.config);
    m.step();
    wipe(m);
    const v = m.bossRetries.view('p0').retry!;
    m.disconnect('p2');
    m.bossRetries.vote('p0', v.id, true);
    m.bossRetries.vote('p1', v.id, true);
    ticks(m, 11);
    m.reconnect('p2');
    m.step();
    expect(m.hero('p2')!.bossSpectator).toBe(true);
    expect(m.hero('p2')!.hp).toBe(0);
  });
  it('excludes a drop before ballot opening and refunds their consumed potion while offline', () => {
    const { m } = fixture(2);
    for (const id of m.membership.keys()) {
      const h = m.hero(id)!;
      h.inventory = emptyInventory();
      h.inventory.potions.hp_small = 1;
      m.enter(id, 'shared', 'co_mo');
    }
    const b = m.hero('p1')!;
    b.inventory!.potions.hp_small = 0;
    m.bossRetries.recordPotion(b.id, 'hp_small', 1);
    for (let n = 0; n < 3; n++) {
      for (const id of m.membership.keys()) kill(m, m.hero(id)!);
      ticks(m, 4);
    }
    kill(m, m.hero('p0')!);
    m.disconnect('p1');
    const v = m.bossRetries.view('p0').retry!;
    expect(v.phase).toBe('vote');
    expect(v.total).toBe(1);
    expect(m.campaignCharacter('p1')!.inventory!.potions.hp_small).toBe(1);
  });
  it('a stopped wave stays uncleared, permits ordinary arena respawn, and can be called again', () => {
    const { m, h } = fixture();
    m.dongTa!.restartCampaign(m.arena.world, m.arena.config);
    m.step();
    wipe(m);
    const v = m.bossRetries.view(h.id).retry!;
    m.bossRetries.vote(h.id, v.id, false);
    expect(m.waveBossLocked).toBe(false);
    kill(m, h);
    ticks(m, 151);
    expect(h.hp).toBeGreaterThan(0);
    expect(m.dongTa!.phase).toBe('retry');
    expect(m.bossRetries.call(h.id, v.id)).toBeUndefined();
    m.step();
    expect(m.waveBossLocked).toBe(true);
    expect(m.bossRetries.view(h.id).retry?.attempt).toBe(2);
  });
  it('snapshots the electorate and refuses to count disconnected yes voters', () => {
    const { m } = fixture(3);
    for (const id of m.membership.keys()) m.enter(id, 'shared', 'co_mo');
    wipe(m);
    const v = m.bossRetries.view('p0').retry!;
    m.bossRetries.vote('p0', v.id, true);
    m.disconnect('p0');
    m.bossRetries.vote('p1', v.id, true);
    m.bossRetries.vote('p2', v.id, false);
    expect(m.bossRetries.view('p1').retry?.phase).toBe('waiting');
  });
  it.each([
    'dong_ta',
    'tay_doc_boss',
    'boss_nam_de',
    'bac_cai',
    'vuong_trung_duong',
  ])(
    '%s uses finite lives, a vote, and a clean restart rather than automatic wipe retry',
    (bossId) => {
      const { m, h } = fixture();
      const w = m.arena.world;
      if (bossId === 'dong_ta') m.dongTa!.restartCampaign(w, m.arena.config);
      if (bossId === 'tay_doc_boss') {
        m.dongTa!.phase = 'cleared';
        m.tayDoc!.spawn(w, m.arena.config);
      }
      if (bossId === 'boss_nam_de') {
        m.dongTa!.phase = 'cleared';
        m.tayDoc!.phase = 'dead';
        w.namDe!.phase = 'rest';
        w.namDe!.spawnAt = 0;
        spawnNamDeIfReady(w, m.arena.config, 0);
      }
      if (bossId === 'bac_cai') {
        m.dongTa!.phase = 'cleared';
        const e = new BacCaiEncounter(bacCaiDefinition);
        e.initialize(w, m.arena.config);
        e.phase = 'combat';
      }
      if (bossId === 'vuong_trung_duong') {
        m.dongTa!.phase = 'cleared';
        new VuongEncounter(vuongDefinition).initialize(w, m.arena.config);
      }
      m.step();
      expect(m.bossRetries.view(h.id).retry?.bossId).toBe(bossId);
      wipe(m);
      const v = m.bossRetries.view(h.id).retry!;
      expect(v.phase).toBe('vote');
      expect(m.bossRetries.vote(h.id, v.id, true)).toBeUndefined();
      m.step();
      expect(m.bossRetries.view(h.id).retry?.attempt).toBe(2);
      expect(m.bossRetries.view(h.id).retry?.revivals).toBe(3);
      expect(w.creeps.get(bossId)!.hp).toBe(w.creeps.get(bossId)!.maxHp);
    },
  );
  it('a failed final music challenge ends the attempt even with revivals remaining', () => {
    const { m, h } = fixture();
    m.dongTa!.phase = 'cleared';
    const w = m.arena.world;
    new VuongEncounter(vuongDefinition).initialize(w, m.arena.config);
    m.step();
    w.vuong!.lightningHits = 3;
    const boss = w.creeps.get('vuong_trung_duong')!;
    hurt(w, boss, h.id, 'threshold', boss.maxHp * 10, m.arena.config, {
      critChance: 0,
      critMultiplier: 1,
    });
    m.step();
    hurt(w, boss, h.id, 'threshold', boss.maxHp * 10, m.arena.config, {
      critChance: 0,
      critMultiplier: 1,
    });
    for (
      let i = 0;
      i < 1000 && m.bossRetries.view(h.id).retry?.phase !== 'vote';
      i++
    )
      m.step();
    expect(m.bossRetries.view(h.id).retry?.phase).toBe('vote');
  });
  it.each(['co_mo', 'hong_liet', 'chu_ba_thong', 'kim_luan'])(
    '%s gives three delayed revivals and a solo vote after the fourth death',
    (destination) => {
      const { m, h } = fixture();
      m.enter(h.id, 'shared', destination);
      const z = m.zoneOf(h.id)!;
      for (let n = 0; n < 3; n++) {
        const cooldown = z.world.tick + 100;
        h.skillCooldowns[0] = cooldown;
        kill(m, h);
        expect(h.hp).toBe(0);
        expect(m.bossRetries.view(h.id).retry?.phase).toBe('fighting');
        ticks(m, 4);
        expect(h.hp).toBe(h.maxHp);
        expect(h.skillCooldowns[0]).toBe(cooldown);
      }
      kill(m, h);
      const v = m.bossRetries.view(h.id).retry!;
      expect(v.phase).toBe('vote');
      expect(v.required).toBe(1);
      const wave = m.arenaTick;
      ticks(m, 2);
      expect(m.arenaTick).toBe(wave);
      expect(m.bossRetries.vote(h.id, v.id, true)).toBeUndefined();
      expect(h.hp).toBe(h.maxHp);
      expect(m.bossRetries.view(h.id).retry?.revivals).toBe(3);
      for (const enemy of z.world.creeps.values())
        expect(enemy.hp).toBe(enemy.maxHp);
      expect(m.bossRetries.vote(h.id, v.id, true)).toBeDefined();
    },
  );
  it.each([1, 2, 3, 4, 5, 6])(
    'requires ceil(N/2) yes votes among %i participants and lets dissenters leave',
    (players) => {
      const { m } = fixture(players);
      for (const id of m.membership.keys()) m.enter(id, 'shared', 'co_mo');
      wipe(m);
      const v = m.bossRetries.view('p0').retry!;
      expect(v.phase).toBe('vote');
      expect(v.required).toBe(Math.ceil(players / 2));
      expect(m.bossRetries.vote('outsider', v.id, true)).toBeDefined();
      for (let i = 0; i < players; i++)
        expect(
          m.bossRetries.vote('p' + i, v.id, i < v.required),
        ).toBeUndefined();
      expect(m.bossRetries.view('p0').retry?.attempt).toBe(2);
      for (let i = v.required; i < players; i++)
        expect(m.zoneOf('p' + i)?.id).toBe('arena');
    },
  );
  it('times out unanswered ballots, refunds only actual potion use and permits a later call', () => {
    const { m, h } = fixture();
    h.inventory = emptyInventory();
    h.inventory.potions.hp_small = 3;
    m.enter(h.id, 'shared', 'co_mo');
    h.hp = h.maxHp - 60;
    const z = m.zoneOf(h.id)!;
    expect(
      transactMerchant(
        h,
        m.base,
        { inArena: false, matchTick: m.tick, worldTick: z.world.tick },
        h.inventory.revision,
        { action: 'use-potion', potionId: 'hp_small' },
      ),
    ).toBeUndefined();
    m.bossRetries.recordPotion(h.id, 'hp_small', 1);
    expect(h.inventory.potions.hp_small).toBe(2);
    wipe(m);
    const v = m.bossRetries.view(h.id).retry!;
    expect(h.inventory.potions.hp_small).toBe(3);
    ticks(m, 11);
    expect(m.zoneOf(h.id)?.id).toBe('arena');
    expect(m.bossRetries.view(h.id).retry?.phase).toBe('waiting');
    expect(m.bossRetries.vote(h.id, v.id, true)).toBeDefined();
    expect(m.bossRetries.call(h.id, v.id)).toBeUndefined();
    expect(m.zoneOf(h.id)?.id).toBe('co_mo_shared');
    expect(h.inventory.potions.hp_small).toBe(3);
  });
  it('preserves used lives on travel and reconnect rather than granting a fresh ledger', () => {
    const { m, h } = fixture();
    m.enter(h.id, 'shared', 'co_mo');
    kill(m, h);
    ticks(m, 4);
    const z = m.zoneOf(h.id)!;
    Object.assign(h, z.dungeon!.exit);
    m.exit(h.id);
    m.enter(h.id, 'shared', 'co_mo');
    expect(m.bossRetries.view(h.id).retry?.revivals).toBe(2);
    m.disconnect(h.id);
    m.reconnect(h.id);
    expect(m.bossRetries.view(h.id).retry?.revivals).toBe(1);
  });
  it('validates only vote intentions, never client life, location, reward or voter counts', () => {
    const base = {
      protocolVersion: PROTOCOL_VERSION,
      sequence: 1,
      action: 'vote',
      id: 1,
      accept: true,
    };
    expect(bossRetryActionSchema.safeParse(base).success).toBe(true);
    for (const extra of [
      { revivals: 99 },
      { yes: 6 },
      { gold: 900 },
      { voterId: 'other' },
    ])
      expect(
        bossRetryActionSchema.safeParse({ ...base, ...extra }).success,
      ).toBe(false);
  });
});
