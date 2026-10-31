# Phase 1H — Arena creeps Waves 13–16

Four approved Phase 1G designs are now authored as original transparent animations and bound to the existing Phaser arena renderer. **Final runtime artwork approved by the owner on 2026-10-31: “all approve”.** This delivery stops at Wave 16.

## Production files

| Wave / character | Exact production directory | Approved concept |
| --- | --- | --- |
| 13 — Ma Khuyển | `assets/sprites/creeps/arena/ma-khuyen/` | `assets/concepts/arena-creeps/waves-13-16/ma_khuyen_concept.png` |
| 14 — Tiểu Hỏa Quỷ | `assets/sprites/creeps/arena/tieu-hoa-quy/` | `assets/concepts/arena-creeps/waves-13-16/tieu_hoa_quy_concept.png` |
| 15 — Hỏa Pháp Sư | `assets/sprites/creeps/arena/hoa-phap-su/` | `assets/concepts/arena-creeps/waves-13-16/hoa_phap_su_concept.png` |
| 16 — Ngưu Ma | `assets/sprites/creeps/arena/nguu-ma/` | `assets/concepts/arena-creeps/waves-13-16/nguu_ma_concept.png` |

Each directory contains `spritesheet.png`, `atlas.json`, `manifest.json`, 64 individual `frames/*.png`, retained generated directional source PNGs, an editable `source/creep_*.aseprite` and extraction audit. All four views are separately authored. Every facing has idle 2, movement 4, attack 4, hurt 2 and death 4 distinct drawings: **256 character frames, 80 animation tags** total. This is not a repeated static-image atlas.

The batch provenance, exact image-generation requests/reference paths, extraction config, builder scripts and protected-input lock are under `assets/sprites/creeps/arena/waves-13-16-production/`. Its `effects/` directory contains **28 distinct transparent frames / seven animation tags**, one editable Aseprite source and PNG/JSON atlas: four contact effects, hound embers and two projectile loops. Runtime preparation copies the retained exports into `apps/game-client/public/assets/arena_creeps/`; `assets/arena_creeps.manifest.json` records exact concepts, source manifests and SHA-256 hashes.

Existing Waves 1–12 remain in `sprites/creeps/arena/`. No earlier approved artwork was relocated or replaced. The preferred `assets/sprites/creeps/arena/` convention is used for this new batch.

## Visual fidelity and scale

The mandatory actual concepts for Waves 1–16, earlier creep production images and Cái Bang were inspected and used as direct image-generation references. Generated directional sources were visually reviewed before Aseprite extraction. All four exported character atlases and the FX atlas were opened. The individual concept → production → actual arena PNGs were also opened and compared.

- Ma Khuyển retains the low quadruped posture, charcoal/crimson mane, bright eyes, fangs, large foreclaws, orange back seams and fiery paws. Its 34px body is a heavier supernatural relative of Wave 1's 27px wild dog.
- Tiểu Hỏa Quỷ retains orange skin, two dark horns, pointed ears/tail, purple wrap and burning hands. At 32px it stays smaller than the approximately 44px hero.
- Hỏa Pháp Sư retains the dark-purple/crimson hooded full robe, orange eyes/sigils, bronze clasp and a single right-hand staff with pointed orange crystal/bronze cradle. Body height is 48px, excluding the staff. This hooded full-robe caster remains distinct from the bald, bead-wearing Wave 6 monk.
- Ngưu Ma retains the bull head, two ivory curved horns, maroon muscular body, bronze/black armor, split crimson waistcloth, hooves and single crescent axe. Its 66px body is comparable to the Wave 12 golem while its silhouette remains distinct.

The camera is the existing fixed elevated orthographic view. Runtime sprites use native scale 1, fixed normalized foot pivots, nearest filtering and existing Y-depth. Large transparent margins accommodate fallen poses and weapon arcs without enlarging gameplay collision/range. Fixed source-level nearest scaling prevents pose-by-pose fit jitter. The cultist uses hood/body measurements that exclude its tall staff; the brute's contact anchor uses hooves rather than the lowered axe tip.

Two original right-facing cultist poses contained an extra staff and were rejected. A corrected eight-pose source replaces the entire right attack/death group. The original sources and rejected indices remain recorded; the selected atlas uses the single-staff set.

Fine embroidery, rivets and small flame branches simplify at the final 32–66px body sizes. This is disclosed for director review rather than a claim of pixel-identical reproduction of a large concept board.

## Integration and gameplay boundary

- `scripts/prepare-arena-creeps.mjs`: extends the existing copied atlas pack/mappings through Wave 16, adds exact source folders and the separate demon FX pack.
- `apps/game-client/src/arena-creeps.ts`: typed optional projectile/ambient presentation metadata. The existing per-instance one-shot/death playback controller remains in use.
- `apps/game-client/src/art.ts`: registers effect textures, frame validation, nearest filtering and authored repeat settings through the existing registry.
- `apps/game-client/src/arena-creep-effects.ts`: renders confirmed-hit effects, one bounded walking ember sprite per hound, and projectiles solely from authoritative projectile state; removes effects when complete/absent or when leaving the arena/session.
- `apps/game-client/src/arena-scene.ts`: small lifecycle/event/sync additions to that presentation class. Existing renderer, movement interpolation, facing, depth and synchronization remain in place.
- `tests/arena-creep-presentation.test.ts`: updates mapping/manifest coverage through 16 and preserves playback regression scenarios.
- `tools/verify-arena-creeps-13-16.py`, `tools/verify-arena-creeps-13-16.mjs`, `tools/compare-arena-creeps-13-16.mjs`, `playwright.arena-creeps.config.ts`, `tests/e2e/arena-creeps-13-16.spec.ts`: scoped validation and PNG comparison tooling.

**The current server invasion recipes remain melee.** Imp/cultist casting poses present existing `creep_strike` actions. Their projectile art is registered and can follow an existing server-owned projectile, but normal enemy AI does not currently emit those shots. The projectile screenshot uses an explicitly labeled server-only zero-damage fixture. No new ranged AI, charge, burn, area damage or shockwave mechanic was implemented. Brute ground impact is a small contact dust/stone fan triggered by confirmed hits, not a new area attack. Hound fire is presentation only.

No server/core, balance, wave scheduling, collision/range, HUD, map or dungeon implementation was authored by this phase. Concurrent sessions' unrelated uncommitted work was preserved.

## Measured validation

Completed during iteration:

- `python -u assets/sprites/creeps/arena/waves-13-16-production/build_sprites.py`: PASS; 256 distinct frames, 80 tags and 1,145 protected input hashes.
- `python -u assets/sprites/creeps/arena/waves-13-16-production/build_effects.py`: PASS; 28 distinct FX frames / seven tags.
- `python -X utf8 tools/verify-arena-creeps-13-16.py`: PASS; exact individual/atlas pixels, binary alpha, nonempty safe bounds, distinct drawings, durations, editable source headers/frame counts, exact concept hashes, runtime copies and all 1,145 protected files.
- `pnpm check:quick tests/arena-creep-presentation.test.ts`: PASS, five tests.
- `pnpm exec tsc -b apps/game-client`: PASS.
- Scoped six-client combat diagnostic: PASS, all 16 textures, actual attacks/hurt/death/rewards, independent actors, real ArrowRight/A input, synchronized HP and all 28 FX frames; unchanged source stats and invasion definition. Earlier projectile-position assertion sampled presentation and snapshot in separate browser calls; it was corrected to an atomic observation. Historical failure evidence is retained and is not final-pass evidence.

Final command: **`pnpm check:final --config playwright.arena-creeps.config.ts` — PASS in 191.31s.** Asset preparation, project/tool typechecks, two workflow regression tests, all **174 unit/integration tests across 17 files**, production build and all eight currently configured asset validators passed. The one scoped browser test passed in 2.4 minutes (147.38s browser stage). The build retains the existing large-client-chunk warning; no missing-texture or browser console errors occurred in the arena run.

The final isolated MatchRoom run used six real Chromium contexts on dedicated local ports. It triggered the unchanged director in a test-only server fixture to obtain genuine stock-stat spawns from Waves 1–16. Normal production 180-second scheduling and recipe values were not edited. Existing stun/action state held poses only during deterministic frame coverage; natural combat removed the pose fixture and used actual AI plus ArrowRight/A commands. The first four players used normal melee attacks; the two helpers selected the existing Cái Bang Chưởng through the real skill menu.

Observed **all 256 character frames across all 80 directional state tags**, plus **all 28 FX frames**. Attack, hurt and death completions were observed from real authoritative combat. All four enemies were killed by real player commands, rewards appeared, and HP agreed between clients. Two genuine Wave 13 spawns simultaneously retained different animation states. All 16 textures and their 320 registered state/direction definitions loaded. All sampled new actor origins match the manifest foot pivots exactly, with native scale 1 and depth equal to feet Y.

The [900×560 native-pixel capture](evidence/phase1h-integration/arena-native-1x.png) was opened and inspected, alongside the normal integer-2× arena views. The brute was inspected [behind the existing tree](evidence/phase1h-integration/arena-brute-behind-tree.png) and [in front of it](evidence/phase1h-integration/arena-brute-in-front-of-tree.png); numeric depths and actual occlusion agree. The four identities remain distinguishable at native scale; large horns/axe remain within the frame. Back/side locomotion and final fallen poses were inspected in actual PNG captures, in addition to the exported full atlases. Contact sprites, walking ember sprites and server-owned projectile sprites all cleaned up. Final network/browser error list is empty.

After recording review metadata, the read-only frame/provenance validator passed again. PNGs, animation inputs and runtime bindings did not change after the successful final pipeline. A full-suite rerun was not needed for approval/review metadata and report edits.

## Evidence

All evidence is static PNG or JSON/log observation, with video and trace recording disabled.

- [Master concept / production / arena comparison](evidence/phase1h-integration/concept-production-arena-comparison.png)
- Individual comparisons: [hound](evidence/phase1h-integration/ma-khuyen-comparison.png), [imp](evidence/phase1h-integration/tieu-hoa-quy-comparison.png), [cultist](evidence/phase1h-integration/hoa-phap-su-comparison.png), [brute](evidence/phase1h-integration/nguu-ma-comparison.png)
- [Four enemies in the actual arena](evidence/phase1h-integration/arena-idle-down.png)
- [Six-client natural combat](evidence/phase1h-integration/arena-natural-attacks.png)
- [Labeled projectile renderer fixture](evidence/phase1h-integration/arena-projectile-renderer-fixture.png)
- [Live integration report](evidence/phase1h-integration/integration_verification.json)
- [Final command log](evidence/phase1h-integration/final-check.log)
- [Exact scoped file inventory](../assets/sprites/creeps/arena/waves-13-16-production/delivery_files_v1.json)

The JSON report distinguishes deterministic server-owned pose fixtures from natural AI/combat and contains actual frame observations; a single PNG is not treated as proof of motion or server correctness. No Waves 17–20 assets were generated. Phase 1H is approved and complete. Phase 1I remains unstarted and requires a separate instruction.


## Final owner approval — 2026-10-31

The owner explicitly approved all four delivered character sets, animations, VFX and final runtime appearance with “all approve”. Exact approval scope and gameplay exclusions are recorded in `assets/sprites/creeps/arena/waves-13-16-production/approval_v1.json`. Source manifests now record `DIRECTOR_APPROVED`; `assets/approved_arena_creeps_13_16.lock.json` protects the exact concepts, retained sources, selected exports and provenance manifests during normal asset preparation. No PNG, Aseprite, frame timing, pivot, animation binding or gameplay logic changed for this approval. Existing melee AI and the labeled projectile-only fixture limitation remain unchanged. No next batch was started.

Approval-only validation: `pnpm check:quick tests/arena-creep-presentation.test.ts` passed all five checks, including normal preparation with the new 337-file approval guard. All runtime animation/effect definitions and non-status asset fields remain identical to the verified Phase 1H delivery. The read-only PNG/provenance validator also passed after approval. The previously successful full/live suite is retained; it was not repeated for approval metadata.
