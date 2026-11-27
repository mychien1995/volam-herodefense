import type { CampaignDefinition } from '@volam/game-core';

/** Research hypotheses only. Nothing imports these profiles into production. */
export const campaignXpProfiles = {
  baseline: {
    invasionXp: [100, 300, 450, 650, 650],
    bossXp: {} as Record<string, number>,
  },
  wave_frontload: {
    invasionXp: [100, 450, 750, 750, 750],
    bossXp: {} as Record<string, number>,
  },
  wave_only: {
    invasionXp: [100, 400, 650, 850, 850],
    bossXp: {} as Record<string, number>,
  },
  wave_shift: {
    invasionXp: [100, 400, 650, 850, 850],
    bossXp: { bac_cai: 1000, kim_luan_phap_vuong: 1200 } as Record<
      string,
      number
    >,
  },
  boss_shift: {
    invasionXp: [100, 300, 450, 650, 650],
    bossXp: {
      dong_ta: 600,
      boss_ly_mac_sau: 450,
      tay_doc_boss: 700,
      hong_liet_boss: 900,
      boss_nam_de: 1000,
      chu_ba_thong: 900,
      bac_cai: 1000,
      kim_luan_phap_vuong: 1200,
    } as Record<string, number>,
  },
};
export type CampaignXpProfile = keyof typeof campaignXpProfiles;

/** Clone first; the source campaign, all gold, thresholds and mechanics remain unchanged. */
export function withCampaignXpProfile(
  base: CampaignDefinition,
  name: CampaignXpProfile,
): CampaignDefinition {
  if (!Object.hasOwn(campaignXpProfiles, name))
    throw Error('Unknown XP trial profile: ' + name);
  const profile = campaignXpProfiles[name];
  const candidate = structuredClone(base);
  candidate.invasionXp = [...profile.invasionXp];
  for (const [id, xp] of Object.entries(profile.bossXp)) {
    if (!candidate.bosses[id]) throw Error('Unknown campaign boss: ' + id);
    candidate.bosses[id]!.xp = xp;
  }
  return candidate;
}

/** Strip only the XP fields allowed by this trial; compare everything else byte-for-byte. */
export function withoutTrialXpFields(campaign: CampaignDefinition) {
  return {
    ...campaign,
    invasionXp: [],
    bosses: Object.fromEntries(
      Object.entries(campaign.bosses).map(([id, boss]) => [
        id,
        { ...boss, xp: 0 },
      ]),
    ),
  };
}
