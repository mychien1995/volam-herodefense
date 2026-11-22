import { describe, expect, it } from 'vitest';
import { conLuan, type CombatEvent } from '@volam/game-core';
import {
  ConLuanSoundDirector,
  type ConLuanAudioFrame,
} from '../apps/game-client/src/con-luan-sound-director.js';

function fixture() {
  const played: Array<{
    cue: string;
    gain: number;
    rate: number;
    loop: boolean;
    live: boolean;
  }> = [];
  const director = new ConLuanSoundDirector({
    play(cue, options) {
      const item = { cue, ...options, live: true };
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
  const frame: ConLuanAudioFrame = {
    identity: 'self:arena:monk',
    live: true,
    ranged: false,
    chaos: false,
    star: false,
  };
  director.sync(frame, 50);
  let id = 0;
  const send = (
    abilityId: string,
    kind: CombatEvent['kind'],
    extra: Partial<CombatEvent> = {},
  ) => {
    const event: CombatEvent = {
      id: ++id,
      tick: id,
      sourceId: 'self',
      targetId: '',
      abilityId,
      kind,
      damage: kind === 'hit' ? 10 : 0,
      critical: false,
      x: 0,
      y: 0,
      ...extra,
    };
    director.event(event, 'self');
    return event;
  };
  return { director, frame, played, send };
}

describe('Côn Luân authoritative sound presentation', () => {
  it('distinguishes all four hammer stages, ranged A, orb and sword finisher', () => {
    const { send, played } = fixture();
    for (const stage of ['thrust', 'sweep', 'rising', 'overhead'])
      send(conLuan.monk, 'attack', { stage });
    send(conLuan.bolt, 'attack');
    send(conLuan.sword, 'attack', { stage: 'orb' });
    send(conLuan.sword, 'attack', { stage: 'sword' });
    expect(played.map((p) => p.cue)).toEqual([
      'monk-thrust',
      'monk-sweep',
      'monk-rising',
      'monk-overhead',
      'monk-bolt',
      'orb',
      'sword',
    ]);
  });

  it('does not sound hits on cast and uses the real slam / projectile explosion pulses', () => {
    const { send, played } = fixture();
    send(conLuan.slam, 'cast');
    send(conLuan.hammer, 'cast');
    expect(played.map((p) => p.cue)).toEqual(['slam-windup', 'hammer-launch']);
    send(conLuan.slam, 'pulse', { stage: 'hammer_contact' });
    send(conLuan.hammer, 'pulse', { stage: 'explosion' });
    expect(played.slice(-2).map((p) => p.cue)).toEqual([
      'slam-impact',
      'hammer-explosion',
    ]);
  });

  it('preserves five E sweeps and groups cleave / multi-marker damage without repeated audio', () => {
    const { send, played, director } = fixture();
    send(conLuan.fan, 'cast');
    for (let i = 0; i < 5; i++) {
      send(conLuan.fan, 'pulse', {
        stage: 'sweep',
        tick: 10 + i * 2,
        hitIndex: i,
      });
      send(conLuan.fan, 'hit', { tick: 10 + i * 2, targetId: 'one' });
      send(conLuan.fan, 'hit', { tick: 10 + i * 2, targetId: 'two' });
    }
    send(conLuan.fan, 'pulse', { stage: 'finisher', tick: 22 });
    expect(played.filter((p) => p.cue === 'fan-sweep')).toHaveLength(5);
    expect(played.filter((p) => p.cue === 'hit-electric')).toHaveLength(5);
    const detonation = send(conLuan.detonate, 'pulse', { tick: 30 });
    send(conLuan.detonate, 'pulse', { tick: 30 });
    director.event(detonation, 'self');
    expect(played.filter((p) => p.cue === 'detonate-impact')).toHaveLength(1);
    expect(director.inspect().active).toBeLessThanOrEqual(8);
  });

  it('supports both complete active kits and S without inventing passive casts', () => {
    const { send, played } = fixture();
    for (const id of [
      conLuan.ring,
      conLuan.chaos,
      conLuan.plant,
      conLuan.detonate,
      conLuan.dash,
      conLuan.dragon,
      conLuan.star,
    ])
      send(id, 'cast');
    send(conLuan.passive, 'cast');
    expect(played.map((p) => p.cue)).toEqual([
      'ring',
      'chaos-start',
      'plant',
      'detonate-trigger',
      'dash',
      'dragon-launch',
      'star-windup',
    ]);
    send(conLuan.dragon, 'hit');
    send(conLuan.star, 'pulse', { stage: 'area_open' });
    send(conLuan.star, 'pulse', { stage: 'area_tick' });
    expect(played.slice(-3).map((p) => p.cue)).toEqual([
      'dragon-hit',
      'star-open',
      'star-pulse',
    ]);
  });

  it('reconciles both stance directions and authoritative Chaos / star lifetimes', () => {
    const { director, frame, played, send } = fixture();
    send(conLuan.stance, 'cast');
    expect(played).toHaveLength(0);
    director.sync({ ...frame, ranged: true, chaos: true, star: true }, 50);
    send(conLuan.monk, 'attack', { stage: 'thrust' });
    expect(played.at(-1)?.rate).toBe(0.83);
    director.sync({ ...frame, ranged: true, chaos: true, star: true }, 50);
    expect(played.filter((p) => p.cue === 'chaos-loop')).toHaveLength(1);
    expect(director.inspect().loops).toEqual(['chaos-loop', 'star-loop']);
    director.sync(frame, 50);
    expect(played.slice(-3).map((p) => p.cue)).toEqual([
      'stance-melee',
      'chaos-end',
      'star-end',
    ]);
    expect(director.inspect().loops).toEqual([]);
  });

  it('respects local ownership, mute and volume changes; unmute resumes only live loops', () => {
    const { director, frame, played, send } = fixture();
    send(conLuan.sword, 'attack', { sourceId: 'peer', stage: 'orb' });
    send('cai_bang_bong', 'attack');
    expect(played).toHaveLength(0);
    director.sync({ ...frame, chaos: true }, 50);
    director.sync({ ...frame, chaos: true }, 25);
    expect(played[0]?.gain).toBeCloseTo(0.38 * 0.25);
    director.sync({ ...frame, chaos: true }, 0);
    const muted = send(conLuan.monk, 'attack', { stage: 'thrust' });
    expect(director.inspect().active).toBe(0);
    director.sync({ ...frame, chaos: true }, 50);
    director.event(muted, 'self');
    expect(played.map((p) => p.cue)).toEqual(['chaos-loop', 'chaos-loop']);
  });

  it.each([
    'zone',
    'branch',
    'session',
    'death',
    'disconnect',
    'leave',
  ] as const)('cleans up without an end cue on %s', (reason) => {
    const { director, frame, played, send } = fixture();
    director.sync({ ...frame, chaos: true, star: true }, 50);
    if (reason === 'death')
      send('', 'death', { sourceId: 'enemy', targetId: 'self' });
    else
      director.sync(
        reason === 'leave'
          ? undefined
          : {
              ...frame,
              identity: ['zone', 'branch', 'session'].includes(reason)
                ? `changed:${reason}`
                : frame.identity,
              live: reason !== 'disconnect',
            },
        50,
      );
    expect(played.every((p) => !p.live)).toBe(true);
    expect(played).toHaveLength(2);
    expect(director.inspect().active).toBe(0);
  });
});
