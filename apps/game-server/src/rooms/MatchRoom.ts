import { randomInt } from 'node:crypto';
import { Room, ServerError, validate, type Client } from '@colyseus/core';
import { serverInvasionDefinition } from '../invasion-config.js';
import { lobbyConfig, m1Config, creepDungeon } from '@volam/game-data';
import { DungeonMatch, type Actor, type MatchZone } from '@volam/game-core';
import {
  lobbyActionSchema,
  LobbyState,
  LobbyPlayer,
  CreepState,
  ProjectileState,
  joinOptionsSchema,
  connectionCheckSchema,
  inputSchema,
  PROTOCOL_VERSION,
  type JoinOptions,
  type ServerMessages,
  dungeonActionSchema,
  DungeonState,
  StateView,
} from '@volam/game-protocol';

type MatchClient = Client<{ auth: JoinOptions; messages: ServerMessages }>;
export class MatchRoom extends Room<{
  state: LobbyState;
  client: MatchClient;
}> {
  override maxClients = lobbyConfig.maxPlayers;
  override maxMessagesPerSecond = lobbyConfig.maxMessagesPerSecond;
  override state = new LobbyState();
  readonly seed = randomInt(1, 0x1_0000_0000);
  readonly simulation = new DungeonMatch(
    m1Config,
    creepDungeon,
    this.seed,
    serverInvasionDefinition(),
  );
  readonly world = this.simulation.arena.world;
  private readonly checkSequences = new Map<string, number>();
  private readonly dungeonSequences = new Map<string, number>();
  private eventSequence = 0;
  override messages = {
    'lobby-action': validate(
      lobbyActionSchema,
      (client: MatchClient, action) => {
        const player = this.state.players.get(client.sessionId);
        if (!player || !player.connected) return;
        const reject = (reason: string) =>
          client.send('command-rejected', {
            protocolVersion: PROTOCOL_VERSION,
            sequence: 1,
            reason,
          });
        if (action.action === 'start') {
          if (
            this.state.phase !== 'WAITING_LOBBY' ||
            client.sessionId !== this.state.hostId
          )
            return reject('Only the host can start from the waiting lobby.');
          if ([...this.state.players.values()].some((p) => !p.connected))
            return reject(
              'A participant is disconnected. Leave and recreate the room.',
            );
          this.state.phase = 'SCHOOL_SELECTION';
          void this.setMetadata({ phase: this.state.phase });
        } else {
          if (
            !['SCHOOL_SELECTION', 'IN_GAME'].includes(this.state.phase) ||
            player.confirmed
          )
            return reject('Selection is not editable in this phase.');
          if (action.action === 'select') player.schoolId = action.schoolId;
          else {
            if (!player.schoolId) return reject('Choose a school first.');
            player.confirmed = true;
            if (this.state.phase === 'IN_GAME') {
              const hero = this.simulation.add(
                client.sessionId,
                player.nickname,
              );
              hero.schoolId = player.schoolId;
              this.syncState();
            } else if (
              [...this.state.players.values()].every(
                (p) => p.connected && p.confirmed,
              )
            ) {
              for (const [id, p] of this.state.players) {
                const hero = this.simulation.add(id, p.nickname);
                hero.schoolId = p.schoolId;
              }
              this.state.phase = 'IN_GAME';
              void this.setMetadata({ phase: this.state.phase });
              this.syncState();
            }
          }
        }
      },
    ),
    'connection-check': validate(
      connectionCheckSchema,
      (client: MatchClient, input) => {
        const player = this.state.players.get(client.sessionId);
        if (!player) return;
        if (input.sequence > (this.checkSequences.get(client.sessionId) ?? 0)) {
          this.checkSequences.set(client.sessionId, input.sequence);
          player.checks += 1;
        }
        client.send('connection-ack', {
          protocolVersion: PROTOCOL_VERSION,
          sequence: input.sequence,
          checks: player.checks,
        });
      },
    ),
    'dungeon-action': validate(
      dungeonActionSchema,
      (client: MatchClient, input) => {
        const reject = (reason: string) =>
          client.send('command-rejected', {
            protocolVersion: PROTOCOL_VERSION,
            sequence: input.sequence,
            reason,
          });
        if (this.state.phase !== 'IN_GAME')
          return reject('Gameplay has not begun.');
        if (!this.state.players.get(client.sessionId)?.confirmed)
          return reject('Choose and confirm a school before playing.');
        if (
          input.sequence <= (this.dungeonSequences.get(client.sessionId) ?? 0)
        )
          return;
        this.dungeonSequences.set(client.sessionId, input.sequence);
        if (input.action === 'open') {
          if (!this.simulation.canEnterDungeon(client.sessionId))
            return reject('Enter dungeons from the arena while alive.');
          client.send(
            'dungeon-menu',
            { protocolVersion: PROTOCOL_VERSION },
            { afterNextPatch: true },
          );
          return;
        }
        const reason =
          input.action === 'enter'
            ? this.simulation.enter(client.sessionId, input.access)
            : this.simulation.exit(client.sessionId);
        if (reason) return reject(reason);
        const hero = this.simulation.hero(client.sessionId);
        if (hero)
          hero.lastSequence = Math.max(hero.lastSequence, input.sequence);
        this.syncState();
      },
    ),
    input: validate(inputSchema, (client: MatchClient, input) => {
      if (this.state.phase !== 'IN_GAME') {
        client.send('command-rejected', {
          protocolVersion: PROTOCOL_VERSION,
          sequence: input.sequence,
          reason: 'Gameplay has not begun.',
        });
        return;
      }
      if (!this.state.players.get(client.sessionId)?.confirmed) {
        client.send('command-rejected', {
          protocolVersion: PROTOCOL_VERSION,
          sequence: input.sequence,
          reason: 'Choose and confirm a school before playing.',
        });
        return;
      }
      if (input.kind === 'cast' && !m1Config.skills[input.slot]) {
        client.send('command-rejected', {
          protocolVersion: PROTOCOL_VERSION,
          sequence: input.sequence,
          reason: 'This slot is not equipped.',
        });
        return;
      }
      const reason = this.simulation.input(
        client.sessionId,
        input.sequence,
        input,
      );
      if (reason)
        client.send('command-rejected', {
          protocolVersion: PROTOCOL_VERSION,
          sequence: input.sequence,
          reason,
        });
    }),
  };
  override onCreate(): void {
    this.metadata = { phase: this.state.phase };
    this.patchRate = 1000 / m1Config.tickRate;
    this.syncState();
    this.setFixedTimestep(() => {
      if (this.state.phase !== 'IN_GAME' || !this.simulation.membership.size)
        return;
      this.simulation.step();
      if (this.simulation.invasion?.defeated) {
        this.state.phase = 'DEFEAT';
        void this.lock();
        void this.setMetadata({ phase: this.state.phase });
      }
      this.syncState();
      for (const { zoneId, event } of this.simulation.events) {
        const zone = this.simulation.zones.get(zoneId)!;
        this.broadcast(
          'combat-event',
          {
            ...event,
            id: ++this.eventSequence,
            zoneId,
            sourceId: zone.world.creeps.has(event.sourceId)
              ? this.entityKey(zone, event.sourceId)
              : event.sourceId,
            targetId: zone.world.creeps.has(event.targetId)
              ? this.entityKey(zone, event.targetId)
              : event.targetId,
            protocolVersion: PROTOCOL_VERSION,
          },
          {
            afterNextPatch: true,
            except: this.clients.filter(
              (client) =>
                this.simulation.zoneOf(client.sessionId)?.id !== zoneId,
            ),
          },
        );
      }
    }, m1Config.tickRate);
  }
  override onAuth(_client: MatchClient, options: unknown): JoinOptions {
    const parsed = joinOptionsSchema.safeParse(options);
    if (!parsed.success)
      throw new ServerError(
        400,
        `Use a nickname of 1–${lobbyConfig.nicknameMaxLength} characters and a compatible client.`,
      );
    return parsed.data;
  }
  override onJoin(client: MatchClient, _options: JoinOptions): void {
    if (!client.auth) throw new ServerError(400, 'Invalid join.');
    if (
      !['WAITING_LOBBY', 'SCHOOL_SELECTION', 'IN_GAME'].includes(
        this.state.phase,
      )
    )
      throw new ServerError(403, 'This match has ended.');
    if (!this.state.hostId) this.state.hostId = client.sessionId;
    client.view = new StateView();
    this.state.players.set(
      client.sessionId,
      new LobbyPlayer({ nickname: client.auth.nickname }),
    );
    this.syncState();
  }
  override onLeave(client: MatchClient): void {
    this.simulation.remove(client.sessionId);
    if (this.state.phase === 'SCHOOL_SELECTION') {
      const player = this.state.players.get(client.sessionId);
      if (player) {
        player.connected = false;
        player.confirmed = false;
      }
    } else {
      const player = this.state.players.get(client.sessionId);
      if (player)
        for (const peer of this.clients)
          if (peer.view?.has(player)) peer.view.remove(player);
      this.state.players.delete(client.sessionId);
    }
    this.checkSequences.delete(client.sessionId);
    this.dungeonSequences.delete(client.sessionId);
    this.syncState();
  }
  private syncActor(
    target: Pick<Actor, 'x' | 'y' | 'fx' | 'fy' | 'hp' | 'maxHp'> & {
      pose: string;
    },
    source: Actor,
  ): void {
    target.x = source.x;
    target.y = source.y;
    target.fx = source.fx;
    target.fy = source.fy;
    target.hp = source.hp;
    target.maxHp = source.maxHp;
    target.pose = source.pose;
  }
  private syncState(): void {
    this.state.tick = this.world.tick;
    this.state.matchElapsedMs = (this.world.tick * 1000) / m1Config.tickRate;
    const invasion = this.simulation.invasion,
      defense = this.state.defense,
      statue = this.world.statue;
    if (invasion && statue) {
      defense.enabled = true;
      defense.statueHp = statue.hp;
      defense.statueMaxHp = statue.maxHp;
      defense.x = statue.x;
      defense.y = statue.y;
      defense.wave = invasion.wave;
      defense.nextWaveTick = invasion.nextWaveTick;
      defense.intervalTicks = invasion.definition.intervalTicks;
      defense.spawnPlayerCount = invasion.spawnPlayerCount;
      defense.defeated = invasion.defeated;
      defense.defeatTick = invasion.defeatTick;
      const notice = invasion.notice;
      if (notice) {
        defense.noticeId = notice.id;
        defense.noticeKind = notice.kind;
        defense.noticeWave = notice.wave;
        defense.noticeLeadTicks = notice.leadTicks;
        defense.noticeUntilTick = notice.untilTick;
      }
    }
    for (const id of this.simulation.membership.keys()) {
      const zone = this.simulation.zoneOf(id)!;
      const hero = this.simulation.hero(id)!;
      const target = this.state.players.get(id);
      if (!target) continue;
      this.syncActor(target, hero);
      target.zoneId = zone.id;
      target.respawnTicks = Math.max(
        0,
        (this.simulation.respawns.get(id) ?? 0) - this.simulation.tick,
      );
      target.mana = hero.mana;
      target.maxMana = hero.maxMana;
      target.xp = hero.xp;
      target.gold = hero.gold;
      target.level = hero.level;
      target.skillPoints = hero.skillPoints;
      target.basicId = hero.basicId;
      target.lastSequence = hero.lastSequence;
      target.basicCooldown = Math.max(0, hero.cooldown - zone.world.tick);
      target.qCooldown = Math.max(
        0,
        (hero.skillCooldowns[0] ?? 0) - zone.world.tick,
      );
      target.wCooldown = Math.max(
        0,
        (hero.skillCooldowns[1] ?? 0) - zone.world.tick,
      );
    }
    const creepKeys = new Set<string>(),
      shotKeys = new Set<string>();
    for (const zone of this.simulation.zones.values()) {
      if (zone.access !== 'arena') {
        let dungeon = this.state.dungeons.get(zone.id);
        if (!dungeon) {
          dungeon = new DungeonState();
          this.state.dungeons.set(zone.id, dungeon);
        }
        dungeon.id = zone.id;
        dungeon.access = zone.access;
        dungeon.ownerId = zone.ownerId;
        dungeon.wave = zone.wave;
        dungeon.occupants = zone.world.heroes.size;
        dungeon.paused = zone.world.heroes.size === 0;
        dungeon.tick = zone.world.tick;
        dungeon.living = [...zone.world.creeps.values()].filter(
          (c) => c.hp > 0,
        ).length;
        dungeon.spawnPlayerCount = zone.spawnPlayerCount;
        dungeon.nextWaveTicks =
          zone.nextWaveAt === undefined
            ? 0
            : Math.max(0, zone.nextWaveAt - zone.world.tick);
      }
      for (const [localId, enemy] of zone.world.creeps) {
        const id = this.entityKey(zone, localId);
        creepKeys.add(id);
        let target = this.state.creeps.get(id);
        if (!target) {
          target = new CreepState();
          this.state.creeps.set(id, target);
        }
        this.syncActor(target, enemy);
        target.zoneId = zone.id;
        target.invasionWave = enemy.invasion?.wave ?? 0;
        target.lane = enemy.invasion?.lane ?? '';
        target.targetId = enemy.invasion?.targetId ?? '';
      }
      for (const [localId, shot] of zone.world.projectiles) {
        const id = this.entityKey(zone, localId);
        shotKeys.add(id);
        let target = this.state.projectiles.get(id);
        if (!target) {
          target = new ProjectileState();
          this.state.projectiles.set(id, target);
        }
        target.x = shot.x;
        target.y = shot.y;
        target.vx = shot.vx;
        target.vy = shot.vy;
        target.ownerId = shot.ownerId;
        target.abilityId = shot.abilityId;
        target.zoneId = zone.id;
      }
    }
    for (const [id, target] of this.state.creeps)
      if (!creepKeys.has(id)) {
        for (const client of this.clients)
          if (client.view?.has(target)) client.view.remove(target);
        this.state.creeps.delete(id);
      }
    for (const [id, target] of this.state.projectiles)
      if (!shotKeys.has(id)) {
        for (const client of this.clients)
          if (client.view?.has(target)) client.view.remove(target);
        this.state.projectiles.delete(id);
      }
    for (const client of this.clients) {
      const view = client.view;
      if (!view) continue;
      const zoneId = this.simulation.zoneOf(client.sessionId)?.id ?? 'arena';
      for (const player of this.state.players.values()) {
        const visible =
          this.state.phase === 'WAITING_LOBBY' ||
          this.state.phase === 'SCHOOL_SELECTION' ||
          player.zoneId === zoneId;
        if (visible && !view.has(player)) view.add(player);
        else if (!visible && view.has(player)) view.remove(player);
      }
      for (const entity of [
        ...this.state.creeps.values(),
        ...this.state.projectiles.values(),
      ]) {
        if (entity.zoneId === zoneId && !view.has(entity)) view.add(entity);
        else if (entity.zoneId !== zoneId && view.has(entity))
          view.remove(entity);
      }
      for (const dungeon of this.state.dungeons.values()) {
        const visible =
          dungeon.access === 'shared' || dungeon.ownerId === client.sessionId;
        if (visible && !view.has(dungeon)) view.add(dungeon);
        else if (!visible && view.has(dungeon)) view.remove(dungeon);
      }
    }
  }
  private entityKey(zone: MatchZone, id: string): string {
    return zone.access === 'arena' ? id : `${zone.id}:${id}`;
  }
}
