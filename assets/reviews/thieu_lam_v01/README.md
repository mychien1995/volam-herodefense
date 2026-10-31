# Thiếu Lâm v01 Phaser art review

**FINAL RUNTIME CHARACTER ART APPROVED on2026-10-31.** The user explicitly said "all approved, has sprites been created for this ?" after the actual Phaser result. [Approved-byte lock](../../approved_thieu_lam.lock.json) protects89 exact concept/source/export files. Pre-approval PNGs/JSON reports are preserved in pre_approval/; approval-label checks do not regenerate artwork. Concept v02 approval and final runtime approval are separately recorded.

Approved design: [thieu-lam-concept-v02.png](../../concepts/heroes/thieu-lam/thieu-lam-concept-v02.png). [Production provenance and frame hashes](../../source/characters/thieu_lam_v01/production_manifest_v01.json), [exact generation prompts](../../source/characters/thieu_lam_v01/generation_prompts_v01.json) and [file validator report](../../source/characters/thieu_lam_v01/export_validation_v01.json).

The two sets contain80 distinct transparent frames /24 authored tags: four facings × idle2×350ms, walk4×120ms, basic attack4×75ms. Quyền80×80/feet(40,64); Đao112×80/feet(56,64). Both normalized origins(0.5,0.8), approximately44px bodies and unchanged gameplay camera zoom1/display scale2.

Completed focused checks:

- `python -X utf8 scripts/verify-thieu-lam.py`: PASS, all80 unique PNG frames,24 authored tags, source headers, binary alpha, atlas bounds/no clipping, pivots, durations, individual-frame/atlas equality and all186 existing approved-file hashes.
- `pnpm check:browser --config playwright.thieu-lam.config.ts tests/e2e/thieu-lam-art.spec.ts --grep "both weapon"`: PASS, one actual Chromium/Phaser case. TypeScript compilation and production build passed. All80 frames observed live across24 tags; no page/asset errors. The retained Vite large-chunk warning remains.
- Actual [Phaser gallery PNG](both_weapons_phaser_2x.png) and [sampled frame/timing observations](animation_observations.json) were opened/reviewed. [Unarmed](quyen_atlas_4x.png) and [đao](dao_atlas_4x.png) static enlarged atlas inspections are provided as PNG only.

Final validation: **PASS across the final pipeline and focused failed-case rerun**.174 unit/integration tests in17 files,2 workflow tests, typechecks, build and all6 asset validators passed. All9 unique browser scenarios passed, including both real-match weapon presentations, all4 attack frames per facing/style, the actual monk portrait, shared authority, mixed-school six-player scale, tree occlusion and existing gameplay regressions. The last full final run passed8 browser cases and stopped on a90ms screenshot-facing input fixture; the corrected fixture waits for an actual authoritative step, and its focused rerun passed. No production code changed after that full final run. Exact [final summary](verification_summary_v01.json), [verification history including earlier failures](verification_history_v01.json), [full-run browser report](playwright_final_with_playback_results_v01.json) and [successful focused rerun](playwright_results_v01.json) are retained. No recording, video, GIF or animated evidence generated.

Final commands actually run:

```powershell
pnpm check:final --config playwright.thieu-lam.config.ts tests/e2e/thieu-lam-art.spec.ts tests/e2e/gameplay.spec.ts
pnpm exec tsc -p tsconfig.tools.json --noEmit
pnpm check:browser --config playwright.thieu-lam.config.ts tests/e2e/thieu-lam-art.spec.ts --grep "Đao art-review"
```

Earlier diagnostic runs revealed an obsolete starting-skill fixture, driver sampling starting before key delivery, existing1px rounded world interpolation and a short network pose cutting off a local clip under load. Their reports and corrections are preserved. The monk now reuses the existing local one-shot helper; direct Phaser animation events record complete frame sequences alongside screen samples. No authoritative simulation or attack timing was changed. The existing Vite large-client-chunk warning remains.

Delivery paths:

| Set | Editable source | Runtime PNG | Runtime JSON |
| --- | --- | --- | --- |
| Quyền | [hero_thieu_lam.aseprite](../../source/characters/thieu_lam_v01/hero_thieu_lam.aseprite) | [hero_thieu_lam.png](../../exports/characters/hero_thieu_lam.png) | [hero_thieu_lam.json](../../exports/characters/hero_thieu_lam.json) |
| Đao | [hero_thieu_lam_dao.aseprite](../../source/characters/thieu_lam_v01/hero_thieu_lam_dao.aseprite) | [hero_thieu_lam_dao.png](../../exports/characters/hero_thieu_lam_dao.png) | [hero_thieu_lam_dao.json](../../exports/characters/hero_thieu_lam_dao.json) |

Individual frame directories: `assets/exports/characters/thieu_lam_v01/quyen/frames/` and `assets/exports/characters/thieu_lam_v01/dao/frames/`. Twelve original generated PNGs, source-component masks, measured frame mapping and assembly/export scripts remain available alongside the two editable sources. Aseprite1.3.18.6 was actually used; no recovered semantic costume layers are claimed.

Actual evidence: [Quyền1280×720](quyen_gameplay_1280x720.png), [Đao1280×720](dao_gameplay_1280x720.png), [Quyền1920×1080](quyen_gameplay_1920x1080.png), [Đao1920×1080](dao_gameplay_1920x1080.png), [Quyền logical1×](quyen_logical_1x.png), [Đao logical1×](dao_logical_1x.png), [six-school-scale scene](six_players_1280x720.png), [front of tree](front_of_tree_1280x720.png), [behind tree](behind_tree_1280x720.png), [Quyền observations](quyen_match_observations.json), [Đao observations](dao_match_observations.json), [party observations](six_player_observations.json) and [occlusion observations](occlusion_observations.json). The party contains three monks and one each of the three approved schools; labels are test nicknames. All186 previously approved character files remain hash-identical.

[Static reference/runtime comparison PNG](reference_runtime_comparison.png): top-left actual Phaser gallery, top-right exact approved concept v02, bottom-left actual current Đao match, bottom-right rejected placeholder screenshot. The board is a QA composition of existing pixels, not runtime art. Positive school source is the lower monk in [artwork/thieu-lam-thien-son.png](../../../artwork/thieu-lam-thien-son.png). The actual runtime preserves ochre/brown cloth, bald silhouette, wraps, clear fists, restrained gold and a broad steel blade. It intentionally reduces concept bead/cloth detail into small readable clusters; the negative reference's block hero has been replaced. Existing environment/practice-creep art retains its separate status.

Visual observations: shaved head, warm skin, short ochre/brown robe panels, wraps, visible fists and planted stance distinguish the monk from the approved long-haired schools. New left/right walk passing poses narrow the leg silhouette between contact poses; the corrected left đao contact/follow-through reach screen-left. The broad steel blade remains visible without an energy trail. Source alpha haze is absent in exported frames. Fine beads and fabric trim are intentionally simplified at gameplay scale. The enlarged approved concept remains an identity guide, not a production atlas.

Limitations: four-frame walk cycles are stylized rather than high-frame-count motion. Active-skill/cast art, VFX, icons, authored hurt/death and Thiếu Lâm combat implementation are outside scope. Cast uses attack frames; hurt/death use idle. The debug đao variant changes presentation only; server attack IDs/tuning remain the existing implementation. Director approval at normal zoom is recorded; cast/hurt/death reuse remains outside authored-art approval.


Approval-only verification2026-10-31: all275 approved-file hashes (including89 new Thiếu Lâm files), metadata, preparation and exporter overwrite guard passed. Client/test typechecks and2 focused real-Phaser gallery/approved-portrait cases passed; [approval results](playwright_approval_results_v01.json). No source/export artwork regenerated and no full suite repeated. Pre-approval evidence is preserved in pre_approval/.
