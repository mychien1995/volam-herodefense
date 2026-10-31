/** Presentation only. Wave comes from the authoritative CreepState, never client tuning. */
export interface ActorAnimation {
  state: string;
  direction: string;
  frames: string[];
  frameRate: number;
  repeat: number;
}
export interface ArenaCreepArt {
  id: string;
  wave: number;
  slug: string;
  nameVi: string;
  status: string;
  bodyHeight: number;
  footPivot: [number, number];
  animations: ActorAnimation[];
  sourceConcept: string;
  sourceConceptSha256: string;
  impact?: string;
  projectile?: string;
  ambient?: string;
}
export interface CreepEffectAnimation {
  id: string;
  frames: string[];
  frameRate: number;
  texture?: string;
  repeat?: number;
  offsetY?: number;
  kind?: 'contact' | 'projectile' | 'ambient';
}
export interface ArenaCreepManifest {
  assets: ArenaCreepArt[];
  effects: CreepEffectAnimation[];
}
export function arenaCreepArt(
  manifest: ArenaCreepManifest | undefined,
  wave = 0,
  zone = 'arena',
): ArenaCreepArt | undefined {
  return zone === 'arena' && Number.isInteger(wave)
    ? manifest?.assets.find((a) => a.wave === wave)
    : undefined;
}
type Action = 'basic_attack' | 'hurt' | 'death';
/** Holds authored one-shots across shorter network poses; never changes simulation time. */
export class CreepPlayback {
  hold: { state: Action; direction: string; until: number } | undefined;
  deathAt: number | undefined;
  private snapshotPose = '';
  begin(
    state: Action,
    direction: string,
    now: number,
    duration: number,
  ): boolean {
    if (this.deathAt !== undefined) return false;
    if (
      state !== 'death' &&
      this.hold &&
      now < this.hold.until &&
      (this.hold.state === 'hurt' || this.hold.state === state)
    )
      return false;
    this.hold = { state, direction, until: now + duration };
    if (state === 'death') this.deathAt = now;
    return true;
  }
  resolve(
    pose: string,
    direction: string,
    now: number,
    duration: (state: Action) => number,
  ) {
    if (
      pose !== this.snapshotPose &&
      ['basic_attack', 'hurt', 'death'].includes(pose)
    )
      this.begin(pose as Action, direction, now, duration(pose as Action));
    this.snapshotPose = pose;
    return this.hold && (this.deathAt !== undefined || now < this.hold.until)
      ? { state: this.hold.state, direction: this.hold.direction }
      : { state: pose, direction };
  }
  retain(now: number, spirit: boolean): boolean {
    return (
      this.deathAt !== undefined &&
      !!this.hold &&
      now < this.hold.until + (spirit ? 340 : 0)
    );
  }
  alpha(now: number, spirit: boolean): number {
    return spirit && this.deathAt !== undefined && this.hold
      ? Math.max(0, 1 - Math.max(0, now - this.hold.until) / 340)
      : 1;
  }
}
