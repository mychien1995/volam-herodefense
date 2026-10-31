import { qaEvidenceDirectory } from './qa-session.mjs';
/** Two/three-client frame iteration and the unchanged six-client final combat gate. */
export function arenaCreepQaOptions(args, env = process.env) {
  let mode, players;
  let evidence = 'minimal';
  let combatOnly = false;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--combat-only') combatOnly = true;
    else if (arg === '--mode') {
      mode = args[++i];
      if (mode === undefined) throw new Error('--mode requires a value');
    } else if (arg === '--players') players = Number(args[++i]);
    else if (arg === '--evidence') evidence = args[++i];
    else throw new Error('Unknown arena QA argument: ' + arg);
  }
  mode ??= players !== undefined && players < 6 ? 'frames' : 'full';
  players ??= mode === 'frames' ? 2 : 6;
  if (!['frames', 'full'].includes(mode))
    throw new Error('Mode must be frames or full');
  if (![2, 3, 6].includes(players))
    throw new Error('Players must be 2, 3 or 6');
  if (mode === 'full' && players !== 6)
    throw new Error('Full combat/final validation requires six players');
  if (combatOnly && mode !== 'full')
    throw new Error('--combat-only requires full mode');
  if (!['minimal', 'review'].includes(evidence))
    throw new Error('Evidence must be minimal or review');
  return {
    mode,
    players,
    combatOnly,
    evidence,
    evidenceDirectory: qaEvidenceDirectory(
      `docs/evidence/arena-creep-workflow/${mode}-${players}-players-${evidence}${combatOnly ? '-combat-only' : ''}`,
      env,
    ),
  };
}

/** Capturing pixels is separate from running/observing every required animation. */
export function shouldCaptureArenaCreepPng(options, filename) {
  if (filename === 'arena-failure.png') return true;
  if (options.evidence === 'minimal')
    return (
      options.mode === 'full' &&
      ['arena-idle-down.png', 'arena-natural-attacks.png'].includes(filename)
    );
  return (
    options.mode === 'full' ||
    [
      'arena-independent-instances.png',
      'arena-native-1x.png',
      'arena-projectile-renderer-fixture.png',
    ].includes(filename)
  );
}

/** Keep the exact observed frame names and outcomes; actor/event dumps are review-only. */
export function arenaCreepSavedReport(report, evidence) {
  if (evidence === 'review') return report;
  const {
    poseEvidence,
    completed,
    impactEvents,
    effects,
    projectileFixture,
    depthEvidence,
    ...summary
  } = report;
  return {
    ...summary,
    observedEffectFrames: effects?.observedFrames ?? [],
    completedAnimationCount: completed?.length ?? 0,
    contactEventCount: impactEvents?.length ?? 0,
  };
}
