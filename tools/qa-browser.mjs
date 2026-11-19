/** Compact failure context; never return the full DOM, roster or event history. */
export async function qaBrowserDiagnostic(page) {
  return page.evaluate(() => {
    const snapshot = window.__VOLAM__?.snapshot();
    const hero = snapshot?.state?.players?.[snapshot.sessionId];
    return {
      ready: document
        .querySelector('#scene-status')
        ?.getAttribute('data-ready'),
      phase: snapshot?.state?.phase,
      tick: snapshot?.state?.tick,
      sessionId: snapshot?.sessionId,
      actor: hero && {
        hp: hero.hp,
        mana: hero.mana,
        zoneId: hero.zoneId,
        confirmed: hero.confirmed,
        lastSequence: hero.lastSequence,
      },
      notice: document
        .querySelector('#pregame .pre-error')
        ?.textContent?.slice(0, 160),
    };
  });
}

/** Poll inside the browser: one driver wait, no repeated snapshot round trips. */
export async function observeQa(
  page,
  predicate,
  argument,
  { label = 'authoritative observation', timeout = 15000, polling = 30 } = {},
) {
  let handle;
  try {
    handle = await page.waitForFunction(predicate, argument, {
      timeout,
      polling,
    });
    return await handle.jsonValue();
  } catch (cause) {
    let diagnostic;
    try {
      diagnostic = await qaBrowserDiagnostic(page);
    } catch {
      diagnostic = { unavailable: true };
    }
    throw Error(
      `QA ${label}: ${cause.name ?? 'Error'}; ${JSON.stringify(diagnostic)}`,
      { cause },
    );
  } finally {
    await handle?.dispose();
  }
}

/** A confirmed lobby snapshot is not evidence that Phaser finished loading. */
export async function waitForGameReady(page, options = {}) {
  await observeQa(
    page,
    () => {
      const snapshot = window.__VOLAM__?.snapshot();
      return (
        document.querySelector('#scene-status')?.getAttribute('data-ready') ===
          'true' &&
        snapshot?.state?.phase === 'IN_GAME' &&
        snapshot.state.players[snapshot.sessionId]?.confirmed === true
      );
    },
    undefined,
    { ...options, label: 'scene + server ready' },
  );
}

/** Only the existing idempotent lobby choices can be retried, until server ack. */
export async function acknowledgeQaLobby(page, action, id = '', options = {}) {
  if (!['start', 'school', 'branch', 'confirm'].includes(action))
    throw Error(`Unsupported lobby action: ${action}`);
  await observeQa(
    page,
    ({ action, id }) => {
      const snapshot = window.__VOLAM__?.snapshot();
      const phase = snapshot?.state?.phase;
      const self = snapshot?.state?.players?.[snapshot.sessionId];
      if (action === 'start' && phase === 'SCHOOL_SELECTION') return true;
      if (
        action === 'school' &&
        self?.schoolId === id &&
        (!snapshot.state.requiresBranch ||
          document.querySelector('#pregame .branch-dialog[open]'))
      )
        return true;
      if (action === 'branch' && self?.selectedBranch === id) return true;
      if (action === 'confirm' && self?.confirmed) return true;
      if (phase !== (action === 'start' ? 'WAITING_LOBBY' : 'SCHOOL_SELECTION'))
        return false;
      const buttons = document.querySelectorAll('#pregame button');
      const button = Array.from(buttons).find(
        (node) =>
          node.dataset.action === action &&
          (action === 'school'
            ? node.dataset.school === id
            : action === 'branch'
              ? node.dataset.branch === id
              : true),
      );
      if (button && !button.disabled) button.click();
      return false;
    },
    { action, id },
    { ...options, label: `lobby ${action} ${id}`, polling: 300 },
  );
}

/** Arm observation before one real key press; never retry combat or invent its result. */
export async function pressQaAndWait(
  page,
  key,
  predicate,
  argument,
  options = {},
) {
  await waitForGameReady(page, options);
  await page.evaluate(() => {
    const snapshot = window.__VOLAM__.snapshot();
    const actor = snapshot.state.players[snapshot.sessionId];
    if (!actor || actor.hp <= 0)
      throw Error(
        `Combat input requires a living authoritative actor: ${snapshot.sessionId} hp=${actor?.hp}`,
      );
  });
  await page.bringToFront();
  await page.locator('#game canvas').focus();
  const observation = observeQa(page, predicate, argument, options);
  // If input itself fails, preserve that error without an unhandled pending wait.
  observation.catch(() => {});
  await page.keyboard.press(key, { delay: options.keyDelay ?? 0 });
  return observation;
}
