import { ServerError, validate, type Client } from '@colyseus/core';
import { StandaloneLoiDai, duongMon } from '@volam/game-core';
import { m1Config, pvpDefinition } from '@volam/game-data';
import {
  LobbyPlayer,
  StateView,
  PROTOCOL_VERSION,
  pvpActionSchema,
  pvpJoinOptionsSchema,
  type JoinOptions,
  type PvpJoinOptions,
  type ServerMessages,
} from '@volam/game-protocol';
import { MatchRoom } from './MatchRoom.js';

type PvpClient = Client<{ auth: JoinOptions; messages: ServerMessages }>;

/** Reuses the existing combat projection/renderer contract; no Defense director runs. */
export class StandaloneLoiDaiRoom extends MatchRoom {
  protected override get standaloneLoiDai(): boolean {
    return true;
  }
  override maxClients = 8;
  private closing = false;
  private pvpEvent = 0;
  get pvp(): StandaloneLoiDai {
    return this.simulation as StandaloneLoiDai;
  }
  protected override getMatchMessages() {
    const shared = super.getMatchMessages();
    const reject = (client: PvpClient, _payload: unknown) =>
      this.reject(client, 'Chức năng này không dùng trong Lôi Đài.');
    return {
      ...shared,
      'lobby-action': { ...shared['lobby-action'], handler: reject },
      'loi-dai-action': { ...shared['loi-dai-action'], handler: reject },
      'dungeon-action': { ...shared['dungeon-action'], handler: reject },
      'merchant-action': { ...shared['merchant-action'], handler: reject },
      'boss-item-action': { ...shared['boss-item-action'], handler: reject },
      'boss-loot-action': { ...shared['boss-loot-action'], handler: reject },
      'boss-retry-action': { ...shared['boss-retry-action'], handler: reject },
      'creep-preview-action': {
        ...shared['creep-preview-action'],
        handler: reject,
      },
      'skill-preview-action': {
        ...shared['skill-preview-action'],
        handler: reject,
      },
      'pvp-action': validate(pvpActionSchema, (client: PvpClient, action) => {
        if (
          !this.pvp.members.has(client.sessionId) ||
          !this.pvp.acceptSequence(client.sessionId, action.sequence)
        )
          return;
        let reason: string | undefined;
        switch (action.action) {
          case 'choose':
            reason = this.pvp.choose(
              client.sessionId,
              action.schoolId,
              action.branchId,
            );
            break;
          case 'assign':
            reason = this.pvp.assign(
              client.sessionId,
              action.playerId,
              action.team,
            );
            break;
          case 'settings':
            reason = this.pvp.configure(
              client.sessionId,
              action.mapId,
              action.hazardsEnabled,
            );
            break;
          case 'start':
            reason = this.pvp.start(client.sessionId);
            break;
        }
        if (reason) this.reject(client, reason, action.sequence);
        this.syncState();
      }),
    };
  }
  private reject(client: PvpClient, reason: string, sequence = 1): void {
    client.send('command-rejected', {
      protocolVersion: PROTOCOL_VERSION,
      sequence,
      reason,
    });
  }
  override onAuth(_client: PvpClient, options: unknown): PvpJoinOptions {
    const parsed = pvpJoinOptionsSchema.safeParse(options);
    if (!parsed.success)
      throw new ServerError(400, 'Biệt danh hoặc phiên bản game không hợp lệ.');
    return parsed.data;
  }
  override onCreate(
    options: {
      portalCount?: unknown;
      creepPreview?: unknown;
      mapId?: unknown;
      pvp?: unknown;
    } = {},
  ): void {
    if (
      options.mapId !== undefined &&
      !Object.hasOwn(pvpDefinition.maps, String(options.mapId))
    )
      throw new ServerError(400, 'Map không hợp lệ.');
    if (options.mapId)
      this.pvp.mapId = options.mapId as keyof typeof pvpDefinition.maps;
    // configure performs the map geometry setup even before the first member joins.
    this.pvp.configure('', this.pvp.mapId, true);
    this.state.phase = 'IN_GAME';
    this.state.maxPlayers = 8;
    this.state.requiresBranch = true;
    this.state.pvp.enabled = true;
    this.metadata = { phase: 'PVP_LOBBY' };
    this.patchRate = 1000 / m1Config.tickRate;
    this.syncState();
    this.setFixedTimestep(() => {
      this.pvp.step();
      this.syncState();
      for (const { event, zoneId } of this.pvp.events)
        this.broadcast(
          'combat-event',
          {
            ...event,
            id: ++this.pvpEvent,
            zoneId,
            protocolVersion: PROTOCOL_VERSION,
          },
          {
            afterNextPatch: true,
            except: this.clients.filter(
              (c) =>
                event.abilityId === duongMon.trap &&
                event.kind === 'cast' &&
                c.sessionId !== event.sourceId,
            ),
          },
        );
    }, m1Config.tickRate);
  }
  override onJoin(client: PvpClient, _options: PvpJoinOptions): void {
    if (!client.auth) throw new ServerError(400, 'Chưa xác thực biệt danh.');
    const reason = this.pvp.join(client.sessionId, client.auth.nickname);
    if (reason) throw new ServerError(403, reason);
    client.view = new StateView();
    this.state.players.set(
      client.sessionId,
      new LobbyPlayer({ nickname: client.auth.nickname }),
    );
    this.state.hostId = this.pvp.hostId;
    this.syncState();
  }
  override onDrop(client: PvpClient): void {
    this.depart(client);
  }
  override onLeave(client: PvpClient): void {
    this.depart(client);
  }
  private depart(client: PvpClient): void {
    if (this.closing || !this.pvp.members.has(client.sessionId)) return;
    const host = client.sessionId === this.pvp.hostId;
    this.pvp.remove(client.sessionId);
    const player = this.state.players.get(client.sessionId);
    if (player)
      for (const peer of this.clients)
        if (peer.view?.has(player)) peer.view.remove(player);
    this.state.players.delete(client.sessionId);
    if (host) {
      this.closing = true;
      void this.disconnect(4011);
    } else this.syncState();
  }
  protected override syncState(): void {
    super.syncState();
    this.state.defense.enabled = false;
    this.state.pvp.json = JSON.stringify(this.pvp.snapshot());
    for (const m of this.pvp.members.values()) {
      const p = this.state.players.get(m.id);
      if (!p) continue;
      const h = this.pvp.hero(m.id);
      p.schoolId = m.schoolId;
      p.selectedBranch = m.branchId;
      p.confirmed = m.ready;
      p.zoneId = 'arena';
      p.level = 30;
      p.bossSpectator = m.team === 'spectator' || !h || h.hp <= 0;
      p.loiDaiFighter = !!h && m.team !== 'spectator' && h.hp > 0;
    }
  }
}
