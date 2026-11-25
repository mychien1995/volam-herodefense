import { bossFightReady } from './boss-provocation.js';
import { waveBossFarewell } from './boss-banter.js';
import { announceBossSkill } from './boss-skill-announcement.js';
import { addCreep } from './simulation.js';
import { emit, hurt } from './combat.js';
import {
  blocked,
  direction,
  distance,
  moveCircle,
  segmentCircle,
} from './geometry.js';
import { hasStatus, statusValue } from './status.js';
import { NAM_DE_ID, namDeAbilities, namDeKeys } from './nam-de-types.js';
import type {
  NamDeAbility,
  NamDeCast,
  NamDeControl,
  NamDeDefinition,
  NamDeEffect,
  NamDeKey,
  NamDeView,
} from './nam-de-types.js';
import type { Hero, Point, SimulationConfig, World } from './types.js';

export function validateNamDe(d: NamDeDefinition, c: SimulationConfig): void {
  const finite = (v: unknown): void => {
    if (typeof v === 'number' && (!Number.isFinite(v) || v < 0))
      throw Error('Invalid Nam Đế number');
    if (v && typeof v === 'object') Object.values(v).forEach(finite);
  };
  finite(d);
  for (const k of [
    'restTicks',
    'actionRestTicks',
    'openingTicks',
    'auraDurationTicks',
    'dashTicks',
    'beamWarningTicks',
    'beamActiveTicks',
    'barrageWarningTicks',
    'barrageIntervalTicks',
    'barrageVolleys',
    'barrageDirections',
    'barrageTurnTicks',
    'qteTicks',
    'qteLength',
    'stunTicks',
    'pressureDashTicks',
    'confusionTicks',
    'skyCount',
    'skyWarningTicks',
    'smallBurstMax',
    'smallWindupTicks',
    'smallRecoveryTicks',
    'smallCooldownTicks',
    'skyDashTicks',
    'corpseTicks',
  ] as const)
    if (!Number.isInteger(d[k]) || d[k] < 1)
      throw Error('Invalid Nam Đế ticks/count: ' + k);
  if (
    d.wave !== 15 ||
    d.qteLength !== 10 ||
    d.barrageDirections !== 4 ||
    d.barrageVolleys !== 16 ||
    d.skyCount !== 96 ||
    !d.rotation.length ||
    d.rotation.some((id) => !namDeAbilities.includes(id))
  )
    throw Error('Invalid Nam Đế final kit');
  if (
    d.beamHpFraction !== 0.9 ||
    d.backlashFraction !== 0.7 ||
    d.healFraction !== 0.1 ||
    d.dashChance > 1 ||
    d.dashAuraChance > 1 ||
    d.controlResistance >= 1 ||
    d.stats.hp <= 0 ||
    d.smallBurstMax !== 5 ||
    d.smallBurstIntervalTicks <= 0 ||
    d.skySpacingTicks <= 0 ||
    d.rayRange <= 0 ||
    d.rayRadius <= 0
  )
    throw Error('Invalid Nam Đế tuning');
  for (const key of [
    'moveSpeed',
    'dashSpeed',
    'palmRange',
    'palmRadius',
    'palmSpeed',
    'auraRadius',
    'smallSpeed',
    'smallRadius',
    'rayRange',
    'rayRadius',
    'skyRadius',
  ] as const)
    if (d[key] <= 0) throw Error('Invalid Nam Đế extent/speed: ' + key);
  for (const p of [d.spawn, d.entrance])
    if (blocked(p, d.stats.radius, c.width, c.height, c.collision))
      throw Error('Blocked Nam Đế marker');
}
export function initializeNamDe(
  world: World,
  config: SimulationConfig,
  definition: NamDeDefinition,
): void {
  validateNamDe(definition, config);
  world.namDe = {
    definition: {
      ...definition,
      spawn: { ...definition.spawn },
      entrance: { ...definition.entrance },
      stats: { ...definition.stats },
      damage: { ...definition.damage },
      rotation: [...definition.rotation],
    },
    phase: 'waiting',
    spawnAt: 0,
    spawnCount: 0,
    serial: 0,
    rotationIndex: 0,
    nextActionAt: 0,
    nextSmallAt: world.tick + definition.openingTicks,
    effects: new Map(),
    controls: new Map(),
  };
}
/** Called after invasion clear detection, never merely from the 45-minute clock. */
export function gateNamDe(world: World, wave: number, matchTick: number): void {
  const s = world.namDe;
  if (!s || s.phase !== 'waiting' || wave < s.definition.wave) return;
  if (world.invasionPending?.has(s.definition.wave)) return;
  if (
    [...world.creeps.values()].some(
      (c) => c.invasion?.wave === s.definition.wave && c.hp > 0,
    )
  )
    return;
  s.phase = 'rest';
  s.spawnAt = matchTick + s.definition.restTicks;
}
export function namDeView(world: World): NamDeView | null {
  const s = world.namDe;
  if (!s) return null;
  return {
    actorId: NAM_DE_ID,
    phase: s.phase,
    spawnAt: s.spawnAt,
    spawnCount: s.spawnCount,
    defeatedAt: s.defeatedAt ?? 0,
    cast: s.cast
      ? {
          ...s.cast,
          origin: { ...s.cast.origin },
          target: { ...s.cast.target },
        }
      : null,
    smallCast: s.smallCast
      ? {
          ...s.smallCast,
          origin: { ...s.smallCast.origin },
          target: { ...s.smallCast.target },
        }
      : null,
    nextActionAt: s.nextActionAt,
    targets: [...s.controls].map(([id, c]) => ({
      id,
      qteUntil: c.qte?.state === 'pending' ? c.qte.until : 0,
      confusionUntil: c.confusion?.until ?? 0,
      stunUntil: c.stunUntil,
    })),
  };
}
export function clearNamDeHero(world: World, id: string): void {
  world.namDe?.controls.delete(id);
  const h = world.heroes.get(id);
  if (h) {
    h.namDeLocked = false;
    h.moveX = h.moveY = 0;
    h.statuses = (h.statuses ?? []).filter((s) => s.sourceId !== NAM_DE_ID);
  }
}
export function clearNamDe(world: World): void {
  const s = world.namDe;
  if (!s) return;
  s.effects.clear();
  delete s.cast;
  delete s.smallCast;
  s.nextSmallAt = world.tick + s.definition.openingTicks;
  for (const id of [...s.controls.keys()]) clearNamDeHero(world, id);
}
/** Empty rooms may stop ticking; do not defer cast cleanup to the next tick. */
export function clearNamDeIfEmpty(world: World): void {
  const s = world.namDe;
  if (!s || !s.spawnCount || [...world.heroes.values()].some((h) => h.hp > 0))
    return;
  clearNamDe(world);
  const b = world.creeps.get(NAM_DE_ID);
  if (!b || b.hp <= 0) s.phase = 'defeated';
  else if (s.phase !== 'enter') s.phase = 'idle';
  if (b) b.castAbilityId = '';
  s.nextActionAt = world.tick + s.definition.openingTicks;
}
export function namDeMovement(world: World, hero: Hero): Point {
  const confusion = world.namDe?.controls.get(hero.id)?.confusion;
  if (!confusion || confusion.until <= world.tick)
    return direction(hero.moveX, hero.moveY);
  let x = 0,
    y = 0;
  const add = (key: NamDeKey) => {
    const v = keyVector(confusion.mapping[key]);
    x += v.x;
    y += v.y;
  };
  if (hero.moveX > 0) add('right');
  if (hero.moveX < 0) add('left');
  if (hero.moveY > 0) add('down');
  if (hero.moveY < 0) add('up');
  return direction(x, y);
}
function keyVector(k: NamDeKey): Point {
  return k === 'up'
    ? { x: 0, y: -1 }
    : k === 'down'
      ? { x: 0, y: 1 }
      : k === 'left'
        ? { x: -1, y: 0 }
        : { x: 1, y: 0 };
}
const alive = (w: World) =>
  [...w.heroes.values()]
    .filter((h) => h.hp > 0)
    .sort((a, b) => a.id.localeCompare(b.id));
const boss = (w: World) => w.creeps.get(NAM_DE_ID);
function control(w: World, id: string): NamDeControl {
  let c = w.namDe!.controls.get(id);
  if (!c) {
    c = { stunUntil: 0 };
    w.namDe!.controls.set(id, c);
  }
  return c;
}
function cue(
  w: World,
  id: NamDeAbility,
  stage: string,
  targetId = '',
  point: Point = boss(w) ?? { x: 0, y: 0 },
): void {
  emit(w, {
    kind: 'cast',
    sourceId: NAM_DE_ID,
    targetId,
    abilityId: id,
    stage,
    ...point,
    damage: 0,
    critical: false,
  });
}
function failChallenge(
  w: World,
  c: SimulationConfig,
  h: Hero,
  result: 'wrong' | 'timeout',
): void {
  const s = w.namDe!,
    v = s.controls.get(h.id)!;
  if (v.qte?.state !== 'pending') return;
  v.qte.state = result;
  h.namDeLocked = false;
  h.moveX = h.moveY = 0;
  hurt(
    w,
    h,
    NAM_DE_ID,
    'dai_ly_phong_huyet',
    h.maxHp * s.definition.backlashFraction,
    c,
    {
      critChance: 0,
      critMultiplier: 1,
      directHp: true,
      unavoidableHpLoss: true,
      preserveFraction: true,
      reactive: true,
      periodic: true,
    },
  );
  const b = boss(w);
  if (b && b.hp > 0)
    b.hp = Math.min(b.maxHp, b.hp + b.maxHp * s.definition.healFraction);
  if (h.hp > 0) {
    h.statuses ??= [];
    h.statuses.push({
      kind: 'stun',
      magnitude: 1,
      durationTicks: s.definition.stunTicks,
      until: w.tick + s.definition.stunTicks,
      sourceId: NAM_DE_ID,
      abilityId: 'dai_ly_phong_huyet',
    });
    v.stunUntil = w.tick + s.definition.stunTicks;
  }
  addEffect(
    w,
    'backlash',
    'dai_ly_phong_huyet',
    h,
    { x: 1, y: 0 },
    0,
    60,
    w.tick,
    Math.ceil(0.4 * c.tickRate),
    0,
  );
  cue(w, 'dai_ly_phong_huyet', result, h.id, h);
}
export function answerNamDe(
  w: World,
  c: SimulationConfig,
  hero: Hero,
  id: string,
  index: number,
  key: NamDeKey,
): boolean {
  const q = w.namDe?.controls.get(hero.id)?.qte;
  if (
    !q ||
    q.state !== 'pending' ||
    q.id !== id ||
    hero.hp <= 0 ||
    !Number.isInteger(index) ||
    index !== q.index ||
    !namDeKeys.includes(key)
  )
    return false;
  if (w.tick >= q.until) {
    failChallenge(w, c, hero, 'timeout');
    return false;
  }
  if (q.keys[index] !== key) {
    failChallenge(w, c, hero, 'wrong');
    return true;
  }
  q.index++;
  if (q.index === q.keys.length) {
    q.state = 'success';
    hero.namDeLocked = false;
    hero.moveX = hero.moveY = 0;
    cue(w, 'dai_ly_phong_huyet', 'success', hero.id, hero);
  }
  return true;
}
function startChallenge(w: World, h: Hero, cast: NamDeCast): void {
  const d = w.namDe!.definition;
  const v = control(w, h.id);
  v.qte = {
    id: cast.id,
    keys: Array.from(
      { length: d.qteLength },
      () => namDeKeys[Math.floor(w.random() * 4)]!,
    ),
    index: 0,
    until: w.tick + d.qteTicks,
    state: 'pending',
    anchor: { x: h.x, y: h.y },
  };
  h.namDeLocked = true;
  h.moveX = h.moveY = 0;
  // Interrupt moving/channel actions without erasing unrelated buffs or support fields.
  w.actions = (w.actions ?? []).filter((a) => a.ownerId !== h.id);
  h.statuses = (h.statuses ?? []).filter(
    (s) => !['dash', 'dash_guard', 'channel'].includes(s.kind),
  );
  cue(w, 'dai_ly_phong_huyet', 'sealed', h.id, h);
}
function socket(p: Point, aim: Point): Point {
  const offset =
    Math.abs(aim.x) > Math.abs(aim.y)
      ? aim.x >= 0
        ? { x: 42, y: -39 }
        : { x: -32, y: -35 }
      : aim.y >= 0
        ? { x: 27, y: -41 }
        : { x: 4, y: -60 };
  return { x: p.x + offset.x, y: p.y + offset.y };
}
function addEffect(
  w: World,
  kind: NamDeEffect['kind'],
  ability: NamDeAbility,
  p: Point,
  aim: Point,
  length: number,
  radius: number,
  activeAt: number,
  lifetime: number,
  damage: number,
  hpFraction?: number,
  speed = 0,
  index = 0,
): NamDeEffect {
  const s = w.namDe!,
    id = `nam_de_fx_${w.nextId++}`;
  const e: NamDeEffect = {
    id,
    kind,
    ownerId: NAM_DE_ID,
    castId: s.cast?.id ?? `nam_de_${s.serial}`,
    abilityId: ability,
    x: p.x,
    y: p.y,
    fx: aim.x,
    fy: aim.y,
    length,
    radius,
    speed,
    startedAt: w.tick,
    activeAt,
    expiresAt: activeAt + lifetime,
    damageUntil: activeAt + lifetime,
    index,
    damage,
    hitIds: [],
    traveled: 0,
    ...(hpFraction === undefined ? {} : { hpFraction }),
  };
  s.effects.set(id, e);
  return e;
}
function beam(
  w: World,
  c: SimulationConfig,
  cast: NamDeCast,
  a: number,
  at: number,
  index: number,
  hp = false,
): void {
  const d = w.namDe!.definition,
    v = { x: Math.cos(a), y: Math.sin(a) },
    p = socket(cast.origin, v);
  // Map-sized, world-space geometry is identical for every client viewport.
  const limits = [
    v.x > 0 ? (c.width - p.x) / v.x : v.x < 0 ? -p.x / v.x : Infinity,
    v.y > 0 ? (c.height - p.y) / v.y : v.y < 0 ? -p.y / v.y : Infinity,
  ];
  addEffect(
    w,
    'beam',
    cast.ability,
    p,
    v,
    Math.max(0, Math.min(d.rayRange, ...limits)),
    d.rayRadius,
    at,
    d.beamActiveTicks,
    hp ? 0 : d.damage.barrage,
    hp ? d.beamHpFraction : undefined,
    0,
    index,
  );
}
export function beginNamDeCast(
  w: World,
  c: SimulationConfig,
  ability: NamDeAbility,
  targetId?: string,
  instant = false,
): boolean {
  const s = w.namDe,
    b = boss(w);
  if (!s || !b || b.hp <= 0 || !namDeAbilities.includes(ability)) return false;
  const choices = alive(w).filter((h) => !hasStatus(h, 'concealed', w.tick));
  const h =
    choices.find((h) => h.id === targetId) ??
    choices.sort(
      (a, z) => distance(a, b) - distance(z, b) || a.id.localeCompare(z.id),
    )[0];
  if (!h) return false;
  const d = s.definition,
    aim = direction(h.x - b.x, h.y - b.y);
  if (ability === 'nam_de_small_finger' && s.smallCast) return false;
  const cast: NamDeCast = {
    id: `nam_de_${++s.serial}`,
    ability,
    startedAt: w.tick,
    releaseAt: w.tick,
    until: w.tick + Math.ceil(0.6 * c.tickRate),
    targetId: h.id,
    fx: aim.x,
    fy: aim.y,
    origin: { x: b.x, y: b.y },
    target: { x: h.x, y: h.y },
    rotation: Math.atan2(aim.y, aim.x),
    nextVolley: 0,
    released: false,
  };
  if (ability === 'nam_de_small_finger') {
    cast.burstCount = d.smallBurstMax;
    cast.releaseAt = w.tick + (instant ? 0 : d.smallWindupTicks);
    cast.until =
      cast.releaseAt +
      Math.round((cast.burstCount - 1) * d.smallBurstIntervalTicks) +
      d.smallRecoveryTicks;
    s.smallCast = cast;
    s.nextSmallAt = w.tick + d.smallCooldownTicks;
    if (!s.cast)
      s.nextActionAt = Math.max(s.nextActionAt, w.tick + d.actionRestTicks);
    announceBossSkill(w, NAM_DE_ID, ability);
    cue(w, ability, 'warning', h.id, b);
    return true;
  }
  s.phase = ability;
  s.cast = cast;
  announceBossSkill(w, NAM_DE_ID, ability);
  b.fx = aim.x;
  b.fy = aim.y;
  b.pose = 'cast';
  b.castAbilityId = ability;
  if (ability === 'nhat_duong_chi') {
    const hand = socket(b, aim),
      ray = direction(h.x - hand.x, h.y - hand.y);
    cast.fx = ray.x;
    cast.fy = ray.y;
    cast.rotation = Math.atan2(ray.y, ray.x);
    cast.releaseAt = w.tick + d.beamWarningTicks;
    cast.until = cast.releaseAt + d.beamActiveTicks;
    beam(w, c, cast, cast.rotation, cast.releaseAt, 0, true);
    cast.released = true;
  }
  if (ability === 'lien_hoan_nhat_duong_chi') {
    cast.releaseAt = w.tick + d.barrageStartupTicks;
    cast.until =
      cast.releaseAt + d.barrageTurnTicks + Math.ceil(0.5 * c.tickRate);
    cast.rotation = w.random() * Math.PI * 2;
  }
  if (ability === 'dai_ly_phong_huyet' || ability === 'nam_de_dash') {
    cast.releaseAt =
      w.tick + (ability === 'nam_de_dash' ? d.dashTicks : d.pressureDashTicks);
    cast.until = cast.releaseAt + Math.ceil(0.5 * c.tickRate);
    if (ability === 'nam_de_dash') {
      const v = direction(h.fx, h.fy);
      cast.target = {
        x: h.x - v.x * d.behindDistance,
        y: h.y - v.y * d.behindDistance,
      };
      if (
        blocked(cast.target, d.stats.radius, c.width, c.height, c.collision)
      ) {
        delete s.cast;
        s.phase = 'idle';
        s.nextActionAt = w.tick + d.actionRestTicks;
        return false;
      }
    }
  }
  if (ability === 'phat_quang_pho_chieu') {
    cast.releaseAt = w.tick + Math.ceil(0.4 * c.tickRate);
    cast.until = cast.releaseAt + Math.ceil(2.3 * c.tickRate);
  }
  if (ability === 'nhat_duong_quy_tong') {
    cast.releaseAt = w.tick + d.skyStartupTicks;
    cast.until =
      cast.releaseAt +
      d.skyCount * d.skySpacingTicks +
      Math.ceil(0.7 * c.tickRate);
    for (let i = 0; i < d.skyCount; i++) {
      const a = w.random() * Math.PI * 2,
        r = Math.sqrt(w.random()) * 0.88;
      const point = {
        x: d.arenaBounds.x + Math.cos(a) * r * (d.arenaBounds.radiusX - 28),
        y: d.arenaBounds.y + Math.sin(a) * r * (d.arenaBounds.radiusY - 28),
      };
      const activeAt = cast.releaseAt + Math.round(i * d.skySpacingTicks);
      const e = addEffect(
        w,
        'sky',
        ability,
        point,
        { x: 0, y: 1 },
        0,
        d.skyRadius,
        activeAt,
        Math.ceil(0.4 * c.tickRate),
        d.damage.sky,
        undefined,
        0,
        i,
      );
      e.startedAt = activeAt - d.skyWarningTicks;
    }
  }
  b.actionUntil = cast.until;
  cue(w, ability, 'warning', h.id, b);
  return true;
}
function release(w: World, c: SimulationConfig, cast: NamDeCast): void {
  const s = w.namDe!,
    d = s.definition,
    b = boss(w)!;
  const h = w.heroes.get(cast.targetId);
  cast.released = true;
  cue(w, cast.ability, 'release', cast.targetId, b);
  if (cast.ability === 'nam_de_dash') {
    delete s.cast;
    s.phase = 'idle';
    b.castAbilityId = '';
    s.nextActionAt = w.tick + d.actionRestTicks;
    beginNamDeCast(
      w,
      c,
      w.random() < d.dashAuraChance ? 'nam_de_aura' : 'nam_de_small_finger',
      h && h.hp > 0 ? h.id : undefined,
      true,
    );
    return;
  }
  if (cast.ability === 'nam_de_palm')
    addEffect(
      w,
      'palm',
      cast.ability,
      { x: b.x, y: b.y - 20 },
      { x: cast.fx, y: cast.fy },
      d.palmRange,
      d.palmRadius,
      w.tick,
      Math.ceil((d.palmRange / d.palmSpeed) * c.tickRate) + 1,
      d.damage.palm,
      undefined,
      d.palmSpeed,
    );
  if (cast.ability === 'nam_de_aura')
    addEffect(
      w,
      'ring',
      cast.ability,
      b,
      { x: 1, y: 0 },
      0,
      d.auraRadius,
      w.tick,
      d.auraDurationTicks,
      d.damage.aura,
    );
  if (
    cast.ability === 'dai_ly_phong_huyet' &&
    h &&
    h.hp > 0 &&
    distance(b, h) <= d.stats.radius + c.radius + 8
  )
    startChallenge(w, h, cast);
  if (cast.ability === 'phat_quang_pho_chieu' && h && h.hp > 0) {
    const keys = [...namDeKeys];
    do {
      for (let i = 3; i > 0; i--) {
        const j = Math.floor(w.random() * (i + 1));
        [keys[i], keys[j]] = [keys[j]!, keys[i]!];
      }
    } while (keys.some((k, i) => k === namDeKeys[i]));
    control(w, h.id).confusion = {
      mapping: Object.fromEntries(
        namDeKeys.map((k, i) => [k, keys[i]!]),
      ) as Record<NamDeKey, NamDeKey>,
      until: w.tick + d.confusionTicks,
    };
  }
}
function stepEffects(w: World, c: SimulationConfig): void {
  const s = w.namDe!;
  for (const [id, e] of s.effects) {
    if (w.tick >= e.expiresAt) {
      s.effects.delete(id);
      continue;
    }
    if (w.tick < e.activeAt || e.kind === 'backlash') continue;
    const from = { x: e.x, y: e.y };
    if (e.speed) {
      const step = Math.min(e.length - e.traveled, e.speed / c.tickRate);
      e.x += e.fx * step;
      e.y += e.fy * step;
      e.traveled += step;
    }
    for (const h of alive(w)) {
      if (e.hitIds.includes(h.id)) continue;
      let inside = false;
      if (e.kind === 'beam')
        inside =
          segmentCircle(
            e,
            { x: e.x + e.fx * e.length, y: e.y + e.fy * e.length },
            h,
            c.radius + e.radius,
          ) !== undefined;
      else if (e.speed)
        inside = segmentCircle(from, e, h, c.radius + e.radius) !== undefined;
      else if (e.kind === 'sky') inside = distance(h, e) <= e.radius + c.radius;
      else if (e.kind === 'ring') {
        const radius =
          e.radius *
          Math.min(
            1,
            (w.tick - e.activeAt + 1) /
              Math.max(1, (e.expiresAt - e.activeAt) * 0.8),
          );
        inside = distance(h, e) <= radius + c.radius;
      }
      if (inside) {
        e.hitIds.push(h.id);
        hurt(
          w,
          h,
          NAM_DE_ID,
          e.abilityId,
          e.hpFraction === undefined ? e.damage : h.maxHp * e.hpFraction,
          c,
          {
            critChance: 0,
            critMultiplier: 1,
            fx: e.fx,
            fy: e.fy,
            ...(e.hpFraction === undefined
              ? {}
              : { directHp: true, preserveFraction: true }),
          },
        );
      }
    }
    if (e.speed && e.traveled >= e.length) s.effects.delete(id);
  }
}
/** Independent five-shot channel; main movement, QTE and special cast clocks continue. */
function stepSmallBurst(w: World, c: SimulationConfig): void {
  const s = w.namDe!,
    d = s.definition,
    b = boss(w)!;
  const cast = s.smallCast;
  if (cast) {
    while (
      cast.nextVolley < (cast.burstCount ?? 1) &&
      w.tick >=
        cast.releaseAt + Math.round(cast.nextVolley * d.smallBurstIntervalTicks)
    ) {
      const target = w.heroes.get(cast.targetId);
      if (!target || target.hp <= 0) {
        cast.nextVolley = cast.burstCount ?? 1;
        break;
      }
      const p = socket(b, direction(target.x - b.x, target.y - b.y)),
        v = direction(target.x - p.x, target.y - p.y);
      cast.fx = v.x;
      cast.fy = v.y;
      if (!s.cast) {
        b.fx = v.x;
        b.fy = v.y;
      }
      const effect = addEffect(
        w,
        'finger',
        cast.ability,
        p,
        v,
        d.rayRange,
        d.smallRadius,
        w.tick,
        Math.ceil((d.rayRange / d.smallSpeed) * c.tickRate),
        d.damage.small,
        undefined,
        d.smallSpeed,
        cast.nextVolley++,
      );
      effect.castId = cast.id;
      cast.released = true;
    }
  }
  if (cast && w.tick >= cast.until) delete s.smallCast;
}
export function stepNamDe(w: World, c: SimulationConfig): void {
  if (!bossFightReady(w, c) && w.namDe?.phase !== 'enter') {
    const waiting = w.creeps.get(NAM_DE_ID);
    if (waiting && waiting.hp > 0) waiting.pose = 'idle';
    return;
  }
  const s = w.namDe;
  if (!s) return;
  const d = s.definition;
  for (const [id, v] of s.controls) {
    const h = w.heroes.get(id);
    if (!h || h.hp <= 0) {
      clearNamDeHero(w, id);
      continue;
    }
    if (v.qte?.state === 'pending' && w.tick >= v.qte.until)
      failChallenge(w, c, h, 'timeout');
    if (v.confusion && v.confusion.until <= w.tick) delete v.confusion;
    if (
      v.qte &&
      v.qte.state !== 'pending' &&
      w.tick >= Math.max(v.qte.until, v.stunUntil)
    )
      delete v.qte;
    if (!v.qte && !v.confusion && v.stunUntil <= w.tick) s.controls.delete(id);
  }
  if (s.phase === 'defeated') {
    if (
      s.defeatedAt !== undefined &&
      w.tick >=
        s.defeatedAt + Math.max(d.corpseTicks, c.bossBanter?.farewellTicks ?? 0)
    )
      w.creeps.delete(NAM_DE_ID);
    return;
  }
  if (s.phase === 'waiting' || s.phase === 'rest') return;
  const b = boss(w);
  if (!b || b.hp <= 0) {
    s.phase = 'defeated';
    if (s.defeatedAt === undefined) {
      s.defeatedAt = w.tick;
      if (b) waveBossFarewell(w, c, b);
    }
    clearNamDe(w);
    return;
  }
  const targets = alive(w);
  if (!targets.length) {
    b.pose = 'idle';
    delete s.cast;
    delete s.smallCast;
    s.nextSmallAt = w.tick + d.openingTicks;
    s.effects.clear();
    if (s.phase !== 'enter') s.phase = 'idle';
    s.nextActionAt = w.tick + d.openingTicks;
    return;
  }
  if (
    s.phase !== 'enter' &&
    !s.smallCast &&
    w.tick >= s.nextSmallAt &&
    !hasStatus(b, 'stun', w.tick) &&
    !hasStatus(b, 'silence', w.tick) &&
    !hasStatus(b, 'disarm', w.tick)
  )
    beginNamDeCast(w, c, 'nam_de_small_finger');
  if (s.phase === 'enter') {
    const v = direction(d.entrance.x - b.x, d.entrance.y - b.y);
    b.fx = v.x;
    b.fy = v.y;
    b.pose = 'walk';
    moveCircle(
      b,
      {
        x: (v.x * d.moveSpeed) / c.tickRate,
        y: (v.y * d.moveSpeed) / c.tickRate,
      },
      d.stats.radius,
      c.width,
      c.height,
      c.collision,
    );
    if (distance(b, d.entrance) <= d.moveSpeed / c.tickRate + 2) {
      s.phase = 'idle';
      s.nextActionAt = w.tick + d.openingTicks;
    }
  } else if (s.cast) {
    const cast = s.cast;
    if (
      cast.ability === 'dai_ly_phong_huyet' ||
      cast.ability === 'nam_de_dash'
    ) {
      const h = w.heroes.get(cast.targetId),
        target = cast.ability === 'dai_ly_phong_huyet' ? h : cast.target;
      if (!cast.released && target) {
        const v = direction(target.x - b.x, target.y - b.y);
        b.fx = v.x;
        b.fy = v.y;
        const length =
          cast.ability === 'dai_ly_phong_huyet'
            ? Math.max(0, distance(b, target) - (d.stats.radius + c.radius))
            : distance(b, target);
        const step = Math.min(length, d.dashSpeed / c.tickRate);
        moveCircle(
          b,
          { x: v.x * step, y: v.y * step },
          d.stats.radius,
          c.width,
          c.height,
          c.collision,
        );
      }
    }
    if (
      cast.ability === 'nhat_duong_quy_tong' &&
      w.tick <= cast.startedAt + d.skyDashTicks
    ) {
      const p = Math.min(1, (w.tick - cast.startedAt) / d.skyDashTicks);
      b.x = cast.origin.x + (d.arenaBounds.x - cast.origin.x) * p;
      b.y = cast.origin.y + (d.arenaBounds.y - cast.origin.y) * p;
      b.pose = 'walk';
    }
    if (cast.ability === 'lien_hoan_nhat_duong_chi') {
      const turn =
        cast.rotation +
        Math.min(
          1,
          Math.max(0, (w.tick - cast.releaseAt) / d.barrageTurnTicks),
        ) *
          Math.PI *
          2;
      b.fx = Math.cos(turn);
      b.fy = Math.sin(turn);
      while (
        cast.nextVolley < d.barrageVolleys &&
        w.tick >=
          cast.releaseAt +
            cast.nextVolley * d.barrageIntervalTicks -
            d.barrageWarningTicks
      ) {
        const i = cast.nextVolley++;
        for (let j = 0; j < d.barrageDirections; j++)
          beam(
            w,
            c,
            cast,
            cast.rotation +
              (i * Math.PI * 2) / d.barrageVolleys +
              (j * Math.PI * 2) / d.barrageDirections,
            cast.releaseAt + i * d.barrageIntervalTicks,
            i * d.barrageDirections + j,
          );
      }
    } else if (
      cast.ability !== 'nam_de_small_finger' &&
      !cast.released &&
      w.tick >= cast.releaseAt
    )
      release(w, c, cast);
    if (w.tick >= cast.until) {
      delete s.cast;
      s.phase = 'idle';
      s.nextActionAt = w.tick + d.actionRestTicks;
      b.castAbilityId = '';
    }
  } else if (
    targets.some((h) => !hasStatus(h, 'concealed', w.tick)) &&
    !hasStatus(b, 'stun', w.tick)
  ) {
    const target = targets
      .filter((h) => !hasStatus(h, 'concealed', w.tick))
      .sort(
        (a, z) => distance(a, b) - distance(z, b) || a.id.localeCompare(z.id),
      )[0]!;
    const v = direction(target.x - b.x, target.y - b.y);
    b.fx = v.x;
    b.fy = v.y;
    if (distance(b, target) > d.auraRadius * 0.65) {
      moveCircle(
        b,
        {
          x:
            (v.x *
              d.moveSpeed *
              (1 - Math.min(0.85, statusValue(b, 'slow', w.tick)))) /
            c.tickRate,
          y:
            (v.y *
              d.moveSpeed *
              (1 - Math.min(0.85, statusValue(b, 'slow', w.tick)))) /
            c.tickRate,
        },
        d.stats.radius,
        c.width,
        c.height,
        c.collision,
      );
      b.pose = 'walk';
    } else b.pose = 'idle';
    if (
      w.tick >= s.nextActionAt &&
      !hasStatus(b, 'silence', w.tick) &&
      !hasStatus(b, 'disarm', w.tick)
    ) {
      const ability =
        w.random() < d.dashChance
          ? 'nam_de_dash'
          : d.rotation[s.rotationIndex++ % d.rotation.length]!;
      beginNamDeCast(w, c, ability, target.id);
    }
  } else if (!targets.some((h) => !hasStatus(h, 'concealed', w.tick)))
    b.pose = 'idle';
  stepSmallBurst(w, c);
  stepEffects(w, c);
}
export function spawnNamDeIfReady(
  w: World,
  c: SimulationConfig,
  matchTick: number,
): void {
  const s = w.namDe;
  if (!s || s.phase !== 'rest' || matchTick < s.spawnAt || s.spawnCount) return;
  const d = s.definition,
    b = addCreep(w, NAM_DE_ID, d.spawn, c);
  b.archetypeId = 'nam_de';
  b.stats = { ...d.stats };
  b.hp = b.maxHp = d.stats.hp;
  b.controlled = true;
  b.encounterBoss = true;
  b.neverRespawn = true;
  b.forcedMovementImmune = true;
  b.controlResistance = d.controlResistance;
  s.spawnCount++;
  s.phase = 'enter';
  b.fx = 0;
  b.fy = -1;
}
export function finishNamDeTick(w: World, c: SimulationConfig): void {
  const s = w.namDe;
  if (!s) return;
  const b = boss(w);
  if (s.spawnCount && (b?.hp ?? 0) <= 0) {
    s.phase = 'defeated';
    if (s.defeatedAt === undefined) {
      s.defeatedAt = w.tick;
      if (b) waveBossFarewell(w, c, b);
    }
    clearNamDe(w);
    return;
  }
  for (const [id, v] of s.controls) {
    const h = w.heroes.get(id);
    if (!h || h.hp <= 0) {
      clearNamDeHero(w, id);
      continue;
    }
    if (v.qte?.state === 'pending') {
      h.x = v.qte.anchor.x;
      h.y = v.qte.anchor.y;
      h.pose = 'idle';
    }
  }
}
