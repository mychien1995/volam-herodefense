# M3D feedback r2 — integration review

2026-11-02 · branch `wip/m3d/feedback-integration` · runtime director review pending.

Created a separate managed worktree from approved tech `c3021925` on the exact source branch `wip/m3d/feeback-tech`, then merged approved visual `4bf2dbd2483e1817ebc2fc2c574194a15aeaa8cf`. Nothing is merged into `milestone/m3d`.

## Approval and retained assets

`assets/m3d-feedback-visual/director_approval_r2.json` plus `approved_visual_r2.lock.json` are the approval authority. All 1,004 protected files are verified before preparing runtime copies. Runtime registers only the 243 selected tags / 845 ordered frame references, including the selected suffix of Liệt Phong outro. Whole-atlas byte protection does not approve other tags. Retained support poses use only `retainedActorTags`. Old wave tags and full-sequence convenience tags are excluded. No PNG, source Aseprite, approval register, lock or preview is regenerated or edited.

`scripts/prepare-m3d-feedback-art.mjs` adapts the retained metadata, copies exact PNG/atlas bytes, and writes the selected runtime registry. The dash DOM icon uses the exact 32×32 individual frame, avoiding downsampling its 36×36 padded atlas. `m3d-feedback-policy.ts` contains cosmetic travel/echo choices; no game-core or server production code imports it. Original source/license declarations remain in the locked `provenance.json`. This integration grants no additional rights or ART-01 approval.

## Runtime contract

| Presentation | Authoritative binding |
| --- | --- |
| Thiếu Lâm Quyền | Exactly one body/VFX per accepted A; `left_fist`, `right_fist`, `front_kick`, `roundhouse_kick`. First three cosmetic releases travel outward; fourth preserves the authored arc. |
| Võ Đang Quyền / Kiếm, Thiên Sơn Đao, Thiếu Lâm Đao A | Accepted `attack` only; alternating Võ Đang hands use r2 sonic tags rooted at each facing's fist tip. No held-key replay or animation-triggered hit. |
| Nhân Kiếm Hợp Nhất | Launch from accepted cast. Flight and static hold are positioned at the real projectile x/y, with torso elevation once. `sword_linger` selects a single stationary hold cel. `blink_depart` / `blink_arrive` use the server's old/new foot coordinates. Arrival fade is cosmetic at the already-confirmed new location. Removal dissolves the sword; no preview-time teleport. Swordless walk reuses the selected retained unarmed walk. |
| Liệt Phong | Gather/hold during the real channel; `pulse/strike` starts slash, ground break and recovery. Ground root is 28 presentation units forward. Only selected residual-wind outro frames are used. No client strike timing. |
| Bách Liệt | Each real sweep/finisher pulse emits a cosmetic wave; body flurry and VFX depend on the real channel. The approved ten hits + finisher remain unchanged; the preview's nine waves do not become gameplay. |
| La Hán / Vi Đà | Accepted cast, retained body, new directional gold phases. Vi Đà retains its canonical Quyền ID and the selected 1.3× local eruption offset. This does not change the server's 42-unit origin. |
| Như Lai Niết Bàn | The real delayed arc's `pulse/strike` releases eight cosmetic palms. Its pending windup body cancels with the real channel; no queued palms escape a cancelled windup. Palms never create projectiles, targets, hits, damage or range. Retained cast body loops only for its finite cosmetic display window. This skill is distinct from the projectile-based Như Lai Thiên Diệp. |
| Tam Giới | New Đao pose on cast; gold phases at the real strike pulse. Existing confirmed armor-break status presentation remains. |
| Kháng Long | Accepted cast emits the approved cosmetic dragon phases. Rank4 fire reads the real moving area; intro/loop/end stay below all actors and follow the rendered owner feet. |
| Phá Giáp | Reach intro/loop follows the real channel. Real strike emits a separate explosion at caster feet, not at reach endpoint. |
| Shift | Accepted dash event only, existing server movement/charges/refill. No immunity or damage inferred from dust. |
| Trúc Lâm Kiếm Khách | Only new idle/walk replace baseline. Attack/hurt/death and authoritative Forest identity/AI remain retained. |

Hero canvas160×120 uses feet(80,96)/origin(0.5,0.8), scale1. Bamboo uses160×128/(80,106). Burn uses192×128/(96,76). Directional local offsets come from selected metadata; no actor is resized to its transparent canvas. Ground VFX depth is below actors; existing foreground occlusion and non-rotating zoom1 camera remain. Moving projectiles use captured server heading and never home.

Death, zone transfer, defeat and disconnect remove owned presentation. Real channel cancellation removes held action phases; build revision invalidates obsolete body/transient art on respec. Projectile/area lifetimes stay server-owned. No combat timing, damage, reach, cooldown, teleport, protocol, RNG or balance code changes.

The adapter reconciles reliable cue messages with their following schema patch for up to three projected server ticks; once a channel has been observed, its removal cancels gated phases immediately. Persistent projectile/area views can rebind after an ordinary level revision if the authoritative entity still exists. Confirmed blink arrival snaps rendered feet to replicated position during the fade, instead of interpolating an apparent dash. These are presentation rules only.

Như Lai's finite visual chant/queued echoes also stop if the owner is stunned after release; this never reverses damage that the server has already resolved. The ordinary real-projectile renderer for Như Lai Thiên Diệp is unchanged.

## Verification and evidence

Isolated QA uses server2887/client5487/test-only fixture2888 and the retained Chromium cache at `D:/Projects/volam-hero-defense/.cache/ms-playwright`. Tests own their services; no other checkout's server is borrowed or stopped. Browser video and trace are off.

Executed iteration:

- `pnpm install --frozen-lockfile`: PASS; lockfile unchanged.
- `node assets/m3d-feedback-visual/source/tools/record-approval.mjs --verify`: PASS, 1,004 files /18 components.
- `pnpm check:quick tests/m3d-feedback-integration.test.ts tests/m3d-feedback-tech.test.ts tests/animation-change.test.ts`: PASS,50 tests.
- `pnpm check:browser --config playwright.m3d-integration.config.ts --grep 'selected r2|legal-build|two clients:'`: PASS,6 live tests,240.54s including preparation/build. Two actual clients observed all243 selected clips /845 frame references; source loops completed twice. Existing dash/A/aggro, piercing sword/linger/recast, monk, moving burn/foot explosion and ten-hit-plus-finisher checks passed. No browser errors.

Final command: `pnpm check:final --config playwright.m3d-integration.config.ts`, with the same isolated environment. Final result is recorded below after execution; iteration is not substituted for final six-player acceptance.

Evidence root: `docs/evidence/sessions/m3d-feedback-integration/`. `m3d-feedback-integration/frame-observations.json` contains real Phaser frame/completion observations. `m3d-feedback-tech/` contains the retained technical regression PNGs and state observations captured against this integration. These tests use explicit legal-build/position/immortal-target fixtures, not a claim of natural leveling or campaign balance. The six-client test separately exercises ordinary Forest creeps, AI, actual attacks/deaths/gold and physical exit controls without changing enemy stats.

Visual comparison: opened the actual `armor-slam-burn.png`, `sword-flight.png` and `forest-aggro.png` from this run, plus r2 preview PNGs for sonic, ground break and multi-palm. Compared with Võ Đang/Cái Bang character, world and Forest references and both actual negative references. Detailed chibi characters, school-colored raster VFX, foot anchors and full-viewport composition remain; no exterior dashboard is introduced. Existing development practice enemies in some arena tests are explicitly geometric test fixtures, not newly approved art. Environment/HUD quality and the existing ART-01 gate are outside this feedback asset integration. Final new runtime screenshots still require the director's in-game review.

Official Phaser animation/sprite documentation and installed4.2.1 registry conventions were consulted. Local Colyseus0.18 skill/version contract was read; no production Room/Schema APIs are changed.

Iteration failures were retained and fixed: an invalid two-ultimate QA loadout was rejected by the server; counters spanning the debug bridge's bounded60-event history were replaced by per-cast event IDs; cooldown reset fixtures now clear both the slot projection and ability debt; lobby/peer render probes activate the browser tab before reading its displayed state. Compact in-page hold probes avoid spending the real1.5s recast window transferring the entire scene inspection payload. None of these fixes weaken combat assertions or modify production gameplay.

## Final result

`pnpm check:final --config playwright.m3d-integration.config.ts` — **PASS**,562.70s total /431.48s browser stage, run `6ca67e0f-a6a3-4e37-bd58-5670503d98e7`. Executed after the last runtime implementation change;18 workflow tests,498 unit/integration tests across43 files, project/tool/test typechecks, production build, all15 asset validators and all7 browser tests passed. Existing large-client-chunk warning remains.

The six-client test passed all four cardinal directions, accepted-A-only behavior,10 Bách Liệt hits plus finisher, static real sword hold and assigned-slot blink, moving owner fire below feet, physical dungeon exit, ordinary Forest combat/rewards, stun/death/zone/disconnect cleanup. All six players received real gold in the shared Forest fixture:18/22/15/11/3/3. No browser errors. All243 selected new clips /845 ordered frame references were separately drawn in actual Phaser on two clients, including two cycles of source loops; camera zoom1 and rotation0 were asserted.

Final PNGs opened and compared against r2/reference: `m3d-feedback-integration/six-player-scale.png`, `six-player-combat.png`, `sword-blink.png`, `multi-palm.png`; technical regression captures include isolated character/skill cases. The ground-break phase is verified by live frame/state observations; the slow screenshot capture can occur after that short phase, so `blade-ground.png` alone is not proof of its contact timing. No video/GIF or screenshot-stream trace was created. Full observations are in `multiplayer-observations.json` and `frame-observations.json`; compact pipeline timings are in `check-workflow/final-timings.json`.

Rechecked r2 approval after final tests: **PASS**,1,004 locked files unchanged. Validator-generated EOL-only changes to historical reports are restored to their original bytes; no artwork or protected metadata is changed. No further runtime change follows this final pass.

## In-game director review

The tested production bundle is running at **http://127.0.0.1:5487**, server2887, from the integration worktree. It uses normal production match rules, begins at level1, and has no test fixture endpoint or development practice rectangles. Use arrows /A/QWER/Shift, P for Võ Học, and the existing dungeon/progression controls. Test-only level30 and actor-arrangement fixtures above are not part of the running review service.

Worktree: `C:/Users/ADMIN/.codex/worktrees/m3d-feedback-integration/volam-hero-defense`. Source approval registers remain immutable historical records. Integration/Phaser verification is complete; **runtime director approval is pending**. No merge into `milestone/m3d` is performed.
