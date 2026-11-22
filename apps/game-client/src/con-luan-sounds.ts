import type Phaser from 'phaser';
import type { CombatEvent } from '@volam/game-core';
import type { LobbyState } from '@volam/game-protocol';
import { preferences } from './preferences.js';
import { ConLuanSoundDirector } from './con-luan-sound-director.js';
import {
  inspectSchoolSoundBank,
  preloadSchoolSoundBank,
  schoolSoundPort,
} from './school-sound-bank.js';
const directors = new WeakMap<Phaser.Scene, ConLuanSoundDirector>();

export function preloadConLuanSounds(scene: Phaser.Scene): void {
  preloadSchoolSoundBank(scene, 'con-luan');
}

function director(scene: Phaser.Scene): ConLuanSoundDirector {
  let current = directors.get(scene);
  if (current) return current;
  current = new ConLuanSoundDirector(schoolSoundPort(scene, 'con-luan'));
  directors.set(scene, current);
  const clear = () => {
    current.clear();
    directors.delete(scene);
  };
  scene.events.once('shutdown', clear);
  scene.events.once('destroy', clear);
  return current;
}

export function syncConLuanSounds(
  scene: Phaser.Scene,
  state: LobbyState | undefined,
  sessionId: string,
): void {
  const local = state?.players.get(sessionId);
  if (!local || !state || local.schoolId !== 'con_luan') {
    directors.get(scene)?.sync(undefined, 0);
    return;
  }
  const statuses = JSON.parse(local.statuses) as Array<{
    kind: string;
    ticks: number;
  }>;
  const has = (kind: string) =>
    statuses.some((s) => s.kind === kind && s.ticks > 0);
  director(scene).sync(
    {
      identity: `${sessionId}:${local.zoneId}:${local.basicId}`,
      live: state.phase === 'IN_GAME' && local.connected && local.hp > 0,
      ranged: has('con_luan_ranged'),
      chaos: has('con_luan_chaos'),
      star: [...state.areas.values()].some(
        (area) =>
          area.ownerId === sessionId &&
          area.zoneId === local.zoneId &&
          area.abilityId === 'con_luan_kiem_tran' &&
          area.ticks > 0,
      ),
    },
    preferences.volume,
  );
}

export function playConLuanSound(
  scene: Phaser.Scene,
  event: CombatEvent,
  sessionId: string,
): void {
  director(scene).event(event, sessionId);
}

export function inspectConLuanSounds(scene: Phaser.Scene) {
  const sound = scene.sound;
  return {
    ...directors.get(scene)?.inspect(),
    loaded: inspectSchoolSoundBank(scene, 'con-luan'),
    locked: sound.locked,
    contextState:
      'context' in sound ? (sound.context as AudioContext).state : 'html5',
  };
}
