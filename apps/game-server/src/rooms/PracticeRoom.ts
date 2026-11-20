import { ServerError, validate, type Client } from '@colyseus/core';
import { PracticeMatch } from '@volam/game-core';
import { m1Config } from '@volam/game-data';
import {
  LobbyPlayer,
  StateView,
  PROTOCOL_VERSION,
  practiceJoinOptionsSchema,
  practiceSelectSchema,
  inputSchema,
  buildActionSchema,
  type JoinOptions,
  type PracticeJoinOptions,
  type ServerMessages,
} from '@volam/game-protocol';
import { MatchRoom } from './MatchRoom.js';
type PracticeClient = Client<{ auth: JoinOptions; messages: ServerMessages }>;
export class PracticeRoom extends MatchRoom {
  protected override get standalonePractice(): boolean {
    return true;
  }
  override maxClients = 1;
  private eventId = 0;
  get practice(): PracticeMatch {
    return this.simulation as PracticeMatch;
  }
  protected override getMatchMessages() {
    const blocked = super.getMatchMessages();
    const reject = (client: PracticeClient) =>
      client.send('command-rejected', {
        protocolVersion: PROTOCOL_VERSION,
        sequence: 1,
        reason: 'Chức năng này không dùng trong phòng test.',
      });
    for (const [name, message] of Object.entries(blocked))
      if (name !== 'connection-check') message.handler = reject;
    return {
      ...blocked,
      'practice-select': validate(
        practiceSelectSchema,
        (client: PracticeClient, choice) => {
          const reason = this.practice.switchHero(
            client.sessionId,
            choice.sequence,
            choice.schoolId,
            choice.branchId,
          );
          if (reason) {
            client.send('command-rejected', {
              protocolVersion: PROTOCOL_VERSION,
              sequence: choice.sequence,
              reason,
            });
            return;
          }
          const player = this.state.players.get(client.sessionId)!;
          player.schoolId = choice.schoolId;
          player.selectedBranch = choice.branchId;
          this.syncState();
        },
      ),
      input: validate(inputSchema, (client: PracticeClient, input) => {
        const reason = this.practice.input(
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
      'build-action': validate(
        buildActionSchema,
        (client: PracticeClient, input) => {
          const {
            protocolVersion: _protocol,
            sequence,
            revision,
            ...change
          } = input;
          const reason = this.practice.modifyBuild(
            client.sessionId,
            sequence,
            revision,
            change,
          );
          if (reason)
            client.send('command-rejected', {
              protocolVersion: PROTOCOL_VERSION,
              sequence,
              reason,
            });
          this.syncState();
        },
      ),
    };
  }
  override messages = this.getMatchMessages();
  override onAuth(
    _client: PracticeClient,
    options: unknown,
  ): PracticeJoinOptions {
    const result = practiceJoinOptionsSchema.safeParse(options);
    if (
      !result.success ||
      !this.practice.validChoice(result.data.schoolId, result.data.branchId)
    )
      throw new ServerError(
        400,
        'Biệt danh, phái/hệ hoặc phiên bản game không hợp lệ.',
      );
    return result.data;
  }
  override onCreate(): void {
    this.state.phase = 'IN_GAME';
    this.state.maxPlayers = 1;
    this.state.requiresBranch = true;
    this.state.practice.enabled = true;
    this.metadata = { phase: 'PRACTICE' };
    void this.setPrivate(true);
    this.patchRate = 1000 / m1Config.tickRate;
    this.syncState();
    this.setFixedTimestep(() => {
      this.practice.step();
      this.syncState();
      for (const { event, zoneId } of this.practice.events)
        this.broadcast(
          'combat-event',
          {
            ...event,
            id: ++this.eventId,
            zoneId,
            protocolVersion: PROTOCOL_VERSION,
          },
          { afterNextPatch: true },
        );
    }, m1Config.tickRate);
  }
  override onJoin(client: PracticeClient, _options: PracticeJoinOptions): void {
    const auth = practiceJoinOptionsSchema.parse(client.auth);
    this.practice.addSelected(
      client.sessionId,
      auth.nickname,
      auth.schoolId,
      auth.branchId,
    );
    client.view = new StateView();
    this.state.players.set(
      client.sessionId,
      new LobbyPlayer({
        nickname: auth.nickname,
        schoolId: auth.schoolId,
        selectedBranch: auth.branchId,
        confirmed: true,
      }),
    );
    this.state.hostId = client.sessionId;
    this.syncState();
  }
  override onDrop(client: PracticeClient): void {
    this.depart(client);
  }
  override onLeave(client: PracticeClient): void {
    this.depart(client);
  }
  private depart(client: PracticeClient): void {
    if (!this.state.players.has(client.sessionId)) return;
    this.practice.remove(client.sessionId);
    this.state.players.delete(client.sessionId);
  }
  protected override syncState(): void {
    super.syncState();
    this.state.defense.enabled = false;
    for (const target of this.state.creeps.values())
      if (target.archetypeId === 'practice_dog') target.invasionWave = 1;
  }
}
