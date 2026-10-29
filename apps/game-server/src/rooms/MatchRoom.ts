import { Room, ServerError, validate, type Client } from '@colyseus/core';
import { lobbyConfig } from '@volam/game-data';
import {
  LobbyState,
  LobbyPlayer,
  joinOptionsSchema,
  connectionCheckSchema,
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
  private readonly lastSequences = new Map<string, number>();

  override messages = {
    'connection-check': validate(
      connectionCheckSchema,
      (client: MatchClient, input) => {
        const player = this.state.players.get(client.sessionId);
        if (!player) return;
        // Replayed checks acknowledge the current count, without applying twice.
        if (input.sequence > (this.lastSequences.get(client.sessionId) ?? 0)) {
          this.lastSequences.set(client.sessionId, input.sequence);
          player.checks += 1;
        }
        client.send('connection-ack', {
          protocolVersion: PROTOCOL_VERSION,
          sequence: input.sequence,
          checks: player.checks,
        });
      },
    ),
  };

  override onAuth(_client: MatchClient, options: unknown): JoinOptions {
    const result = joinOptionsSchema.safeParse(options);
    if (!result.success) {
      throw new ServerError(
        400,
        `Use a nickname of 1–${lobbyConfig.nicknameMaxLength} characters and a compatible client.`,
      );
    }
    return result.data;
  }

  override onJoin(client: MatchClient, _options: JoinOptions): void {
    const nickname = client.auth?.nickname;
    if (!nickname) throw new ServerError(400, 'Invalid nickname.');
    this.state.players.set(client.sessionId, new LobbyPlayer({ nickname }));
  }

  override onLeave(client: MatchClient): void {
    this.state.players.delete(client.sessionId);
    this.lastSequences.delete(client.sessionId);
  }
}
