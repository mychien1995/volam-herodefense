import { bossFightReady } from './boss-provocation.js';
import { grantCraftMaterial } from './economy.js';
import { announceBossSkill } from './boss-skill-announcement.js';
import type {
  ChuDefinition,
  ChuEncounter,
  ChuPhase,
  ChuView,
  ChuLoot,
} from './chu-types.js';
import { CHU_BOSS_ID } from './chu-types.js';
import { addCreep } from './simulation.js';
import { hurt, emit } from './combat.js';
import { direction, distance, moveCircle, segmentCircle } from './geometry.js';
import { gainExperience } from './progression.js';
import {
  applyStatus,
  cancelOwnedEffects,
  displace,
  hasStatus,
} from './status.js';
import type { World, SimulationConfig, Point, Hero } from './types.js';
export function spawnChu(
  world: World,
  config: SimulationConfig,
  definition: ChuDefinition,
  previous?: ChuEncounter,
): void {
  const boss = addCreep(world, CHU_BOSS_ID, definition.spawn, config);
  boss.bossEncounter = true;
  boss.archetypeId = 'chu_ba_thong';
  boss.hp = boss.maxHp = definition.hp;
  boss.forcedMovementImmune = true;
  boss.fx = 0;
  boss.fy = 1;
  boss.stats = {
    ...config.creep,
    hp: definition.hp,
    defense: definition.defense,
    xp: definition.xp,
    gold: definition.gold,
    speed: 0,
  };
  world.chu = {
    definition,
    phase: 'idle',
    phaseIndex: 0,
    started: world.tick,
    until: world.tick + definition.phases[0]!.ticks,
    cycle: 0,
    fx: 0,
    fy: 1,
    missiles: [],
    hands: [],
    loot: previous?.loot ?? [],
    kill: previous?.kill ?? 0,
    nextAction: world.tick,
  };
}
const alive = (w: World) =>
  [...w.heroes.values()]
    .filter((h) => h.hp > 0)
    .sort((a, b) => a.id.localeCompare(b.id));
function signal(
  w: World,
  abilityId: string,
  p: Point,
  stage: string,
  radius = 0,
) {
  emit(w, {
    kind: 'pulse',
    sourceId: CHU_BOSS_ID,
    targetId: '',
    abilityId,
    x: p.x,
    y: p.y,
    fx: w.chu!.fx,
    fy: w.chu!.fy,
    stage,
    radius,
    damage: 0,
    critical: false,
  });
}
function damage(
  w: World,
  h: Hero,
  id: string,
  amount: number,
  c: SimulationConfig,
) {
  return hurt(w, h, CHU_BOSS_ID, id, amount, c, {
    critChance: 0,
    critMultiplier: 1,
  });
}
export function chuFields(
  elapsed: number,
  width = 1280,
  height = 720,
): Array<Point & { id: number; radius: number; active: boolean }> {
  return Array.from({ length: 15 }, (_, i) => ({
    id: i,
    x:
      ((640 + 420 * Math.sin(elapsed * (0.37 + i * 0.007) + i * 2.39996)) *
        width) /
      1280,
    y:
      ((410 + 155 * Math.sin(elapsed * (0.53 + i * 0.009) + i * 3.11995)) *
        height) /
      720,
    radius: 54,
    active: elapsed % 1.4 >= 0.7,
  }));
}
export function chuWaves(t: number) {
  return Array.from({ length: 4 }, (_, i) => {
    const age = (t + i * 0.7) % 2.8,
      scale = 0.5 + age * 3.8;
    return {
      x: 640 + 270 * Math.sin(t * 0.57 + i * 1.7),
      y: 410 + 135 * Math.sin(t * 0.69 + i * 1.3),
      radius: 45 * scale,
      thickness: 12 * scale,
      scale,
      alpha: 0.68 * (1 - age / 2.8),
    };
  });
}
function nearest(w: World) {
  const b = w.creeps.get(CHU_BOSS_ID)!;
  return alive(w)
    .filter((h) => !hasStatus(h, 'concealed', w.tick))
    .sort(
      (a, z) => distance(a, b) - distance(z, b) || a.id.localeCompare(z.id),
    )[0];
}
function begin(
  w: World,
  c: SimulationConfig,
  phase: ChuPhase,
  index: number,
): void {
  const s = w.chu!,
    b = w.creeps.get(CHU_BOSS_ID)!,
    d = s.definition,
    target = nearest(w);
  s.phase = phase;
  for (const [id, e] of w.creeps)
    if (e.archetypeId === 'chu_wine_disciple') {
      if (e.hp <= 0)
        (s.wine ??= []).push({
          id,
          x: e.x,
          y: e.y,
          until: w.tick + c.tickRate * 30,
        });
      w.creeps.delete(id);
    }
  s.phaseIndex = index;
  s.started = w.tick;
  s.until = w.tick + d.phases[index]!.ticks;
  s.nextAction = w.tick;
  s.spinHits = {};
  s.hands = [];
  delete s.trap;
  if (target) {
    const v = direction(target.x - b.x, target.y - b.y);
    s.fx = b.fx = v.x;
    s.fy = b.fy = v.y;
  }
  if (phase === 'spin') s.spinOrigin = { x: b.x, y: b.y };
  b.castAbilityId = phase;
  b.pose = ['sweep', 'fists', 'palm'].includes(phase)
    ? 'basic_attack'
    : phase === 'idle'
      ? 'idle'
      : 'cast';
  b.actionUntil = s.until;
  signal(w, phase, b, 'warning');
  announceBossSkill(w, b.id, phase);
  if (phase === 'drink') {
    for (const [i, h] of alive(w).entries()) {
      const p = {
        x: c.width * (i % 2 ? 0.8 : 0.2),
        y: c.height * (0.38 + Math.floor(i / 2) * 0.12),
      };
      const e = addCreep(w, 'chu_wine_' + w.nextId++, p, c);
      e.archetypeId = 'chu_wine_disciple';
      e.controlled = true;
      e.bossEncounter = true;
      e.summonedBy = CHU_BOSS_ID;
      e.hp = e.maxHp = d.wineDisciple.hp;
      e.stats = {
        ...c.creep,
        hp: d.wineDisciple.hp,
        speed: 80,
        damage: 0,
        radius: 12,
        defense: d.wineDisciple.defense,
        xp: 0,
        gold: 0,
      };
      e.aggroTargetId = h.id;
    }
  }
  if (phase === 'hands' && target) {
    const p = { x: target.x, y: target.y };
    const starts = [
      { x: -140, y: p.y },
      { x: c.width + 140, y: p.y },
      { x: p.x, y: -140 },
      { x: p.x, y: c.height + 140 },
    ];
    s.hands = starts.map((from, id) => {
      const v = direction(p.x - from.x, p.y - from.y);
      return {
        id,
        ...from,
        from,
        target: { ...p },
        fx: v.x,
        fy: v.y,
        hitIds: [],
      };
    });
  }
  if (phase === 'trap' && target)
    s.trap = {
      targetId: target.id,
      x: target.x,
      y: target.y,
      until: w.tick + d.trapTicks,
      required: alive(w).map((h) => h.id),
      inside: 0,
      released: false,
      reason: '',
    };
}
function death(w: World, c: SimulationConfig): void {
  const s = w.chu!,
    b = w.creeps.get(CHU_BOSS_ID)!,
    d = s.definition;
  s.deadAt = w.tick;
  s.wine = [];
  s.wineDrinkers = {};
  for (const [id, e] of w.creeps)
    if (e.archetypeId === 'chu_wine_disciple') w.creeps.delete(id);
  s.missiles = [];
  s.hands = [];
  delete s.trap;
  cancelOwnedEffects(w, CHU_BOSS_ID);
  const eligible = [...w.heroes.values()]
    .filter((h) => Object.hasOwn(b.hits, h.id))
    .sort((a, z) => a.id.localeCompare(z.id));
  eligible.forEach((h, i) => {
    if (c.campaign) return;
    gainExperience(
      h,
      Math.floor(d.xp / eligible.length) + (i < d.xp % eligible.length ? 1 : 0),
      c,
    );
    h.gold +=
      Math.floor(d.gold / eligible.length) +
      (i < d.gold % eligible.length ? 1 : 0);
  });
  if (c.personalCraftLoot) {
    s.kill++;
    grantCraftMaterial(w, c, b, 'hat');
    return;
  }
  const item = d.loot[Math.floor(w.random() * d.loot.length)]!;
  const loot: ChuLoot = {
    id: ++s.kill,
    itemId: item.id,
    nameVi: item.nameVi,
    eligible: eligible.map((h) => h.id),
    rolls: {},
    until: w.tick + d.rollTicks,
    state: 'rolling',
    ownerId: '',
    x: b.x,
    y: b.y,
  };
  s.loot.push(loot);
  if (eligible.length === 1) chuLootAction(w, eligible[0]!.id, loot.id, 'roll');
  if (!eligible.length) loot.state = 'ground';
}
export function settleBossLoot(w: World): void {
  const s = w.chu ?? w.kim?.rewards;
  if (!s) return;
  for (const loot of s.loot) {
    if (loot.state !== 'rolling') continue;
    const present = loot.eligible.filter((id) => w.heroes.has(id));
    if (
      w.tick < loot.until &&
      present.some((id) => loot.rolls[id] === undefined)
    )
      continue;
    const candidates = present
      .filter((id) => (loot.rolls[id] ?? 0) > 0)
      .sort((a, b) => loot.rolls[b]! - loot.rolls[a]! || a.localeCompare(b));
    // Ties use the instance's seeded RNG, never client order or timestamp.
    const top = candidates.filter(
      (id) => loot.rolls[id] === loot.rolls[candidates[0] ?? ''],
    );
    const owner = top.length
      ? w.heroes.get(top[Math.floor(w.random() * top.length)]!)
      : undefined;
    if (owner) {
      (owner.bossItems ??= []).push(loot.itemId);
      loot.ownerId = owner.id;
      loot.state = 'claimed';
    } else loot.state = 'ground';
  }
}
export function chuLootAction(
  w: World,
  id: string,
  lootId: number,
  action: 'roll' | 'pass' | 'pickup',
): string | undefined {
  const s = w.chu ?? w.kim?.rewards,
    hero = w.heroes.get(id),
    loot = s?.loot.find((l) => l.id === lootId);
  if (!s || !hero || !loot) return 'Chiến lợi phẩm không còn ở khu vực này.';
  if (action === 'pickup') {
    if (loot.state !== 'ground' || hero.hp <= 0 || distance(hero, loot) > 64)
      return 'Hãy đến gần chiến lợi phẩm.';
    (hero.bossItems ??= []).push(loot.itemId);
    loot.ownerId = id;
    loot.state = 'claimed';
    return;
  }
  if (
    loot.state !== 'rolling' ||
    w.tick >= loot.until ||
    !loot.eligible.includes(id) ||
    loot.rolls[id] !== undefined
  )
    return 'Không thể tham gia lượt roll này.';
  loot.rolls[id] = action === 'pass' ? 0 : 1 + Math.floor(w.random() * 100);
  settleBossLoot(w);
  return;
}
export function constrainChuTrap(w: World, c: SimulationConfig): void {
  const s = w.chu,
    trap = s?.trap;
  if (!trap || trap.released) return;
  const target = w.heroes.get(trap.targetId),
    required = alive(w).filter((h) => trap.required.includes(h.id));
  // Departed/dead members no longer block rescue; late entrants are not added mid-cast.
  trap.required = required.map((h) => h.id);
  trap.inside = required.filter(
    (h) => distance(h, trap) <= s!.definition.trapRadius,
  ).length;
  if (
    !target ||
    target.hp <= 0 ||
    !trap.required.length ||
    trap.inside === trap.required.length ||
    w.tick >= trap.until
  ) {
    trap.released = true;
    trap.reason =
      w.tick >= trap.until
        ? 'timeout'
        : !target || target.hp <= 0
          ? 'target_left'
          : 'rescued';
    s!.until = Math.min(s!.until, w.tick + c.tickRate);
    return;
  }
  const r = distance(target, trap),
    limit = s!.definition.trapRadius - c.radius;
  if (r > limit) {
    const v = direction(target.x - trap.x, target.y - trap.y);
    target.x = trap.x + v.x * limit;
    target.y = trap.y + v.y * limit;
  }
}
/** Authoritative swept palm body: transparent corners and long empty trails are excluded. */
export function chuHandContact(
  from: Point,
  to: Point,
  hero: Point,
  fx: number,
  fy: number,
  scale: number,
  heroRadius: number,
): boolean {
  const start = { x: from.x + fx * 8 * scale, y: from.y + fy * 8 * scale },
    end = { x: to.x + fx * 8 * scale, y: to.y + fy * 8 * scale };
  const local = (p: Point) => ({
    x: (p.x - hero.x) * fx + (p.y - hero.y) * fy,
    y: -(p.x - hero.x) * fy + (p.y - hero.y) * fx,
  });
  const a = local(start),
    b = local(end);
  // Capsule along fingers-to-wrist, much smaller than the full 224px cel.
  const steps = Math.max(1, Math.ceil(distance(from, to) / 8));
  for (let i = 0; i <= steps; i++) {
    const f = i / steps,
      x = a.x + (b.x - a.x) * f,
      y = a.y + (b.y - a.y) * f;
    if (
      Math.hypot(Math.max(0, Math.abs(x) - 42 * scale), y) <=
      34 * scale + heroRadius
    )
      return true;
  }
  return false;
}
export function stepChu(w: World, c: SimulationConfig): void {
  if (!bossFightReady(w, c)) return;
  const s = w.chu;
  if (!s) return;
  settleBossLoot(w);
  const boss = w.creeps.get(CHU_BOSS_ID);
  if (!boss) return;
  if (boss.hp <= 0) {
    if (s.deadAt === undefined) death(w, c);
    else if (w.tick - s.deadAt >= s.definition.bossRespawnTicks)
      spawnChu(w, c, s.definition, s);
    return;
  }
  if (!alive(w).length) {
    s.missiles = [];
    s.hands = [];
    if (s.trap) s.trap.released = true;
    return;
  }
  if (w.tick >= s.until) {
    let i = (s.phaseIndex + 1) % s.definition.phases.length;
    if (i === 0) s.cycle++;
    begin(w, c, s.definition.phases[i]!.id, i);
  }
  const d = s.definition,
    elapsed = w.tick - s.started,
    seconds = elapsed / c.tickRate;
  s.wine = (s.wine ?? []).filter((a) => a.until > w.tick);
  for (const [id, e] of w.creeps)
    if (e.archetypeId === 'chu_wine_disciple') {
      if (e.hp <= 0) {
        (s.wine ??= []).push({
          id,
          x: e.x,
          y: e.y,
          until: w.tick + c.tickRate * 30,
        });
        w.creeps.delete(id);
        continue;
      }
      if (hasStatus(e, 'stun', w.tick)) continue;
      const aim = direction(boss.x - e.x, boss.y - e.y);
      e.fx = aim.x;
      e.fy = aim.y;
      e.pose = 'walk';
      if (distance(e, boss) > 55)
        moveCircle(
          e,
          { x: (aim.x * 80) / c.tickRate, y: (aim.y * 80) / c.tickRate },
          12,
          c.width,
          c.height,
          c.collision,
        );
      else {
        e.pose = 'cast';
        e.castAbilityId = 'wine_delivery';
      }
    }
  boss.pose =
    s.phase === 'idle'
      ? 'idle'
      : ['sweep', 'fists', 'palm'].includes(s.phase)
        ? 'basic_attack'
        : 'cast';
  boss.castAbilityId = s.phase;
  if (s.phase === 'idle') {
    const target = nearest(w);
    if (target && distance(target, boss) > 180) {
      const v = direction(target.x - boss.x, target.y - boss.y);
      moveCircle(
        boss,
        {
          x: (v.x * (d.movementSpeed ?? 70)) / c.tickRate,
          y: (v.y * (d.movementSpeed ?? 70)) / c.tickRate,
        },
        30,
        c.width,
        c.height,
        c.collision,
      );
      boss.fx = v.x;
      boss.fy = v.y;
      boss.pose = 'walk';
    }
  }
  const hitEvery = (interval: number, fn: () => void) => {
    if (elapsed >= Math.round(0.45 * c.tickRate) && w.tick >= s.nextAction) {
      s.nextAction = w.tick + interval;
      fn();
    }
  };
  if (s.phase === 'sweep')
    hitEvery(Math.round(1.6 * c.tickRate), () => {
      signal(w, 'sweep', boss, 'impact', d.sweepFrontRadius);
      for (const h of alive(w))
        if (
          distance(h, boss) <= d.sweepFootRadius + c.radius ||
          distance(h, {
            x: boss.x + s.fx * d.sweepFrontOffset,
            y: boss.y + s.fy * d.sweepFrontOffset,
          }) <=
            d.sweepFrontRadius + c.radius
        )
          damage(w, h, 'chu_phong_kinh', d.damage.sweep, c);
    });
  if (s.phase === 'fists')
    hitEvery(Math.round(0.5 * c.tickRate), () => {
      signal(w, 'fists', boss, 'impact', d.fistReach);
      for (const h of alive(w)) {
        const dx = h.x - boss.x,
          dy = h.y - boss.y,
          front = dx * s.fx + dy * s.fy,
          side = Math.abs(-dx * s.fy + dy * s.fx);
        if (
          front >= -20 &&
          front <= d.fistReach + c.radius &&
          side <= d.fistHalfWidth + c.radius
        )
          damage(w, h, 'chu_song_quyen', d.damage.fist, c);
      }
    });
  if (s.phase === 'palm' || w.tick >= (s.nextBasicAt ?? 0)) {
    if (
      s.phase === 'palm' ||
      s.phase === 'spin' ||
      s.phase === 'idle' ||
      s.phase === 'reflect' ||
      s.phase === 'ultimate'
    ) {
      if (w.tick >= (s.nextBasicAt ?? 0)) {
        const target = nearest(w);
        if (!target) return;
        const v = direction(target.x - boss.x, target.y - boss.y);
        if (s.phase === 'palm') {
          s.fx = boss.fx = v.x;
          s.fy = boss.fy = v.y;
        }
        s.missiles.push({
          id: w.nextId++,
          x: boss.x,
          y: boss.y,
          vx: v.x * 300,
          vy: v.y * 300,
          radius: 15,
          remaining: 1000,
          hitIds: [],
        });
        signal(w, 'palm', boss, 'release');
        s.nextBasicAt =
          w.tick + (d.basicPalmIntervalTicks ?? Math.round(2.2 * c.tickRate));
      }
    }
  }
  for (const shot of s.missiles) {
    const from = { x: shot.x, y: shot.y };
    shot.x += shot.vx / c.tickRate;
    shot.y += shot.vy / c.tickRate;
    shot.remaining -= Math.hypot(shot.vx, shot.vy) / c.tickRate;
    for (const h of alive(w))
      if (
        !shot.hitIds.includes(h.id) &&
        segmentCircle(from, shot, h, shot.radius + c.radius) !== undefined
      ) {
        shot.hitIds.push(h.id);
        if (damage(w, h, 'chu_chuong', d.damage.palm, c) && h.hp > 0)
          applyStatus(
            h,
            {
              kind: 'slow',
              magnitude: d.palmSlow.fraction,
              durationTicks: d.palmSlow.ticks,
            },
            CHU_BOSS_ID,
            'chu_chuong',
            w.tick,
          );
        shot.remaining = 0;
      }
  }
  s.missiles = s.missiles.filter(
    (p) =>
      p.remaining > 0 &&
      p.x > c.width * 0.1 &&
      p.x < c.width * 0.9 &&
      p.y > (c.height * 190) / 720 &&
      p.y < (c.height * 640) / 720,
  );
  if (s.phase === 'hands')
    for (const hand of s.hands) {
      const from = { x: hand.x, y: hand.y },
        u = Math.max(0, Math.min(1, (seconds - 0.75) / 2)),
        ease = u * u;
      hand.x = hand.from.x + (hand.target.x - hand.from.x) * ease;
      hand.y = hand.from.y + (hand.target.y - hand.from.y) * ease;
      if (seconds >= 0.75 && seconds <= 3.35)
        for (const h of alive(w))
          if (
            !hand.hitIds.includes(h.id) &&
            chuHandContact(
              from,
              hand,
              h,
              hand.fx,
              hand.fy,
              d.handsScale,
              c.radius,
            )
          ) {
            hand.hitIds.push(h.id);
            if (damage(w, h, 'song_thu_ho_bac', d.damage.hand, c) && h.hp > 0)
              applyStatus(
                h,
                {
                  kind: 'slow',
                  magnitude: d.palmSlow.fraction,
                  durationTicks: d.palmSlow.ticks,
                },
                CHU_BOSS_ID,
                'song_thu_ho_bac',
                w.tick,
              );
          }
    }
  constrainChuTrap(w, c);
  if (s.phase === 'spin') {
    const from = { x: boss.x, y: boss.y };
    const tri = (v: number, a: number, b: number) => {
      const span = b - a,
        n = ((v % (2 * span)) + 2 * span) % (2 * span);
      return a + (n < span ? n : 2 * span - n);
    };
    boss.x = tri(
      (s.spinOrigin ?? d.spawn).x -
        (205 * c.width) / 1280 +
        seconds * d.spinSpeedX,
      (205 * c.width) / 1280,
      (1075 * c.width) / 1280,
    );
    boss.y = tri(
      (s.spinOrigin ?? d.spawn).y -
        (235 * c.height) / 720 +
        seconds * d.spinSpeedY,
      (235 * c.height) / 720,
      (570 * c.height) / 720,
    );
    s.spinHits ??= {};
    for (const h of alive(w))
      if (
        w.tick >= (s.spinHits[h.id] ?? 0) &&
        segmentCircle(from, boss, h, d.spinRadius + c.radius) !== undefined
      ) {
        s.spinHits[h.id] = w.tick + Math.round(c.tickRate * 0.5);
        damage(w, h, 'tuy_tien_bo', d.damage.spin, c);
      }
  }
  if (s.phase === 'reflect')
    for (const h of alive(w)) {
      applyStatus(
        h,
        {
          kind: 'slow',
          magnitude: d.pullSlowFraction,
          durationTicks: Math.min(2, s.until - w.tick),
        },
        CHU_BOSS_ID,
        'can_khon_phan_chan',
        w.tick,
      );
      const dist = distance(h, boss);
      if (dist > 35) {
        const v = direction(boss.x - h.x, boss.y - h.y);
        displace(
          h,
          (v.x * d.pullSpeed) / c.tickRate,
          (v.y * d.pullSpeed) / c.tickRate,
          c.radius,
          c,
          w.tick,
        );
      }
    }
  if (
    s.phase === 'ultimate' &&
    elapsed >= c.tickRate &&
    w.tick >= s.nextAction
  ) {
    s.nextAction = w.tick + Math.round(0.35 * c.tickRate);
    const fields = chuFields(seconds, c.width, c.height);
    for (const h of alive(w))
      if (fields.some((f) => f.active && distance(h, f) <= f.radius + c.radius))
        damage(w, h, 'am_duong_nghich_chuyen', d.damage.ultimate, c);
  }
}
export function chuView(w: World, c: SimulationConfig): ChuView | null {
  const s = w.chu,
    b = w.creeps.get(CHU_BOSS_ID);
  if (!s || !b) return null;
  const d = s.definition,
    elapsed = (w.tick - s.started) / c.tickRate;
  return {
    phase: s.phase,
    elapsed,
    duration: (s.until - s.started) / c.tickRate,
    cycle: s.cycle,
    fx: s.fx,
    fy: s.fy,
    bossId: CHU_BOSS_ID,
    bossX: b.x,
    bossY: b.y,
    bossHp: b.hp,
    bossMaxHp: b.maxHp,
    hands: s.hands.map((h) => ({
      ...h,
      stage:
        elapsed < 0.75
          ? 'warning'
          : elapsed < 2.75
            ? 'travel'
            : elapsed < 3.35
              ? 'impact'
              : 'dissipate',
    })),
    missiles: s.missiles,
    trap: s.trap ?? null,
    disciples: [...w.creeps.values()]
      .filter((e) => e.archetypeId === 'chu_wine_disciple' && e.hp > 0)
      .map((e, id) => ({
        id,
        x: e.x,
        y: e.y,
        hp: e.hp,
        maxHp: e.maxHp,
        direction:
          Math.abs(e.fx) > Math.abs(e.fy)
            ? e.fx < 0
              ? 'left'
              : 'right'
            : e.fy < 0
              ? 'up'
              : 'down',
        tag: e.pose === 'walk' ? 'carry_walk' : 'drop_wine',
      })),
    wine: s.wine ?? [],
    wineDrinkers: Object.entries(s.wineDrinkers ?? {}).flatMap(
      ([id, until]) => {
        const h = w.heroes.get(id);
        return h && h.hp > 0 && until > w.tick
          ? [
              {
                id,
                x: h.x,
                y: h.y,
                remainingTicks: until - w.tick,
                durationTicks: s.definition.wineBuffTicks ?? 360,
              },
            ]
          : [];
      },
    ),
    fields: s.phase === 'ultimate' ? chuFields(elapsed, c.width, c.height) : [],
    waves: [],
    loot: s.loot,
    spinRadius: d.spinRadius,
    sweepFootRadius: d.sweepFootRadius,
    sweepFrontRadius: d.sweepFrontRadius,
    sweepFrontOffset: d.sweepFrontOffset,
    fistReach: d.fistReach,
    fistHalfWidth: d.fistHalfWidth,
    handsScale: d.handsScale,
  };
}

/** Atomic proximity interaction: one bottle, one server event, never boss loot rolls. */
export function drinkChuWine(w: World, id: string): boolean {
  const h = w.heroes.get(id),
    s = w.chu;
  if (!h || h.hp <= 0 || !s) return false;
  const bottle = (s.wine ?? [])
    .filter((a) => a.until > w.tick && distance(a, h) <= 64)
    .sort((a, b) => distance(a, h) - distance(b, h))[0];
  if (!bottle) return false;
  s.wine = s.wine!.filter((a) => a.id !== bottle.id);
  (s.wineDrinkers ??= {})[id] = w.tick + (s.definition.wineBuffTicks ?? 360);
  emit(w, {
    kind: 'pulse',
    abilityId: 'chu_wine',
    sourceId: id,
    targetId: id,
    x: h.x,
    y: h.y,
    damage: 0,
    critical: false,
    stage: 'wine_drink',
  });
  return true;
}
export function chuItemAction(
  w: World,
  id: string,
  index: number,
  itemId: string,
  action: 'sell' | 'drop',
  item: { id: string; nameVi: string; sellGold: number },
): string | undefined {
  const h = w.heroes.get(id);
  if (!h || h.hp <= 0 || h.bossItems?.[index] !== itemId || item.id !== itemId)
    return 'Vật phẩm không thuộc về bạn.';
  if (action === 'sell') {
    h.bossItems.splice(index, 1);
    h.gold += item.sellGold;
    return;
  }
  const context = w.chu ?? w.kim?.rewards;
  if (!context) return 'Chỉ thả chiến lợi phẩm trong phó bản thủ lĩnh.';
  h.bossItems.splice(index, 1);
  context.loot.push({
    id: ++context.kill,
    itemId,
    nameVi: item.nameVi,
    eligible: [],
    rolls: {},
    until: w.tick,
    state: 'ground',
    ownerId: '',
    x: h.x,
    y: h.y,
  });
}
