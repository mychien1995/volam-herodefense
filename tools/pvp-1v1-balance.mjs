import { mkdirSync, writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import {
  StandaloneLoiDai,
  rankedAbility,
  characterStats,
  fortuneReadings,
} from '@volam/game-core';
import {
  m1Config,
  creepDungeon,
  pvpDefinition,
  schools,
} from '@volam/game-data';

const folder = new URL('../artifacts/pvp-1v1/', import.meta.url);
mkdirSync(folder, { recursive: true });
const seeds = (process.env.AUDIT_SEEDS ?? '11,42,193').split(',').map(Number);
const profiles = (process.env.AUDIT_PROFILES ?? 'contact,spacing').split(',');
const beat = Number(process.env.AUDIT_BEAT ?? 6);
const tactical = process.env.AUDIT_TACTICAL === '1';
const evade = process.env.AUDIT_EVADE === '1';
const filter = process.env.AUDIT_BRANCH;
const branches = Object.entries(m1Config.progression.schools).flatMap(
  ([school, s]) =>
    s.basicIds.map((branch) => ({
      school,
      branch,
      schoolName: schools.find((s) => s.id === school)?.name ?? school,
    })),
);
const has = (h, kind, tick) =>
  h.statuses?.some((s) => s.kind === kind && s.until > tick);
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
function checked(value) {
  if (value !== undefined) throw Error(value);
}
function setup(left, right, seed, profile) {
  const def = structuredClone(pvpDefinition);
  def.countdownTicks = 1;
  if (process.env.AUDIT_BASELINE === '1') delete def.oneVOne;
  const p = new StandaloneLoiDai(m1Config, creepDungeon, def, seed);
  for (const id of ['host', 'a', 'b']) checked(p.join(id, id));
  for (const [id, build, team] of [
    ['a', left, 'chinh'],
    ['b', right, 'ta'],
  ]) {
    checked(p.choose(id, build.school, build.branch));
    checked(p.assign('host', id, team));
  }
  checked(p.configure('host', 'rung_truc', false));
  checked(p.start('host'));
  p.step();
  // Only the fixture's initial positions are placed directly; subsequent actions use authoritative inputs.
  if (profile === 'contact') {
    Object.assign(p.hero('a'), { x: 600, y: 360 });
    Object.assign(p.hero('b'), { x: 680, y: 360 });
  }
  const state = {};
  for (const id of ['a', 'b']) {
    const h = p.hero(id);
    if (h.level !== 30 || h.skillIds.length !== 5 || h.inventory)
      throw Error('Invalid normalized build');
    state[id] = {
      abilities: h.skillIds.map((id) => rankedAbility(h, id, p.arena.config)),
      lastChoice: -1,
      basicInputs: 0,
      castInputs: 0,
    };
  }
  return { p, state };
}
function desiredRange(h, basic) {
  if (basic.effect.mode === 'arc') return Math.min(85, basic.effect.range - 12);
  return Math.min(245, basic.effect.range * 0.8);
}
function shouldCast(p, h, foe, a, d, state) {
  const w = p.arena.world,
    t = w.tick,
    e = a.effect;
  if (
    a.passive ||
    a.id === 'ngu_hanh_cach_the_thuat' ||
    a.id === 'vo_hinh_doc' ||
    a.id === 'vo_hinh_ma_co'
  )
    return false;
  if (a.id === 'ngu_loi_chinh_phap_the') return false; // Current Q is passive, never oscillate stance.
  if (a.id === 'ngu_doc_chuong') return !has(h, 'ngu_doc_palm', t);
  if (a.id === 'am_ta_hap_hon_khi')
    return !has(h, 'ngu_doc_aura', t) && d < 135;
  if (a.id === 'thiet_duc_hoanh_khong')
    return !has(h, 'duong_mon_flight', t) && h.mana > 55;
  if (a.id === 'thi_quy_phong_tan')
    return !h.nguDocSummons?.some((m) => m.kind === 'reaper' && m.hp > 0);
  if (a.id === 'yeu_co')
    return (
      (h.nguDocSummons?.filter((m) => m.kind === 'jiangshi' && m.hp > 0)
        .length ?? 0) < 2
    );
  if (a.id === 'loi_dong_thien_dia')
    return w.areas?.some(
      (x) =>
        x.ownerId === h.id &&
        x.abilityId === 'kinh_loi' &&
        distance(x, foe) < 85,
    );
  if (a.id === 'dien_quang_loi_anh') return d > 140 && d < 285;
  if (a.id === 'nhiep_hon_nguyet_anh')
    return d < 155 && !has(h, 'duong_mon_evade', t);
  if (a.id === 'thien_co_thiet_duc')
    return h.hp < h.maxHp * 0.65 && !has(h, 'duong_mon_shell', t);
  if (e.mode === 'mana_shield') return !has(h, 'mana_shield', t) && h.mana > 25;
  if (e.mode === 'guard_counter') return d < 150 && h.hp < h.maxHp * 0.7;
  if (e.mode === 'fortune' && h.fortune) {
    const s = h.statuses.find((s) => s.kind === 'fortune_roll');
    const reading = fortuneReadings[s?.magnitude ?? h.fortune.offset];
    return (
      reading ===
      (h.hp < h.maxHp * 0.65
        ? 'can'
        : h.mana < h.maxMana * 0.35
          ? 'ton'
          : 'khon')
    );
  }
  if (a.id === 'lien_hoa_phien') return d < 230 && h.hp < h.maxHp * 0.9;
  if (a.id === 'luu_phong_bo')
    return (
      ![...w.projectiles.values()].some(
        (x) => x.ownerId === h.id && x.abilityId === a.id,
      ) && d < 260
    );
  if (a.id === 'dia_diem_hoa') return d < 145;
  if (a.id === 'hoa_van_chuong') return d > 130 && d < 340;
  if (a.id === 'kim_cang_bat_hoai') return d < 190;
  if (a.id === 'bat_dong_minh_vuong') return h.hp < h.maxHp * 0.8;
  if (a.id === 'vo_cuc_phong_loi_quyet') return d < 300;
  if (e.mode === 'support') return d < 260;
  if (e.mode === 'buff' || e.mode === 'fortune') return d < 450;
  if (e.mode === 'area')
    return (
      d <
      (e.skyfall?.range ??
        e.nearestRange ??
        e.radius + (e.forwardOffset ?? 0)) +
        15
    );
  if (e.mode === 'multi_hit')
    return (
      d < (e.targetArea?.range ?? Math.max(e.range, e.finisherRange ?? 0)) + 12
    );
  if (e.mode === 'skyfall') return d < (e.range ?? 320);
  if (e.mode === 'arc') return d < (a.focusRange ?? e.range) + 10;
  if (e.mode === 'dash') return d < (e.gather?.range ?? e.distance) + 35;
  if (e.mode === 'projectile') return d < (a.focusRange ?? e.range) + 10;
  if (e.mode === 'counter') return d < 180;
  return d < 250;
}
function drive(p, h, foe, profile, state, tick, seat) {
  const w = p.arena.world,
    t = w.tick,
    c = p.arena.config;
  const send = (command) => checked(p.input(h.id, h.lastSequence + 1, command));
  const d = distance(h, foe),
    b = c.basics[h.basicId];
  if (profile === 'spacing') {
    const ideal = desiredRange(h, b),
      dx = (foe.x - h.x) / Math.max(1, d),
      dy = (foe.y - h.y) / Math.max(1, d);
    let direction = d > ideal + 18 ? 1 : d < ideal - 22 ? -1 : 0;
    // Do not retreat straight into the floor boundary: approach again near a wall.
    if (direction < 0 && (h.x < 140 || h.x > 1140 || h.y < 166 || h.y > 565))
      direction = 1;
    send({
      kind: 'move',
      x: Math.abs(dx) > 0.32 ? Math.sign(dx) * direction : 0,
      y: Math.abs(dy) > 0.32 ? Math.sign(dy) * direction : 0,
    });
    if (
      evade &&
      tick % beat === 0 &&
      h.dashCharges > 0 &&
      !has(h, 'stun', t) &&
      !has(h, 'dash', t) &&
      !(w.actions ?? []).some((a) => a.ownerId === h.id)
    ) {
      if (has(h, 'silence', t) && has(h, 'disarm', t) && d < 225) {
        send({
          kind: 'move',
          x: -Math.sign(dx),
          y: Math.abs(dy) > 0.32 ? -Math.sign(dy) : 0,
        });
        send({ kind: 'dash' });
        return;
      }
      const incoming = [...w.projectiles.values()].find((s) => {
        if (s.ownerId === h.id || distance(h, s) > 125) return false;
        const px = h.x - s.x,
          py = h.y - s.y,
          v2 = s.vx * s.vx + s.vy * s.vy;
        const dt = v2 ? (px * s.vx + py * s.vy) / v2 : -1;
        return (
          dt >= 0 &&
          dt < 0.25 &&
          Math.hypot(px - s.vx * dt, py - s.vy * dt) <
            (s.effect.radius ?? 10) + c.radius + 5
        );
      });
      if (incoming) {
        const sign = seat === 0 ? 1 : -1;
        send({
          kind: 'move',
          x: Math.abs(incoming.vy) > 1 ? -Math.sign(incoming.vy) * sign : 0,
          y: Math.abs(incoming.vx) > 1 ? Math.sign(incoming.vx) * sign : 0,
        });
        send({ kind: 'dash' });
        return;
      }
      if (b.effect.mode === 'arc' && d > ideal + 100 && d < 420) {
        send({ kind: 'dash' });
        return;
      }
    }
  }
  if (tick % beat !== 0) return;
  if (
    has(h, 'stun', t) ||
    has(h, 'guard_counter', t) ||
    has(h, 'duong_mon_shell', t)
  )
    return;
  if (tactical && has(h, 'concealed', t)) return; // Let Bách Liệt's autonomous clones finish without self-revealing.
  if ((w.actions ?? []).some((a) => a.ownerId === h.id && !a.detached)) return;
  if (h.comboFinisher) return;
  if (
    h.basicId === 'con_luan_kiem_ton' &&
    d < 245 &&
    tick % 30 === 0 &&
    (w.areas ?? []).filter(
      (a) => a.ownerId === h.id && a.abilityId === 'kinh_loi',
    ).length < 3
  ) {
    send({ kind: 'tam-lien-tram' });
    return;
  }
  if (h.tamLien?.readyUntil > t) {
    send({ kind: 'tam-lien-tram' });
    return;
  }
  // Explicit A is required: game-core intentionally disables auto-basic inside world.duel.
  // Targeted A uses the same target validation and aiming as player mouse input.
  if (!tactical) send({ kind: 'basic', targetId: foe.id });
  state.basicInputs++;
  const opening = {
    cai_bang_bong: [2, 1, 4, 3, 0],
    cai_bang_chuong: [3, 1, 2, 4, 0],
    thien_son_phien: [0, 3, 4, 2, 1],
    thien_son_dao: [1, 3, 4, 0, 2],
    vo_dang_quyen: [3, 0, 1, 4, 2],
    vo_dang_kiem: [2, 0, 4, 1, 3],
    thieu_lam_quyen: [3, 1, 0, 2, 4],
    thieu_lam_dao: [1, 2, 3, 0, 4],
    con_luan_thien_su: [4, 1, 3, 2, 0],
    con_luan_kiem_ton: [4, 0, 3, 2, 1],
    duong_mon_co_quan: [1, 0, 2, 4, 3],
    duong_mon_am_khi: [2, 0, 1, 4, 3],
    ngu_doc_ta_hiep: [0, 2, 4, 1, 3],
    ngu_doc_co_su: [4, 1, 2, 0, 3],
  };
  // One skill decision per beat, rotating fairly across available slots.
  for (let j = 1; j <= 5; j++) {
    const slot = tactical
        ? opening[h.basicId][j - 1]
        : (state.lastChoice + j) % 5,
      a = state.abilities[slot];
    const settle = a.effect.mode === 'fortune' && h.fortune;
    if (
      !settle &&
      (t < (h.skillCooldowns[slot] ?? 0) ||
        t < (h.abilityCooldowns?.[a.id] ?? 0) ||
        h.mana < a.manaCost)
    )
      continue;
    if (!shouldCast(p, h, foe, a, d, state)) continue;
    send({ kind: 'cast', slot });
    state.lastChoice = slot;
    state.castInputs++;
    break;
  }
  if (tactical) send({ kind: 'basic', targetId: foe.id });
}
function run(left, right, seed, profile, reverse) {
  const { p, state } = setup(
    reverse ? right : left,
    reverse ? left : right,
    seed,
    profile,
  );
  const start = p.tick,
    a = p.hero('a'),
    b = p.hero('b');
  const stats = [a, b].map((h) => ({
    branch: h.basicId,
    hp: h.maxHp,
    mana: h.maxMana,
    ...characterStats(h, p.arena.config, p.tick).total,
  }));
  const totals = {
    a: {
      damage: 0,
      heal: 0,
      stunTicks: 0,
      disabledTicks: 0,
      hits: 0,
      casts: 0,
      attacks: 0,
      abilities: {},
    },
    b: {
      damage: 0,
      heal: 0,
      stunTicks: 0,
      disabledTicks: 0,
      hits: 0,
      casts: 0,
      attacks: 0,
      abilities: {},
    },
  };
  for (
    let tick = 0;
    tick < p.definition.roundTicks && p.phase === 'fighting';
    tick++
  ) {
    // Alternate command insertion order, and repeat each matchup with swapped spawn/creation order.
    for (const h of tick % 2 ? [b, a] : [a, b])
      drive(p, h, h === a ? b : a, profile, state[h.id], tick, h === a ? 0 : 1);
    p.step();
    for (const h of [a, b]) {
      if (has(h, 'stun', p.tick)) totals[h.id].stunTicks++;
      if (['stun', 'silence', 'disarm'].some((k) => has(h, k, p.tick)))
        totals[h.id].disabledTicks++;
    }
    for (const { event: e } of p.events) {
      if (!totals[e.sourceId]) continue;
      const q = totals[e.sourceId];
      if (e.kind === 'hit' && (e.targetId === 'a' || e.targetId === 'b')) {
        q.damage += e.damage;
        q.hits++;
        q.abilities[e.abilityId] = (q.abilities[e.abilityId] ?? 0) + e.damage;
      }
      if (e.kind === 'attack') q.attacks++;
      if (e.kind === 'cast') q.casts++;
      if (e.kind === 'heal') q.heal += e.damage;
    }
  }
  const ids = reverse ? ['b', 'a'] : ['a', 'b'];
  const winner =
    p.result?.winner === 'draw'
      ? 'draw'
      : p.result?.winner === 'chinh'
        ? 'a'
        : 'b';
  return {
    leftBranch: left.branch,
    rightBranch: right.branch,
    leftSchool: left.school,
    rightSchool: right.school,
    seed,
    profile,
    reverse,
    seconds: (p.tick - start) / m1Config.tickRate,
    winner: winner === 'draw' ? 'draw' : winner === ids[0] ? 'left' : 'right',
    reason: p.result?.reason,
    leftHp: p.hero(ids[0]).hp,
    rightHp: p.hero(ids[1]).hp,
    left: totals[ids[0]],
    right: totals[ids[1]],
    stats,
  };
}
function summarize(rows) {
  const result = {};
  for (const profile of profiles) {
    const selected = rows.filter((r) => r.profile === profile);
    result[profile] = branches
      .map((b) => {
        const games = selected.filter(
          (r) => r.leftBranch === b.branch || r.rightBranch === b.branch,
        );
        const wins = games.filter(
          (r) =>
            (r.leftBranch === b.branch && r.winner === 'left') ||
            (r.rightBranch === b.branch && r.winner === 'right'),
        ).length;
        const draws = games.filter((r) => r.winner === 'draw').length;
        return {
          school: b.schoolName,
          branch: b.branch,
          games: games.length,
          wins,
          draws,
          losses: games.length - wins - draws,
          score: games.length ? (wins + draws / 2) / games.length : 0,
          meanSeconds: games.length
            ? games.reduce((a, r) => a + r.seconds, 0) / games.length
            : 0,
        };
      })
      .sort((a, b) => b.score - a.score);
  }
  return result;
}
const rows = [],
  started = performance.now();
let pairs = 0;
for (let i = 0; i < branches.length; i++)
  for (let j = i + 1; j < branches.length; j++) {
    if (filter && ![branches[i].branch, branches[j].branch].includes(filter))
      continue;
    for (const profile of profiles)
      for (const seed of seeds)
        for (const reverse of [false, true])
          rows.push(run(branches[i], branches[j], seed, profile, reverse));
    pairs++;
    if (pairs % 7 === 0)
      console.log(
        JSON.stringify({
          pairs,
          rounds: rows.length,
          seconds: Math.round((performance.now() - started) / 1000),
        }),
      );
  }
const summary = summarize(rows);
const filename = process.env.AUDIT_OUTPUT ?? 'audit.json';
writeFileSync(
  new URL(filename, folder),
  JSON.stringify(
    {
      scope:
        'Standalone PvP; level30 max fixed five-slot builds; no items/potions/Long Chau; forest map, hazards off. Contact starts at80 units; spacing uses native spawns. Fixed-input bots, not human balance acceptance.',
      baseline: process.env.AUDIT_BASELINE === '1',
      tactical,
      evade,
      beat,
      seeds,
      profiles,
      elapsedSeconds: (performance.now() - started) / 1000,
      summary,
      rows,
    },
    null,
    2,
  ),
);
console.log(
  JSON.stringify(
    {
      report: new URL(filename, folder).pathname,
      rounds: rows.length,
      summary,
    },
    null,
    2,
  ),
);
