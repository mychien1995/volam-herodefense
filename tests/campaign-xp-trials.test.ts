import { describe, expect, it } from 'vitest';
import { campaignDefinition, campaignSchema, m1Config } from '@volam/game-data';
import { addHero, createWorld, type Creep } from '@volam/game-core';
import { awardCampaignBoss } from '../packages/game-core/src/campaign.js';
import {
  campaignXpProfiles,
  withCampaignXpProfile,
  withoutTrialXpFields,
  type CampaignXpProfile,
} from '../tools/campaign-xp-profiles.js';

describe('research-only chapter XP trials', () => {
  for (const name of Object.keys(campaignXpProfiles) as CampaignXpProfile[]) {
    it(`${name} changes only the authored XP fields and never mutates production data`, () => {
      const before = structuredClone(campaignDefinition);
      const trial = withCampaignXpProfile(campaignDefinition, name);
      expect(campaignSchema.safeParse(trial).success).toBe(true);
      expect(withoutTrialXpFields(trial)).toEqual(withoutTrialXpFields(before));
      expect(trial.dungeonXp).toEqual(before.dungeonXp);
      expect(trial.xpThresholds).toEqual(before.xpThresholds);
      expect(campaignDefinition).toEqual(before);
    });
  }
  for (const players of [1, 6])
    it(`settles trial first-clear XP once while preserving gold at P${players}`, () => {
      const c = {
        ...structuredClone(m1Config),
        campaign: withCampaignXpProfile(campaignDefinition, 'boss_shift'),
        creepSpawns: [],
      };
      const w = createWorld(c, 42);
      const heroes = Array.from({ length: players }, (_, i) =>
        addHero(w, 'p' + i, 'P', c),
      );
      const boss = {
        id: 'dong_ta',
        damagedBy: new Set(heroes.map((h) => h.id)),
        campaignPlayers: players,
      } as Creep;
      expect(awardCampaignBoss(w, c, boss)).toBe(true);
      for (const h of heroes) {
        expect(h.xp).toBe(600);
        expect(h.gold).toBe(180);
      }
      awardCampaignBoss(w, c, boss);
      for (const h of heroes) {
        expect(h.xp).toBe(600);
        expect(h.gold).toBe(180);
      }
    });
});
