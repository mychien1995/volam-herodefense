import { describe, expect, it } from 'vitest';
import { nguDoc, duongMon, type CombatEvent } from '@volam/game-core';
import {
  AdditionalSchoolSoundDirector,
  type AdditionalAudioFrame,
} from '../apps/game-client/src/additional-school-sound-director.js';

function fixture(school: 'ngu-doc' | 'duong-mon') {
  const played: Array<{ cue: string; gain: number; live: boolean }> = [];
  const director = new AdditionalSchoolSoundDirector(school, {
    play(cue, options) {
      const item = { cue, gain: options.gain, live: true };
      played.push(item);
      return {
        active: () => item.live,
        volume: (value) => {
          item.gain = value;
        },
        stop: () => {
          item.live = false;
        },
      };
    },
  });
  const frame: AdditionalAudioFrame = {
    identity: 'self:arena:branch',
    live: true,
    tick: 1,
    flags: {},
    elements: 4,
    summons: [],
  };
  director.sync(frame, 50);
  let id = 0;
  const send = (
    abilityId: string,
    kind: CombatEvent['kind'],
    extra: Partial<CombatEvent> = {},
  ) => {
    const e: CombatEvent = {
      id: ++id,
      tick: id,
      sourceId: 'self',
      targetId: '',
      kind,
      abilityId,
      damage: kind === 'hit' ? 10 : 0,
      critical: false,
      x: 0,
      y: 0,
      ...extra,
    };
    director.event(e, 'self');
    return e;
  };
  return { played, frame, director, send };
}

describe('Ngũ Độc and Đường Môn sound policy', () => {
  it('has distinct normal / toxic palm and staff sounds, without periodic-poison noise', () => {
    const { played, send } = fixture('ngu-doc');
    send(nguDoc.taiHiep, 'attack');
    send(nguDoc.taiHiep, 'attack', { stage: 'ngu_doc_toxic' });
    send(nguDoc.coSu, 'attack');
    send(nguDoc.palm, 'hit');
    send(nguDoc.counter, 'hit');
    expect(played.map((e) => e.cue)).toEqual(['palm', 'toxic-palm', 'skull']);
  });

  it('plays actual attach / detonate / return and throttles reflected poison', () => {
    const { played, send } = fixture('ngu-doc');
    send(nguDoc.mark, 'effect', { stage: 'attached' });
    send(nguDoc.mark, 'pulse', { stage: 'detonate' });
    send(nguDoc.mark, 'effect', { stage: 'return' });
    for (let tick = 10; tick < 30; tick++)
      send(nguDoc.counter, 'effect', { stage: 'reflected', tick });
    expect(played.slice(0, 3).map((e) => e.cue)).toEqual([
      'mark-attach',
      'mark-detonate',
      'mark-return',
    ]);
    expect(played.filter((e) => e.cue === 'counter')).toHaveLength(2);
  });

  it('accepts Reaper cues only from an owned summon, including before its first state patch', () => {
    const { played, send } = fixture('ngu-doc');
    send(nguDoc.reaperSweep, 'effect', { sourceId: 'foreign' });
    send(nguDoc.reaper, 'effect', { stage: 'summoned', targetId: 'owned' });
    send(nguDoc.reaperSweep, 'effect', { sourceId: 'owned' });
    send(nguDoc.reaperWave, 'effect', { sourceId: 'owned' });
    send(nguDoc.reaperSlam, 'effect', { sourceId: 'owned' });
    expect(played.map((e) => e.cue)).toEqual([
      'reaper-emerge',
      'reaper-sweep',
      'reaper-wave',
      'reaper-slam',
    ]);
  });

  it('stops fields on expiry/toggle and fades minions without replaying summons on zone changes', () => {
    const { director, frame, played } = fixture('ngu-doc');
    director.sync(
      {
        ...frame,
        flags: { aura: true, pool: true, hands: true },
        summons: [{ id: 'minion', kind: 'jiangshi' }],
      },
      50,
    );
    expect(director.inspect().loops).toHaveLength(3);
    director.sync({ ...frame, tick: 40 }, 50);
    expect(director.inspect().loops).toEqual([]);
    expect(played.map((e) => e.cue)).toContain('jiangshi-fade');
    const count = played.length;
    director.sync({ ...frame, identity: 'self:dungeon:branch' }, 50);
    expect(played).toHaveLength(count);
  });

  it('uses a composite ranked fan, real laser release and actual six knife / eight storm pulses', () => {
    const { send, played } = fixture('duong-mon');
    send(duongMon.amKhi, 'attack');
    send(duongMon.laser, 'cast');
    expect(played.map((p) => p.cue)).toEqual(['needles-4', 'laser-charge']);
    send(duongMon.laser, 'pulse', { stage: 'release' });
    for (let i = 0; i < 6; i++)
      send(duongMon.knives, 'pulse', { stage: 'release' });
    for (const stage of [
      'slow_knives',
      ...Array(6).fill('poison_knives'),
      'water',
    ])
      send(duongMon.storm, 'pulse', { stage });
    expect(played.filter((p) => p.cue === 'knife-shot')).toHaveLength(6);
    expect(played.filter((p) => p.cue === 'storm-poison')).toHaveLength(6);
    expect(played.at(-1)!.cue).toBe('storm-water');
  });

  it('groups twenty flower explosions and never emits a passive R cast or foreign hidden-trap sound', () => {
    const { send, played } = fixture('duong-mon');
    for (let i = 0; i < 20; i++)
      send(duongMon.flowers, 'pulse', { tick: 60, stage: 'area_tick' });
    send(duongMon.elements, 'cast');
    send(duongMon.trap, 'cast', { sourceId: 'foreign' });
    expect(played.map((e) => e.cue)).toEqual(['flowers-burst']);
  });

  it('keeps overlapping voices within linear headroom even at full master volume', () => {
    const { director, frame, send, played } = fixture('duong-mon');
    director.sync(frame, 100);
    for (let i = 0; i < 20; i++)
      send(duongMon.knives, 'pulse', { stage: 'release' });
    const live = played.filter((entry) => entry.live);
    expect(live).toHaveLength(8);
    expect(
      live.reduce((sum, entry) => sum + entry.gain, 0),
    ).toBeLessThanOrEqual(0.900001);
  });

  it.each(['ngu-doc', 'duong-mon'] as const)(
    '%s respects mute, hero death and disconnect for every sustained sound',
    (school) => {
      const { director, frame, send, played } = fixture(school);
      const active = {
        ...frame,
        flags: { aura: true, flight: true, shell: true },
      };
      director.sync(active, 50);
      director.sync(active, 0);
      expect(director.inspect().active).toBe(0);
      const muted = send(
        school === 'ngu-doc' ? nguDoc.coSu : duongMon.coQuan,
        'attack',
      );
      director.sync(active, 50);
      director.event(muted, 'self');
      const count = played.length;
      send('', 'death', { sourceId: 'foreign', targetId: 'self' });
      expect(director.inspect().active).toBe(0);
      director.sync(undefined, 0);
      expect(played).toHaveLength(count);
    },
  );
});
