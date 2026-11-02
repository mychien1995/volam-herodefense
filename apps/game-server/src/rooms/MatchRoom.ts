import { chuView, chuLootAction, chuItemAction } from '@volam/game-core';
import {
  bossLootActionSchema,
  bossItemActionSchema,
} from '@volam/game-protocol';
import { randomInt } from 'node:crypto';
import { Room, ServerError, validate, type Client } from '@colyseus/core';
import { serverInvasionDefinition } from '../invasion-config.js';
import {
  lobbyConfig,
  m1Config,
  creepDungeon,
  desertDungeon,
  beachDungeon,
  chuBaThongDungeon,
  hongLietDungeon,
  kimLuanDungeon,
  coMoDungeon,
} from '@volam/game-data';
import {
  DungeonMatch,
  initializeProgression,
  characterStats,
  pointAccounting,
  equippedAbility,
  addCreep,
  blocked,
  type Actor,
  type MatchZone,
} from '@volam/game-core';
import {
  lobbyActionSchema,
  buildActionSchema,
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
  AreaState,
  BossEffectState,
  skillPreviewActionSchema,
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
    [
      desertDungeon,
      beachDungeon,
      chuBaThongDungeon,
      hongLietDungeon,
      kimLuanDungeon,
      coMoDungeon,
    ],
  );
  readonly world = this.simulation.arena.world;
  private readonly checkSequences = new Map<string, number>();
  private readonly dungeonSequences = new Map<string, number>();
  private eventSequence = 0;
  readonly legacySkills =
    process.env['NODE_ENV'] !== 'production' &&
    process.env['VOLAM_DEV_LEGACY_SKILLS'] === '1';
  readonly devSkillLoadout =
    this.legacySkills && process.env['VOLAM_DEV_SKILLS'] === '1';
  override messages = {
    'skill-preview-action': validate(
      skillPreviewActionSchema,
      (client: MatchClient, input) => {
        const hero = this.simulation.hero(client.sessionId),
          zone = this.simulation.zoneOf(client.sessionId);
        if (
          !this.devSkillLoadout ||
          this.state.phase !== 'IN_GAME' ||
          !hero ||
          hero.hp <= 0 ||
          zone?.access !== 'arena'
        )
          return;
        const prefix = `preview_${client.sessionId}_`;
        zone.world.combos = (zone.world.combos ?? []).filter(
          (c) => !c.targetId.startsWith(prefix),
        );
        for (const id of zone.world.creeps.keys())
          if (id.startsWith(prefix)) zone.world.creeps.delete(id);
        if (input.action !== 'clear')
          for (let i = 0; i < (input.action === 'attacker' ? 1 : 3); i++) {
            const point = {
              x: hero.x + hero.fx * (24 + i * 48),
              y: hero.y + hero.fy * (24 + i * 48),
            };
            if (
              blocked(
                point,
                zone.config.creep.radius,
                zone.config.width,
                zone.config.height,
                zone.config.collision,
              )
            )
              continue;
            const enemy = addCreep(zone.world, prefix + i, point, zone.config);
            enemy.hp = enemy.maxHp = 10000;
            enemy.stats = {
              ...zone.config.creep,
              hp: 10000,
              speed: 0,
              defense: 0,
              xp: 0,
              gold: 0,
              damage: 12,
              attackCooldownTicks: 45,
              attackRange: 40,
              detectionRange: input.action === 'attacker' ? 65 : 1,
            };
          }
        this.syncState();
      },
    ),
    'build-action': validate(
      buildActionSchema,
      (client: MatchClient, input) => {
        const reason =
          this.state.phase !== 'IN_GAME' ||
          !this.state.players.get(client.sessionId)?.confirmed
            ? 'Chọn và xác nhận môn phái trước khi đổi võ học.'
            : this.simulation.modifyBuild(
                client.sessionId,
                input.sequence,
                input.revision,
                input,
              );
        if (reason)
          client.send('command-rejected', {
            protocolVersion: PROTOCOL_VERSION,
            sequence: input.sequence,
            reason,
          });
        this.syncState();
      },
    ),
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
            return reject('Chỉ host được bắt đầu từ phòng chờ.');
          if ([...this.state.players.values()].some((p) => !p.connected))
            return reject(
              'Có người chơi mất kết nối. Hãy rời và tạo phòng mới.',
            );
          this.state.phase = 'SCHOOL_SELECTION';
          void this.setMetadata({ phase: this.state.phase });
        } else {
          if (
            !['SCHOOL_SELECTION', 'IN_GAME'].includes(this.state.phase) ||
            player.confirmed
          )
            return reject('Không thể đổi lựa chọn ở giai đoạn này.');
          if (action.action === 'select') player.schoolId = action.schoolId;
          else {
            if (!player.schoolId) return reject('Hãy chọn môn phái trước.');
            player.confirmed = true;
            if (this.state.phase === 'IN_GAME') {
              const hero = this.simulation.add(
                client.sessionId,
                player.nickname,
              );
              hero.schoolId = player.schoolId;
              if (
                this.legacySkills &&
                ['thien_son', 'vo_dang', 'thieu_lam'].includes(hero.schoolId)
              ) {
                hero.basicId =
                  m1Config.progression!.schools[hero.schoolId]!.basicIds[0]!;
                hero.skillIds = ['', '', '', ''];
              }
              if (
                !this.legacySkills &&
                !initializeProgression(hero, m1Config, 'default')
              ) {
                hero.skillIds = ['', '', '', ''];
                hero.skillCooldowns = [0, 0, 0, 0];
              }
              this.syncState();
            } else if (
              [...this.state.players.values()].every(
                (p) => p.connected && p.confirmed,
              )
            ) {
              for (const [id, p] of this.state.players) {
                const hero = this.simulation.add(id, p.nickname);
                hero.schoolId = p.schoolId;
                if (
                  this.legacySkills &&
                  ['thien_son', 'vo_dang', 'thieu_lam'].includes(hero.schoolId)
                ) {
                  hero.basicId =
                    m1Config.progression!.schools[hero.schoolId]!.basicIds[0]!;
                  hero.skillIds = ['', '', '', ''];
                }
                if (
                  !this.legacySkills &&
                  !initializeProgression(hero, m1Config, 'default')
                ) {
                  hero.skillIds = ['', '', '', ''];
                  hero.skillCooldowns = [0, 0, 0, 0];
                }
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
    'boss-item-action': validate(
      bossItemActionSchema,
      (client: MatchClient, input) => {
        const hero = this.simulation.hero(client.sessionId),
          zone = this.simulation.zoneOf(client.sessionId);
        if (
          this.state.phase !== 'IN_GAME' ||
          !hero ||
          !zone ||
          input.sequence <= hero.lastSequence
        )
          return;
        hero.lastSequence = input.sequence;
        const error = chuItemAction(
          zone.world,
          client.sessionId,
          input.index,
          input.itemId,
          input.action,
          [
            ...chuBaThongDungeon.chuBoss!.loot,
            ...kimLuanDungeon.kimBoss!.loot,
          ].find((i) => i.id === input.itemId) ?? {
            id: '',
            nameVi: '',
            sellGold: 0,
          },
        );
        if (error)
          client.send('command-rejected', {
            protocolVersion: PROTOCOL_VERSION,
            sequence: input.sequence,
            reason: error,
          });
        this.syncState();
      },
    ),
    'boss-loot-action': validate(
      bossLootActionSchema,
      (client: MatchClient, input) => {
        if (this.state.phase !== 'IN_GAME') return;
        const hero = this.simulation.hero(client.sessionId),
          zone = this.simulation.zoneOf(client.sessionId);
        if (!hero || !zone || input.sequence <= hero.lastSequence) return;
        hero.lastSequence = input.sequence;
        const error = chuLootAction(
          zone.world,
          client.sessionId,
          input.lootId,
          input.action,
        );
        if (error)
          client.send('command-rejected', {
            protocolVersion: PROTOCOL_VERSION,
            sequence: input.sequence,
            reason: error,
          });
        this.syncState();
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
          return reject('Trận đấu chưa bắt đầu.');
        if (!this.state.players.get(client.sessionId)?.confirmed)
          return reject('Hãy chọn và xác nhận môn phái trước khi chơi.');
        if (
          input.sequence <= (this.dungeonSequences.get(client.sessionId) ?? 0)
        )
          return;
        this.dungeonSequences.set(client.sessionId, input.sequence);
        if (input.action === 'open') {
          if (!this.simulation.canEnterDungeon(client.sessionId))
            return reject('Chỉ vào phó bản khi còn sống tại đấu trường.');
          client.send(
            'dungeon-menu',
            { protocolVersion: PROTOCOL_VERSION },
            { afterNextPatch: true },
          );
          return;
        }
        let reason =
          input.action === 'enter'
            ? this.simulation.enter(
                client.sessionId,
                input.access ?? 'private',
                input.destination,
              )
            : input.action === 'summon-help'
              ? this.simulation.summonHelp(client.sessionId, Date.now())
              : input.action === 'reply-invitation'
                ? this.simulation.replyInvitation(
                    client.sessionId,
                    input.invitationId,
                    input.accept,
                    Date.now(),
                  )
                : input.action === 'interact'
                  ? this.simulation.interact(client.sessionId)
                  : this.simulation.exit(client.sessionId);
        if (!reason && input.action === 'enter' && input.summonHelp)
          reason = this.simulation.summonHelp(client.sessionId, Date.now());
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
          reason: 'Trận đấu chưa bắt đầu.',
        });
        return;
      }
      if (!this.state.players.get(client.sessionId)?.confirmed) {
        client.send('command-rejected', {
          protocolVersion: PROTOCOL_VERSION,
          sequence: input.sequence,
          reason: 'Hãy chọn và xác nhận môn phái trước khi chơi.',
        });
        return;
      }
      if (
        input.kind === 'select-basic' &&
        ((!this.legacySkills &&
          this.simulation.hero(client.sessionId)?.schoolId !== 'cai_bang') ||
          (this.legacySkills &&
            !m1Config.progression?.schools[
              this.simulation.hero(client.sessionId)?.schoolId ?? ''
            ]?.basicIds.includes(input.id)))
      ) {
        client.send('command-rejected', {
          protocolVersion: PROTOCOL_VERSION,
          sequence: input.sequence,
          reason:
            'Đòn đánh môn phái này chưa mở. Không thể dùng võ học môn phái khác.',
        });
        return;
      }
      if (
        input.kind === 'dev-loadout' &&
        (!this.devSkillLoadout ||
          !['cai_bang', 'thien_son', 'vo_dang', 'thieu_lam'].includes(
            this.simulation.hero(client.sessionId)?.schoolId ?? '',
          ))
      ) {
        client.send('command-rejected', {
          protocolVersion: PROTOCOL_VERSION,
          sequence: input.sequence,
          reason: 'Bộ kỹ năng thử nghiệm đang tắt.',
        });
        return;
      }
      if (
        input.kind === 'dev-loadout' &&
        (input.ids.some(
          (id) =>
            id &&
            m1Config.progression?.skills[id]?.schoolId !==
              this.simulation.hero(client.sessionId)?.schoolId,
        ) ||
          new Set(input.ids.filter(Boolean)).size !==
            input.ids.filter(Boolean).length)
      ) {
        client.send('command-rejected', {
          protocolVersion: PROTOCOL_VERSION,
          sequence: input.sequence,
          reason: 'Bộ thử nghiệm có kỹ năng không hợp lệ hoặc bị trùng.',
        });
        return;
      }
      if (
        input.kind === 'cast' &&
        !equippedAbility(
          this.simulation.hero(client.sessionId)!,
          input.slot,
          m1Config,
        )
      ) {
        client.send('command-rejected', {
          protocolVersion: PROTOCOL_VERSION,
          sequence: input.sequence,
          reason: this.simulation.hero(client.sessionId)?.progression
            ? 'Kỹ năng chưa trang bị hoặc chưa học. Dùng điểm tại Võ Học trong đấu trường.'
            : 'Ô này chưa được trang bị.',
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
    // Historical combat targets are explicit development fixtures, never match spawns.
    if (!(
      process.env['NODE_ENV'] !== 'production' &&
      process.env['VOLAM_DEV_PRACTICE_CREEPS'] === '1'
    ))
      this.world.creeps.clear();
    this.state.devSkillLoadout = this.devSkillLoadout;
    this.metadata = { phase: this.state.phase };
    this.patchRate = 1000 / m1Config.tickRate;
    this.syncState();
    this.setFixedTimestep(() => {
      if (this.state.phase !== 'IN_GAME') return;
      if (!this.simulation.membership.size) {
        // Keep boss empty-reset clocks advancing while a late joiner is selecting a school.
        this.simulation.tick++;
        for (const zone of this.simulation.zones.values())
          zone.encounter?.emptyStep(
            zone.world,
            zone.config,
            this.simulation.tick,
          );
        this.syncState();
        return;
      }
      this.simulation.step(Date.now());
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
            sourceId:
              zone.world.creeps.has(event.sourceId) ||
              event.sourceId.startsWith('hl_minion_')
                ? this.entityKey(zone, event.sourceId)
                : event.sourceId,
            targetId:
              zone.world.creeps.has(event.targetId) ||
              event.targetId.startsWith('hl_minion_')
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
        `Biệt danh cần từ 1–${lobbyConfig.nicknameMaxLength} ký tự và phiên bản game tương thích.`,
      );
    return parsed.data;
  }
  override onJoin(client: MatchClient, _options: JoinOptions): void {
    if (!client.auth)
      throw new ServerError(400, 'Yêu cầu vào phòng không hợp lệ.');
    if (
      !['WAITING_LOBBY', 'SCHOOL_SELECTION', 'IN_GAME'].includes(
        this.state.phase,
      )
    )
      throw new ServerError(403, 'Trận đấu đã kết thúc.');
    if (!this.state.hostId) this.state.hostId = client.sessionId;
    client.view = new StateView();
    this.state.players.set(
      client.sessionId,
      new LobbyPlayer({ nickname: client.auth.nickname }),
    );
    this.syncState();
  }
  override onDrop(client: MatchClient): void {
    const player = this.state.players.get(client.sessionId);
    if (player) player.connected = false;
    this.simulation.disconnect(client.sessionId);
    this.syncState();
    this.allowReconnection(client, 30);
  }
  override onReconnect(client: MatchClient): void {
    const player = this.state.players.get(client.sessionId);
    if (player) player.connected = true;
    client.view = new StateView();
    this.simulation.reconnect(client.sessionId);
    this.syncState();
  }
  override onLeave(client: MatchClient): void {
    for (const zone of this.simulation.zones.values())
      for (const id of zone.world.creeps.keys())
        if (id.startsWith(`preview_${client.sessionId}_`))
          zone.world.creeps.delete(id);
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
    tick: number,
  ): void {
    target.x = source.x;
    target.y = source.y;
    target.fx = source.fx;
    target.fy = source.fy;
    target.hp = source.hp;
    target.maxHp = source.maxHp;
    target.pose = source.pose;
    const actor = target as typeof target & {
      statuses: string;
      castAbilityId: string;
    };
    actor.statuses = JSON.stringify(
      (source.statuses ?? [])
        .filter((s) => s.until > tick)
        .map((s) => ({
          kind: s.kind,
          abilityId: s.abilityId,
          sourceId: s.sourceId,
          ticks: s.until - tick,
          magnitude: s.magnitude,
          secondary: s.secondary,
          receivedDamage: s.receivedDamage,
          thresholdFraction: s.thresholdFraction,
        })),
    );
    actor.castAbilityId = source.castAbilityId ?? '';
  }
  private syncState(): void {
    this.state.tick = this.world.tick;
    this.state.matchElapsedMs = (this.world.tick * 1000) / m1Config.tickRate;
    const invasion = this.simulation.invasion,
      defense = this.state.defense,
      statue = this.world.statue;
    if (invasion && statue) {
      defense.paused = this.simulation.arenaPaused;
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
      target.bossInvitation = JSON.stringify(
        this.simulation.party.invitations.get(id) ?? null,
      );
      if (!hero) {
        target.zoneId = 'arena';
        continue;
      }
      target.bossSpectator = !!hero.bossSpectator;
      target.actionUntil = hero.actionUntil;
      target.actionStartedAt = hero.actionStartedAt ?? 0;
      target.basicStage = hero.basicStage ?? '';
      const action = zone.world.actions?.find((a) => a.ownerId === id);
      target.actionState = action
        ? JSON.stringify({
            id: action.id,
            abilityId: action.abilityId,
            kind: action.kind,
            startedAt: action.startedAt,
            nextTick: action.nextTick,
            until: action.until,
            remaining: action.remaining,
            fx: action.fx,
            fy: action.fy,
            range: 'range' in action.effect ? action.effect.range : 0,
            windupTicks:
              'windupTicks' in action.effect ? action.effect.windupTicks : 0,
          })
        : '';
      const bossZone = !!(
        zone.dungeon?.boss ||
        zone.dungeon?.kimBoss ||
        zone.dungeon?.chuBoss ||
        zone.dungeon?.bossEncounter
      );
      target.bossAttempt = bossZone ? this.simulation.party.attempt(zone) : 0;
      target.bossRevivalUsed =
        bossZone && this.simulation.party.life(zone, id).revivalUsed;
      this.syncActor(target, hero, zone.world.tick);
      target.bossItems = JSON.stringify(hero.bossItems ?? []);
      target.bossLoot = JSON.stringify(hero.bossLoot ?? []);
      target.zoneId = zone.id;
      target.combos = JSON.stringify(
        (zone.world.combos ?? [])
          .filter(
            (c) =>
              c.sourceId === id &&
              c.until > zone.world.tick &&
              (zone.world.creeps.get(c.targetId)?.hp ?? 0) > 0,
          )
          .map((c) => ({
            id: c.id,
            targetId: c.targetId,
            step: c.step,
            ticks: c.until - zone.world.tick,
          })),
      );
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
      target.build.enabled = !!hero.progression;
      if (hero.progression) {
        Object.assign(target.build, pointAccounting(hero, m1Config));
        target.build.revision = hero.progression.revision;
        target.build.mode = hero.progression.mode;
        target.build.branchId = hero.progression.branchId;
        hero.progression.defaultSkills.forEach((id, i) => {
          target.build.slotSkills[i] = id;
        });
        const stats = characterStats(hero, m1Config, zone.world.tick);
        Object.assign(target.build.stats, stats.total);
        target.build.sources = JSON.stringify(stats.sources);
        for (const key of target.build.ranks.keys())
          if (!Object.hasOwn(hero.progression.ranks, key))
            target.build.ranks.delete(key);
        for (const [key, rank] of Object.entries(hero.progression.ranks))
          target.build.ranks.set(key, rank);
      }
      target.basicId = hero.basicId;
      target.lastSequence = hero.lastSequence;
      target.basicCooldown = Math.max(0, hero.cooldown - zone.world.tick);
      target.dashCharges = hero.dashCharges ?? 0;
      target.dashRechargeTicks = Math.max(
        0,
        (hero.dashRechargeAt ?? 0) - zone.world.tick,
      );
      const blinkShot = [...zone.world.projectiles.values()].find(
        (p) => p.ownerId === id && p.effect.blinkWindowTicks,
      );
      target.blinkTicks = blinkShot
        ? blinkShot.lingerUntil === undefined
          ? Math.ceil(
              (blinkShot.remaining / blinkShot.effect.speed) *
                zone.config.tickRate,
            ) + blinkShot.effect.blinkWindowTicks!
          : Math.max(0, blinkShot.lingerUntil - zone.world.tick)
        : 0;
      target.qCooldown = Math.max(
        0,
        (hero.skillCooldowns[0] ?? 0) - zone.world.tick,
      );
      target.wCooldown = Math.max(
        0,
        (hero.skillCooldowns[1] ?? 0) - zone.world.tick,
      );
      target.eCooldown = Math.max(
        0,
        (hero.skillCooldowns[2] ?? 0) - zone.world.tick,
      );
      target.rCooldown = Math.max(
        0,
        (hero.skillCooldowns[3] ?? 0) - zone.world.tick,
      );
      const ids = hero.skillIds ?? m1Config.skills.map((s) => s.id);
      target.qSkill = ids[0] ?? '';
      target.wSkill = ids[1] ?? '';
      target.eSkill = ids[2] ?? '';
      target.rSkill = ids[3] ?? '';
    }
    const creepKeys = new Set<string>(),
      shotKeys = new Set<string>(),
      areaKeys = new Set<string>(),
      bossEffectKeys = new Set<string>();
    for (const zone of this.simulation.zones.values()) {
      if (zone.access !== 'arena') {
        let dungeon = this.state.dungeons.get(zone.id);
        if (!dungeon) {
          dungeon = new DungeonState();
          this.state.dungeons.set(zone.id, dungeon);
        }
        dungeon.encounter = zone.world.chu
          ? JSON.stringify(chuView(zone.world, zone.config))
          : zone.kim
            ? JSON.stringify({ ...zone.kim.view(zone.world), effects: [] })
            : '';
        const boss =
          zone.encounter && zone.world.creeps.get(zone.encounter.bossId);
        dungeon.bossHp = boss?.hp ?? 0;
        dungeon.bossMaxHp = boss?.maxHp ?? 0;
        dungeon.bossRespawnTicks = zone.encounter?.respawnAt
          ? Math.max(0, zone.encounter.respawnAt - zone.world.tick)
          : 0;
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
        dungeon.respawnTicks = Math.max(
          0,
          (zone.bossRespawnAt ?? this.simulation.tick) - this.simulation.tick,
        );
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
        this.syncActor(target, enemy, zone.world.tick);
        if (enemy.hp > 0 && enemy.burnUntil > zone.world.tick) {
          const statuses = JSON.parse(target.statuses) as unknown[];
          statuses.push({
            kind: 'burn',
            abilityId: 'cuong_long_loan_vu',
            sourceId: enemy.burnSource,
            ticks: enemy.burnUntil - zone.world.tick,
          });
          target.statuses = JSON.stringify(statuses);
        }
        target.zoneId = zone.id;
        target.invasionWave = enemy.invasion?.wave ?? 0;
        target.archetypeId = enemy.archetypeId ?? '';
        target.actionStartedAt = enemy.encounterAction?.startedAt ?? 0;
        target.actionActiveAt = enemy.encounterAction?.activeAt ?? 0;
        target.actionEndsAt = enemy.encounterAction?.endsAt ?? 0;
        const bossCast = enemy.encounterBoss
          ? zone.world.boss?.cast
          : undefined;
        target.castTicks = Math.max(
          0,
          (bossCast?.releaseAt ?? zone.world.tick) - zone.world.tick,
        );
        target.castTargetId = bossCast?.targetId ?? '';
        target.lane = enemy.invasion?.lane ?? '';
        target.targetId = enemy.invasion?.targetId ?? enemy.aggroTargetId ?? '';
      }
      for (const effect of [
        ...(zone.encounter?.effects.values() ?? []),
        ...(zone.kim?.effects.values() ?? []),
      ]) {
        const id = this.entityKey(zone, effect.id);
        bossEffectKeys.add(id);
        let target = this.state.bossEffects.get(id);
        if (!target) {
          target = new BossEffectState();
          this.state.bossEffects.set(id, target);
        }
        for (const key of [
          'kind',
          'castId',
          'ownerId',
          'abilityId',
          'x',
          'y',
          'fx',
          'fy',
          'length',
          'radius',
          'startedAt',
          'activeAt',
          'expiresAt',
          'damageUntil',
        ] as const)
          (target as unknown as Record<string, unknown>)[key] =
            key in effect
              ? (effect as unknown as Record<string, unknown>)[key]
              : effect.expiresAt;
        target.speed = effect.speed;
        target.index = 'index' in effect ? (effect.index ?? 0) : 0;
        target.maxRadius = 'maxRadius' in effect ? (effect.maxRadius ?? 0) : 0;
        target.previousRadius =
          'previousRadius' in effect ? (effect.previousRadius ?? 0) : 0;
        target.zoneId = zone.id;
      }
      for (const area of zone.world.areas ?? []) {
        const id = this.entityKey(zone, area.id);
        areaKeys.add(id);
        let target = this.state.areas.get(id);
        if (!target) {
          target = new AreaState();
          this.state.areas.set(id, target);
        }
        Object.assign(target, {
          startedAt: area.until - area.effect.durationTicks,
          x: area.x,
          y: area.y,
          radius: area.effect.radius,
          ticks: area.until - zone.world.tick,
          ownerId: area.ownerId,
          abilityId: area.abilityId,
          zoneId: zone.id,
        });
      }
      for (const [localId, shot] of zone.world.projectiles) {
        const id = this.entityKey(zone, localId);
        shotKeys.add(id);
        let target = this.state.projectiles.get(id);
        if (!target) {
          target = new ProjectileState();
          this.state.projectiles.set(id, target);
        }
        shot.spawnedAt ??= zone.world.tick;
        target.startedAt = shot.spawnedAt;
        target.x = shot.x;
        target.y = shot.y;
        target.vx = shot.vx;
        target.vy = shot.vy;
        target.ownerId = zone.world.creeps.has(shot.ownerId)
          ? this.entityKey(zone, shot.ownerId)
          : shot.ownerId;
        target.abilityId = shot.abilityId;
        target.zoneId = zone.id;
        target.radius = shot.effect.radius;
        target.stage = shot.stage ?? '';
        target.leg = shot.leg ?? '';
        target.lingerTicks = Math.max(
          0,
          (shot.lingerUntil ?? 0) - zone.world.tick,
        );
      }
    }
    for (const [id, target] of this.state.bossEffects)
      if (!bossEffectKeys.has(id)) {
        for (const client of this.clients)
          if (client.view?.has(target)) client.view.remove(target);
        this.state.bossEffects.delete(id);
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
    for (const [id, target] of this.state.areas)
      if (!areaKeys.has(id)) {
        for (const client of this.clients)
          if (client.view?.has(target)) client.view.remove(target);
        this.state.areas.delete(id);
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
        ...this.state.areas.values(),
        ...this.state.bossEffects.values(),
      ]) {
        if (entity.zoneId === zoneId && !view.has(entity)) view.add(entity);
        else if (entity.zoneId !== zoneId && view.has(entity))
          view.remove(entity);
      }
      for (const dungeon of this.state.dungeons.values()) {
        const visible =
          dungeon.id === zoneId ||
          (!dungeon.id.startsWith('chu_ba_thong_') &&
            !dungeon.id.startsWith('kim_luan_') &&
            (dungeon.access === 'shared' ||
              dungeon.ownerId === client.sessionId));
        if (visible && !view.has(dungeon)) view.add(dungeon);
        else if (!visible && view.has(dungeon)) view.remove(dungeon);
      }
    }
  }
  private entityKey(zone: MatchZone, id: string): string {
    return zone.access === 'arena' ? id : `${zone.id}:${id}`;
  }
}
