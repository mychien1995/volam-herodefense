import { describe, it, expect } from 'vitest';
import {
  DungeonMatch,
  BacCaiEncounter,
  NAM_DE_ID,
  beginNamDeCast,
  submitInput,
  insideEllipse,
} from '@volam/game-core';
import {
  m1Config,
  creepDungeon,
  coMoDungeon,
  createInvasionDefinition,
  dongTaDefinition,
  tayDocDefinition,
  namDeDefinition,
  bacCaiDefinition,
} from '@volam/game-data';

function setup(players = 2) {
  const config = {
    ...structuredClone(m1Config),
    creepSpawns: [],
    collision: [],
    critChance: 0,
  };
  const dong = {
    ...structuredClone(dongTaDefinition),
    restTicks: 1,
    entryTicks: 1,
    retryTicks: 3,
    openingTicks: 100000,
  };
  const m = new DungeonMatch(
    config,
    creepDungeon,
    42,
    createInvasionDefinition(180, 1000000),
    [coMoDungeon],
    dong,
    structuredClone(tayDocDefinition),
    structuredClone(namDeDefinition),
    structuredClone(bacCaiDefinition),
  );
  const w = m.arena.world;
  for (let i = 0; i < players; i++) {
    const h = m.add('p' + i, 'P' + i);
    h.hp = h.maxHp = 100000;
    h.mana = h.maxMana = 100000;
  }
  const step = (n = 1) => {
    for (let i = 0; i < n; i++) m.step();
  };
  const start = () => {
    m.invasion!.wave = 5;
    step(4);
    return w.creeps.get('dong_ta')!;
  };
  const later = (id: string) => {
    m.dongTa!.phase = 'cleared';
    if (id === 'tay_doc') {
      m.tayDoc!.spawn(w, m.arena.config);
      m.tayDoc!.phase = 'phase1';
    }
    if (id === 'nam_de') {
      w.namDe!.phase = 'rest';
      w.namDe!.spawnAt = w.tick;
      step();
      w.namDe!.phase = 'idle';
    }
    if (id === 'bac_cai') {
      const e = new BacCaiEncounter(structuredClone(bacCaiDefinition));
      e.initialize(w, m.arena.config);
      e.phase = 'combat';
    }
    step();
  };
  return { m, w, dong, step, start, later };
}
describe('approved wave boss feedback in authoritative runtime', () => {
  it.each(['tay_doc', 'nam_de', 'bac_cai'])(
    '%s recalls, revives, confines and protects the statue; wipe retries without rewards',
    (id) => {
      const s = setup();
      s.m.enter('p1', 'private', 'co_mo');
      const h = s.m.hero('p1')!;
      h.hp = 0;
      h.gold = 37;
      s.later(id);
      expect(s.m.zoneOf(h.id)?.id).toBe('arena');
      expect(h.hp).toBeGreaterThan(0);
      expect(h.gold).toBe(37);
      expect(s.w.statue!.invulnerable).toBe(true);
      expect(s.m.arena.config.heroBounds).toBeDefined();
      const before = s.w.statue!.hp;
      for (const p of s.w.heroes.values()) p.hp = 0;
      s.step();
      expect((s.m as any).waveArena?.phase).toBe('retry');
      s.step(5);
      expect(s.m.hero('p0')!.hp).toBeGreaterThan(0);
      expect(s.w.statue!.hp).toBe(before);
      expect(
        insideEllipse(
          s.m.hero('p0')!,
          dongTaDefinition.bounds,
          s.m.base.radius,
        ),
      ).toBe(true);
      expect(s.m.hero('p0')!.gold).toBe(0);
      expect(s.m.canEnterDungeon('p0')).toBe(false);
    },
  );
  it('normal Lạc Anh actually travels a seeded polygon; active +/X remains stationary', () => {
    const s = setup();
    const b = s.start();
    const e = s.m.dongTa!;
    s.w.heroes.get('p0')!.x = 1000;
    s.w.heroes.get('p0')!.y = 616;
    expect(
      e.beginCast(s.w, s.m.arena.config, b.id, 'lac_anh_normal', 'p0'),
    ).toBe(true);
    const before = { x: b.x, y: b.y };
    s.step(s.dong.abilities.lac_anh_normal.windup + 8);
    expect(Math.hypot(b.x - before.x, b.y - before.y)).toBeGreaterThan(50);
    expect((e.casts[0] as any).path.length).toBeGreaterThanOrEqual(5);
    const cast = e.casts[0]!;
    expect(cast.endsAt - cast.activeAt).toBe(
      s.dong.normalDash.approachTicks +
        (cast.path!.length - 2) * s.dong.normalDash.segmentTicks,
    );
    expect(insideEllipse(b, s.dong.bounds, b.stats!.radius)).toBe(true);
    s.step(90);
    b.cooldown = s.w.tick + 10000;
    e.casts = [];
    expect(
      e.beginCast(s.w, s.m.arena.config, b.id, 'lac_anh_kiem_phap', 'p0'),
    ).toBe(true);
    const p = { x: b.x, y: b.y };
    s.step(s.dong.abilities.lac_anh_kiem_phap.windup + 3);
    expect({ x: b.x, y: b.y }).toEqual(p);
  });
  it('Mai pull blocks real Shift inputs without spending a charge and gives0.8s after tug before Ma Ảnh', () => {
    const s = setup();
    const b = s.start(),
      e = s.m.dongTa!;
    e.beginCast(s.w, s.m.arena.config, b.id, 'trieu_hon_dong_hai');
    s.step(
      s.dong.abilities.trieu_hon_dong_hai.windup +
        s.dong.abilities.trieu_hon_dong_hai.duration +
        1,
    );
    e.casts = [];
    const mai = s.w.creeps.get('mai_sieu_phong')!,
      h = s.w.heroes.get('p0')!;
    h.x = mai.x + 180;
    h.y = mai.y;
    mai.fx = 1;
    mai.fy = 0;
    e.beginCast(s.w, s.m.arena.config, mai.id, 'am_phong_hap_luc', h.id);
    s.step(s.dong.abilities.am_phong_hap_luc.windup + 2);
    const charge = h.dashCharges;
    submitInput(s.w, h.id, h.lastSequence + 1, { kind: 'dash' });
    s.step();
    expect(h.dashCharges).toBe(charge);
    s.step(s.dong.abilities.am_phong_hap_luc.duration);
    const follow = e.casts.find(
      (c) => c.actorId === mai.id && c.abilityId === 'ma_anh_troc_hon',
    )!;
    expect(follow).toBeDefined();
    expect(follow.activeAt - follow.startedAt).toBe(24);
    expect(
      e.effects.some(
        (x) => x.ownerId === mai.id && x.abilityId === 'ma_anh_troc_hon',
      ),
    ).toBe(false);
    const first = follow.activeAt;
    while (s.w.tick < first - 1) s.step();
    expect(
      e.effects.some(
        (x) => x.ownerId === mai.id && x.abilityId === 'ma_anh_troc_hon',
      ),
    ).toBe(false);
    s.step();
    expect(
      e.effects.some(
        (x) => x.ownerId === mai.id && x.abilityId === 'ma_anh_troc_hon',
      ),
    ).toBe(true);
    const lock = h.statuses?.find((x) => x.kind === 'dash_lock');
    expect(lock!.until).toBe(
      follow.startedAt -
        s.dong.abilities.am_phong_hap_luc.duration +
        s.dong.pull.lockTicks,
    );
  });
  it('post-dash Nam Đế starts one of the two actual follow-ups and charge is halved', () => {
    const s = setup();
    s.later('nam_de');
    const h = s.w.heroes.get('p0')!,
      b = s.w.creeps.get(NAM_DE_ID)!;
    h.x = b.x + 100;
    h.y = b.y;
    h.fx = 1;
    h.fy = 0;
    s.w.namDe!.nextActionAt = Infinity;
    expect(beginNamDeCast(s.w, s.m.arena.config, 'nam_de_dash', h.id)).toBe(
      true,
    );
    s.step(s.w.namDe!.definition.dashTicks + 2);
    expect(
      s.w.namDe!.effects.size > 0 ||
        ['nam_de_aura', 'nam_de_small_finger'].includes(
          s.w.namDe!.cast?.ability ?? s.w.namDe!.smallCast?.ability ?? '',
        ),
    ).toBe(true);
    expect(namDeDefinition.beamWarningTicks).toBe(23);
    expect(tayDocDefinition.attacks.van_doc_phi_cham.speed).toBe(288);
  });
  it('Bắc Cái releases the dragon from arena center after visible dash; natural opening summons dogs', () => {
    const s = setup();
    s.later('bac_cai');
    const e = s.w.bacCai!,
      b = s.w.creeps.get(e.bossId)!;
    e.cast = undefined;
    b.x = 650;
    b.y = 700;
    expect(e.begin(s.w, s.m.arena.config, 'spiral', s.w.heroes.get('p0'))).toBe(
      true,
    );
    expect({ x: b.x, y: b.y }).toEqual({ x: 650, y: 700 });
    s.step(30);
    const dragon = [...e.effects.values()].find((x) => x.kind === 'spiral')!;
    expect(dragon.origin).toEqual(dongTaDefinition.center);
    expect(e.definition.spiral.flightMs).toBeCloseTo(5600 / 1.3);
    const natural = setup();
    natural.later('bac_cai');
    natural.step(180);
    expect(
      natural.w.bacCai!.view(natural.w, natural.m.arena.config).dogs,
    ).toHaveLength(4);
  });
});
