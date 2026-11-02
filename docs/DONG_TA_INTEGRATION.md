# Đông Tà — authoritative V04 integration

Implementation was produced in `wip/m3d/dong-ta`; on2026-11-03 the director approved the runtime and requested integration into `milestone/m3d`. The director-approved V04 sprites/VFX are reused byte-for-byte; no new artwork, arena, other chapter bosses or deployment is included. The subsequently authorized milestone merge is recorded separately. Visual-preview approval is recorded in `assets/reviews/bosses/dong_ta_v02/director_approval.json`; the original record's `gameRuntimeIntegrated: false` describes approval-time scope and is preserved. Runtime art/gameplay approval is now recorded in `docs/evidence/dong-ta-runtime/director-approval.json`; final numeric combat balance remains provisional. Historical verification-time approval flags are preserved.

## Encounter behavior

`DungeonMatch` owns a `DongTaEncounter` independently of dungeon bosses. The first gate opens after every living invasion enemy carrying **wave 5** has died; wave 6 and older survivors cannot block it. After the proposed 10-second rest, Đông Tà walks west from (1420,616) along the east road for three seconds to world court center (800,616). The statue marker remains (800,576). These are world coordinates, not preview camera-local coordinates. The existing three invasion recipes remain the M2B prototype catalogue; this change does not implement the other chapter bosses or a full 20-wave content set.

At the center, the server hides/protects the statue, removes its temporary collision, transfers **all match heroes** from their current zones, and immediately revives dead heroes. Transfer retains each hero object, progression, items/pending claims, XP/gold and cooldown debt. Living heroes receive no HP/MP refill; dead heroes use the existing full HP/MP respawn policy. Empty creep dungeons pause; existing boss-dungeon reset clocks remain active, including Cổ Mộ's 30-second empty reset. No PvP instance exists in this checkout; recall iterates all memberships and has no dungeon/zone whitelist.

The playable field is the court ellipse (radii324,294, including the preview's24px rim), reduced by the hero foot radius. Server normal movement and swept dash/pull/knockback enforce it regardless of status immunity. Dungeon/menu entry is rejected while locked; Quit remains available. Dead individuals respawn inside the court after the existing five-second delay.

The **180-second invasion clock continues**, including retries. Existing creep waves and their rewards are retained. Statue immunity changes no HP and is never repair. The statue remains protected through the proposed three-second retry rest.

If every remaining participant dies before ordinary respawn, the server clears encounter effects/actors/locks, cancels dead heroes' queued actions, and starts a fresh full-HP attempt after the retry rest. Recall/revival and the one-time summon allowance reset per attempt; XP, gold, items and builds do not rewind. There is no retry limit. Normal room leave removes disconnected participants; an empty room does not run a ghost wipe/retry loop. A late confirmed join is placed inside the active field; boss scaling is snapshotted per attempt, including members recalled from dungeons.

Đông Tà's death immediately clears this encounter without requiring Mai/Hoàng kills. Summons, poison, petals and other encounter effects are removed, the boundary unlocks and the statue returns with its unchanged HP. Anyone occupying its hidden collision base is moved to the nearest deterministic legal foot position before the solid statue returns; other positions/resources remain intact. This is not match victory. The proposed650XP/360gold fixed pools are divided deterministically among heroes who hit Đông Tà during the successful attempt, once only. There are **no item drops or loot rolls**, and no reward for resetting or killing summons. A brief client death cel is cosmetic, driven by the authoritative death event.

## Approved mechanics and provisional coefficients

All Vietnamese names remain separate from stable ASCII IDs. Normal `lac_anh_normal` and active `lac_anh_kiem_phap` share the display name **Lạc Anh Kiếm Pháp**, with separate execution identities.

| Actor | Behavior |
|---|---|
| Đông Tà | 13 serial Tà Kiếm thrusts over180°/380px; frontal blossom fan normal; 8–14 straight radial beads with seeded phase; four simultaneous stationary +/X slashes;40 randomly separated flower clusters with individual delayed explosions; both summons once strictly below40%HP. |
| Mai Siêu Phong | Sticky single-player pursuit until death/removal; two opposing frontal claws; five captured-vector ranged claws; pull of the locked player; cloth pouch flight, impact and lingering burgundy poison ticks. No target-lock spell/animation. |
| Hoàng Dung | Only straight healing palms to living Đông Tà/Mai and a sudden movement-speed burst. No shield, attack, revival or extra legacy skill. |

The scripted threshold summon completes even through a stun, so an interrupt cannot permanently consume the one allowed summon. Other casts can be interrupted by stun; silence blocks active selection, disarm blocks normals, control resistance uses the common status pipeline, and these three actors reject forced displacement. These are documented initial control defaults.

HP/defense/speed, damage, cast times, cooldowns, healing, DOT, pull strength, XP/gold and scaling are validated **proposed tuning** in `packages/game-data/src/dong-ta.ts`. Baseline bossHP6200, MaiHP1800, HoàngHP1200; per-additional-playerHP multiplier0.45; control resistance0.75. The geometric values match the preview trial values; final balance is not claimed. Polygon dash, five same-direction beads, grid flowers, rear-hitting claws and extra V01 Hoàng skills are excluded.

## Authority, transport and artwork

`game-core` has no Phaser/DOM/Colyseus imports. Fixed server ticks own AI, cast vectors, RNG, sweep/contact geometry, delayed damage, DOT/heal/pull, summon thresholds, recall, collision, revival, retries and rewards. Damage passes through the existing `hurt` pipeline, including defense, mana shields, dash immunity, counters and death cleanup. Per-effect target lists deduplicate each strike; poison uses an independent tick cadence.

Protocol18 adds match encounter metadata under `DefenseState.dongTa`. VFX use the existing zone-filtered `BossEffectState` delta map, with captured origin/target fields. Stationary flower positions are not retransmitted inside a full JSON array every tick. Clients never submit hits, boss state or random results. Existing dungeons and their state filtering remain separate.

`scripts/prepare-dong-ta.mjs` checks all630 pinned inputs before copying retained sheets and filtering runtime atlas/animation registration to109 approved clips/436 frames. It preserves feet pivots and metadata. `dong-ta-art.ts` samples these real cels against server cast/effect timestamps; pose clocks restart on pose/facing transitions rather than room creation. All boss actors use feet/Y-depth sorting. The simple ellipse stroke is a functional boundary indicator, not replacement environment or VFX artwork. The HUD stays inside the existing game viewport. Provenance/source references remain in the approved preview's `provenance.json` and asset manifests.

## Verification

Focused tests cover gate/rest/entry, recall and cooldown preservation, dungeon empty-reset scheduling, statue immunity and clock overlap, server bounds/respawn, straight radial vectors/counts, +/X patterns, random flowers/delay, frontal claws in four facings, sticky focus, pull/poison/healing, strict threshold/stun/summon-once, repeated wipes, late join/disconnect, cleanup, unique rewards and no items. An SDK test exercises two real connections and rejection of forged damage/location. The asset test checks source hashes, exact public-copy bytes, selected clips, atlas bounds and feet pivots.

The browser fixture deliberately accelerates the wave gate, grants legal level30 progression, and arranges dungeon/death/threshold/wipe positions. Its frame fixtures render actors inside the actual match, not a gallery. Natural production AI, damage, healing, movement and actual arrow/A/QWER input then exercise the encounter. It uses two clients for iteration and six for the final combat/readability pass. PNGs, observed frames and error logs are retained; video and trace playback are disabled. This is not a real-time15-minute wave test. Two-player iteration shortens remaining bossHP for the final keyboard-clear check; the final six-player attempt uses full reset bossHP and ordinary keyboard damage.

Final measured results and exact commands are recorded in `docs/evidence/dong-ta-runtime/verification.json`. Detailed browser evidence: `docs/evidence/dong-ta-runtime/`. Headless metrics: `artifacts/dong-ta/balance.json` / `.csv`, produced by `pnpm --filter @volam/game-server exec tsx ../../tools/dong-ta-balance.ts`.

### Fixed-seed balance evidence

The production-core simulation after cadence tuning completed192 runs in96.17s;72 cleared within180s. It preceded the post-clear terrain-release fix, which changes only where feet can stand after victory and no combat/reward coefficient. Each row below aggregates eight basics across three seeds, with legal automatic QWER builds and no equipment. Bots pursue/attack and do not predictively dodge, so these results are not human success rates.

| Level | Solo clears /24 | Six-player clears /24 | Mean six-player clear time among wins |
|---|---:|---:|---:|
|1|0|6|136.58s|
|6|0|13|85.48s|
|15|0|19|45.84s|
|30|10|24|17.80s|

No run awarded an item; the protected statue'sHP remained unchanged. Solo bots below level30 did not clear within the cap; solo difficulty/build dependence is an explicit tuning risk. Full records/CSV are in `artifacts/dong-ta/`; the compact tracked summary is `docs/evidence/dong-ta-runtime/balance-summary.json`.

### Visual comparison at normal gameplay scale

The actual match retains the same detailed chibi silhouettes, feet pivots, costume palettes and raster cels as the approved V04 preview. Pink blossoms contrast with Mai's burgundy claws/poison, while Hoàng retains the existing support palette. Main arena terrain/props and the single full-viewport HUD are retained; no procedural character/environment replacement is introduced. Unlike the rejected placeholder reference, the screenshots contain the authored world/character/VFX sheets. Normal gameplay keeps camera zoom1 with the existing integer display scale2 at1280×720. The player-follow camera can crop the far side of the large court when a player stands at its rim; evidence positions the observing hero near the action without changing camera zoom or perspective. Large poison sheets and stacked actor labels can obscure small details during overlap; final runtime art/readability remains subject to director review.

Compared inputs: approved `assets/reviews/bosses/dong_ta_v02/feedback_02/overview.png`, positive `assets/references/vo_dang_character_reference.png` / `in_game_world_reference.png`, and negative `assets/references/current_game_2026_10_29_placeholder_anti_reference.png`. Final actual PNGs: `docs/evidence/dong-ta-runtime/six-player-combat.png` and `arena-restored.png`; historical pre-terrain-release evidence is retained separately.

### Final validation outcome — PASS

- Project/test/tool typechecks, production build,18workflow regression checks, all15 existing asset validators and the additional Đông Tà asset/hash guards passed. The original final pipeline stopped on a protocol17 assertion; the corrected protocol18 regression passed. Final unique unit/integration coverage is493 checks across the initial full run and focused reruns, including53 checks after the terrain-release fix. This is an aggregate of actual stages, not a claim that one uninterrupted `check:final` invocation was green.
- Two-player iteration observed109clips/436frames with no client errors. The first six-player full-HP pass and both multiplayer dungeon regressions passed. After the post-clear collider fix, the six-player encounter reran successfully in145.16s: full-HP reset→actual A/QWER damage→clear/reward sync, no terrain overlaps,109clips/436frames and zero client errors.
- Both final normal-zoom PNGs were opened and visually inspected. Screenshot placement moves the observing hero near the action; camera perspective/zoom and server combat remain unchanged. Original source/preview hash locks remain intact, and historical pre-fix evidence is preserved. No recordings were created.
- The final verification record includes actual commands, scope/fixture limitations and hashes of runtime/test inputs. The existing large-bundle build warning remains. Tuning and final runtime art/readability approval remain pending; no new final-balance approval is inferred.

## Subsequent director approval — 2026-11-03

The user explicitly approved this delivered runtime and authorized integration into `milestone/m3d`. `docs/evidence/dong-ta-runtime/director-approval.json` pins the exact reviewed source/evidence and leaves numerical balance provisional. Earlier pending-runtime-art/no-merge statements above describe the original delivery, not the latest approval. Merge reconciliation and validation on the newer milestone baseline are recorded in `docs/DONG_TA_M3D_MERGE_2026-11-03.md`.
