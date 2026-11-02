import type { CreepDungeonDefinition, MatchZone } from './dungeons.js';

export const isBossDungeon = (d?: CreepDungeonDefinition): boolean =>
  !!(d?.boss || d?.chuBoss || d?.kimBoss || d?.bossEncounter);

export interface BossLife {
  revivalUsed: boolean;
  eliminated: boolean;
}
export interface BossInvitation {
  id: number;
  inviterId: string;
  recipientId: string;
  zoneId: string;
  destination: string;
  expiresAtMs: number;
}
interface Attempt {
  serial: number;
  generation: unknown;
  lives: Map<string, BossLife>;
}

/** Membership changes never clear lives; only a real encounter initialization does. */
export class BossPartyState {
  readonly disconnected = new Set<string>();
  readonly invitations = new Map<string, BossInvitation>();
  private readonly attempts = new Map<string, Attempt>();
  private invitationSequence = 0;

  observe(zone: MatchZone): boolean {
    if (!isBossDungeon(zone.dungeon)) return false;
    const generation =
      zone.kim?.generation ??
      zone.encounter?.generation ??
      zone.world.chu ??
      zone.world.boss;
    const previous = this.attempts.get(zone.id);
    if (previous?.generation === generation) return false;
    this.attempts.set(zone.id, {
      serial: (previous?.serial ?? 0) + 1,
      generation,
      lives: new Map(),
    });
    return !!previous;
  }
  attempt(zone: MatchZone): number {
    this.observe(zone);
    return this.attempts.get(zone.id)?.serial ?? 0;
  }
  life(zone: MatchZone, id: string): BossLife {
    this.observe(zone);
    const lives = this.attempts.get(zone.id)!.lives;
    if (!lives.has(id))
      lives.set(id, { revivalUsed: false, eliminated: false });
    return lives.get(id)!;
  }
  invite(
    inviterId: string,
    recipientId: string,
    zone: MatchZone,
    nowMs: number,
  ): void {
    this.invitations.set(recipientId, {
      id: ++this.invitationSequence,
      inviterId,
      recipientId,
      zoneId: zone.id,
      destination: zone.dungeon!.id,
      expiresAtMs: nowMs + 30_000,
    });
  }
  expire(nowMs: number): void {
    for (const [id, invitation] of this.invitations)
      if (nowMs >= invitation.expiresAtMs) this.invitations.delete(id);
  }
  remove(id: string): void {
    this.disconnected.delete(id);
    this.invitations.delete(id);
    for (const [recipient, invitation] of this.invitations)
      if (invitation.inviterId === id) this.invitations.delete(recipient);
  }
}
