import { namDeView } from '@volam/game-core';
import { serverWaveBossTestOptions } from '../wave-boss-test-config.js';
import {
  prepareSkillReviewHero,
  resetSkillReviewResources,
  applySkillReviewLoadout,
} from '../skill-review-mode.js';
import { namDeDefinition } from '@volam/game-data';
import { NamDeControlState } from '@volam/game-protocol';
import { chuView } from '@volam/game-core';
import { isBacCaiActor } from '@volam/game-core';
import {
  bossLootActionSchema,
  bossItemActionSchema,
} from '@volam/game-protocol';
import { randomInt } from 'node:crypto';
import { Room, ServerError, validate, type Client } from '@colyseus/core';
import { serverInvasionDefinition } from '../invasion-config.js';
import { CreepPreviewSession } from '../creep-preview.js';
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
  dongTaDefinition,
  tayDocDefinition,
  hellDungeon,
  bacCaiDefinition,
  creepCombatDefinition,
  vuongDefinition,
  campaignDefinition,
} from '@volam/game-data';
import {
  DungeonMatch,
  conLuan,
  duongMon,
  nguDoc,
  nguDocSummons,
  nguDocSummonPrefix,
  changeBuild,
  initializeProgression,
  skillRank,
  characterStats,
  pointAccounting,
  equippedAbility,
  skillCharges,
  transactMerchant,
  refreshCharacter,
  loiDai,
  experienceAtLevel,
  addCreep,
  blocked,
  type Actor,
  type PotionId,
  type MatchZone,
} from '@volam/game-core';
import {
  lobbyActionSchema,
  buildActionSchema,
  LobbyState,
  LobbyPlayer,
  SkillChargeState,
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
  TayDocState,
  AreaState,
  BossEffectState,
  BacCaiState,
  VuongState,
  skillPreviewActionSchema,
  merchantActionSchema,
  portalCountSchema,
  creepPreviewActionSchema,
  bossRetryActionSchema,
  loiDaiActionSchema,
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
  readonly devCreepTest =
    process.env['NODE_ENV'] !== 'production' &&
    process.env['VOLAM_DEV_CREEP_TEST'] === '1';
  readonly waveBossTestOptions = serverWaveBossTestOptions(m1Config.tickRate);
  readonly simulation = new DungeonMatch(
    {
      ...m1Config,
      ...(!this.devCreepTest &&
      !this.waveBossTestOptions &&
      process.env['VOLAM_DEV_LEGACY_SKILLS'] !== '1' &&
      process.env['VOLAM_TEST_LEGACY_PROGRESSION'] !== '1'
        ? { campaign: structuredClone(campaignDefinition) }
        : {}),
      personalCraftLoot: true,
      creepCombat: creepCombatDefinition,
    },
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
      hellDungeon,
    ],
    this.devCreepTest ? undefined : structuredClone(dongTaDefinition),
    this.devCreepTest ? undefined : structuredClone(tayDocDefinition),
    this.devCreepTest ? undefined : namDeDefinition,
    this.devCreepTest ? undefined : bacCaiDefinition,
    this.waveBossTestOptions,
    !this.devCreepTest &&
      (!this.waveBossTestOptions || process.env['VOLAM_DEV_FINAL_BOSS'] === '1')
      ? vuongDefinition
      : undefined,
  );
  readonly world = this.simulation.arena.world;
  private creepPreview: CreepPreviewSession | undefined;
  readonly devTayDoc =
    process.env['NODE_ENV'] !== 'production' &&
    process.env['VOLAM_DEV_TAY_DOC'] === '1';
  private readonly devLoiDai =
    process.env['NODE_ENV'] === 'development' &&
    process.env['VOLAM_DEV_LOI_DAI'] === '1';
  private readonly checkSequences = new Map<string, number>();
  private readonly collectInputTiming =
    process.env['NODE_ENV'] !== 'production' &&
    process.env['VOLAM_INPUT_TIMING'] === '1';
  private readonly inputTiming = new Map<
    string,
    Array<{
      sequence: number;
      receivedAt: number;
      steppedAt?: number;
      tick?: number;
    }>
  >();
  private readonly dungeonSequences = new Map<string, number>();
  private eventSequence = 0;
  readonly legacySkills =
    process.env['NODE_ENV'] !== 'production' &&
    process.env['VOLAM_DEV_LEGACY_SKILLS'] === '1';
  readonly devSkillLoadout =
    this.legacySkills && process.env['VOLAM_DEV_SKILLS'] === '1';
  // Historical room fixtures can exercise the earlier progression contract.
  private readonly legacyProgression =
    process.env['NODE_ENV'] === 'test' &&
    process.env['VOLAM_TEST_LEGACY_PROGRESSION'] === '1';

  private spawnPlayer(id: string, player: LobbyPlayer): void {
    const hero = this.simulation.add(id, player.nickname);
    if (this.devCreepTest) hero.invulnerable = true;
    hero.schoolId = player.schoolId;
    const first = m1Config.progression!.schools[hero.schoolId]!.basicIds[0]!;
    if (this.legacySkills) {
      if (hero.schoolId !== 'cai_bang') {
        hero.basicId = first;
        hero.skillIds = ['', '', '', ''];
      }
    } else {
      initializeProgression(
        hero,
        m1Config,
        this.legacyProgression ? 'default' : 'fixed',
        player.selectedBranch || first,
      );
    }
    if (this.devSkillLoadout) prepareSkillReviewHero(hero, m1Config);
    const conLuanTrial =
      hero.schoolId === conLuan.school &&
      process.env['NODE_ENV'] !== 'production' &&
      process.env['VOLAM_DEV_CON_LUAN'] === '1' &&
      !this.legacySkills;
    const duongMonTrial =
      hero.schoolId === duongMon.school &&
      process.env['NODE_ENV'] !== 'production' &&
      process.env['VOLAM_DEV_DUONG_MON'] === '1' &&
      !this.legacySkills;
    const nguDocTrial =
      hero.schoolId === nguDoc.school &&
      process.env['NODE_ENV'] !== 'production' &&
      process.env['VOLAM_DEV_NGU_DOC'] === '1' &&
      !this.legacySkills;
    if (this.devLoiDai || conLuanTrial || duongMonTrial || nguDocTrial) {
      hero.level = this.devLoiDai ? loiDai.minLevel : 6;
      hero.xp = experienceAtLevel(hero.level, this.simulation.base);
      hero.skillPoints = hero.level;
      if (nguDocTrial) {
        hero.gold = Math.max(hero.gold, 250);
        for (const slot of [
          0,
          1,
          2,
          3,
          4,
          hero.basicId === nguDoc.coSu ? 1 : 0,
        ])
          changeBuild(
            this.world,
            hero,
            this.simulation.base,
            hero.progression!.revision,
            { action: 'upgrade-slot', slot },
          );
      }
      if (duongMonTrial) {
        for (const slot of [
          0,
          1,
          2,
          3,
          4,
          hero.basicId === duongMon.amKhi ? 3 : 2,
        ])
          changeBuild(
            this.world,
            hero,
            this.simulation.base,
            hero.progression!.revision,
            { action: 'upgrade-slot', slot },
          );
      }
      refreshCharacter(hero, this.simulation.base);
      hero.hp = hero.maxHp;
      hero.mana = hero.maxMana;
    }
  }

  override messages = {
    'loi-dai-action': validate(
      loiDaiActionSchema,
      (client: MatchClient, input) => {
        if (
          this.state.phase !== 'IN_GAME' ||
          this.creepPreview ||
          !this.state.players.get(client.sessionId)?.confirmed
        )
          return;
        const hero = this.simulation.hero(client.sessionId);
        if (!hero || input.sequence <= hero.lastSequence) return;
        hero.lastSequence = input.sequence;
        const reason =
          input.action === 'enter'
            ? this.simulation.enterLoiDai(client.sessionId)
            : this.simulation.exitLoiDai(client.sessionId);
        if (reason)
          client.send('command-rejected', {
            protocolVersion: PROTOCOL_VERSION,
            sequence: input.sequence,
            reason,
          });
        this.syncState();
      },
    ),
    'boss-retry-action': validate(
      bossRetryActionSchema,
      (client: MatchClient, input) => {
        const hero = this.simulation.hero(client.sessionId);
        if (
          !hero ||
          !this.simulation.base.campaign ||
          this.state.phase !== 'IN_GAME' ||
          input.sequence <= hero.lastSequence
        )
          return;
        hero.lastSequence = input.sequence;
        const reason =
          input.action === 'vote'
            ? this.simulation.bossRetries.vote(
                client.sessionId,
                input.id,
                input.accept,
              )
            : this.simulation.bossRetries.call(client.sessionId, input.id);
        if (reason)
          client.send('command-rejected', {
            protocolVersion: PROTOCOL_VERSION,
            sequence: input.sequence,
            reason,
          });
        this.syncState();
      },
    ),
    'creep-preview-action': validate(
      creepPreviewActionSchema,
      (client: MatchClient, input) => {
        const reason =
          !this.creepPreview || !this.devCreepTest
            ? 'Preview creep chỉ dùng trong phòng test riêng.'
            : client.sessionId !== this.state.hostId
              ? 'Chỉ host điều khiển preview creep.'
              : this.state.phase !== 'IN_GAME' ||
                  !this.state.players.get(client.sessionId)?.confirmed
                ? 'Hãy chọn và xác nhận môn phái trước.'
                : this.creepPreview.action(input);
        if (reason)
          client.send('command-rejected', {
            protocolVersion: PROTOCOL_VERSION,
            sequence: input.sequence,
            reason,
          });
        this.syncState();
      },
    ),
    'merchant-action': validate(
      merchantActionSchema,
      (client: MatchClient, input) => {
        const hero = this.simulation.hero(client.sessionId),
          zone = this.simulation.zoneOf(client.sessionId);
        if (
          this.state.phase !== 'IN_GAME' ||
          !hero ||
          !zone ||
          !this.state.players.get(client.sessionId)?.confirmed
        )
          return;
        if (input.sequence <= hero.lastSequence) return;
        hero.lastSequence = input.sequence;
        const beforePotions = { ...hero.inventory?.potions };
        const reason =
          zone.access === 'duel'
            ? 'Không thể dùng vật phẩm hoặc mở Thương Gia trong Lôi Đài.'
            : this.simulation.base.campaign &&
                input.action !== 'use-potion' &&
                this.simulation.waveBossLocked
              ? 'Không thể mua hoặc chế tạo khi đang giao chiến boss.'
              : transactMerchant(
                  hero,
                  m1Config,
                  {
                    inArena: zone.access === 'arena',
                    matchTick: this.simulation.tick,
                    worldTick: zone.world.tick,
                  },
                  input.revision,
                  input,
                );
        if (!reason && input.action === 'use-potion')
          for (const key of Object.keys(beforePotions) as PotionId[]) {
            const used =
              (beforePotions[key] ?? 0) - (hero.inventory?.potions[key] ?? 0);
            if (used > 0)
              this.simulation.bossRetries.recordPotion(hero.id, key, used);
          }
        if (reason)
          client.send('command-rejected', {
            protocolVersion: PROTOCOL_VERSION,
            sequence: input.sequence,
            reason,
          });
        else
          client.send('merchant-result', {
            protocolVersion: PROTOCOL_VERSION,
            sequence: input.sequence,
            revision: hero.inventory!.revision,
            message:
              input.action === 'use-potion'
                ? 'Đã dùng bình.'
                : input.action === 'craft'
                  ? 'Đã chế tạo và trang bị.'
                  : 'Đã mua và cập nhật hành trang.',
          });
        this.syncState();
      },
    ),
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
          if (action.action === 'select') {
            if (player.schoolId !== action.schoolId) player.selectedBranch = '';
            player.schoolId = action.schoolId;
          } else if (action.action === 'branch') {
            if (
              !m1Config.progression?.schools[
                player.schoolId
              ]?.basicIds.includes(action.basicId)
            )
              return reject('Nhánh võ học không thuộc môn phái đã chọn.');
            player.selectedBranch = action.basicId;
          } else {
            if (!player.schoolId) return reject('Hãy chọn môn phái trước.');
            if (this.state.requiresBranch && !player.selectedBranch)
              return reject('Hãy chọn nhánh võ học trước khi xác nhận.');
            player.confirmed = true;
            if (this.state.phase === 'IN_GAME') {
              this.spawnPlayer(client.sessionId, player);
              this.syncState();
            } else if (
              [...this.state.players.values()].every(
                (p) => p.connected && p.confirmed,
              )
            ) {
              for (const [id, p] of this.state.players) this.spawnPlayer(id, p);
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
        client.send('command-rejected', {
          protocolVersion: PROTOCOL_VERSION,
          sequence: input.sequence,
          reason: 'Nguyên liệu cá nhân không thể bán hoặc thả.',
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
        client.send('command-rejected', {
          protocolVersion: PROTOCOL_VERSION,
          sequence: input.sequence,
          reason:
            'Nguyên liệu cá nhân được cấp tự động, không cần nhận hoặc quay thưởng.',
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
        if (this.creepPreview)
          return reject(
            'Phòng preview dùng bộ chọn creep ngay trong sân test.',
          );
        if (!this.state.players.get(client.sessionId)?.confirmed)
          return reject('Hãy chọn và xác nhận môn phái trước khi chơi.');
        if (
          input.sequence <= (this.dungeonSequences.get(client.sessionId) ?? 0)
        )
          return;
        this.dungeonSequences.set(client.sessionId, input.sequence);
        if (this.simulation.zoneOf(client.sessionId)?.access === 'duel')
          return reject('Hãy rời Lôi Đài trước khi mở phó bản.');
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
      const receivedAt = this.collectInputTiming ? performance.now() : 0;
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
        (!this.legacySkills ||
          !m1Config.progression?.schools[
            this.simulation.hero(client.sessionId)?.schoolId ?? ''
          ]?.basicIds.includes(input.id))
      ) {
        client.send('command-rejected', {
          protocolVersion: PROTOCOL_VERSION,
          sequence: input.sequence,
          reason: 'Đòn đánh đã được khóa theo nhánh khi vào trận.',
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
            ? 'Kỹ năng chưa trang bị hoặc chưa học. Dùng dấu cộng trên thanh kỹ năng để học.'
            : 'Ô này chưa được trang bị.',
        });
        return;
      }
      if (this.devSkillLoadout) {
        const h = this.simulation.hero(client.sessionId)!,
          zone = this.simulation.zoneOf(client.sessionId)!;
        if (
          ['dev-loadout', 'select-basic'].includes(input.kind) &&
          zone.access !== 'arena'
        ) {
          client.send('command-rejected', {
            protocolVersion: PROTOCOL_VERSION,
            sequence: input.sequence,
            reason: 'Chỉ đổi bộ thử nghiệm tại đấu trường.',
          });
          return;
        }
        if (zone.access !== 'duel') resetSkillReviewResources(h, zone.world);
        if (
          zone.access === 'arena' &&
          applySkillReviewLoadout(
            zone.world,
            h,
            zone.config,
            input.sequence,
            input,
          )
        ) {
          this.syncState();
          return;
        }
      }
      let command = input;
      if (
        (input.kind === 'basic' || input.kind === 'move-to') &&
        input.targetId
      ) {
        const zone = this.simulation.zoneOf(client.sessionId);
        const prefix = zone ? this.entityKey(zone, '') : '';
        if (prefix && input.targetId.startsWith(prefix))
          command = { ...input, targetId: input.targetId.slice(prefix.length) };
      }
      const reason = this.simulation.input(
        client.sessionId,
        input.sequence,
        command,
      );
      if (
        !reason &&
        this.collectInputTiming &&
        (input.kind === 'move' || input.kind === 'basic')
      ) {
        const samples = this.inputTiming.get(client.sessionId) ?? [];
        if (samples.length < 16)
          samples.push({ sequence: input.sequence, receivedAt });
        this.inputTiming.set(client.sessionId, samples);
      }
      if (reason)
        client.send('command-rejected', {
          protocolVersion: PROTOCOL_VERSION,
          sequence: input.sequence,
          reason,
        });
    }),
  };
  override onCreate(
    options: { portalCount?: unknown; creepPreview?: unknown } = {},
  ): void {
    if (
      options.creepPreview !== undefined &&
      typeof options.creepPreview !== 'boolean'
    )
      throw new ServerError(400, 'Chế độ preview không hợp lệ.');
    if (options.creepPreview) {
      if (!this.devCreepTest)
        throw new ServerError(
          403,
          'Bật VOLAM_DEV_CREEP_TEST=1 trên server development để preview creep.',
        );
      this.creepPreview = new CreepPreviewSession(this.simulation);
    }
    const portals = portalCountSchema.safeParse(
      options.portalCount ?? (this.simulation.base.campaign ? 4 : 2),
    );
    if (!portals.success)
      throw new ServerError(400, 'Số cổng phải là 1, 2, 3 hoặc 4.');
    this.simulation.invasion!.definition.portalCount = portals.data;
    this.state.defense.portalCount = portals.data;
    this.state.defense.devCreepTest = this.devCreepTest;
    if (this.devLoiDai)
      console.info('[DEV] Lôi Đài: người chơi bắt đầu ở cấp 6.');
    if (this.devCreepTest) {
      if (this.waveBossTestOptions)
        throw new ServerError(400, 'Chỉ bật một chế độ test creep hoặc boss.');
      this.world.statue!.invulnerable = true;
      console.info(
        '[DEV] VOLAM_DEV_CREEP_TEST=1: all 20 creep waves, 20s interval / 12s streams, invulnerable heroes/statue, chapter bosses disabled.',
      );
    }
    if (this.waveBossTestOptions)
      console.info(
        '[DEV] VOLAM_DEV_WAVE_BOSSES=1: four live wave bosses, god mode, run x3, valid boss hits -5% max HP. New rooms only.',
      );
    // Historical combat targets are explicit development fixtures, never match spawns.
    if (!(
      process.env['NODE_ENV'] !== 'production' &&
      process.env['VOLAM_DEV_PRACTICE_CREEPS'] === '1'
    ))
      this.world.creeps.clear();
    else if (process.env['VOLAM_DEV_DUONG_MON'] === '1') {
      for (const creep of this.world.creeps.values()) {
        creep.archetypeId = 'duong_mon_practice_dummy';
        creep.stats = {
          ...this.simulation.base.creep,
          damage: 0,
          speed: 0,
          xp: 0,
          gold: 0,
        };
        creep.hp = creep.maxHp = 1200;
        creep.neverRespawn = true;
      }
    }
    this.state.devSkillLoadout = this.devSkillLoadout;
    this.state.requiresBranch = !this.legacySkills && !this.legacyProgression;
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
      if (this.devTayDoc && this.simulation.tayDoc?.phase === 'waiting')
        this.simulation.tayDoc.spawn(this.world, this.simulation.arena.config);
      this.creepPreview?.beforeStep();
      this.simulation.step(Date.now());
      if (this.inputTiming.size) {
        const steppedAt = performance.now();
        for (const samples of this.inputTiming.values())
          for (const sample of samples)
            if (sample.steppedAt === undefined) {
              sample.steppedAt = steppedAt;
              sample.tick = this.simulation.tick;
            }
      }
      if (this.devSkillLoadout)
        for (const id of this.simulation.membership.keys()) {
          const h = this.simulation.hero(id);
          if (h && this.simulation.zoneOf(id)?.access !== 'duel')
            resetSkillReviewResources(h, this.simulation.zoneOf(id)?.world);
        }
      if (this.simulation.invasion?.defeated || this.simulation.victory) {
        this.state.phase = this.simulation.victory ? 'VICTORY' : 'DEFEAT';
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
              event.sourceId.startsWith('hl_minion_') ||
              event.sourceId.startsWith(nguDocSummonPrefix)
                ? this.entityKey(zone, event.sourceId)
                : event.sourceId,
            targetId:
              zone.world.creeps.has(event.targetId) ||
              event.targetId.startsWith('hl_minion_') ||
              event.targetId.startsWith(nguDocSummonPrefix)
                ? this.entityKey(zone, event.targetId)
                : event.targetId,
            protocolVersion: PROTOCOL_VERSION,
          },
          {
            afterNextPatch: true,
            except: this.clients.filter(
              (client) =>
                this.simulation.zoneOf(client.sessionId)?.id !== zoneId ||
                (event.abilityId === duongMon.trap &&
                  event.kind === 'cast' &&
                  client.sessionId !== event.sourceId),
            ),
          },
        );
      }
    }, m1Config.tickRate);
  }
  override onBeforePatch(): void {
    if (!this.inputTiming.size) return;
    const patchAt = performance.now();
    for (const client of this.clients) {
      const samples = this.inputTiming.get(client.sessionId);
      if (!samples) continue;
      const pending = [];
      for (const { sequence, receivedAt, steppedAt, tick } of samples) {
        if (steppedAt === undefined || tick === undefined) {
          pending.push({ sequence, receivedAt });
          continue;
        }
        client.send(
          'input-timing',
          {
            sequence,
            tick,
            inputToStepMs: steppedAt - receivedAt,
            stepToPatchMs: patchAt - steppedAt,
          },
          { afterNextPatch: true },
        );
      }
      if (pending.length) this.inputTiming.set(client.sessionId, pending);
      else this.inputTiming.delete(client.sessionId);
    }
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
    this.inputTiming.delete(client.sessionId);
    const player = this.state.players.get(client.sessionId);
    if (player) player.connected = false;
    this.simulation.disconnect(client.sessionId);
    this.syncState();
    // A drop before the join handshake completes can reject before reserving a seat.
    // Colyseus calls onLeave when a reconnection cannot be made.
    void this.allowReconnection(client, 30).catch(() => undefined);
  }
  override onReconnect(client: MatchClient): void {
    const player = this.state.players.get(client.sessionId);
    if (player) player.connected = true;
    client.view = new StateView();
    this.simulation.reconnect(client.sessionId);
    this.syncState();
  }
  override onLeave(client: MatchClient): void {
    this.inputTiming.delete(client.sessionId);
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
  override onDispose(): void {
    this.world.bacCai?.clear(this.world);
    this.world.vuong?.clear(this.world);
    this.simulation.tayDoc?.dispose(this.world);
  }
  private syncState(): void {
    let tayDoc = this.state.tayDoc.get('arena');
    if (!tayDoc) {
      tayDoc = new TayDocState();
      this.state.tayDoc.set('arena', tayDoc);
    }
    tayDoc.json = JSON.stringify(
      this.simulation.tayDoc?.view(this.world) ?? null,
    );
    const bacCai = this.world.bacCai;
    if (bacCai && this.world.creeps.has(bacCai.bossId)) {
      let projection = this.state.bacCai.get('arena');
      if (!projection) {
        projection = new BacCaiState();
        this.state.bacCai.set('arena', projection);
      }
      projection.snapshot = JSON.stringify(
        bacCai.view(this.world, this.simulation.arena.config),
      );
    }
    if (!bacCai || !this.world.creeps.has(bacCai.bossId)) {
      const projection = this.state.bacCai.get('arena');
      if (projection) {
        for (const client of this.clients) client.view?.remove(projection);
        this.state.bacCai.delete('arena');
      }
    }
    const vuong = this.world.vuong;
    let final = this.state.vuong.get('arena');
    if (vuong && this.world.creeps.has(vuong.bossId)) {
      if (!final) {
        final = new VuongState();
        this.state.vuong.set('arena', final);
      }
      final.snapshot = JSON.stringify(
        vuong.view(this.world, this.simulation.arena.config),
      );
    } else if (final) {
      for (const client of this.clients) client.view?.remove(final);
      this.state.vuong.delete('arena');
    }
    this.state.tick = this.world.tick;
    this.state.loiDaiTick = this.simulation.duel.zone.world.tick;
    this.state.loiDaiGateTicks = Math.max(
      0,
      this.simulation.duel.gateAt - this.simulation.tick,
    );
    this.state.loiDaiFighters = this.simulation.duel.fighters.size;
    this.state.matchElapsedMs = (this.world.tick * 1000) / m1Config.tickRate;
    this.state.defense.creepPreview = this.creepPreview
      ? JSON.stringify(this.creepPreview.view)
      : '';
    const invasion = this.simulation.invasion,
      defense = this.state.defense,
      statue = this.world.statue;
    defense.waveArena = JSON.stringify(this.simulation.waveArenaView() ?? null);
    defense.dongTa = this.simulation.dongTa
      ? JSON.stringify({
          ...this.simulation.dongTa.view(this.world),
          effects: [],
        })
      : '';
    if (invasion && statue) {
      defense.paused = this.simulation.arenaPaused;
      defense.devWaveBosses = !!this.world.waveBossTest;
      defense.devFinalBoss =
        !!this.world.waveBossTest && !!this.simulation.mainBosses?.final;
      defense.devWaveBossStage = this.world.waveBossTest?.stage ?? '';
      defense.namDe = JSON.stringify(namDeView(this.world));
      defense.enabled = true;
      defense.statueHp = statue.hp;
      defense.statueMaxHp = statue.maxHp;
      defense.x = statue.x;
      defense.y = statue.y;
      defense.wave = invasion.wave;
      defense.nextWaveTick = invasion.nextWaveTick;
      defense.intervalTicks = invasion.definition.intervalTicks;
      defense.streamUntilTick = invasion.streamUntilTick;
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
        target.loiDaiFighter = false;
        continue;
      }
      target.bossSpectator = !!hero.bossSpectator;
      target.actionUntil = hero.actionUntil;
      target.actionStartedAt = hero.actionStartedAt ?? 0;
      target.basicStage = hero.basicStage ?? '';
      target.inventory.tamLienReadyTicks = Math.max(
        0,
        (hero.tamLien?.readyUntil ?? 0) - zone.world.tick,
      );
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
      target.loiDaiFighter = this.simulation.duel.fighters.has(id);
      target.combos = JSON.stringify(
        (zone.world.combos ?? [])
          .filter(
            (c) =>
              c.sourceId === id &&
              c.until > zone.world.tick &&
              ((
                zone.world.creeps.get(c.targetId) ??
                zone.world.heroes.get(c.targetId)
              )?.hp ?? 0) > 0,
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
        (this.simulation.duel.respawns.get(id) ?? 0) - this.simulation.tick,
        (this.simulation.respawns.get(id) ?? 0) - this.simulation.tick,
        this.simulation.base.campaign
          ? (this.simulation.bossRetries.view(id).retry?.revivalTicks ?? 0)
          : 0,
      );
      target.mana = hero.mana;
      target.maxMana = hero.maxMana;
      target.xp = hero.xp;
      target.inventory.campaign = this.simulation.base.campaign
        ? JSON.stringify(this.simulation.bossRetries.view(id))
        : '';
      target.gold = hero.gold;
      target.inventory.revision = hero.inventory?.revision ?? 0;
      target.inventory.potionCooldownTicks = Math.max(
        0,
        (hero.inventory?.potionReadyAt ?? 0) - this.simulation.tick,
      );
      target.inventory.auxiliaryCooldownTicks = Math.max(
        0,
        (hero.inventory?.auxiliaryReadyAt ?? 0) - zone.world.tick,
      );
      for (const slot of ['weapon', 'armor', 'hat', 'boots'] as const) {
        target.inventory.levels.set(slot, hero.inventory?.levels[slot] ?? 0);
        target.inventory.materials.set(
          slot,
          hero.inventory?.materials?.[slot] ?? 0,
        );
        target.inventory.crafted.set(
          slot,
          hero.inventory?.crafted?.[slot] ?? '',
        );
      }
      for (const potion of Object.keys(m1Config.economy!.potions))
        target.inventory.potions.set(
          potion,
          hero.inventory?.potions[potion as PotionId] ?? 0,
        );
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
        const ranks =
          hero.progression.mode === 'fixed'
            ? Object.fromEntries(
                hero.progression.defaultSkills.map((id) => [
                  id,
                  skillRank(hero, id, m1Config),
                ]),
              )
            : hero.progression.ranks;
        for (const key of target.build.ranks.keys())
          if (!Object.hasOwn(ranks, key)) target.build.ranks.delete(key);
        for (const [key, rank] of Object.entries(ranks))
          target.build.ranks.set(key, rank);
      }
      target.basicId = hero.basicId;
      const chargedSkills = new Set<string>();
      const syncCharges = (
        ability: NonNullable<ReturnType<typeof equippedAbility>>,
      ) => {
        const charges = skillCharges(hero, ability, zone.world.tick);
        if (!charges) return;
        chargedSkills.add(ability.id);
        let view = target.build.charges.get(ability.id);
        if (!view) {
          view = new SkillChargeState();
          target.build.charges.set(ability.id, view);
        }
        view.count = charges.count;
        view.capacity = charges.capacity;
        view.rechargeTicks = charges.rechargeTicks;
      };
      for (let slot = 0; slot < 5; slot++) {
        const ability = equippedAbility(hero, slot, zone.config);
        if (ability) syncCharges(ability);
      }
      const plant = zone.config.skillCatalogue?.[conLuan.plant];
      if (hero.basicId === conLuan.sword && plant) syncCharges(plant);
      for (const id of target.build.charges.keys())
        if (!chargedSkills.has(id)) target.build.charges.delete(id);
      target.lastSequence = hero.lastSequence;
      const showBasicRecovery =
        zone.config.basics[hero.basicId]?.basicComboEndRecoveryTicks ===
          undefined ||
        hero.pose !== 'basic_attack' ||
        zone.world.tick >= hero.actionUntil;
      const conLuanMelee =
        hero.basicId === conLuan.monk &&
        !(hero.statuses ?? []).some(
          (status) =>
            status.kind === 'con_luan_ranged' && status.until > zone.world.tick,
        );
      target.basicCooldown =
        showBasicRecovery && !conLuanMelee
          ? Math.max(0, hero.cooldown - zone.world.tick)
          : 0;
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
      target.tCooldown = Math.max(
        0,
        (hero.skillCooldowns[4] ?? 0) - zone.world.tick,
      );
      const ids = hero.skillIds ?? m1Config.skills.map((s) => s.id);
      target.qSkill = ids[0] ?? '';
      target.wSkill = ids[1] ?? '';
      target.eSkill = ids[2] ?? '';
      target.rSkill = ids[3] ?? '';
      target.tSkill = ids[4] ?? '';
    }
    const creepKeys = new Set<string>(),
      shotKeys = new Set<string>(),
      areaKeys = new Set<string>(),
      bossEffectKeys = new Set<string>();
    for (const zone of this.simulation.zones.values()) {
      if (zone.access === 'arena' && this.simulation.duelPausesArena) continue;
      if (zone.access === 'shared' || zone.access === 'private') {
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
        // The public encounter projection anonymizes all eight forms and never leaks the real actor coordinate.
        if (
          zone.access === 'arena' &&
          (isBacCaiActor(localId) || localId === this.world.vuong?.bossId)
        )
          continue;
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
        target.ownerId = '';
        target.lane = enemy.invasion?.lane ?? '';
        target.targetId = enemy.invasion?.targetId ?? enemy.aggroTargetId ?? '';
      }
      for (const minion of nguDocSummons(zone.world)) {
        if (minion.hp <= 0) continue;
        // A summon has a world-independent identity. Only the owner's zone sees it.
        creepKeys.add(minion.id);
        let target = this.state.creeps.get(minion.id);
        if (!target) {
          target = new CreepState();
          this.state.creeps.set(minion.id, target);
        }
        this.syncActor(target, minion, zone.world.tick);
        target.ownerId = minion.ownerId;
        target.archetypeId = 'ngu_doc_' + minion.kind;
        target.zoneId = zone.id;
        target.actionEndsAt = minion.actionUntil;
        target.actionStartedAt =
          minion.actionUntil -
          (minion.castAbilityId === nguDoc.reaperSlam ? 18 : 12);
      }
      for (const effect of [
        ...(zone.world.creepCombat?.effects.values() ?? []),
        ...(zone.encounter?.effects.values() ?? []),
        ...(zone.kim?.effects.values() ?? []),
        ...(zone.access === 'arena'
          ? (this.simulation.dongTa?.effects.map((e) => ({
              ...e,
              castId: e.id,
              damageUntil: e.expiresAt,
            })) ?? [])
          : []),
        ...[...(zone.world.namDe?.effects.values() ?? [])].filter(
          (e) => e.startedAt <= zone.world.tick,
        ),
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
        target.originX = 'origin' in effect ? effect.origin.x : 0;
        target.originY = 'origin' in effect ? effect.origin.y : 0;
        target.targetId = 'targetId' in effect ? effect.targetId : '';
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
          launchX: area.launch?.x ?? 0,
          launchY: area.launch?.y ?? 0,
          launchFx: area.launch?.fx ?? 0,
          launchFy: area.launch?.fy ?? 0,
          x: area.x,
          y: area.y,
          radius: area.effect.radius,
          radiusY: area.effect.radiusY ?? area.effect.radius,
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
    const controls = this.world.vuong?.controls.size
      ? this.world.vuong.controls
      : this.world.namDe?.controls;
    for (const [id, entry] of this.state.namDeControls)
      if (!controls?.has(id)) {
        for (const client of this.clients)
          if (client.view?.has(entry)) client.view.remove(entry);
        this.state.namDeControls.delete(id);
      }
    for (const [id, control] of controls ?? []) {
      let entry = this.state.namDeControls.get(id);
      if (!entry) {
        entry = new NamDeControlState();
        entry.heroId = id;
        this.state.namDeControls.set(id, entry);
      }
      entry.payload = JSON.stringify(control);
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
      for (const entity of this.state.tayDoc.values()) {
        if (zoneId === 'arena' && !view.has(entity)) view.add(entity);
        else if (zoneId !== 'arena' && view.has(entity)) view.remove(entity);
      }
      for (const projection of this.state.bacCai.values()) {
        if (zoneId === 'arena' && !view.has(projection)) view.add(projection);
        else if (zoneId !== 'arena' && view.has(projection))
          view.remove(projection);
      }
      for (const projection of this.state.vuong.values()) {
        if (zoneId === 'arena' && !view.has(projection)) view.add(projection);
        else if (zoneId !== 'arena' && view.has(projection))
          view.remove(projection);
      }
      for (const player of this.state.players.values()) {
        const visible =
          this.state.phase === 'WAITING_LOBBY' ||
          this.state.phase === 'SCHOOL_SELECTION' ||
          player.zoneId === zoneId;
        if (visible && !view.has(player)) view.add(player);
        else if (!visible && view.has(player)) view.remove(player);
      }
      for (const entry of this.state.namDeControls.values()) {
        const visible = zoneId === 'arena' && entry.heroId === client.sessionId;
        if (visible && !view.has(entry)) view.add(entry);
        else if (!visible && view.has(entry)) view.remove(entry);
      }
      for (const entity of [
        ...this.state.creeps.values(),
        ...this.state.projectiles.values(),
        ...this.state.areas.values(),
        ...this.state.bossEffects.values(),
      ]) {
        const visible =
          entity.zoneId === zoneId &&
          (!('abilityId' in entity) ||
            entity.abilityId !== duongMon.trap ||
            !('ownerId' in entity) ||
            entity.ownerId === client.sessionId);
        if (visible && !view.has(entity)) view.add(entity);
        else if (!visible && view.has(entity)) view.remove(entity);
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
    return zone.access === 'arena' || id.startsWith(nguDocSummonPrefix)
      ? id
      : `${zone.id}:${id}`;
  }
}
