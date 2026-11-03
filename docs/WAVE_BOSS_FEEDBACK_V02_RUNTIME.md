> Latest gameplay override: [V03 boss playtest feedback](WAVE_BOSS_FEEDBACK_V03_RUNTIME.md) adds combat banter, terminates Mục Hạ on failure/timeout and makes the small finger a concurrent fixed-five channel. Frozen V02 review assets remain unchanged.

# Approved cumulative wave boss feedback — 2026-11-03

Director: “Duyệt VFX. Ghi nhớ toàn bộ feedback của tôi. Hãy tích hợp vào Phaser cùng toàn bộ feedback còn lại, đảm bảo animation trong game nét và đúng như preview.” Approval and immutable input hashes: `assets/approved_wave_boss_feedback_v02.lock.json`. This is authorization to integrate the latest v02 preview and every remaining feedback item. The pre-integration production hashes in its manifest are historical evidence; retained art and reviewed preview inputs remain immutable.

## Canonical feedback ledger

Earlier changes remain in `WAVE_BOSS_FEEDBACK_RUNTIME.md`. Later feedback below supersedes the corresponding earlier mechanics, including immediate Ma Ảnh after a long pull and Thiên Hạ's pull/slow/slam or stationary central boss.

| Area | Approved behavior |
| --- | --- |
| Shared wave arena | All wave bosses inherit Đông Tà's circular arena, faint wall, hidden/protected statue, recall, revival and wipe retries. Common Tây Độc-style HP presentation stays. |
| Skill announcements | Every boss, including dungeon bosses, displays the exact Vietnamese special-skill name overhead once per cast. Normal attacks stay silent. This is text, not recorded speech. |
| Đông Tà | Retain random triangle/square/diamond/Z normal sword dashes and peach petals from v01. |
| Mai — Bạch Cốt Trảo | Two long frontal opposing claws: one top-down, one bottom-up, travel to200px at the approved raster scale. |
| Mai — Âm Phong | Quick tug close to Mai; Shift disabled5s from tug start. After tug completes, exactly0.8s before first Ma Ảnh release, allowing walking dodge. Each released projectile remains straight. |
| Tây Độc — pillars | Border snake pillars face inward and fire three inward directions. Use the approved new larger/brighter snake projectile, never enlarge the old projectile. |
| Tây Độc — normal poison | Use the approved separate larger/brighter poison projectile. Retain slower needles (−20%) and clearer v01 poison pool. |
| Tây Độc — Cáp Mô | Radius405→364.5 (−10%); warning, core/rim/fragments agree. Preserve sharp retained raster components. |
| Nam — small finger | Approved gold blaster projectile, random1–5 shots per burst. Re-aim each release at the selected living player's current position; straight flight afterward. |
| Nam — Liên Hoàn | Rotate1.5× as fast, retaining four directions and16volleys. |
| Nam — Phật Quang Phổ Chiếu | Wave hand once. No connecting beam or hand charge. Keep approved light on one player and the existing authoritative confusion mechanic. |
| Nam — Nhất Dương Quy Tông | Dash to arena center, then96falling rays (three times density in the same window). Every warned footprint stays inside the arena; warned points stay fixed. Rays descend from above. |
| Nam — prior rework | Retain half charge for Nhất Dương Chỉ, sharp tiled beam, dash-behind50/50 aura or small finger, and approved palm shockwave. |
| Bắc Cái — dialogue | “Ai còn nhớ lời lão phu?” replaces the rejected question. No preference chatter during Mục Hạ Vô Nhân; opening skill announcement remains. |
| Bắc Cái — Thiên Hạ Vô Cẩu | Original boss plus eight clones: **all nine spin while moving independently to random destinations in the arena**, including original boss. No circular orbit, stationary center actor, pull, slow, slam or Shift lock. Moving damage zones follow all nine. |
| Bắc Cái — prior rework | Mục Hạ formation centered on arena; dash to center before faster Phi Long; natural AI uses Bổng Đả Ác Khuyển. |
| Transition | Nam's corpse disappears before Bắc Cái enters. Preserve rewards and boss gates; don't treat a preview-only demo as a runtime fix. |

## Production contract

Copy exact approved PNG/frame rectangles, pivots and durations. Match preview scale/opacity/depth/timing at normal gameplay zoom, configure nearest filtering once, and verify motion in the running production Phaser client. Server owns RNG, paths, releases, bounds, damage and statuses. A shot can re-aim only before release; animation never decides damage. Keep dungeon life ledgers, inventory-v2 future scope, wave cadence, rewards and controls intact.

## Integration status

Implemented and verified in protocol28. Mai tug duration rounds to5ticks (≈0.167s at30Hz); the following dodge window is exactly24ticks/0.8s and Shift lock is150ticks/5s. Gold0.16s and sky18/s releases use rounded per-index tick timestamps, preserving cadence without cumulative rounding drift. Approved source artwork is unchanged; no new art was generated in this integration.

`pnpm check:final --config playwright.wave-boss-feedback.config.ts` passed preparation, both typechecks,18workflow checks and714unit cases before stopping at occupied Chu test port2798. The same test passed on isolated2938with original source hash unchanged; combined715unique cases. Production build,20canonical asset validators and exact127input/native PNG/frame guards passed. The original failed report is retained. No occupied service was stopped or borrowed.

Production browser coverage is3unique cases passed across scoped retries: two Phaser clients; six real network clients (two Phaser/four SDK) with full-HP natural AI clears; and four dungeon skill announcements visible above boss heads within the viewport. Initial SDK join orchestration failed before combat and was fixed to await server acknowledgements; only that stage was retried. A mismatched test build endpoint was rejected and rebuilt correctly, without weakening the identity guard. Test-only positioning/cast prerequisites remain isolated middleware; no campaign/recording or six-renderer performance claim.

All16new cels were observed in the running production Phaser client. Actual PNGs were opened at gameplay zoom, including six-peer9spinner/96ray views and in-frame dungeon announcements. Natural boss clears: Đông Tà19.23s, Tây Độc2.286s, Nam Đế26.809s, Bắc Cái64.616s; these bot times are not balance approval. Statue remained2000/2000 and no wave items appeared. Separate768seeded20s exposure probes completed in46.45s with protected statues and zero items; bots do not model human dodges, clone guesses or votes.

Evidence and exact commands/results: `docs/evidence/wave-boss-feedback-v02-runtime/verification.json`, `two-client.json`, `six-client.json`, `dungeon-shouts.json`, `balance.json/csv`. Owned QA services closed. Restart client/server via `start-game.cmd` and create a new room for protocol28. Preview approval is recorded; final in-game art judgment remains separate. No push/deploy or inventory-v2 migration.
