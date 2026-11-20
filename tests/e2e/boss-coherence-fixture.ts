import assert from 'node:assert/strict';
import {
  BacCaiEncounter,
  VuongEncounter,
  initializeNamDe,
  spawnNamDeIfReady,
} from '@volam/game-core';
import {
  bacCaiDefinition,
  vuongDefinition,
  namDeDefinition,
} from '@volam/game-data';

/** Server-only visual coverage prerequisites; never a client gameplay endpoint. */
export function bossFixture(room: any, id: string) {
  const sim = room.simulation,
    arena = room.world;
  const unique = [...room.state.players.keys()]
    .map((key: string) => sim.hero(key))
    .filter(Boolean) as any[];
  for (const h of unique) {
    const zone = sim.zoneOf(h.id);
    if (zone?.dungeon) {
      Object.assign(h, zone.dungeon.exit);
      assert.equal(sim.exit(h.id), undefined);
    }
    h.level = 30;
  }
  sim.invasion.nextWaveTick = arena.tick + 100000;
  sim.invasion.wave = Math.max(1, sim.invasion.wave); // Normal late-boss pack prerequisite; no natural progression claim.
  arena.creeps.clear();
  arena.projectiles.clear();
  arena.areas = [];
  arena.shots = [];
  arena.actions = [];
  sim.dongTa.phase = 'waiting';
  sim.tayDoc.phase = 'waiting';
  sim.mainBosses.encounter = undefined;
  arena.namDe = undefined;
  arena.vuong = undefined;
  arena.bacCai = undefined;
  sim.waveArena = undefined;
  sim.lockWaveArena(false);
  const dungeon = (
    {
      chu_ba_thong: 'chu_ba_thong',
      hoan_nhan_hong_liet: 'hong_liet',
      kim_luan: 'kim_luan',
      ly_mac_sau: 'co_mo',
    } as Record<string, string>
  )[id];
  if (dungeon)
    for (const h of unique)
      assert.equal(sim.enter(h.id, 'shared', dungeon), undefined);
  const zone = sim.zoneOf(unique[0].id),
    w = zone.world,
    c = zone.config;
  let encounter: any, actor: any;
  if (id === 'dong_ta') {
    encounter = sim.dongTa;
    encounter.phase = 'fighting';
    encounter.summoned = true;
    actor = encounter.spawn(w, c, 'dong_ta', { x: 700, y: 650 });
  } else if (id.startsWith('tay_doc')) {
    encounter = sim.tayDoc;
    assert.ok(encounter.spawn(w, c));
    encounter.phase = id.endsWith('cap_mo') ? 'phase2' : 'phase1';
    actor = w.creeps.get(encounter.bossId);
  } else if (id === 'nam_de') {
    initializeNamDe(w, c, namDeDefinition);
    w.namDe.phase = 'rest';
    w.namDe.spawnAt = 0;
    spawnNamDeIfReady(w, c, w.tick);
    w.namDe.phase = 'idle';
    encounter = w.namDe;
    actor = w.creeps.get('boss_nam_de');
  } else if (id === 'bac_cai') {
    encounter = new BacCaiEncounter(bacCaiDefinition);
    encounter.initialize(w, c);
    encounter.phase = 'combat';
    sim.mainBosses.encounter = encounter;
    actor = w.creeps.get(encounter.bossId);
  } else if (id.startsWith('vuong_trung_duong')) {
    // The normal final-boss director owns defeat/corpse/victory. Preserve that
    // path by supplying its earlier-boss prerequisites, never the defeat itself.
    for (const earlier of ['dong_ta', 'tay_doc', 'nam_de', 'bac_cai'])
      sim.mainBosses.recordDefeat(earlier);
    w.campaign?.cleared.add('kim_luan_phap_vuong');
    encounter = new VuongEncounter(vuongDefinition);
    encounter.initialize(w, c);
    encounter.phase = id.endsWith('p2') ? 2 : 1;
    actor = w.creeps.get(encounter.bossId);
  } else if (id === 'kim_luan') {
    encounter = zone.kim;
    encounter.spawn(w, c, 'kim_luan_phap_vuong');
    encounter.phase = 'boss';
    actor = w.creeps.get('kim_luan_phap_vuong');
  } else if (id === 'hoan_nhan_hong_liet') {
    encounter = zone.encounter;
    actor = w.creeps.get(encounter.bossId);
  } else if (id === 'chu_ba_thong') {
    encounter = w.chu;
    actor = [...w.creeps.values()].find((a: any) => a.archetypeId === id);
  } else {
    encounter = w.boss;
    actor = w.creeps.get(encounter.actorId);
  }
  assert.ok(actor, id + ' actual encounter actor');
  const origin = dungeon ? { x: actor.x, y: actor.y } : { x: 700, y: 650 };
  const freeze = () => {
    if (id === 'dong_ta') {
      encounter.casts = [];
      encounter.effects = [];
      for (const ability of [
        'dan_chi_than_cong',
        'lac_anh_kiem_phap',
        'ta_kiem_lien_kich',
        'ngoc_tieu_hoi_phong',
        'trieu_hon_dong_hai',
      ])
        encounter.ready.set(ability, w.tick + 100000);
    } else if (id.startsWith('tay_doc')) {
      encounter.cast = undefined;
      encounter.nextActionAt = w.tick + 100000;
    } else if (id === 'nam_de') {
      encounter.cast = undefined;
      encounter.smallCast = undefined;
      encounter.nextActionAt = encounter.nextSmallAt = w.tick + 100000;
    } else if (id === 'bac_cai') {
      encounter.cast = undefined;
      encounter.nextAction = w.tick + 100000;
    } else if (id.startsWith('vuong_trung_duong')) {
      encounter.action = undefined;
      encounter.nextAction =
        encounter.nextHazard =
        encounter.nextSpecial =
        encounter.nextFinger =
          w.tick + 100000;
      encounter.releasedAt = w.tick - 100;
    } else if (id === 'chu_ba_thong') {
      encounter.phase = 'idle';
      encounter.until = w.tick + 100000;
      encounter.nextBasicAt = w.tick + 100000;
    } else if (id === 'kim_luan') {
      encounter.casts.clear();
      encounter.next.set(actor.id, w.tick + 100000);
    } else {
      encounter.cast = undefined;
      encounter.nextActionAt = w.tick + 100000;
    }
  };
  const arrange = (fx = 1, fy = 1, distance = 118) => {
    freeze();
    for (const [key] of w.creeps) if (key !== actor.id) w.creeps.delete(key);
    Object.assign(actor, {
      ...origin,
      fx,
      fy,
      hp: 1000000,
      maxHp: 1000000,
      cooldown: w.tick + 100000,
      statuses: [],
      pose: 'idle',
      actionUntil: 0,
      castAbilityId: '',
    });
    const length = Math.hypot(fx, fy) || 1;
    unique.forEach((h: any, i: number) =>
      Object.assign(h, {
        x: origin.x + (fx / length) * (distance + i * 25),
        y: origin.y + (fy / length) * (distance + i * 25),
        hp: 100000,
        maxHp: 100000,
        invulnerable: true,
        statuses: [],
        moveX: 0,
        moveY: 0,
      }),
    );
  };
  arrange();
  return {
    id,
    room,
    sim,
    zone,
    w,
    c,
    encounter,
    actor,
    heroes: unique,
    origin,
    freeze,
    arrange,
  };
}
