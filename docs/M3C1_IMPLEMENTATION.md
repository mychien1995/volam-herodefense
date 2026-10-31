# M3C1 — Thiên Sơn implementation

Scope: the requested second playable school only. Võ Đang/Thiếu Lâm combat, equipment, crafting, PvP, bosses and new environments remain outside this change. Existing generated/approved source art is reused. Asset inventory and the ten skill-to-sprite mappings are in `M3C1_SKILL_ASSET_MAP.md`.

## Mechanics and configurable proposals

Both A choices use the existing authoritative arc/primary-target/cleave path. Phiến: raw24, range62, half-angle90°, cleave70%,14 base ticks. Đao: raw30, range58, half-angle45°, cleave30%,12 base ticks. Attack-speed stats shorten the same shared A cooldown. Neither creates projectiles.

All values below are rank1 tuning proposals at30 ticks/s, separate from mechanics. Canonical IDs/names/behaviors follow CONTENT_DATA and the M3C1 request. Active rank gates1/3/5/7, ultimate6/10/14, four slots, optional one ultimate and equipment-independent style mixing reuse M3B unchanged.

| Skill | Implemented behavior | MP / cooldown ticks | Rank1 detail |
| --- | --- | --- | --- |
| Liên Hoa Phiến | Frontal rapid multi-hit |18 /90 |4×16,4-tick spacing, range78,90° half-angle |
| Lục Dương Chưởng | Moving self-centered spin |24 /180 |6×15,8-tick spacing, radius80 |
| Lưu Phong Bộ | Directional non-damaging dash |12 /120 |distance140, speed700/s, no stun |
| Chiết Mai Thủ | Timed speed buff |20 /360 |+30% movement,+35% attack speed,180 ticks |
| Bách Phiến Phong Bạo | Large moving whirlwind ultimate |42 /540 |10×22,7-tick spacing, radius115 |
| Phi Ảnh Trảm | Swept dash slash |22 /180 |distance150, speed750/s,58 once per crossed target, no stun |
| Truy Hồn Đao | Two frontal cuts, conditional damage |18 /120 |2×30,5-tick spacing,+40% against currently slowed targets |
| Phong Ảnh Hoán Vị | Evasive step and timed counter |20 /240 |distance65, speed650/s,30-tick window; evade one enemy hit, counter60 within90 |
| Liệt Phong Đao | Heavy strike with penetration |25 /180 |75,range72,50% defense penetration for this strike |
| Bách Liệt Thiên Kích | Rapid forward combo ultimate |45 /540 |10×13 every2 ticks, then45 finisher;45° half-angle |

Rank scaling is explicit in `game-data/thien-son.ts`: multi-hit damage/range grow; Truy Hồn's conditional bonus grows; dashes gain distance and damaging slash/counter strength; counter window expands; Chiết Mai gains speed strength/duration; Liệt Phong gains damage/penetration. Costs increase modestly and cooldowns decrease by rank. Normal ranks add1MP/−3ticks; ultimate ranks add3MP/−15ticks. No second progression ledger or client resource calculation is introduced.

Repeated skills use captured facing with live owner position, deterministic tick cadence and line-of-sight checks. Moving spins permit normal arrow movement; a running timed action blocks another A/active action until it finishes. Dashes retain facing and use small swept collision steps against the current zone's bounds/terrain; damaged target IDs are recorded once per dash. Clients submit neither positions nor hit results. The counter starts at cast, consumes one valid incoming enemy hit before retaliation and cannot trigger recursively; the retaliation requires range and clear terrain. An unused window expires without damage. No PvP counter implementation is inferred.

## Stats / progression

Thiên Sơn base: HP135,MP100,ATK24,DEF0,attack-speed1.1,movement180,crit14%/1.5×,mana regen6/s. Per level after1: HP6,MP2,ATK1.6,DEF0.1. Bắc Minh automatically adds movement1.1,attack-speed0.012,crit0.003 per level after1. Surplus adds movement1.3,attack-speed0.012,crit0.003 per point, only after four equipped skills max out. All numbers remain proposals, with M3B caps and derived sources retained. Equipment is the existing reserved zero layer, not a new backend.

Normal Thiên Sơn heroes start with one available point, empty active slots and Phiến A. Only their ten school skills and two basics are legal. Phiến/Đao skills mix freely without matching weapons. Point budgeting, rank/level gates, stale/replay rejection, arena-only edits, stat recalculation and cooldown debt across respec/slot changes/transfers all use M3B. Death, disconnect, respec, defeat and zone transfer cancel owner actions, queued shots and temporary self statuses through existing cleanup.

## Shared changes and files

- `game-core/types.ts`, `skills.ts`: optional directional multi-hit geometry, per-hit slow bonus, pure mobility dashes, optional counter window; existing Cái Bang shapes remain valid.
- `combat.ts`: per-strike fractional armor penetration and current-status bonus in the common damage formula; one-hit evasion/counter before HP application.
- `progression.ts`: strongest nonstacking temporary movement/attack-speed bonuses in the existing source calculation; no additional progression system.
- `game-data/ability-schema.ts`, `thien-son.ts`, `m1.ts`, `progression-data.ts`: validated data and explicit ranks/school stats.
- `prepare-assets.mjs`, `skill-art.ts/json`: merge the two retained skill manifests into the shared registry; school-aware icon/stage bindings.
- `skill-vfx.ts`, `skill-menu.ts`, `ui.ts`, `skill-preview.ts`, `main.ts`: shared runtime animation phases, owner-associated wind effects, school-filtered builds and icons, extended real-server preview.
- `arena-scene.ts`: a new accepted A event restarts an already-active basic attack clip at rapid attack speeds; hit events do not. Shared VFX honors authored caster-front anchors and keeps a completed hit's short impact after target death.
- `MatchRoom.ts`, `game-protocol/index.ts`: normal school initialization plus bounded development-preview support for the two new basic IDs. All normal build changes still use M3B requests.
- School/selector avatar updates reuse existing idle PNGs. World size/camera and in-viewport layout remain unchanged.
- New deterministic/network/browser tests, asset audit and balance probe; Cái Bang browser expectations now derive combined registry counts and retain their ten-skill scope. The old unsupported-school case uses Võ Đang because Thiên Sơn is now supported.

## Verification / evidence

See `docs/evidence/m3c1/` for actual PNGs, asset inventory, runtime frame observations, mixed-school snapshots, Playwright report and balance JSON. No videos, GIFs or screenshot-stream traces are produced.

Focused checks already run during implementation:80 Cái Bang/progression tests passed;28 new core/asset checks passed; the mixed-school SDK test passed after extending its wait to cover the real pulse duration. Early browser iterations found and fixed the preview's inherited foreign legacy slot, the basic-input whitelist and an over-budget test upgrade. Final results follow below.

`tools/m3c1-balance.ts` ran48 eight-second legal build probes over levels1/6/15/30, both basics, optional ultimate and seeds42/1337/9001. Three stationary immortal defense5 targets produced aggregate DPS ranges181.5–191,348–392,601–691.25,985.75–1135.5. A attempts every2 ticks respect real cooldowns; rotating active attempts every6 ticks respect ranks/mana. This measures a stationary workload, not survival, economy, optimal human play, PvP or campaign balance. It is not directly comparable with M3B's18-tick manual-A schedule. JSON: `artifacts/m3c1-balance.json` (copied into evidence).

Development preview: start the server with both existing non-production flags `VOLAM_DEV_LEGACY_SKILLS=1` and `VOLAM_DEV_SKILLS=1`, open `?debug=1&skillPreview=1`, choose Thiên Sơn in pre-match selection, then choose any of its ten rank1 skills / both basics. Arrows set directional skills; arena practice enemies supply multiple targets. Mana/cooldowns and the same server/runtime effects remain active. Switching school uses pre-match selection, preserving the confirmed-school contract. Normal progression verification uses neither flag. The retained art-only gallery remains separately available at `?artPreview=1&thienSonSkills=1`.

### Final verified results — 2026-10-31

`pnpm check:final --config playwright.m3c1.config.ts tests/e2e/m3c1-preview.spec.ts tests/e2e/m3c1.spec.ts tests/e2e/skills.spec.ts` **passed**, exit0,458.57s. It ran project and tool/test typechecks,226 unit/network tests in20 files,two workflow checks,production build,nine current asset validators and eight real Chromium cases. The browser subset covers every Thiên Sơn active/both basics/four dash directions,two- and six-player ownership,normal point-funded mixed-school farming/rank changes/statue defense/cleanup,and all five existing Cái Bang skill scenarios. Actual log: `docs/evidence/m3c1/final-acceptance.log`. The existing large-bundle advisory remains nonblocking.

The broader24-case browser run initially passed19 and failed5. After correcting fixture positioning/input waits and separating both test services from the reporter process,all five affected cases passed in `isolated-services-smoke.log` (5.0min). The final canonical run then passed all eight selected cases. All24 distinct scenarios have passing latest results **across these runs**; this is not a claim of a single green24-case invocation. Accounting and exact cases: `docs/evidence/m3c1/verification-summary.json`. Earlier failed logs are preserved.

The M3C1 Playwright setup starts isolated normal/preview services with file-backed logs and separate Vite caches. Windows synchronous pipe output can block the parent event loop ([official Node process I/O documentation](https://nodejs.org/api/process.html#a-note-on-process-io)); attributing the earlier stale clock/input symptoms to reporter backpressure is an inference,supported by the corrected isolated-service runs. No production gameplay authority changes were made for test reliability.

All48 legal balance probes completed after the final mechanics changes,with the limits stated above. Retained source/public PNG+atlas hashes match for all20 wind components,and all89 protected Thiên Sơn baseline files remain unchanged. `assets/exports/skills/thien-son/runtime_integration_m3c1.json` records runtime status,registered tags,hashes and actual observed frame subsets separately from historical production manifests.

Actual PNGs and live frame/movement/ownership observations were inspected,including all ten skill previews,skill menu,dungeon avatar,shared farming/statue defense and six-player mixed wind/fire at normal gameplay zoom. Screenshots are under `docs/evidence/m3c1/`; no recordings were created. Dedicated hurt/death frames remain missing aliases; Thiên Sơn skill artwork was explicitly director approved on2026-10-31 (user: “skill artwork approved”); exact assets are recorded in `assets/approved_thien_son_skills.lock.json`; numeric tuning is provisional. M3C1 engineering/gameplay integration is complete. No Võ Đang/Thiếu Lâm combat or later milestone is implemented here.
