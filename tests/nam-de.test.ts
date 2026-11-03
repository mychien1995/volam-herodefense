import { describe, it, expect } from 'vitest';
import {
  DungeonMatch,
  createWorld,
  addHero,
  removeHero,
  initializeNamDe,
  spawnNamDeIfReady,
  stepWorld,
  beginNamDeCast,
  answerNamDe,
  submitInput,
  namDeMovement,
  clearNamDeHero,
  validateNamDe,
  namDeAbilities,
  namDeView,
  NAM_DE_ID,
} from '@volam/game-core';
import { hurt } from '../packages/game-core/src/combat.js';
import {
  namDeDefinition,
  m1Config,
  creepDungeon,
  createInvasionDefinition,
} from '@volam/game-data';
import { inputSchema, PROTOCOL_VERSION } from '@volam/game-protocol';
function setup() {
  const c = structuredClone(m1Config);
  c.creepSpawns = [];
  c.critChance = 0;
  const w = createWorld(c, 123);
  const d = structuredClone(namDeDefinition);
  initializeNamDe(w, c, d);
  const h = addHero(w, 'a', 'A', c),
    other = addHero(w, 'b', 'B', c);
  h.x = 700;
  h.y = 750;
  other.x = 1100;
  other.y = 800;
  w.namDe!.phase = 'rest';
  w.namDe!.spawnAt = 0;
  spawnNamDeIfReady(w, c, 0);
  const b = w.creeps.get(NAM_DE_ID)!;
  b.x = 800;
  b.y = 800;
  w.namDe!.phase = 'idle';
  w.namDe!.nextActionAt = 1e9;
  return { w, c, d, h, other, b };
}
const steps = (s: ReturnType<typeof setup>, n: number) => {
  for (let i = 0; i < n; i++) stepWorld(s.w, s.c);
};
function challenge() {
  const s = setup();
  s.h.x = 760;
  s.h.y = 800;
  beginNamDeCast(s.w, s.c, 'dai_ly_phong_huyet', s.h.id);
  steps(s, s.d.pressureDashTicks + 1);
  const q = s.w.namDe!.controls.get('a')!.qte!;
  expect(q.state).toBe('pending');
  return { ...s, q };
}
describe('Nam Đế authoritative encounter', () => {
  it('validates tuning/markers and rejects invalid final kit', () => {
    const s = setup();
    validateNamDe(s.d, s.c);
    for (const bad of [
      { wave: 10 },
      { qteLength: 9 },
      { damage: { ...s.d.damage, palm: NaN } },
      { spawn: { x: 0, y: 0 } },
      { barrageDirections: 1 },
      { beamHpFraction: 0.5 },
    ])
      expect(() => validateNamDe({ ...s.d, ...bad }, s.c)).toThrow();
  });
  it('gates on the last wave15 creep, waits rest, spawns once, retains invasion clock/overlap', () => {
    const c = structuredClone(m1Config);
    c.creepSpawns = [];
    const d = structuredClone(namDeDefinition);
    d.restTicks = 3;
    const invasion = createInvasionDefinition(180, 1e9);
    for (const v of invasion.waves) v.speed = 0;
    const m = new DungeonMatch(
      c,
      creepDungeon,
      42,
      invasion,
      [],
      undefined,
      undefined,
      d,
    );
    m.add('a', 'A');
    m.invasion!.wave = 14;
    m.invasion!.nextWaveTick = 1;
    m.step();
    expect(m.invasion!.wave).toBe(15);
    const creeps = [...m.arena.world.creeps.values()];
    creeps.slice(1).forEach((v) => (v.hp = 0));
    for (let i = 0; i < 5; i++) m.step();
    expect(m.arena.world.namDe!.phase).toBe('waiting');
    creeps[0]!.hp = 0;
    m.step();
    expect(m.arena.world.namDe!.phase).toBe('rest');
    m.step();
    m.step();
    expect(m.arena.world.namDe!.spawnCount).toBe(0);
    m.step();
    expect(m.arena.world.namDe!.spawnCount).toBe(1);
    expect(m.arena.world.creeps.get(NAM_DE_ID)!.y).toBeGreaterThan(
      d.entrance.y,
    );
    m.invasion!.nextWaveTick = m.tick + 1;
    m.step();
    expect(m.invasion!.wave).toBe(16);
    expect(m.invasion!.nextWaveTick - m.tick).toBe(5400);
    expect(m.arena.world.namDe!.spawnCount).toBe(1);
  });
  it('keeps the selected target and locks each released finger travel', () => {
    const s = setup();
    beginNamDeCast(s.w, s.c, 'nam_de_small_finger', 'a');
    s.h.x = 1400;
    steps(s, s.d.smallWindupTicks);
    const e = [...s.w.namDe!.effects.values()][0]!;
    expect(e.kind).toBe('finger');
    expect(s.w.namDe!.smallCast!.targetId).toBe('a');
    const v = [e.fx, e.fy];
    s.h.y = 300;
    steps(s, 2);
    expect([e.fx, e.fy]).toEqual(v);
    expect(e.speed).toBe(s.d.smallSpeed);
  });
  it('major beam warns fixed geometry and removes exactly90% maximum HP through shield/armor', () => {
    const s = setup();
    s.h.statuses = [
      {
        kind: 'mana_shield',
        magnitude: 1,
        secondary: 1,
        durationTicks: 1000,
        until: 1000,
        sourceId: 'a',
        abilityId: 'shield',
      },
      {
        kind: 'damage_reduction',
        magnitude: 0.85,
        durationTicks: 1000,
        until: 1000,
        sourceId: 'a',
        abilityId: 'guard',
      },
    ];
    s.h.mana = s.h.maxMana;
    beginNamDeCast(s.w, s.c, 'nhat_duong_chi', 'a');
    const e = [...s.w.namDe!.effects.values()][0]!,
      geometry = [e.x, e.y, e.fx, e.fy, e.length];
    steps(s, s.d.beamWarningTicks - 1);
    expect(s.h.hp).toBe(s.h.maxHp);
    expect([e.x, e.y, e.fx, e.fy, e.length]).toEqual(geometry);
    steps(s, 1);
    expect(s.h.hp).toBeCloseTo(s.h.maxHp * 0.1);
    expect(s.h.mana).toBe(s.h.maxMana);
  });
  it('emits16 volleys of4 rays with27tick warnings,90deg spacing and no tracking', () => {
    const s = setup();
    // Keep both targets alive while the independent small-finger channel also runs.
    for (const h of [s.h, s.other]) h.hp = h.maxHp = 100000;
    beginNamDeCast(s.w, s.c, 'lien_hoan_nhat_duong_chi');
    const all = new Map<string, number[]>();
    for (let i = 0; i < 500; i++) {
      stepWorld(s.w, s.c);
      for (const [id, e] of s.w.namDe!.effects)
        if (e.kind === 'beam') {
          const values = [
            e.x,
            e.y,
            e.fx,
            e.fy,
            e.activeAt,
            e.startedAt,
            e.index,
          ];
          if (all.has(id)) expect(values).toEqual(all.get(id));
          else all.set(id, values);
        }
    }
    expect(all.size).toBe(64);
    for (let i = 0; i < 16; i++) {
      const group = [...all.values()].filter(
        (v) => Math.floor(v[6]! / 4) === i,
      );
      expect(group).toHaveLength(4);
      for (const e of group) expect(e[4]! - e[5]!).toBe(27);
      expect(
        group[0]![2]! * group[1]![2]! + group[0]![3]! * group[1]![3]!,
      ).toBeCloseTo(0);
      if (i)
        expect(
          group[0]![4]! -
            [...all.values()].find((v) => v[6] === (i - 1) * 4)![4]!,
        ).toBe(16);
    }
  });
  it('QTE locks movement, incoming damage and attacks;10 physical correct keys resolve immediately', () => {
    const s = challenge(),
      hp = s.h.hp,
      bhp = s.b.hp;
    expect(hurt(s.w, s.h, 'enemy', 'test', 999, s.c)).toBe(false);
    submitInput(s.w, 'a', 1, { kind: 'move', x: 1, y: 0 });
    submitInput(s.w, 'a', 2, { kind: 'basic' });
    const x = s.h.x;
    steps(s, 1);
    expect(s.h.x).toBe(x);
    expect(s.h.hp).toBe(hp);
    for (let i = 0; i < 10; i++)
      expect(answerNamDe(s.w, s.c, s.h, s.q.id, i, s.q.keys[i]!)).toBe(true);
    expect(s.q.state).toBe('success');
    expect(s.h.namDeLocked).toBe(false);
    expect(s.b.hp).toBe(bhp);
    expect(answerNamDe(s.w, s.c, s.h, s.q.id, 9, s.q.keys[9]!)).toBe(false);
  });
  it.each(['wrong', 'timeout'] as const)(
    'QTE %s loses70%% maxHP, heals10%%, closes and stuns2s; replay cannot heal twice',
    (result) => {
      const s = challenge();
      s.b.hp = s.b.maxHp * 0.4;
      const mana = s.h.mana;
      s.h.statuses = [
        {
          kind: 'mana_shield',
          magnitude: 1,
          durationTicks: 1000,
          until: 1000,
          sourceId: 'a',
          abilityId: 'shield',
        },
        {
          kind: 'interrupt_resist',
          magnitude: 1,
          durationTicks: 1000,
          until: 1000,
          sourceId: 'a',
          abilityId: 'resist',
        },
      ];
      if (result === 'wrong')
        answerNamDe(
          s.w,
          s.c,
          s.h,
          s.q.id,
          0,
          s.q.keys[0] === 'up' ? 'down' : 'up',
        );
      else steps(s, s.q.until - s.w.tick);
      expect(s.q.state).toBe(result);
      expect(s.h.hp).toBeCloseTo(s.h.maxHp * 0.3);
      expect(s.h.mana).toBeGreaterThanOrEqual(mana);
      expect(s.b.hp).toBe(s.b.maxHp * 0.5);
      expect(s.h.namDeLocked).toBe(false);
      expect(
        s.h.statuses?.some(
          (x) => x.kind === 'stun' && x.until === s.w.tick + 60,
        ),
      ).toBe(true);
      expect(
        [...s.w.namDe!.effects.values()].some((e) => e.kind === 'backlash'),
      ).toBe(true);
      answerNamDe(s.w, s.c, s.h, s.q.id, 0, 'up');
      expect(s.b.hp).toBe(s.b.maxHp * 0.5);
      steps(s, 60);
      expect(s.w.namDe!.controls.get('a')?.stunUntil ?? 0).toBeLessThanOrEqual(
        s.w.tick,
      );
    },
  );
  it('rejects forged owner, challenge, out-of-order, replay and success payloads', () => {
    const s = challenge();
    for (const [hero, id, index] of [
      [s.other, s.q.id, 0],
      [s.h, 'nam_de_999', 0],
      [s.h, s.q.id, 1],
    ] as const)
      expect(answerNamDe(s.w, s.c, hero, id, index, 'up')).toBe(false);
    expect(s.q.index).toBe(0);
    expect(
      inputSchema.safeParse({
        protocolVersion: PROTOCOL_VERSION,
        sequence: 1,
        kind: 'nam-de-key',
        castId: s.q.id,
        index: 0,
        key: 'up',
        success: true,
      }).success,
    ).toBe(false);
    expect(
      submitInput(s.w, 'a', 1, {
        kind: 'nam-de-key',
        castId: s.q.id,
        index: 0,
        key: s.q.keys[0]!,
      }),
    ).toBe(true);
    expect(
      submitInput(s.w, 'a', 1, {
        kind: 'nam-de-key',
        castId: s.q.id,
        index: 0,
        key: s.q.keys[0]!,
      }),
    ).toBe(false);
    steps(s, 1);
    expect(s.q.index).toBe(1);
  });
  it('owns a stable10s permutation without altering physical QTE keys', () => {
    const s = setup();
    beginNamDeCast(s.w, s.c, 'phat_quang_pho_chieu', 'a');
    steps(s, 12);
    const v = s.w.namDe!.controls.get('a')!.confusion!,
      map = JSON.stringify(v.mapping);
    expect(new Set(Object.values(v.mapping)).size).toBe(4);
    s.h.moveX = 0;
    s.h.moveY = -1;
    expect(namDeMovement(s.w, s.h)).not.toEqual({ x: 0, y: -1 });
    for (let i = 0; i < 20; i++) namDeMovement(s.w, s.h);
    expect(JSON.stringify(v.mapping)).toBe(map);
    steps(s, 300);
    expect(s.w.namDe!.controls.get('a')?.confusion).toBeUndefined();
  });
  it('schedules96 fixed warned sky strikes, keeps a single expanding centered ring', () => {
    const s = setup();
    beginNamDeCast(s.w, s.c, 'nhat_duong_quy_tong');
    const rays = [...s.w.namDe!.effects.values()];
    expect(rays).toHaveLength(96);
    expect(rays.every((e) => e.activeAt - e.startedAt === 9)).toBe(true);
    s.h.x = 50;
    expect(rays.every((e) => e.x !== 50)).toBe(true);
    s.w.namDe!.effects.clear();
    beginNamDeCast(s.w, s.c, 'nam_de_aura');
    steps(s, 1);
    const ring = [...s.w.namDe!.effects.values()];
    expect(ring).toHaveLength(1);
    expect([ring[0]!.x, ring[0]!.y]).toEqual([s.b.x, s.b.y]);
  });
  it('validates rear dash endpoint and never damages statue for any ability', () => {
    for (const ability of namDeAbilities) {
      const s = setup();
      s.w.statue = { ...s.h, id: 'statue', radius: 36, hp: 1e6, maxHp: 1e6 };
      beginNamDeCast(s.w, s.c, ability);
      steps(s, 500);
      expect(s.w.statue.hp).toBe(1e6);
      expect(
        s.w.events.some(
          (e) => e.sourceId === NAM_DE_ID && e.targetId === 'statue',
        ),
      ).toBe(false);
    }
    const s = setup();
    s.h.x = 24;
    s.h.fx = 1;
    s.h.fy = 0;
    expect(beginNamDeCast(s.w, s.c, 'nam_de_dash', 'a')).toBe(false);
  });
  it('cleans death/disconnect/transfer/boss death; never respawns; rewards goldXP only', () => {
    const s = challenge();
    clearNamDeHero(s.w, 'a');
    expect(s.h.namDeLocked).toBe(false);
    expect(s.w.namDe!.controls.has('a')).toBe(false);
    s.b.hits = { a: s.w.tick, b: s.w.tick };
    const gold = s.h.gold;
    hurt(s.w, s.b, 'a', 'test', 1e9, s.c);
    steps(s, 1);
    expect(s.w.namDe!.phase).toBe('defeated');
    expect(s.w.namDe!.effects.size).toBe(0);
    expect(s.h.gold - gold).toBe(s.d.stats.gold / 2);
    expect(s.h.bossItems ?? []).toHaveLength(0);
    steps(s, 500);
    expect(s.b.hp).toBe(0);
    expect(s.w.namDe!.spawnCount).toBe(1);
    expect(namDeView(s.w)?.targets).toHaveLength(0);
  });
  it('waits with no arena targets rather than attacking statue', () => {
    const s = setup();
    s.w.heroes.clear();
    steps(s, 100);
    expect(s.w.namDe!.cast).toBeUndefined();
    expect(s.b.pose).toBe('idle');
  });
  it('same seed and command stream produce identical encounter', () => {
    const a = setup(),
      b = setup();
    for (const s of [a, b]) {
      s.w.namDe!.nextActionAt = 1;
      steps(s, 2000);
    }
    expect(JSON.stringify(namDeView(a.w))).toBe(JSON.stringify(namDeView(b.w)));
    expect([...a.w.namDe!.effects.values()]).toEqual([
      ...b.w.namDe!.effects.values(),
    ]);
  });
  it('arena lock blocks leaving; disconnect and boss death cancel pending challenges', () => {
    const c = structuredClone(m1Config);
    c.creepSpawns = [];
    const m = new DungeonMatch(
      c,
      creepDungeon,
      42,
      createInvasionDefinition(),
      [],
      undefined,
      undefined,
      structuredClone(namDeDefinition),
    );
    const h = m.add('a', 'A');
    m.add('b', 'B');
    const w = m.arena.world;
    w.namDe!.phase = 'rest';
    spawnNamDeIfReady(w, m.arena.config, 0);
    w.namDe!.phase = 'idle';
    w.namDe!.nextActionAt = 1e9;
    const b = w.creeps.get(NAM_DE_ID)!;
    b.x = 800;
    b.y = 790;
    h.x = 760;
    h.y = 790;
    beginNamDeCast(w, m.arena.config, 'dai_ly_phong_huyet', 'a');
    for (let i = 0; i < 25; i++) m.step();
    expect(h.namDeLocked).toBe(true);
    expect(m.enter('a', 'private')).toBeDefined();
    expect(m.zoneOf('a')?.id).toBe('arena');
    m.disconnect('a');
    expect(w.namDe!.controls.has('a')).toBe(false);
    expect(h.namDeLocked).toBe(false);
    const target = w.heroes.get('b')!;
    target.x = b.x - 40;
    target.y = b.y;
    beginNamDeCast(w, m.arena.config, 'dai_ly_phong_huyet', 'b');
    for (let i = 0; i < 25; i++) m.step();
    expect(target.namDeLocked).toBe(true);
    b.hp = 0;
    m.step();
    expect(target.namDeLocked).toBe(false);
    expect(w.namDe!.controls.size).toBe(0);
    expect(w.namDe!.effects.size).toBe(0);
  });
  it('wide palm travels far and hits each living player once; centered ring reaches melee only', () => {
    const p = setup();
    p.h.x = 1200;
    p.h.y = 800;
    p.other.x = 1100;
    p.other.y = 815;
    beginNamDeCast(p.w, p.c, 'nam_de_palm', 'a');
    steps(p, 60);
    const hits = p.w.nextEvent;
    expect(p.h.hp).toBeLessThan(p.h.maxHp);
    expect(p.other.hp).toBeLessThan(p.other.maxHp);
    const hp = p.h.hp;
    steps(p, 10);
    expect(p.h.hp).toBe(hp);
    expect(p.w.nextEvent).toBe(hits);
    const r = setup();
    r.h.x = 960;
    r.h.y = 800;
    r.other.x = 1030;
    r.other.y = 800;
    beginNamDeCast(r.w, r.c, 'nam_de_aura');
    steps(r, 40);
    expect(r.h.hp).toBeLessThan(r.h.maxHp);
    expect(r.other.hp).toBe(r.other.maxHp);
  });
  it('sky damage starts on its warned tick and rear dash reaches a terrain-valid fixed endpoint', () => {
    const s = setup();
    beginNamDeCast(s.w, s.c, 'nhat_duong_quy_tong');
    const e = [...s.w.namDe!.effects.values()][0]!;
    s.h.x = e.x;
    s.h.y = e.y;
    s.other.x = 30;
    s.other.y = 30;
    steps(s, s.d.skyStartupTicks - 1);
    expect(s.h.hp).toBe(s.h.maxHp);
    steps(s, 1);
    expect(s.h.hp).toBeLessThan(s.h.maxHp);
    expect(e.hitIds).toContain('a');
    const d = setup();
    d.h.x = 900;
    d.h.y = 800;
    d.h.fx = 1;
    d.h.fy = 0;
    expect(beginNamDeCast(d.w, d.c, 'nam_de_dash', 'a')).toBe(true);
    steps(d, d.d.dashTicks);
    expect(d.b.x).toBeCloseTo(836);
    expect(d.b.y).toBeCloseTo(800);
  });
  it('fresh challenge has a unique ID and ignores all keys from a resolved challenge', () => {
    const s = challenge();
    for (let i = 0; i < 10; i++)
      answerNamDe(s.w, s.c, s.h, s.q.id, i, s.q.keys[i]!);
    beginNamDeCast(s.w, s.c, 'dai_ly_phong_huyet', 'a');
    steps(s, 25);
    const fresh = s.w.namDe!.controls.get('a')!.qte!;
    expect(fresh.id).not.toBe(s.q.id);
    expect(answerNamDe(s.w, s.c, s.h, s.q.id, 0, s.q.keys[0]!)).toBe(false);
    expect(fresh.state).toBe('pending');
    expect(fresh.index).toBe(0);
  });
  it('cancels shared casts immediately on the final leave even when room ticks pause', () => {
    const s = setup();
    beginNamDeCast(s.w, s.c, 'lien_hoan_nhat_duong_chi');
    steps(s, 40);
    expect(s.w.namDe!.effects.size).toBeGreaterThan(0);
    removeHero(s.w, 'a');
    expect(s.w.namDe!.effects.size).toBeGreaterThan(0);
    removeHero(s.w, 'b');
    expect(s.w.namDe!.effects.size).toBe(0);
    expect(s.w.namDe!.cast).toBeUndefined();
    expect(s.w.namDe!.controls.size).toBe(0);
    addHero(s.w, 'c', 'C', s.c);
    steps(s, 1);
    expect(s.w.namDe!.cast).toBeUndefined();
  });
});
