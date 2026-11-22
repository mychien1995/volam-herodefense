import type { CombatEvent } from '@volam/game-core';

export interface SkillVoice {
  active(): boolean;
  volume(value: number): void;
  stop(): void;
}
export interface SkillAudioPort {
  play(
    cue: string,
    options: { gain: number; rate: number; loop: boolean },
  ): SkillVoice | undefined;
}

/** Bounded voices and per-strike grouping shared by the three new sound kits. */
export class SkillSoundMixer {
  protected master = 0;
  private voices: Array<{ voice: SkillVoice; gain: number; loop: boolean }> =
    [];
  private loops = new Map<string, SkillVoice>();
  private groups = new Map<string, number>();
  private recent: Array<{ cue: string; eventId?: number }> = [];
  private played = 0;

  constructor(private readonly port: SkillAudioPort) {}

  volume(volume: number): void {
    this.master = Math.max(0, Math.min(1, volume / 100));
    this.voices = this.voices.filter(({ voice }) => voice.active());
    if (!this.master) this.stopVoices();
    this.balance();
  }

  play(
    cue: string,
    gain: number,
    event?: CombatEvent,
    rate = 1,
    loop = false,
  ): SkillVoice | undefined {
    if (!this.master) return;
    if (event) {
      const group = `${event.abilityId}:${cue}:${event.stage ?? event.hitPhase ?? ''}`;
      const tick = event.tick ?? event.id;
      if (this.groups.get(group) === tick) return;
      this.groups.set(group, tick);
      if (this.groups.size > 128)
        this.groups.delete(this.groups.keys().next().value!);
    }
    this.voices = this.voices.filter(({ voice }) => voice.active());
    const transients = this.voices.filter((entry) => !entry.loop);
    if (!loop && transients.length >= 8) {
      transients[0]!.voice.stop();
      this.voices = this.voices.filter(({ voice }) => voice.active());
    }
    const total =
      this.voices.reduce((sum, entry) => sum + entry.gain, gain) * this.master;
    const voice = this.port.play(cue, {
      gain: gain * this.master * Math.min(1, 0.9 / Math.max(total, 0.001)),
      rate,
      loop,
    });
    if (voice) {
      this.voices.push({ voice, gain, loop });
      this.balance();
      this.played++;
      this.recent.push({ cue, ...(event ? { eventId: event.id } : {}) });
      if (this.recent.length > 96) this.recent.shift();
    }
    return voice;
  }

  private balance(): void {
    // Conservative linear headroom: overlapping new SFX cannot sum above .9
    // even at 100% volume. The gain returns naturally as voices complete.
    const total =
      this.voices.reduce((sum, entry) => sum + entry.gain, 0) * this.master;
    const scale = Math.min(1, 0.9 / Math.max(total, 0.001));
    for (const { voice, gain } of this.voices)
      voice.volume(gain * this.master * scale);
  }

  loop(cue: string, wanted: boolean, gain: number, ending: string): void {
    const voice = this.loops.get(cue);
    if (wanted && !voice?.active()) {
      const next = this.play(cue, gain, undefined, 1, true);
      if (next) this.loops.set(cue, next);
    } else if (!wanted && voice) {
      voice.stop();
      this.loops.delete(cue);
      this.play(ending, 0.6);
    }
  }

  protected stopVoices(): void {
    for (const { voice } of this.voices) voice.stop();
    this.voices = [];
    this.loops.clear();
  }

  clear(): void {
    this.stopVoices();
    this.groups.clear();
  }

  inspect() {
    return {
      played: this.played,
      recent: [...this.recent],
      loops: [...this.loops.keys()].filter((key) =>
        this.loops.get(key)?.active(),
      ),
      active: this.voices.filter(({ voice }) => voice.active()).length,
    };
  }
}
