import { randomInt } from 'node:crypto';
import { Room, ServerError, validate, type Client } from '@colyseus/core';
import { lobbyConfig, m1Config } from '@volam/game-data';
import {
  addHero,
  createWorld,
  removeHero,
  stepWorld,
  submitInput,
  type Actor,
} from '@volam/game-core';
import {
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
  readonly world = createWorld(m1Config, this.seed);
  private readonly checkSequences = new Map<string, number>();
  override messages = {
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
    input: validate(inputSchema, (client: MatchClient, input) => {
      if (input.kind === 'cast' && !m1Config.skills[input.slot]) {
        client.send('command-rejected', {
          protocolVersion: PROTOCOL_VERSION,
          sequence: input.sequence,
          reason: 'This slot is not equipped.',
        });
        return;
      }
      submitInput(this.world, client.sessionId, input.sequence, input);
    }),
  };
  override onCreate(): void {
    this.patchRate = 1000 / m1Config.tickRate;
    this.syncState();
    this.setFixedTimestep(() => {
      if (!this.world.heroes.size) return;
      stepWorld(this.world, m1Config);
      this.syncState();
      for (const event of this.world.events)
        this.broadcast(
          'combat-event',
          { ...event, protocolVersion: PROTOCOL_VERSION },
          { afterNextPatch: true },
        );
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
    addHero(this.world, client.sessionId, client.auth.nickname, m1Config);
    this.state.players.set(
      client.sessionId,
      new LobbyPlayer({ nickname: client.auth.nickname }),
    );
    this.syncState();
  }
  override onLeave(client: MatchClient): void {
    removeHero(this.world, client.sessionId);
    this.state.players.delete(client.sessionId);
    this.checkSequences.delete(client.sessionId);
    this.syncState();
  }
  private syncActor(target: CreepState, source: Actor): void {
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
    for (const [id, hero] of this.world.heroes) {
      const target = this.state.players.get(id);
      if (!target) continue;
      this.syncActor(target, hero);
      target.mana = hero.mana;
      target.maxMana = hero.maxMana;
      target.xp = hero.xp;
      target.gold = hero.gold;
      target.level = hero.level;
      target.skillPoints = hero.skillPoints;
      target.basicId = hero.basicId;
      target.lastSequence = hero.lastSequence;
      target.basicCooldown = Math.max(0, hero.cooldown - this.world.tick);
      target.qCooldown = Math.max(
        0,
        (hero.skillCooldowns[0] ?? 0) - this.world.tick,
      );
      target.wCooldown = Math.max(
        0,
        (hero.skillCooldowns[1] ?? 0) - this.world.tick,
      );
    }
    for (const [id, enemy] of this.world.creeps) {
      let target = this.state.creeps.get(id);
      if (!target) {
        target = new CreepState();
        this.state.creeps.set(id, target);
      }
      this.syncActor(target, enemy);
    }
    for (const id of this.state.projectiles.keys())
      if (!this.world.projectiles.has(id)) this.state.projectiles.delete(id);
    for (const [id, shot] of this.world.projectiles) {
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
    }
  }
}
