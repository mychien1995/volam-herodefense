> Historical v01 integration. Latest approved overrides and completed validation: [WAVE_BOSS_FEEDBACK_V02_RUNTIME.md](WAVE_BOSS_FEEDBACK_V02_RUNTIME.md).

# Wave boss feedback runtime — 2026-11-03

Director approved the `wave_boss_feedback_v01` visual preview and explicitly authorized Phaser integration together with the original gameplay feedback. Approval quote and immutable input hashes: `assets/approved_wave_boss_feedback_v01.lock.json`. This supersedes the earlier per-boss handoffs that withheld common recall/immunity/retry behavior. Historical preview manifests retain their original candidate labels; this new approval record is canonical. Final in-game visual approval is still the director’s decision.

## Implemented behavior

All four wave encounters now inherit Đông Tà’s main-court field: center (800,616), radii (324,294), faint translucent boundary, hidden/invulnerable statue with its temporary collision removed, all connected party members recalled (including dungeon spectators/dead heroes), server-enforced movement/dash/blink bounds, and unlimited full-party wipe retries. Statue collision/visibility returns after victory and occupants are moved clear of its base. Reconnects use the active field policy. Dungeon boss life ledgers and inventory-v2 scope remain unchanged. Entry/rest/retry exceptions allow the arena clock to reach these bosses even when everyone is in a dungeon; invasions retain the 180-second cadence. Rewards still come from actual common kills: gold/XP, no boss item drops.

| Actor | Feedback implementation |
| --- | --- |
| Đông Tà | Lạc Anh **normal** attacks perform seeded triangle/square/diamond/Z sword dashes with petals and swept server hits (once per target/cast). Active Lạc Anh four-way +/X slashes remain separate. The approved four-facing dash cels are now included in production. |
| Mai Siêu Phong | Pull speed285, range400, 1.7-second pull after0.4-second windup; server `dash_lock` rejects Shift without consuming a charge. Pull completion fires Ma Ảnh immediately toward the target; individual projectiles stay straight. Two opposing frontal claws use approved raster cels at0.9scale, top-down and bottom-up. |
| Tây Độc | Needle speed360→288 (−20%), clearer1.5scale needle. New poison pool loop at0.9scale. Stomp uses retained four-cel core plus native moving fragments and one new large rim with opacity fade; it is not four new explosion drawings. No giant scaling of the small explosion. |
| Nam Đế | New four-cel0.7-second ring; large finger ray uses native-width tiles rather than stretching a small bitmap. Charge45→23ticks (30Hz rounding of50%). Behind-target dash8ticks, then50/50 ring or immediate small finger shot. Normal palm restores approved `palm_trail` travel cels. |
| Bắc Cái | Clone formation uses court center. Dragon cast dashes to center in280ms, releases after400ms gather, detached dragon flight is30%faster. Dogs are the first available special in natural AI. Vortex starts quick physical tug at400ms (250ms tug), then pull48/s plus35%slow; walking escapes, Shift is locked. |

All boss HP labels/bars use Tây Độc’s green overhead style. The duplicate Nam Đế DOM health panel is removed; its owner-only physical-arrow QTE remains. Numeric defaults follow the approved preview and remain trial balance values.

## Renderer and authority

Protocol27 adds `DefenseState.waveArena` while retaining all existing M3D/dev test fields. `DungeonMatch` owns shared field lifecycle; each boss engine still owns its AI/effects. No client can submit a phase, hit, damage or position. `dash_lock` is authoritative and only restricts dash, not normal walking. All modified tuning is in game-data.

Preparation verifies approved hashes, copies the exact three PNGs and exact frame rectangles/durations/origins, and adds only the approved Đông Tà dash clips to its previous selected actor atlas. Retained art is unchanged. Phaser uses nearest sampling, native-size components and server timestamps. Texture filtering is configured once per texture: Phaser4 reuploads the texture when `setFilter` is called, so doing that per fragment/frame caused severe stalls and skipped animation phases and was removed.

## Validation scope and evidence

`tests/wave-boss-feedback-runtime.test.ts` exercises the actual server simulation, shared recall/revive/bounds/retry, polygon travel versus active slash, Mai dash refusal and immediate follow-up, Nam follow-up/charge and Bắc Cái center dash/natural dogs. Existing Nam/Bắc merge cases now expect the newly authorized field behavior.

`tests/wave-boss-feedback-assets.test.ts` checks exact approved bytes, frame rectangles, durations and pivots against shipped assets; existing Đông Tà guards cover the additional16dash cels.

`playwright.wave-boss-feedback.config.ts` uses an isolated production client build and actual Colyseus server (2904/5504 by default), video/trace disabled. Two real clients observe frames/pulls/Shift/walking and wipe retries. A separate six-peer profile uses two production Phaser clients with physical keyboard controls and four real SDK peers sending validated player input, legal level30 builds, full boss HP and natural AI. Both rendered viewports contain the six-player party. Six simultaneous same-machine Phaser renderers were attempted but produced automation/roster timeouts and are not accepted performance evidence. Test-only phase/spawn/cast prerequisites are confined to its setup middleware, absent from the production app; these are not a sixty-minute natural wave campaign test. Reports and PNGs: `docs/evidence/wave-boss-feedback-runtime/`.

Balance exposure command: `pnpm --filter @volam/game-server exec tsx ../../tools/wave-boss-feedback-balance.ts`. It runs768deterministic20-second probes across four bosses/four schools/both normal branches/levels1,6,15,30/solo and six/three seeds, with legal mixed builds and actual new retry policy. No equipment/god mode/injected damage. It does not model human dodge, clone guessing or voting and cannot establish final balance. All768probes kept the statue protected and emitted zero items; see balance.json/csv for damage, deaths, retries and limits.

## Final results

Validation is **PASS with stage retries**: the `check:final` entry passed preparation/typechecks/18workflow checks and690unit cases, then stopped on3historical assertions that expected arena exit/statue vulnerability. The6focused room/reconciliation cases passed after updating them to the newly authorized rules; combined unique unit coverage is693/693. The production build, all20asset validators and both production browser cases passed. Final PNG inspection found an extra legacy Nam health panel; it was removed while preserving QTE, then typechecks and the full two-test production browser profile (including six peers) passed again. Successful unaffected full-unit/asset stages were not repeated for this client-only cleanup. Original failure reports remain intact.

Final browser command: `pnpm check:browser --config playwright.wave-boss-feedback.config.ts` with isolated session `wave-boss-feedback-final-ui` and ports2904/5504: **2passed**, browser204.81s, total242.48s. Six-peer natural full-HP clears: Đông Tà17.27s, Tây Độc3.03s, Nam Đế25.45s, Bắc Cái58.14s; these bot timings are not final balance approval. Statue stayed2000/2000, zero item drops and client errors. The768final-state balance probes passed separately in43.49s.

Actual PNGs were opened and compared with the approved preview: sharp pool outlines/bubbles, native core/fragments/large stomp rim, four ring cels, shared green HP bar, in-viewport HUD and restored statue after victory. Runtime ring PNG captures an earlier expansion cel than the retained preview screenshot; exact source-byte/frame guards and live observations verify all four cels. See [verification](evidence/wave-boss-feedback-runtime/verification.json), [reference comparison](evidence/wave-boss-feedback-runtime/reference-comparison.json), [Phật Quang](evidence/wave-boss-feedback-runtime/live-phat-quang.png), [Cáp Mô](evidence/wave-boss-feedback-runtime/live-stomp-rim.png), [six-player combat](evidence/wave-boss-feedback-runtime/six-player-natural-combat.png) and [restored arena](evidence/wave-boss-feedback-runtime/six-player-arena-restored.png).

Owned QA services closed cleanly. Restart matching server/client and create a new room for protocol27. No push/deployment or final in-game director approval is implied.
