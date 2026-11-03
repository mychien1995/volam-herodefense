import { it, expect } from 'vitest';
import {
  createWorld,
  addHero,
  stepWorld,
  initializeNamDe,
  spawnNamDeIfReady,
  beginNamDeCast,
  NAM_DE_ID,
  BacCaiEncounter,
  TayDocEncounter,
  insideEllipse,
} from '@volam/game-core';
import {
  m1Config,
  namDeDefinition,
  bacCaiDefinition,
  tayDocDefinition,
  dongTaDefinition,
} from '@volam/game-data';

function base(seed = 42) {
  const c = {
    ...structuredClone(m1Config),
    creepSpawns: [],
    collision: [],
    critChance: 0,
    heroBounds: dongTaDefinition.bounds,
  };
  const w = createWorld(c, seed),
    h = addHero(w, 'p', 'P', c);
  h.x = 970;
  h.y = 650;
  h.hp = h.maxHp = 100000;
  const step = (n = 1) => {
    for (let i = 0; i < n; i++) stepWorld(w, c);
  };
  return { c, w, h, step };
}
function nam(seed = 42) {
  const s = base(seed);
  initializeNamDe(s.w, s.c, structuredClone(namDeDefinition));
  s.w.namDe!.phase = 'rest';
  spawnNamDeIfReady(s.w, s.c, 0);
  s.w.namDe!.phase = 'idle';
  s.w.namDe!.nextActionAt = 1e9;
  const b = s.w.creeps.get(NAM_DE_ID)!;
  b.x = 970;
  b.y = 720;
  return { ...s, b };
}
it('sky cast actually dashes to court center and emits96 fixed arena footprints in the same window', () => {
  const s = nam();
  beginNamDeCast(s.w, s.c, 'nhat_duong_quy_tong');
  const positions = [...s.w.namDe!.effects.values()].map((e) => ({
    id: e.id,
    x: e.x,
    y: e.y,
    activeAt: e.activeAt,
  }));
  expect(positions).toHaveLength(96);
  for (const p of positions)
    expect(
      insideEllipse(p, dongTaDefinition.bounds, namDeDefinition.skyRadius),
    ).toBe(true);
  s.step(9);
  expect(s.b.x).toBeCloseTo(800);
  expect(s.b.y).toBeCloseTo(616);
  s.h.x = 600;
  s.h.y = 650;
  s.step(2);
  expect(
    [...s.w.namDe!.effects.values()].map((e) => ({
      id: e.id,
      x: e.x,
      y: e.y,
      activeAt: e.activeAt,
    })),
  ).toEqual(positions);
  expect(
    positions.at(-1)!.activeAt - positions[0]!.activeAt,
  ).toBeLessThanOrEqual(160);
});
it('small gold burst always releases five shots and each shot samples the same moving target anew, then stays straight', () => {
  const counts = new Set<number>();
  for (let seed = 1; seed <= 25; seed++) {
    const s = nam(Math.imul(seed, 0x9e3779b9) >>> 0 || 1);
    s.b.x = 800;
    s.b.y = 616;
    beginNamDeCast(s.w, s.c, 'nam_de_small_finger', s.h.id);
    const shots = new Map<string, { fx: number; fy: number }>();
    for (let t = 0; t < 55; t++) {
      s.h.x = 960;
      s.h.y = 540 + t * 2;
      s.step();
      for (const e of s.w.namDe!.effects.values())
        if (e.kind === 'finger') {
          const old = shots.get(e.id);
          if (old) {
            expect(e.fx).toBe(old.fx);
            expect(e.fy).toBe(old.fy);
          } else shots.set(e.id, { fx: e.fx, fy: e.fy });
        }
    }
    expect(shots.size).toBe(5);
    if (shots.size > 1)
      expect(new Set([...shots.values()].map((e) => e.fy)).size).toBe(
        shots.size,
      );
    counts.add(shots.size);
  }
  expect([...counts]).toEqual([5]);
});
it('a small burst and a main skill remain active together without replacing or delaying either cast', () => {
  for (const reverse of [false, true]) {
    const s = nam();
    const abilities = reverse
      ? (['nam_de_small_finger', 'nhat_duong_quy_tong'] as const)
      : (['nhat_duong_quy_tong', 'nam_de_small_finger'] as const);
    for (const ability of abilities)
      expect(beginNamDeCast(s.w, s.c, ability, s.h.id)).toBe(true);
    expect(s.w.namDe!.cast?.ability).toBe('nhat_duong_quy_tong');
    const mainId = s.w.namDe!.cast!.id;
    const shots = new Set<string>();
    for (let i = 0; i < 45; i++) {
      s.step();
      for (const e of s.w.namDe!.effects.values())
        if (e.kind === 'finger') shots.add(e.id);
    }
    expect(shots.size).toBe(5);
    expect(s.w.namDe!.cast?.id).toBe(mainId);
    expect(
      [...s.w.namDe!.effects.values()].some(
        (e) => e.kind === 'sky' && e.activeAt <= s.w.tick,
      ),
    ).toBe(true);
  }
});
it('Liên Hoàn retains four directions16volleys and rotates1.5times faster', () => {
  expect(namDeDefinition.barrageDirections).toBe(4);
  expect(namDeDefinition.barrageVolleys).toBe(16);
  expect(namDeDefinition.barrageTurnTicks).toBe(256);
  expect(namDeDefinition.barrageIntervalTicks).toBe(16);
});
it('natural concurrent shooting repeats while the long main barrage continues and cleanup cancels pending shots', () => {
  const s = nam();
  beginNamDeCast(s.w, s.c, 'lien_hoan_nhat_duong_chi', s.h.id);
  const id = s.w.namDe!.cast!.id;
  const bursts = new Map<string, Set<number>>();
  for (let i = 0; i < 280; i++) {
    s.step();
    expect(s.w.namDe!.cast!.id).toBe(id);
    for (const e of s.w.namDe!.effects.values())
      if (e.kind === 'finger') {
        const indices = bursts.get(e.castId) ?? new Set<number>();
        indices.add(e.index);
        bursts.set(e.castId, indices);
      }
  }
  expect(bursts.size).toBe(3);
  expect([...bursts.values()].map((s) => s.size)).toEqual([5, 5, 5]);
  s.b.hp = 0;
  s.step();
  expect(s.w.namDe!.smallCast).toBeUndefined();
  expect(s.w.namDe!.effects.size).toBe(0);
});
it('pillar volleys contain three inward straight shots, never eight rotating outward directions', () => {
  const s = base();
  const e = new TayDocEncounter(structuredClone(tayDocDefinition));
  e.spawn(s.w, s.c);
  e.phase = 'phase1';
  e.nextActionAt = Infinity;
  e.begin(s.w, s.c, 'hon_thien_phuc_long_chan', s.h);
  const seen = new Map<string, any>();
  for (let t = 0; t < 80; t++) {
    s.step();
    e.step(s.w, s.c);
    e.nextActionAt = Infinity;
    for (const shot of e.projectiles.values())
      if (!seen.has(shot.id)) seen.set(shot.id, { ...shot });
  }
  expect(e.pillars.size).toBe(6);
  for (const p of e.pillars.values()) {
    const shots = [...seen.values()].filter((x) => x.ownerId === p.id);
    const firstAt = Math.min(...shots.map((x) => x.startedAt));
    const volley = shots.filter((x) => x.startedAt === firstAt);
    expect(volley).toHaveLength(3);
    for (const shot of volley)
      expect(shot.vx * (800 - p.x) + shot.vy * (616 - p.y)).toBeGreaterThan(0);
  }
  for (const p of e.pillars.values()) {
    const actor = s.w.creeps.get(p.id)!;
    const inward = { x: 800 - actor.x, y: 616 - actor.y };
    expect(actor.fx * inward.x + actor.fy * inward.y).toBeGreaterThan(0);
  }
});
it('all nine authoritative spinners move independently with damage, without pull/slow/stun/dash lock', () => {
  const s = base();
  const e = new BacCaiEncounter(structuredClone(bacCaiDefinition));
  e.initialize(s.w, s.c);
  e.phase = 'combat';
  const b = s.w.creeps.get('bac_cai')!;
  b.x = 800;
  b.y = 616;
  e.begin(s.w, s.c, 'vortex', s.h);
  s.step(35);
  const a = e.view(s.w, s.c);
  expect(a.spinners).toHaveLength(9);
  s.step(20);
  const z = e.view(s.w, s.c);
  for (let i = 0; i < 9; i++) {
    expect(
      Math.hypot(
        z.spinners[i]!.x - a.spinners[i]!.x,
        z.spinners[i]!.y - a.spinners[i]!.y,
      ),
    ).toBeGreaterThan(10);
    expect(insideEllipse(z.spinners[i]!, dongTaDefinition.bounds, 72)).toBe(
      true,
    );
  }
  expect(Math.hypot(b.x - 800, b.y - 616)).toBeGreaterThan(10);
  expect(
    (s.h.statuses ?? []).some(
      (x) =>
        x.sourceId === 'bac_cai' &&
        ['dash_lock', 'slow', 'stun'].includes(x.kind),
    ),
  ).toBe(false);
  const q = z.spinners[1]!;
  s.h.x = q.x;
  s.h.y = q.y;
  const hp = s.h.hp;
  s.step(2);
  expect(s.h.hp).toBeLessThan(hp);
  b.hp = 0;
  s.step();
  expect(e.view(s.w, s.c).spinners).toHaveLength(0);
});

const { bacCaiWander, DungeonMatch } = await import('@volam/game-core');
const {
  creepDungeon,
  coMoDungeon,
  chuBaThongDungeon,
  hongLietDungeon,
  kimLuanDungeon,
  bossSkillNames,
} = await import('@volam/game-data');
const reviewedPath = '../assets/reviews/wave_boss_feedback_v02/model.mjs';
const reviewed = await import(reviewedPath);
it('server random paths match the approved preview for every actor, seed and sampled instant', () => {
  for (const seed of [1, 42, 371, 10001])
    for (const elapsed of [0, 0.35, 1, 2.5, 3.9])
      expect(
        bacCaiWander(
          seed,
          elapsed,
          dongTaDefinition.bounds,
          bacCaiDefinition.vortex,
        ),
      ).toEqual(reviewed.spinPositions(seed, elapsed));
});
it('Nam corpse expires, cancel/death clears pending gold pulses and spotlight confusion keeps its rules', () => {
  const s = nam();
  beginNamDeCast(s.w, s.c, 'nam_de_small_finger', s.h.id);
  s.h.hp = 0;
  s.step(30);
  expect(
    [...s.w.namDe!.effects.values()].some((e) => e.kind === 'finger'),
  ).toBe(false);
  s.h.hp = s.h.maxHp;
  beginNamDeCast(s.w, s.c, 'phat_quang_pho_chieu', s.h.id);
  s.step(13);
  expect(s.w.namDe!.controls.get(s.h.id)?.confusion?.until).toBeGreaterThan(
    s.w.tick,
  );
  s.b.hp = 0;
  s.step();
  expect(s.w.namDe!.effects.size).toBe(0);
  s.step(namDeDefinition.corpseTicks);
  expect(s.w.creeps.has(NAM_DE_ID)).toBe(false);
});
it('each dungeon boss emits one localized special announcement at actual cast entry', () => {
  for (const id of [
    'co_mo',
    'chu_ba_thong',
    'hong_liet',
    'kim_luan',
  ] as const) {
    const c = { ...structuredClone(m1Config), creepSpawns: [], critChance: 0 };
    const m = new DungeonMatch(c, creepDungeon, 42, undefined, [
      coMoDungeon,
      chuBaThongDungeon,
      hongLietDungeon,
      kimLuanDungeon,
    ]);
    m.add('p', 'P');
    expect(m.enter('p', 'private', id)).toBeUndefined();
    const z = m.zoneOf('p')!,
      w = z.world,
      h = w.heroes.get('p')!;
    h.hp = h.maxHp = 100000;
    w.events = [];
    if (id === 'hong_liet')
      z.encounter!.begin(w, z.config, 'hoa_son_bao_phat', h);
    if (id === 'kim_luan')
      z.kim!.begin(w, z.config, 'hoac_do', 'cuong_phong_tan_loi_cong', h);
    if (id === 'co_mo') {
      const b = w.creeps.get(w.boss!.actorId)!;
      h.x = b.x + 500;
      h.y = b.y;
      w.boss!.rotation = 0;
      w.boss!.nextActionAt = w.tick;
      m.step();
    }
    if (id === 'chu_ba_thong') {
      w.chu!.phaseIndex =
        w.chu!.definition.phases.findIndex((x) => x.id === 'hands') - 1;
      w.chu!.until = w.tick;
      m.step();
    }
    const calls = w.events.filter((e) => e.stage === 'boss_shout');
    expect(calls, id).toHaveLength(1);
    expect(bossSkillNames[calls[0]!.abilityId], id).toBeTruthy();
  }
});
it('basic boss attacks remain silent and each wave special announces exactly once', () => {
  const s = nam();
  beginNamDeCast(s.w, s.c, 'nam_de_palm');
  expect(s.w.events.some((e) => e.stage === 'boss_shout')).toBe(false);
  s.w.events = [];
  beginNamDeCast(s.w, s.c, 'nhat_duong_chi');
  expect(s.w.events.filter((e) => e.stage === 'boss_shout')).toHaveLength(1);
  s.step(35);
  expect(s.w.events.some((e) => e.stage === 'boss_shout')).toBe(false);
});
