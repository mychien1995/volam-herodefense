import { nguDoc, duongMon, type CombatEvent } from '@volam/game-core';
import { SkillSoundMixer, type SkillAudioPort } from './skill-sound-mixer.js';

type Summon = { id: string; kind: 'jiangshi' | 'zombie' | 'reaper' };
export interface AdditionalAudioFrame {
  identity: string;
  live: boolean;
  tick: number;
  flags: Record<string, boolean>;
  elements: number;
  summons: Summon[];
}

export class AdditionalSchoolSoundDirector extends SkillSoundMixer {
  private frame: AdditionalAudioFrame | undefined;
  private seen = new Set<number>();
  private summonOwners = new Set<string>();
  private throttles = new Map<string, number>();

  constructor(
    private readonly school: 'ngu-doc' | 'duong-mon',
    port: SkillAudioPort,
  ) {
    super(port);
  }

  sync(frame: AdditionalAudioFrame | undefined, volume: number): void {
    const changed = this.frame?.identity !== frame?.identity;
    if (changed || !frame?.live) this.clear();
    const previous = changed ? undefined : this.frame;
    this.frame = frame;
    this.volume(volume);
    if (!frame?.live || !this.master) return;
    const flags = frame.flags;
    if (this.school === 'ngu-doc') {
      if (previous?.live && previous.flags['palm'] !== flags['palm'])
        this.play(flags['palm'] ? 'palm-on' : 'palm-off', 0.65);
      if (previous?.live && !previous.flags['aura'] && flags['aura'])
        this.play('aura-on', 0.65);
      this.loop('aura-loop', !!flags['aura'], 0.25, 'aura-off');
      this.loop('pool-loop', !!flags['pool'], 0.25, 'pool-end');
      this.loop('hands-loop', !!flags['hands'], 0.35, 'hands-end');
      const current = new Set(frame.summons.map((s) => s.id));
      for (const summon of frame.summons) this.summonOwners.add(summon.id);
      for (const old of previous?.summons ?? [])
        if (!current.has(old.id)) {
          this.summonOwners.delete(old.id);
          this.limited(
            old.kind === 'reaper' ? 'reaper-death' : `${old.kind}-fade`,
            0.4,
            frame.tick,
            5,
          );
        }
    } else {
      if (previous?.live && !previous.flags['flight'] && flags['flight'])
        this.play('flight-open', 0.7);
      this.loop('flight-loop', !!flags['flight'], 0.3, 'flight-close');
      this.loop('shell-loop', !!flags['shell'], 0.3, 'shell-open');
      if (previous?.live && previous.flags['evade'] && !flags['evade'])
        this.play('evade-end', 0.4);
      if (previous?.live && !previous.flags['flowers'] && flags['flowers'])
        this.play('flowers-scatter', 0.75);
    }
  }

  event(event: CombatEvent, sessionId: string): void {
    if (event.kind === 'death' && event.targetId === sessionId) {
      this.stopVoices();
      if (this.frame) this.frame = { ...this.frame, live: false };
      return;
    }
    if (!this.frame?.live || this.seen.has(event.id)) return;
    const own = event.sourceId === sessionId;
    if (
      !own &&
      !(
        this.school === 'ngu-doc' &&
        this.summonOwners.has(event.sourceId) &&
        event.kind === 'effect'
      )
    )
      return;
    this.seen.add(event.id);
    if (this.seen.size > 512)
      this.seen.delete(this.seen.values().next().value!);
    if (!this.master) return;
    if (this.school === 'ngu-doc') this.nguDocEvent(event, own);
    else this.duongMonEvent(event);
  }

  private nguDocEvent(e: CombatEvent, own: boolean): void {
    const id = e.abilityId;
    if (e.kind === 'effect' && e.stage === 'summoned' && own) {
      this.summonOwners.add(e.targetId);
      const cue =
        id === nguDoc.jiangshi
          ? 'jiangshi-emerge'
          : id === nguDoc.zombie
            ? 'zombie-emerge'
            : 'reaper-emerge';
      this.play(cue, 0.6, e);
    } else if (e.kind === 'attack') {
      if (id === nguDoc.taiHiep)
        this.play(
          e.stage === 'ngu_doc_toxic' || this.frame?.flags['palm']
            ? 'toxic-palm'
            : 'palm',
          0.75,
          e,
        );
      else if (id === nguDoc.coSu) this.play('skull', 0.7, e);
    } else if (e.kind === 'cast') {
      const cues: Record<string, string> = {
        [nguDoc.pool]: 'pool-open',
        [nguDoc.hands]: 'hands-windup',
        [nguDoc.worms]: 'worms',
        [nguDoc.jiangshi]: 'jiangshi-call',
        [nguDoc.mark]: 'mark-launch',
        [nguDoc.reaper]: 'reaper-call',
      };
      if (cues[id]) this.play(cues[id], 0.8, e);
    } else if (e.kind === 'pulse') {
      if (id === nguDoc.mark && e.stage === 'detonate')
        this.play('mark-detonate', 0.85, e);
      else if (id === nguDoc.hands && e.stage === 'area_open')
        this.play('hands-open', 0.85, e);
    } else if (e.kind === 'effect') {
      if (id === nguDoc.mark && e.stage === 'attached')
        this.play('mark-attach', 0.5, e);
      else if (id === nguDoc.mark && e.stage === 'return')
        this.play('mark-return', 0.6, e);
      else if (id === nguDoc.counter && e.stage === 'reflected')
        this.limited('counter', 0.5, e.tick ?? e.id, 12, e);
      else if (id === nguDoc.reaperSweep) this.play('reaper-sweep', 0.65, e);
      else if (id === nguDoc.reaperWave) this.play('reaper-wave', 0.7, e);
      else if (id === nguDoc.reaperSlam) this.play('reaper-slam', 0.8, e);
    } else if (e.kind === 'hit' && e.damage > 0) {
      if (id === nguDoc.taiHiep || id === nguDoc.coSu)
        this.play('poison-hit', 0.45, e);
      else if (id === nguDoc.worms) this.play('worm-hit', 0.5, e);
      else if (id === nguDoc.jiangshi || id === nguDoc.zombie)
        this.limited(
          id === nguDoc.jiangshi ? 'jiangshi-attack' : 'zombie-attack',
          0.32,
          e.tick ?? e.id,
          6,
          e,
        );
      else if (id === nguDoc.reaperWave) this.play('reaper-hit', 0.4, e);
      // Poison ticks and the R passives have no repeated cast/impact noise.
    }
  }

  private duongMonEvent(e: CombatEvent): void {
    const id = e.abilityId;
    if (e.kind === 'attack') {
      if (id === duongMon.coQuan)
        this.play(e.stage === 'feather' ? 'feather' : 'bolt', 0.7, e);
      else if (id === duongMon.amKhi)
        this.play(
          `needles-${Math.max(0, Math.min(4, this.frame!.elements))}`,
          0.7,
          e,
        );
    } else if (e.kind === 'cast') {
      const cues: Record<string, string> = {
        [duongMon.arrows]: 'arrows',
        [duongMon.laser]: 'laser-charge',
        [duongMon.shell]: 'shell-close',
        [duongMon.flowers]: 'flowers-cast',
        [duongMon.trap]: 'trap-set',
        [duongMon.knives]: 'knives-ready',
        [duongMon.evade]: 'evade',
        [duongMon.storm]: 'storm-ready',
      };
      if (cues[id]) this.play(cues[id], id === duongMon.trap ? 0.4 : 0.8, e);
    } else if (e.kind === 'pulse') {
      if (id === duongMon.laser && e.stage === 'release')
        this.play('laser-release', 0.85, e);
      else if (id === duongMon.knives && e.stage === 'release')
        this.play('knife-shot', 0.65, e);
      else if (id === duongMon.flowers) this.play('flowers-burst', 0.85, e);
      else if (id === duongMon.trap) this.play('trap-burst', 0.8, e);
      else if (id === duongMon.storm) {
        const cue =
          e.stage === 'slow_knives'
            ? 'storm-slow'
            : e.stage === 'poison_knives'
              ? 'storm-poison'
              : e.stage === 'water'
                ? 'storm-water'
                : undefined;
        if (cue) this.play(cue, 0.7, e);
      }
    } else if (e.kind === 'hit' && e.damage > 0) {
      if (id === duongMon.amKhi) {
        const material = e.hitPhase ?? e.stage ?? 'water';
        if (['water', 'wood', 'earth', 'fire', 'metal'].includes(material))
          this.limited(`hit-${material}`, 0.38, e.tick ?? e.id, 6, e);
      } else if (
        [
          duongMon.coQuan,
          duongMon.arrows,
          duongMon.knives,
          duongMon.laser,
          duongMon.storm,
        ].some((ability) => ability === id)
      )
        this.limited('hit-metal', 0.35, e.tick ?? e.id, 5, e);
    }
  }

  private limited(
    cue: string,
    gain: number,
    tick: number,
    interval: number,
    event?: CombatEvent,
  ): void {
    if (tick - (this.throttles.get(cue) ?? -Infinity) < interval) return;
    this.throttles.set(cue, tick);
    this.play(cue, gain, event);
  }

  override clear(): void {
    super.clear();
    this.seen.clear();
    this.summonOwners.clear();
    this.throttles.clear();
  }
}
