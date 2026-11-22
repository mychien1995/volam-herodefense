import { conLuan, type CombatEvent } from '@volam/game-core';
import { SkillSoundMixer } from './skill-sound-mixer.js';

export interface ConLuanAudioFrame {
  identity: string;
  live: boolean;
  ranged: boolean;
  chaos: boolean;
  star: boolean;
}
/** Presentation only: accepted combat events and replicated lifetimes drive audio.
 * No client timers predict a hit, skill duration, cancellation, or damage.
 */
export class ConLuanSoundDirector extends SkillSoundMixer {
  private frame: ConLuanAudioFrame | undefined;
  private seen = new Set<number>();

  sync(frame: ConLuanAudioFrame | undefined, volume: number): void {
    const changed = this.frame?.identity !== frame?.identity;
    if (changed || !frame?.live) this.clear();
    const previous = changed ? undefined : this.frame;
    this.frame = frame;
    this.volume(volume);
    if (!this.master || !frame?.live) {
      this.stopVoices();
      return;
    }
    if (previous?.live && previous.ranged !== frame.ranged)
      this.play(frame.ranged ? 'stance-ranged' : 'stance-melee', 0.65);
    this.loop('chaos-loop', frame.chaos, 0.38, 'chaos-end');
    this.loop('star-loop', frame.star, 0.32, 'star-end');
  }

  event(event: CombatEvent, sessionId: string): void {
    if (event.kind === 'death' && event.targetId === sessionId) {
      this.stopVoices();
      if (this.frame) this.frame = { ...this.frame, live: false };
      return;
    }
    if (
      event.sourceId !== sessionId ||
      !this.frame?.live ||
      this.seen.has(event.id)
    )
      return;
    this.seen.add(event.id);
    if (this.seen.size > 256)
      this.seen.delete(this.seen.values().next().value!);
    if (!this.master) return;
    const id = event.abilityId;
    const chaos = this.frame.chaos;
    if (event.kind === 'attack') {
      if (
        id === conLuan.monk &&
        ['thrust', 'sweep', 'rising', 'overhead'].includes(event.stage ?? '')
      )
        this.play(
          `monk-${event.stage}`,
          chaos ? 0.95 : 0.78,
          event,
          chaos ? 0.83 : 1,
        );
      else if (id === conLuan.bolt)
        this.play('monk-bolt', chaos ? 0.85 : 0.7, event);
      else if (id === conLuan.sword)
        this.play(event.stage === 'sword' ? 'sword' : 'orb', 0.68, event);
      return;
    }
    if (event.kind === 'cast') {
      const cues: Record<string, string> = {
        [conLuan.slam]: 'slam-windup',
        [conLuan.ring]: 'ring',
        [conLuan.hammer]: 'hammer-launch',
        [conLuan.chaos]: 'chaos-start',
        [conLuan.plant]: 'plant',
        [conLuan.detonate]: 'detonate-trigger',
        [conLuan.dash]: 'dash',
        [conLuan.dragon]: 'dragon-launch',
        [conLuan.star]: 'star-windup',
      };
      if (cues[id]) this.play(cues[id], 0.85, event);
      // Stance is reconciled from replicated state; fan sounds use real sweeps.
      return;
    }
    if (event.kind === 'pulse') {
      if (id === conLuan.slam && event.stage === 'hammer_contact')
        this.play('slam-impact', 0.95, event);
      else if (id === conLuan.hammer && event.stage === 'explosion')
        this.play('hammer-explosion', 0.9, event);
      else if (id === conLuan.detonate)
        this.play('detonate-impact', 0.85, event);
      else if (id === conLuan.star)
        this.play(
          event.stage === 'area_open' ? 'star-open' : 'star-pulse',
          event.stage === 'area_open' ? 0.85 : 0.4,
          event,
        );
      else if (id === conLuan.fan && event.stage === 'sweep')
        this.play('fan-sweep', 0.65, event);
      return;
    }
    if (event.kind === 'hit' && event.damage > 0) {
      if (id === conLuan.monk)
        this.play('hit-metal', chaos ? 0.75 : 0.55, event);
      else if (
        [conLuan.sword, conLuan.bolt, conLuan.ring, conLuan.fan].some(
          (ability) => ability === id,
        )
      )
        this.play('hit-electric', 0.45, event);
      else if (id === conLuan.dragon) this.play('dragon-hit', 0.8, event);
      // Hammer / detonations / star already have a server pulse at the contact.
    }
  }

  override clear(): void {
    super.clear();
    this.seen.clear();
  }
}
