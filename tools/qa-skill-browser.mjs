import { observeQa, pressQaAndWait, waitForGameReady } from './qa-browser.mjs';

/** Explicitly requested prerequisite only: one legal UI upgrade, confirmed by the server. */
export async function ensureQaSkillLearned(
  page,
  slot,
  abilityId,
  options = {},
) {
  if (!Number.isInteger(slot) || slot < 0 || slot > 4)
    throw Error('Skill slot must be 0..4');
  const actor = await qaSkillActor(page, options);
  const before = await page.evaluate(
    ({ slot, abilityId }) => {
      const s = window.__VOLAM__.snapshot(),
        h = s.state.players[s.sessionId];
      if (h.build.slotSkills[slot] !== abilityId)
        throw Error('Unexpected equipped skill for QA slot');
      return {
        rank: h.build.ranks[abilityId] ?? 0,
        revision: h.build.revision,
        points: h.build.available,
      };
    },
    { slot, abilityId },
  );
  if (before.rank > 0) return before;
  if (before.points < 1)
    throw Error('Skill QA has no authoritative skill point');
  await page.bringToFront();
  await page
    .locator(`[data-rank-slot="${slot}"]`)
    .click({ timeout: options.timeout ?? 15000 });
  return observeQa(
    page,
    ({ actor, abilityId, revision }) => {
      const s = window.__VOLAM__.snapshot(),
        h = s.state.players[s.sessionId];
      if (
        s.roomId !== actor.roomId ||
        s.sessionId !== actor.sourceId ||
        h?.zoneId !== actor.zoneId ||
        h.hp <= 0
      )
        throw Error('Actor changed during skill upgrade');
      const rank = h.build.ranks[abilityId] ?? 0;
      return rank > 0 && h.build.revision > revision
        ? { rank, revision: h.build.revision, points: h.build.available }
        : false;
    },
    { actor, abilityId, revision: before.revision },
    { ...options, label: `learned ${abilityId}` },
  );
}

/** Resolve the current projected actor every time; never cache identity across travel/PvP. */
export async function qaSkillActor(page, options = {}) {
  await waitForGameReady(page, options);
  return observeQa(
    page,
    () => {
      const s = window.__VOLAM__.snapshot(),
        h = s.state.players[s.sessionId];
      if (!h || h.hp <= 0)
        throw Error('Skill QA needs a living authoritative actor');
      if (h.pose === 'cast' || h.pose === 'attack') return false;
      return {
        roomId: s.roomId,
        sourceId: s.sessionId,
        zoneId: h.zoneId,
        basicId: h.basicId,
        sequence: h.lastSequence,
      };
    },
    undefined,
    { ...options, label: 'current actor ready for skill' },
  );
}

/** One real key; require both a fresh event and sequence acknowledgement. No combat retry. */
export async function castQaSkill(page, key, abilityId, options = {}) {
  const actor = await qaSkillActor(page, options);
  const kind = options.kind ?? 'cast';
  const baseline = await page.evaluate(
    ({ abilityId, kind, sourceId }) => {
      const s = window.__VOLAM__.snapshot();
      return s.events
        .filter(
          (e) =>
            e.sourceId === sourceId &&
            e.abilityId === abilityId &&
            e.kind === kind,
        )
        .map((e) =>
          JSON.stringify([
            e.id,
            e.tick,
            e.kind,
            e.sourceId,
            e.targetId,
            e.abilityId,
            e.stage,
          ]),
        );
    },
    { abilityId, kind, sourceId: actor.sourceId },
  );
  const event = await pressQaAndWait(
    page,
    key,
    ({ actor, abilityId, kind, baseline }) => {
      const s = window.__VOLAM__.snapshot(),
        h = s.state.players[s.sessionId];
      if (
        s.roomId !== actor.roomId ||
        s.sessionId !== actor.sourceId ||
        h?.zoneId !== actor.zoneId
      )
        throw Error(
          'Actor/room/zone changed during skill input; reacquire prerequisites',
        );
      if (!h || h.hp <= 0) throw Error('Actor died during skill input');
      if (h.lastSequence <= actor.sequence) return false;
      return (
        s.events.find(
          (e) =>
            e.sourceId === s.sessionId &&
            e.abilityId === abilityId &&
            e.kind === kind &&
            !baseline.includes(
              JSON.stringify([
                e.id,
                e.tick,
                e.kind,
                e.sourceId,
                e.targetId,
                e.abilityId,
                e.stage,
              ]),
            ),
        ) ?? false
      );
    },
    { actor, abilityId, kind, baseline },
    { ...options, label: `fresh ${kind} ${abilityId}` },
  );
  return { actor, event };
}

/** Kinh Lôi is a real prerequisite of Kiếm Tôn Q, not a fixture-injected area. */
export async function ensureQaKinhLoi(page, options = {}) {
  const actor = await qaSkillActor(page, options),
    abilityId = 'kinh_loi';
  if (actor.basicId !== 'con_luan_kiem_ton')
    throw Error('Kinh Lôi QA requires Côn Luân Kiếm Tôn');
  const initial = await page.evaluate(
    ({ abilityId }) => {
      const s = window.__VOLAM__.snapshot(),
        h = s.state.players[s.sessionId];
      return {
        areas: Object.entries(s.state.areas)
          .filter(
            ([, a]) =>
              a.ownerId === s.sessionId &&
              a.zoneId === h.zoneId &&
              a.abilityId === abilityId,
          )
          .map(([id]) => id),
        charge: h.build?.charges?.[abilityId]?.count ?? 0,
      };
    },
    { abilityId },
  );
  if (!initial.areas.length) {
    if (initial.charge < 1) throw Error('Kinh Lôi has no authoritative charge');
    await castQaSkill(page, options.key ?? 's', abilityId, options);
  }
  return observeQa(
    page,
    ({ abilityId, actor }) => {
      const s = window.__VOLAM__.snapshot(),
        h = s.state.players[s.sessionId];
      if (
        s.roomId !== actor.roomId ||
        s.sessionId !== actor.sourceId ||
        h?.zoneId !== actor.zoneId ||
        h.hp <= 0
      )
        throw Error('Actor/room/zone changed while preparing Kinh Lôi');
      const areas = Object.entries(s.state.areas)
        .filter(
          ([, a]) =>
            a.ownerId === s.sessionId &&
            a.zoneId === h.zoneId &&
            a.abilityId === abilityId,
        )
        .map(([id]) => id);
      return areas.length && h.pose !== 'cast'
        ? {
            sourceId: s.sessionId,
            zoneId: h.zoneId,
            areaIds: areas,
            charges: h.build.charges[abilityId].count,
          }
        : false;
    },
    { abilityId, actor },
    { ...options, label: 'Kinh Lôi placed and server acknowledged' },
  );
}

/** Verify concealment while a peer's authoritative projection actually advances. */
export async function placeQaOwnerOnlyArea(
  owner,
  peers,
  { key, abilityId, absenceMilliseconds = 250, ...options },
) {
  if (!peers.length)
    throw Error('Owner-only area QA requires a peer in the same zone');
  if (!Number.isFinite(absenceMilliseconds) || absenceMilliseconds < 100)
    throw Error('Private area observation requires at least 100ms');
  const previousIds = await owner.evaluate(() =>
    Object.keys(window.__VOLAM__.snapshot().state.areas),
  );
  const receipt = await castQaSkill(owner, key, abilityId, options);
  const areaIds = await observeQa(
    owner,
    ({ abilityId, previousIds }) => {
      const s = window.__VOLAM__.snapshot(),
        h = s.state.players[s.sessionId];
      const ids = Object.entries(s.state.areas)
        .filter(
          ([id, a]) =>
            !previousIds.includes(id) &&
            a.ownerId === s.sessionId &&
            a.zoneId === h.zoneId &&
            a.abilityId === abilityId,
        )
        .map(([id]) => id);
      return ids.length ? ids : false;
    },
    { abilityId, previousIds },
    { ...options, label: 'owner received private area' },
  );
  const observations = [];
  for (const page of peers) {
    await waitForGameReady(page, options);
    await page.bringToFront();
    observations.push(
      await page.evaluate(
        async ({ actor, abilityId, areaIds, duration }) => {
          const start = performance.now(),
            first = window.__VOLAM__.snapshot();
          const firstTick = first.state.tick;
          if (first.sessionId === actor.sourceId)
            throw Error('Private-area observer must be a different actor');
          let samples = 0,
            lastTick = firstTick;
          if (!Number.isFinite(lastTick))
            throw Error('Peer projection has no authoritative tick');
          while (performance.now() - start < duration) {
            const s = window.__VOLAM__.snapshot(),
              h = s.state.players[s.sessionId];
            if (s.roomId !== actor.roomId || h.zoneId !== actor.zoneId)
              throw Error(
                'Private-area peer must stay in the same room and zone',
              );
            if (
              Object.entries(s.state.areas).some(
                ([id, a]) =>
                  areaIds.includes(id) ||
                  (a.ownerId === actor.sourceId && a.abilityId === abilityId),
              )
            )
              throw Error('Private area leaked to peer');
            if (
              s.events.some(
                (e) =>
                  e.sourceId === actor.sourceId &&
                  e.abilityId === abilityId &&
                  e.kind === 'cast',
              )
            )
              throw Error('Private cast leaked to peer');
            lastTick = s.state.tick;
            samples++;
            await new Promise((done) => requestAnimationFrame(done));
          }
          if (
            samples < 2 ||
            !Number.isFinite(lastTick) ||
            lastTick <= firstTick
          )
            throw Error(
              'Peer projection did not advance; absence is inconclusive',
            );
          return { samples, firstTick, lastTick };
        },
        {
          actor: receipt.actor,
          abilityId,
          areaIds,
          duration: absenceMilliseconds,
        },
      ),
    );
  }
  return { receipt, areaIds, observations };
}

export async function captureQaSummon(page, summonId, options = {}) {
  await waitForGameReady(page, options);
  return observeQa(
    page,
    ({ summonId }) => {
      const s = window.__VOLAM__.snapshot(),
        h = s.state.players[s.sessionId],
        a = s.state.creeps[summonId];
      if (!h || h.hp <= 0) throw Error('Summon QA needs a living owner');
      if (!a || a.ownerId !== s.sessionId || a.zoneId !== h.zoneId || a.hp <= 0)
        return false;
      return {
        roomId: s.roomId,
        sourceId: s.sessionId,
        summonId,
        zoneId: h.zoneId,
        hp: a.hp,
        maxHp: a.maxHp,
      };
    },
    { summonId },
    { ...options, label: 'live owned summon before transfer' },
  );
}

export async function waitQaSummonTransfer(
  page,
  before,
  { zonePattern, texture, peers = [], ...options } = {},
) {
  const after = await observeQa(
    page,
    ({ before, zonePattern, texture }) => {
      const s = window.__VOLAM__.snapshot(),
        h = s.state.players[s.sessionId];
      if (s.roomId !== before.roomId)
        throw Error('Summon transfer changed room');
      if (!h || h.hp <= 0)
        throw Error('Owner is not alive during summon transfer');
      if (
        h.zoneId === before.zoneId ||
        (zonePattern && !new RegExp(zonePattern).test(h.zoneId))
      )
        return false;
      const a = s.state.creeps[before.summonId],
        v = window.__VOLAM__.presentation();
      const rendered = v?.actors?.find((actor) => actor.id === before.summonId);
      if (
        !a ||
        a.ownerId !== s.sessionId ||
        a.zoneId !== h.zoneId ||
        a.hp <= 0 ||
        v?.zoneId !== h.zoneId ||
        !rendered ||
        !rendered.healthBarVisible ||
        (texture && rendered.texture !== texture)
      )
        return false;
      return {
        roomId: s.roomId,
        sourceId: s.sessionId,
        summonId: before.summonId,
        zoneId: h.zoneId,
        hp: a.hp,
        maxHp: a.maxHp,
        texture: rendered.texture,
      };
    },
    { before, zonePattern: zonePattern ?? null, texture: texture ?? null },
    { ...options, label: 'same living summon in destination Phaser scene' },
  );
  for (const peer of peers) {
    await peer.bringToFront();
    const tick = await peer.evaluate(
      () => window.__VOLAM__.snapshot().state.tick,
    );
    await observeQa(
      peer,
      ({ before, after, tick }) => {
        const s = window.__VOLAM__.snapshot(),
          h = s.state.players[s.sessionId];
        if (s.roomId !== before.roomId)
          throw Error('Summon observer changed room');
        const projected = s.state.creeps[before.summonId];
        return (
          s.state.tick > tick &&
          h.zoneId !== after.zoneId &&
          (!projected || projected.zoneId === after.zoneId) &&
          !window.__VOLAM__
            .presentation()
            ?.actors.some((a) => a.id === before.summonId)
        );
      },
      { before, after, tick },
      { ...options, label: 'summon removed from old-zone peer projection' },
    );
  }
  return after;
}
