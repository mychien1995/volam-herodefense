# Creep upgrade — 2026-11-06

Director authorized all suggestions in the preceding creep catalogue, Phaser integration, substantially denser invasions, host-selected 2/3/4 gates, and spawning by duration/rate rather than an upfront count. Work is isolated on `wip/m3d/creep-upgrade`, based on `milestone/m3d` at `d54382a1`; unrelated uncommitted final-boss work in the source checkout is preserved.

## Playtest

Set the server environment before starting a new room:

```powershell
$env:VOLAM_DEV_CREEP_TEST = '1'
pnpm dev
```

This single development-only switch runs all 20 actual wave identities in order, every 20 seconds with a 12-second stream, one spawn per gate every 3 seconds before player scaling. Heroes and statue are invulnerable. Chapter bosses are disabled; the regular four creep dungeons remain accessible. The first wave starts 20 seconds after the match begins, the twentieth at 6m40s. Existing waves are retained. Do not combine with `VOLAM_DEV_WAVE_BOSSES=1`. Production ignores this flag, the development interval override and the development statue-HP override. Restart matching protocol-32 services and create a new room after changing it.

Without the flag, room creation offers 2 (west/east), 3 (plus north), or 4 (plus south) gates. The server validates and locks the creator's setting; joining players cannot change it. New gate footprints are checked against authoritative map collisions. Normal invasions start every 180 seconds and stream for 60 seconds. The initial trial rate is one creep every 2 seconds per gate, divided by `1 + 0.60 × (players − 1)` with tick rounding. Player count and stats are captured when the wave opens. Solo gets 60/90/120 creeps per wave at 2/3/4 gates; six players get 240/360/480. No silent live-actor cap truncates streams. Each of the 20 waves has an explicit stat recipe. The retained no-stream factory path serves historical M2B fixtures; the actual MatchRoom always selects the streaming definition.

Boss gates must wait for pending stream spawns as well as living enemies. The existing 180-second overlap, boss recall/retry/statue policy, private dungeons, entry-speed snapshots, keyboard controls, kill/assist reward ownership and no invasion item drops remain. Statue damage comes from normal strikes only. Specials, DOT, self-heal and self-detonation never target it; it is not repaired.

## Combat and rendering

`packages/game-data/src/creep-abilities.ts` validates 49 named profiles: 20 waves, 24 dungeon species and 5 boss-support types. It is the complete catalogue of normal attacks, signatures, death effects, timing, geometry and trial coefficients. The dog, Mongol archer and wine courier deliberately retain their approved simple roles; Mongol infantry, Cổ Mộ needles and Bắc Cái dogs receive their selected changes while retaining encounter-owned behavior.

`game-core/creep-abilities.ts` owns captured aim vectors, windup/cooldown, frontal arcs, delayed/multiple hits, swept projectiles/dashes, collision, fields, death attacks, healing from actual damage, guard and counter. At most three nearby owners can prepare a special simultaneously. Repeat slows use the strongest magnitude; creep poison and burn each tick only their strongest source once per second, capped at 2.5% of maximum HP per element. Normals use 75% of the retained damage coefficient by default, with profile-specific cadence. Numerical values are trial tuning, not final balance approval.

No animation authorizes damage. Existing zone-scoped `BossEffectState` publishes only public geometry/timestamps, not private hit sets or combat configuration. Instant hits retain six presentation ticks while their damage window remains one tick. Phaser renders authored raster warnings, missiles, impacts and fields; actor animation follows the replicated poses. Late snapshots reconstruct ongoing effects, and zone/scene/defeat cleanup removes them. Soft separation extends to invasion packs and excludes active dashes so it cannot clamp their travel.

## Artwork and references

No new bitmap was generated and approved atlas bytes are unchanged. Reused sources: arena creep impact/demon/final FX; forest venom/web/root/thorn FX; desert original arrow; beach projectile/splash/cannon FX; Hell flame/lava/weapon/sigil FX. Asset provenance is inherited from their existing manifests and original sources. New combinations and their in-game readability require director review; reuse does not imply new art approval.

Inspected the positive world/hub/battle, four dungeon and three menu references, Võ Đang character reference, and placeholder anti-reference. Criteria: detailed chibi wuxia silhouettes, elevated orthographic perspective, crisp pixels, one full game viewport and compact in-viewport overlays. The historical `vo_dang_art_direction_reference.png` is absent; `vo_dang_character_reference.png` is the actual style sheet. The file named `current_codex_dashboard_anti_reference.png` currently contains that Võ Đang sheet rather than the historical dashboard, so its name was not treated as evidence of dashboard layout.

## Validation

Focused regression coverage includes the catalogue, real signature starts, dodge/miss/wall checks, DOT cap, frontal guard/counter, self-detonation/death explosions, nearby cast budget, owner cleanup, statue policy, 60-second streams, player snapshots, pending-stream boss gates and production-only settings. SDK tests validate create options, joiner isolation and actual cue synchronization. The dedicated production-Phaser profile uses two browser clients and four SDK peers, covers 44 regular identities and private-zone filtering, and saves PNG evidence without video or screenshot streams.

Final result: **PASS**, `pnpm check:final --config playwright.creep-upgrade.config.ts`, session `creep-upgrade-final-fixed`, server 2928/client 5528. Total 374.46s: project and test/tool typechecks, 18 workflow checks, **821 unit/integration tests across 80 files**, production build, **20 asset validators**, and the production Phaser browser case. The browser observes every regular identity, real keyboard movement/death-trigger input, released raster frames, private-zone filtering, two browser peers plus four SDK peers, and a controlled **120-creep** readability fixture. The controlled fixtures suppress subsequent natural invasions; their deliberately distant HUD countdown is not the production interval.

`pnpm --filter @volam/game-server exec tsx ../../tools/creep-upgrade-balance.ts`: **9,216** fixed-seed PvE probes passed through 48 attacking profiles (wine courier is noncombat), four schools, both basics, levels 1/6/15/30, solo/six, three seeds and legal mixed four-slot builds. Six stream scenarios give solo 60/90/120 and six-player 240/360/480. The 480-actor server-world probe measured p95 **11.82ms**, max **23.22ms** per simulated tick on this machine. It does not include network/GPU cost or model human dodging. Per-creep rewards are retained: the six-player four-gate first-wave supply is 28,800 XP and 5,760 gold before participation splits. This makes progression much faster; final economy/difficulty tuning remains open.

The initial final run passed 818 tests and stopped on the core boundary guard rejecting a type-position `import()` expression. Static type imports fixed it; the final run above includes new statue-footprint regressions. Browser iteration also exposed the initial-snapshot lobby race, missing cast-pose aliases, and short impacts missed by polling; all were fixed and verified. No successful final stages were skipped, no recordings were created, and no runtime art approval is fabricated.

Evidence: [verification](evidence/creep-upgrade/verification.json), [pipeline](evidence/sessions/creep-upgrade-final-fixed/check-workflow/final-timings.json), [browser](evidence/creep-upgrade/browser.json), [balance](evidence/creep-upgrade/balance.json), [arena stress PNG](evidence/creep-upgrade/arena-six-player.png), [skill PNG](evidence/creep-upgrade/arena-skill.png), [forest PNG](evidence/creep-upgrade/forest-web.png). Original Cổ Mộ needle rasters and their 360 range / 300 speed / one-second normal cadence are retained, with the new three-needle signature.

Live review: **http://127.0.0.1:5627/**, server **3427**, protocol 32, run identity `creep-upgrade-review-p32-20261106`, `VOLAM_DEV_CREEP_TEST=1`. Create a new room. The helper is `tools/creep-upgrade-dev.ts`; this review uses explicit QA port/endpoint overrides because another service owns its default 2931 port. That service was left untouched. No merge, push or deployment was performed. New raster combinations remain candidates for director review.

## Director creep feedback r2 — 2026-11-06

North/south gates now require a clear footprint-wide corridor toward the statue, not merely an empty spawn point. Forward smash/slash/claw specials start at their caster and damage a forward capsule; heavy smash geometry increases 50%, other spreading skill radius/width and pattern extent double. Archer basic/special shot range is reduced 15%; melee basic reach doubles. Trúc Xà is fully ranged with poison+slow, Độc Chu keeps melee and web has a 25% one-second root, Sơn Viên stomps with 0.8s stun, Trúc Lâm Kiếm Khách gains 25% chance to reflect 50% of actual direct damage (no recursion), Mộc Linh becomes ranged. Sa Xà becomes ranged with slow; Xác Ướp basic cooldown is 36 ticks and has 25% root; Cự Nhân Sa Thạch basic punch stuns in AoE. Hải Xà becomes ranged and Độc thủy slows. Dung bạo radius is 144 (previously 72). Root blocks movement/dash/blink, permits attacks/casting, and respects expiry/control resistance. Numeric proc chances and durations are trial defaults. Prior r1 verification reports describe the old tuning; r2 evidence is stored separately.

R2 final: **PASS**, `pnpm check:final --config playwright.creep-upgrade.config.ts`, session `creep-upgrade-r2-final`: **830 tests / 81 files**, 18 workflow checks, both typechecks, production build, 20 asset validators and the six-peer production Phaser case. Total 432.58s; browser 160.42s. All 44 regular identities released their retained raster effects; no client errors. Opened the refreshed arena skill, forest web and 120-creep PNGs. Dense piles still overlap sprites/health bars; automation does not establish human dodge difficulty or director art approval.

R2 balance rerun: **9,216 probes**, 36.43s. Streams remain solo60/90/120 and six-player240/360/480. The final 480-actor probe measured p95 **6.62ms**, max **29.74ms** per simulated tick; this excludes network/GPU load and is not a controlled performance comparison with r1. Evidence: [verification](evidence/creep-upgrade-r2/verification.json), [pipeline](evidence/sessions/creep-upgrade-r2-final/check-workflow/final-timings.json), [browser](evidence/creep-upgrade-r2/browser.json), [balance](evidence/creep-upgrade-r2/balance.json), [arena PNG](evidence/creep-upgrade-r2/arena-six-player.png).

R2 review services restarted at **http://127.0.0.1:5627/** / server3427, protocol32, health identity `creep-upgrade-r2-review-p32-20261106`; verified the client endpoint is3427. Reload the page and create a new room. `VOLAM_DEV_CREEP_TEST=1` remains enabled.

Latest review: protocol33 adds individual-creep preview at **http://127.0.0.1:5627/?creepPreview=1**; normal timed-wave test remains at the ordinary URL. See [CREEP_PREVIEW.md](CREEP_PREVIEW.md) for controls, fixture defaults and validation. Historical protocol32 reports above are retained as executed.

Director feedback r3 supersedes the earlier heavy-line/zombie-death-pool/three-signature definitions and selected warning strips. Final851-test/six-peer/changed-preview validation and current review services: [CREEP_FEEDBACK_R3.md](CREEP_FEEDBACK_R3.md).
