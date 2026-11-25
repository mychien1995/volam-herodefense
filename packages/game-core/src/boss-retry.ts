import type { DungeonMatch, MatchZone } from './dungeons.js';
import type { Hero } from './types.js';
import type { PotionId } from './economy-types.js';
import { cancelOwnedEffects } from './status.js';
import { experienceAtLevel } from './campaign.js';

interface Life {
  used: number;
  eliminated: boolean;
  reviveAt?: number;
  consumed: Partial<Record<PotionId, number>>;
}
export interface BossRetryView {
  id: number;
  bossId: string;
  zoneId: string;
  phase: 'fighting' | 'vote' | 'waiting';
  attempt: number;
  remainingMs: number;
  required: number;
  yes: number;
  total: number;
  choice: boolean | null;
  revivals: number;
  revivalTicks: number;
  notesFailure?: { beat: number; note: number; missed: string[] };
}
interface Trial {
  id: number;
  bossId: string;
  zone: MatchZone;
  actor: unknown;
  attempt: number;
  phase: BossRetryView['phase'];
  lives: Map<string, Life>;
  electorate: string[];
  votes: Map<string, boolean>;
  deadline: number;
  notesFailure?: BossRetryView['notesFailure'];
}
/** One server-owned finite-life ledger per encounter; transport/UI never mutate it. */
export class BossRetries {
  readonly trials = new Map<string, Trial>();
  private serial = 0;
  constructor(private match: DungeonMatch) {}
  get voting(): boolean {
    return [...this.trials.values()].some((t) => t.phase === 'vote');
  }
  isWaitingWave(): boolean {
    return this.trials.get('arena')?.phase === 'waiting';
  }
  frozen(zone: MatchZone): boolean {
    const t = this.trials.get(zone.id);
    return (
      !!t &&
      (t.phase === 'vote' || (t.phase === 'waiting' && zone.access !== 'arena'))
    );
  }
  activeCount(zone: MatchZone): number | undefined {
    const t = this.trials.get(zone.id);
    return t?.phase === 'fighting'
      ? [...t.lives.values()].filter((l) => !l.eliminated).length
      : undefined;
  }
  private join(t: Trial, h: Hero): Life {
    let life = t.lives.get(h.id);
    if (!life) {
      life = { used: 0, eliminated: false, consumed: {} };
      t.lives.set(h.id, life);
    }
    return life;
  }
  observe(
    zone: MatchZone,
    bossId: string | undefined,
    forceWipe = false,
  ): void {
    const c = this.match.base.campaign;
    if (!c || !bossId) return;
    const boss = zone.world.creeps.get(bossId);
    const actor = zone.kim?.generation ?? boss;
    let t = this.trials.get(zone.id);
    if (t && t.phase !== 'fighting') return;
    if (
      (!boss || boss.hp <= 0) &&
      !(zone.kim && zone.kim.phase !== 'defeated')
    ) {
      if (t) {
        for (const [id] of t.lives) {
          const h = this.match.hero(id);
          if (
            h &&
            this.match.zoneOf(id) === zone &&
            (h.hp <= 0 || h.bossSpectator)
          )
            this.revive(zone, h);
        }
        this.trials.delete(zone.id);
      }
      return;
    }
    if (!t || t.bossId !== bossId || t.actor !== actor) {
      t = {
        id: ++this.serial,
        bossId,
        zone,
        actor,
        attempt: 1,
        phase: 'fighting',
        lives: new Map(),
        electorate: [],
        votes: new Map(),
        deadline: 0,
      };
      this.trials.set(zone.id, t);
    }
    for (const h of zone.world.heroes.values()) {
      if (this.match.party.disconnected.has(h.id)) continue;
      const life = this.join(t, h);
      if (life.eliminated) {
        h.hp = 0;
        h.bossSpectator = true;
        continue;
      }
      if (forceWipe) {
        t.notesFailure = zone.world.vuong?.notesFailure;
        h.hp = 0;
        life.eliminated = true;
        delete life.reviveAt;
      }
      if (h.hp > 0) continue;
      if (!life.eliminated && life.reviveAt === undefined) {
        cancelOwnedEffects(zone.world, h.id);
        if (life.used < c.revivals) {
          life.used++;
          life.reviveAt =
            this.match.tick + c.revivalSeconds * this.match.base.tickRate;
        } else life.eliminated = true;
      }
      if (life.eliminated) h.bossSpectator = true;
      else if (this.match.tick >= life.reviveAt!) {
        this.revive(zone, h);
        delete life.reviveAt;
      }
    }
    const present = [...t.lives.keys()].filter(
      (id) =>
        this.match.zoneOf(id) === zone &&
        !this.match.party.disconnected.has(id),
    );
    if (present.length && present.every((id) => t!.lives.get(id)!.eliminated)) {
      t.phase = 'vote';
      t.electorate = present;
      t.votes.clear();
      t.deadline = this.match.nowMs + c.voteSeconds * 1000;
      this.refund(t);
      this.match.suspendCampaignBoss(zone, bossId);
    }
  }
  private revive(zone: MatchZone, h: Hero): void {
    h.bossSpectator = false;
    h.hp = h.maxHp;
    h.mana = h.maxMana;
    h.pose = 'idle';
    h.moveX = h.moveY = 0;
    const p =
      zone.access === 'arena'
        ? this.match.base.waveArena!.center
        : zone.dungeon!.spawn;
    h.x = p.x;
    h.y = p.y;
    h.statuses = [];
    this.match.respawns.delete(h.id);
  }
  recordPotion(id: string, potion: PotionId, amount: number): void {
    const zone = this.match.zoneOf(id),
      t = zone && this.trials.get(zone.id),
      l = t?.lives.get(id);
    if (t?.phase === 'fighting' && l)
      l.consumed[potion] = (l.consumed[potion] ?? 0) + amount;
  }
  private refund(t: Trial): void {
    for (const [id, l] of t.lives) {
      const h = this.match.campaignCharacter(id);
      if (!h?.inventory) continue;
      for (const [key, used] of Object.entries(l.consumed)) {
        const potion = key as PotionId;
        h.inventory.potions[potion] = (h.inventory.potions[potion] ?? 0) + used;
      }
      l.consumed = {};
      h.inventory.revision++;
    }
  }
  advance(): void {
    for (const t of [...this.trials.values()]) {
      if (t.phase === 'vote' && this.match.nowMs >= t.deadline) this.resolve(t);
      else if (
        t.phase === 'fighting' &&
        !(t.zone === this.match.arena && this.match.duelPausesArena)
      )
        this.observe(t.zone, t.bossId);
    }
  }
  vote(id: string, trialId: number, accept: boolean): string | undefined {
    const t = [...this.trials.values()].find((t) => t.id === trialId);
    if (
      !t ||
      t.phase !== 'vote' ||
      !t.electorate.includes(id) ||
      this.match.party.disconnected.has(id) ||
      this.match.nowMs >= t.deadline
    )
      return 'Biểu quyết đã hết hạn hoặc bạn không thuộc lượt đánh.';
    if (t.votes.has(id)) return 'Bạn đã biểu quyết.';
    t.votes.set(id, accept);
    if (t.votes.size === t.electorate.length) this.resolve(t);
  }
  private resolve(t: Trial): void {
    const yes = t.electorate.filter(
      (id) =>
        t.votes.get(id) === true &&
        !this.match.party.disconnected.has(id) &&
        this.match.zoneOf(id) === t.zone,
    );
    if (yes.length >= Math.ceil(t.electorate.length / 2)) this.restart(t, yes);
    else {
      t.phase = 'waiting';
      for (const id of t.lives.keys()) this.match.leaveCampaignBoss(id, t.zone);
    }
  }
  call(id: string, trialId: number): string | undefined {
    const t = [...this.trials.values()].find((t) => t.id === trialId);
    if (
      !t ||
      t.phase !== 'waiting' ||
      this.match.zoneOf(id)?.access !== 'arena' ||
      (this.match.hero(id)?.hp ?? 0) <= 0
    )
      return 'Chưa thể gọi đánh lại boss.';
    if (t.zone.access === 'arena')
      this.restart(
        t,
        [...this.match.membership.keys()].filter(
          (k) => !this.match.party.disconnected.has(k),
        ),
      );
    else {
      this.match.resetCampaignDungeon(t.zone);
      this.trials.delete(t.zone.id);
      return this.match.enter(id, 'shared', t.zone.dungeon!.id);
    }
  }
  private restart(t: Trial, ids: string[]): void {
    const no = [...t.lives.keys()].filter((id) => !ids.includes(id));
    t.phase = 'fighting';
    t.attempt++;
    t.votes.clear();
    t.electorate = [];
    this.match.restartCampaignBoss(t.zone, t.bossId);
    t.actor = t.zone.kim?.generation ?? t.zone.world.creeps.get(t.bossId);
    delete t.notesFailure;
    t.lives.clear();
    for (const id of ids) {
      const h = this.match.hero(id);
      if (!h) continue;
      this.revive(t.zone, h);
      this.join(t, h);
    }
    for (const id of no) {
      if (t.zone.access === 'arena') {
        const h = this.match.campaignCharacter(id);
        if (h) {
          this.join(t, h).eliminated = true;
          h.hp = 0;
          h.bossSpectator = true;
        }
      } else this.match.leaveCampaignBoss(id, t.zone);
    }
  }
  reconnect(id: string): void {
    for (const t of this.trials.values()) {
      const l = t.lives.get(id),
        h = this.match.hero(id);
      if (!l || !h) continue;
      if (l.eliminated || l.reviveAt !== undefined || t.phase !== 'fighting') {
        h.hp = 0;
        h.bossSpectator = l.eliminated || t.phase !== 'fighting';
      }
    }
  }
  disconnect(id: string): void {
    for (const t of this.trials.values()) {
      const h = this.match.hero(id);
      if (
        t.phase !== 'fighting' ||
        !h ||
        this.match.zoneOf(id) !== t.zone ||
        !t.lives.has(id)
      )
        continue;
      h.hp = 0;
      const life = t.lives.get(id)!;
      if (!life.eliminated && life.reviveAt === undefined) {
        if (life.used < this.match.base.campaign!.revivals) {
          life.used++;
          life.reviveAt =
            this.match.tick +
            this.match.base.campaign!.revivalSeconds * this.match.base.tickRate;
        } else life.eliminated = true;
      }
      this.observe(t.zone, t.bossId);
    }
  }
  view(id: string): {
    xpStart: number;
    xpNext: number;
    pearls: number;
    dragonBonus: number;
    retry: BossRetryView | null;
  } {
    const h = this.match.hero(id)!;
    const trials = [...this.trials.values()];
    const t =
      trials.find(
        (t) =>
          t.zone === this.match.zoneOf(id) &&
          t.lives.has(id) &&
          t.phase !== 'waiting',
      ) ??
      trials.find((t) => t.lives.has(id) && t.phase !== 'waiting') ??
      trials.find((t) => t.lives.has(id)) ??
      trials.find((t) => t.phase === 'waiting');
    const l = t?.lives.get(id),
      c = this.match.base.campaign!;
    return {
      dragonBonus: h.dragonBonus ?? 0,
      xpStart: experienceAtLevel(h.level, this.match.base),
      xpNext: experienceAtLevel(h.level + 1, this.match.base),
      pearls:
        h.campaignClears?.filter((k) => k !== 'vuong_trung_duong').length ?? 0,
      retry: t
        ? {
            id: t.id,
            ...(t.notesFailure ? { notesFailure: t.notesFailure } : {}),
            bossId: t.bossId,
            zoneId: t.zone.id,
            phase: t.phase,
            attempt: t.attempt,
            remainingMs: Math.max(0, t.deadline - this.match.nowMs),
            required: Math.ceil(t.electorate.length / 2),
            yes: [...t.votes.values()].filter(Boolean).length,
            total: t.electorate.length,
            choice: t.votes.get(id) ?? null,
            revivals: Math.max(0, c.revivals - (l?.used ?? 0)),
            revivalTicks: Math.max(0, (l?.reviveAt ?? 0) - this.match.tick),
          }
        : null,
    };
  }
}
