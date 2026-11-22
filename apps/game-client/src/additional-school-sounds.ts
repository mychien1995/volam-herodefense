import type Phaser from 'phaser';
import { nguDoc, duongMon, type CombatEvent } from '@volam/game-core';
import { m1Config } from '@volam/game-data';
import type { LobbyState } from '@volam/game-protocol';
import { preferences } from './preferences.js';
import { zoneTick } from './zone-tick.js';
import { AdditionalSchoolSoundDirector } from './additional-school-sound-director.js';
import {
  inspectSchoolSoundBank,
  preloadSchoolSoundBank,
  schoolSoundPort,
} from './school-sound-bank.js';

type School = 'ngu-doc' | 'duong-mon';
const schools: School[] = ['ngu-doc', 'duong-mon'];
const stores = new WeakMap<
  Phaser.Scene,
  Map<School, AdditionalSchoolSoundDirector>
>();

function directors(scene: Phaser.Scene) {
  let current = stores.get(scene);
  if (current) return current;
  current = new Map(
    schools.map((school) => [
      school,
      new AdditionalSchoolSoundDirector(school, schoolSoundPort(scene, school)),
    ]),
  );
  stores.set(scene, current);
  const clear = () => {
    for (const item of current.values()) item.clear();
    stores.delete(scene);
  };
  scene.events.once('shutdown', clear);
  scene.events.once('destroy', clear);
  return current;
}

export function preloadAdditionalSchoolSounds(scene: Phaser.Scene): void {
  for (const school of schools) preloadSchoolSoundBank(scene, school);
}

export function syncAdditionalSchoolSounds(
  scene: Phaser.Scene,
  state: LobbyState | undefined,
  sessionId: string,
): void {
  const local = state?.players.get(sessionId);
  if (!local || !state) {
    for (const item of stores.get(scene)?.values() ?? [])
      item.sync(undefined, 0);
    return;
  }
  const target: School | undefined =
    local.schoolId === nguDoc.school
      ? 'ngu-doc'
      : local.schoolId === duongMon.school
        ? 'duong-mon'
        : undefined;
  if (!target && !stores.has(scene)) return;
  const kits = directors(scene);
  for (const [school, kit] of kits)
    if (school !== target) kit.sync(undefined, 0);
  if (!target) return;
  const statuses = JSON.parse(local.statuses) as Array<{
    kind: string;
    ticks: number;
  }>;
  const has = (kind: string) =>
    statuses.some((s) => s.kind === kind && s.ticks > 0);
  const areas = [...state.areas.values()].filter(
    (a) => a.ownerId === sessionId && a.zoneId === local.zoneId && a.ticks > 0,
  );
  const tick = zoneTick(state, local.zoneId) ?? state.tick;
  const handEffect = m1Config.skillCatalogue?.[nguDoc.hands]?.effect;
  const handWindup =
    handEffect?.mode === 'area' ? (handEffect.windupTicks ?? 0) : 0;
  const summons = [...state.creeps.entries()].flatMap(([id, c]) => {
    if (c.ownerId !== sessionId || c.zoneId !== local.zoneId || c.hp <= 0)
      return [];
    const kind =
      c.archetypeId === 'ngu_doc_jiangshi'
        ? 'jiangshi'
        : c.archetypeId === 'ngu_doc_zombie'
          ? 'zombie'
          : c.archetypeId === 'ngu_doc_reaper'
            ? 'reaper'
            : undefined;
    return kind ? [{ id, kind } as const] : [];
  });
  kits.get(target)!.sync(
    {
      identity: `${sessionId}:${local.zoneId}:${local.basicId}`,
      live: state.phase === 'IN_GAME' && local.connected && local.hp > 0,
      tick,
      summons,
      elements: local.build.ranks.get(duongMon.elements) ?? 0,
      flags: {
        palm: has('ngu_doc_palm'),
        aura: has('ngu_doc_aura'),
        pool: areas.some((a) => a.abilityId === nguDoc.pool),
        hands: areas.some(
          (a) =>
            a.abilityId === nguDoc.hands && tick >= a.startedAt + handWindup,
        ),
        flight: has('duong_mon_flight'),
        shell: has('duong_mon_shell'),
        evade: has('duong_mon_evade'),
        flowers: areas.some((a) => a.abilityId === duongMon.flowers),
      },
    },
    preferences.volume,
  );
}

export function playAdditionalSchoolSound(
  scene: Phaser.Scene,
  event: CombatEvent,
  sessionId: string,
): void {
  for (const kit of stores.get(scene)?.values() ?? [])
    kit.event(event, sessionId);
}

export function inspectAdditionalSchoolSounds(scene: Phaser.Scene) {
  return Object.fromEntries(
    schools.map((school) => [
      school,
      {
        ...stores.get(scene)?.get(school)?.inspect(),
        loaded: inspectSchoolSoundBank(scene, school),
      },
    ]),
  );
}
