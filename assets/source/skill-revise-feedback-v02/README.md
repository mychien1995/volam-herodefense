# Skill revise feedback v02

Director's 2026-11-23 motion corrections, branch `wip/m3d/skill-revise`. New output remains candidate; accepted v01 actions and original/concept bytes are retained. Normal game source/loaders/combat are unchanged.

## Authored corrections

Built-in `image_gen` produced eight hammer-facing sheets, two targeted repair sheets, and two wind-option sheets. [Prompts](prompts) preserve the exact requests. [Hammer jobs](generated-jobs.json), [wind jobs](generated-wind-jobs.json), [repair jobs](generated-repair-jobs.json) identify generated originals copied into this workspace; the right-facing pilot is `raw/hammer/right.png`. The original takes remain alongside the repairs. No unreported model/cost is inferred.

Effective exported art: 192 hammer A cels (8 directions × 4 strikes × 6 phases), 32 wave cels and 32 crescent cels, total 256. All four strikes use two hands. Sweep gains six physical phases; slam turns wrists inward before raising/striking. Direction sheets use a common neutral body scale for all four strikes; no runtime size compensation or per-pose enlargement. Retained idle/support, four-cardinal hammer trails and other school bodies remain separate existing art. No new Chaos-state replacement is claimed.

The first right-facing slice was rendered at scale 0.5 and camera zoom 1 before expansion. [Pilot observations](../../../docs/evidence/skill-revise-feedback-v02/pilot/observations.json). The first comparison probe referenced unavailable `Phaser.GAMES` and failed; the corrected probe observes the actual public preview API and renders equivalent states. One original down-left source hit the strict source-clipping guard; its original remains and a separately generated repair is selected. Back-right source rotation was also repaired. [Registration](registration.json) records roots/density; source inspection remains distinct from final director approval.

## Preview-only composition corrections

- Both wind options share a faster 280 ms pull and wider staged target spread; the second beat follows retreat. Those values are art timing proposals, not new combat balance.
- Huyền Âm produces five seeded, changing ink positions around the target. Server RNG/hits/CC remain pending.
- Airborne A uses retained `assets/reviews/duong-mon-vfx-v2/art/vfx.png`, frame `feather`, scale 0.55, matching `apps/game-client/src/duong-mon-art.ts`, repeated along three cone rays.
- Airborne Q bomb scale is 0.175, exactly half the previous 0.35. Blast size is retained.
- Kiếm Tôn A and Lôi Đình Chấn Vực have no new motion selection. Original runtime A/E remain untouched.
- Fire dash, seven swords, laser dash, three-stage fan and eight-way darts retain the accepted choreography.

## Rebuild and verify

```powershell
python -X utf8 assets/source/skill-revise-feedback-v02/build.py
& assets/source/skill-revise-feedback-v02/native-export.ps1
node tools/verify-skill-revise-end-to-end.mjs
```

[Export catalogue](../../exports/skill-revise-feedback-v02/catalogue.json), [native/PNG validation](validation.json), [live playback observations](../../../docs/evidence/skill-revise-feedback-v02/playback.json). Native `.aseprite` files and roundtrip PNGs are in `native/`. The old 872-cel component bundle and its reports remain unchanged. No video or GIF was generated.

Final verification: `pnpm check:final tests/e2e/skill-revise-end-to-end.spec.ts` PASS (626.48 seconds); [current stage logs](../../../docs/evidence/skill-revise-feedback-v02/final/check-workflow/final-timings.json). Native 256-frame roundtrip and 17 selections/24 continuous takes passed. Corrections and both wind alternatives still await director review.
