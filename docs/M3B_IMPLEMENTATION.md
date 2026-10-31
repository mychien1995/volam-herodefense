# M3B — Character progression, ranks and loadouts

Scope: functional Cái Bang character builds, shared progression/stat contracts, existing M3A art and combat. No other-school combat kits, new sprites, equipment, crafting, bosses, PvP or campaign expansion. Stop after M3B.

## Audit and rules

Read the requested design documents, the repository workflows, M3A implementation, server/zone ownership, reward pipeline, hotbar and modal/input handling. Inspected the mandatory world/menu references and rejected prototype screenshot. The old `vo_dang_art_direction_reference.png` alias remains absent; the documented actual Võ Đang reference was already inspected during M3A. Current in-game reference exists. Existing Phaser4.2.1, Colyseus core0.18.23 / SDK0.18.8 / Schema5.0.42 are retained. Official room/schema/animation guidance and bundled Colyseus schema references were consulted; one official schema fetch timed out, so nested-schema constraints were also checked in the bundled reference.

M3A already supplies all ten mechanics, per-ability cooldown debt, status/action cleanup, fixed EXP/gold pools, generated cast/VFX atlases and icons. Those systems are reused. `docs/M3B_RULES.md` records the selected defaults and cooldown/refund policy **before implementation**. Confirmed rules remain separate from provisional numerical tuning.

- Level1 starts with one available point, no learned active ranks and four empty slots. A is available independently. Equip a skill for free, then spend one point to learn rank1. Each later rank costs one point.
- Existing cumulative60-EXP-per-level formula is retained. Level=min(30,floor(EXP/60)+1); EXP caps at1740. Level30 HUD shows MAX. One point is earned per level, including level1, never above30.
- Standard gates1/3/5/7 and cap4; ultimate gates6/10/14 and cap3; at most one optional ultimate in any slot. No R-only rule was found. No duplicate skills or cross-school assignments. These gates/caps are documented proposals, exposed in game data.
- Allocations belong to the current four-skill build. Moving an equipped skill preserves its rank; removing it refunds its ranks. Reset refunds all allocations and retains slot choices at rank0. No hidden unequipped rank bank. Reset is free.
- **Earned = allocated + available + surplus**. Surplus is zero until all four nonempty slots contain maximum ranks; then all remaining points become surplus and available becomes zero. At level30, four normal skills give16 allocated/14 surplus; three normals + one ultimate give15/15. Replacing/removing/resetting a skill removes surplus immediately.
- Only living heroes in the central arena may change builds or A. Dungeon/PvP information is read-only. Defeat blocks changes. Menus do not pause simulation, warnings or hero vulnerability.
- Ability cooldown expiries remain keyed by canonical ID across swaps, removal, upgrades, resets and relearning. A has one shared cooldown across styles. Travel preserves remaining duration. Changes never shorten existing debt or refill resources. Own temporary actions/projectiles/self buffs cancel; hostile control is retained. Already applied enemy statuses keep their existing M3A local expiry semantics.

## Stats and rank tuning — provisional values

Stat sources are separately derived: school base + growth × (level−1) + innate × (level−1) + surplus × points + zero reserved equipment + authoritative temporary effects, then clamps. Totals are not added back into themselves. Equipment is a reserved zero layer, without any equipment gameplay/API.

| Stat | Cái Bang base | Growth per level after1 | Tiêu Diêu per level after1 | Per surplus point |
|---|---:|---:|---:|---:|
| HP |160|8|0|0|
| MP |100|2|0|0|
| Attack Power |28|2|0.3|1.2|
| Defense |0|0.15|0|0|
| Attack speed |1×|0|0|0|
| Movement speed |160|0|0|0|
| Critical chance |10%|0|0.2 percentage points|0.3 percentage points|
| Critical multiplier |1.5×|0|0.005|0.01|
| MP regeneration |6/s|0|0|0|
| Cooldown reduction |0|0|0|0|
| HP regeneration |0|0|0|0|

Crit chance clamps to75%, CDR40%, attack-speed multiplier0.25–3. All coefficients/clamps remain proposed balance. Tiêu Diêu has stable ID `tieu_dieu_cong`, consumes no points/slots and retains M3A offensive growth. Metadata lists the other schools' canonical passives and two basic IDs without enabling their kits.

Raw direct damage = configured rank damage + (total Attack Power − school base Attack Power). Existing armor/crit/RNG pipeline then applies. Zero-damage control stays zero. This preserves level1/rank1 M3A damage. Defense mitigates incoming damage; attack speed affects A cadence; movement, mana regeneration and CDR feed actual simulation. Level growth grants added HP/MP capacity while alive; it cannot revive a dead hero. Build changes only clamp existing resources, never heal/refill.

| Skill | Explicit rank improvements, starting from exact M3A rank1 |
|---|---|
| Hỏa Vân Chưởng | Damage18/22/26/30 per shot; three shots retained; CD3/2.9/2.8/2.7s; MP18/20/22/24 |
| Cuồng Long Loạn Vũ | Blast32/40/48/56; burn4/5/6/7 per second; burn3/3.5/4/4.5s; radius58/62/66/70; MP25/27/29/31 |
| Phi Long Tại Thiên | Damage36/43/50/57; knockback64/72/80/88; range240/252/264/276 |
| Kháng Long Hữu Hối | Crit+30/34/38/42 percentage points; crit multiplier+0.75/0.85/0.95/1.05; duration6/6.5/7/7.5s |
| Hàng Long Hỏa Vũ | Damage90/115/140; range440/470/500; radius48/52/56; MP45/50/55; CD20/19.5/19s |
| Hoành Tảo Bổng | Damage40/46/52/58; slow40/43/46/49%; duration3/3.5/4/4.5s |
| Phá Giáp Bổng | Damage55/63/71/79; defense break20/25/30/35; duration5/5.5/6/6.5s |
| Cầm Long Công | Pull90/100/110/120; range160/172/184/196; silence/disarm2/2.2/2.4/2.6s; MP22/24/26/28; no damage/stun/movement lock |
| Truy Phong Bổng | Damage44/50/56/62; dash140/150/160/170; stun1/1.1/1.2/1.3s |
| Thiên Hạ Vô Cẩu | Four pulses18/22/26 each; finisher75/95/115; pulse radius90/96/102; finisher110/116/122; existing cadence retained |

All unlisted properties retain M3A values. These are mechanic-specific rank configurations, not one universal damage multiplier. Authoritative rank variants retain canonical ability IDs, so existing sprites and semantic VFX mappings continue to work without new art.

## Authority and architecture

`game-core/progression.ts` owns pure point/stat calculation, EXP, rank lookup and atomic build commits. `DungeonMatch.modifyBuild` validates actual zone/life/defeat and a shared monotonic sequence; no client location is accepted. `build-action` messages request loadout, upgrade, reset or basic choice with an expected revision. Strict payload validation rejects extra level/EXP/point/stat fields. The server checks ownership, gates, budget, duplicates and ultimate count before committing. Replays/stale concurrent edits cannot spend/refund twice. Level gains also invalidate stale revisions.

Protocol7 nests build/rank/stat state under each existing player, staying below Colyseus's63-field-per-schema limit. Existing StateViews/events still filter spatial/effect state by zone. Same-room party build metadata does not spawn effects across instances. Another player's progression never enters the calculation.

Normal rooms enable progression for Cái Bang. Existing historical M1/M3A combat fixtures explicitly opt into non-production `VOLAM_DEV_LEGACY_SKILLS=1`; arbitrary rank1 preview loadouts additionally require `VOLAM_DEV_SKILLS=1`. Production ignores both flags. Normal M3B play needs neither. The server checks this rather than trusting room creation or input payloads. Unsupported schools receive no foreign Cái Bang active defaults and cannot select Cái Bang attacks through build requests; their pre-existing A prototype remains outside M3B. No new kit/stat balance is claimed for them.

## In-game UI and art

Open the existing diamond/point badge beside A/QWER, or Settings → Võ Học. The framed jade/gold overlay contains both style sections, all ten M3A icons, rank/gate/current/next-rank information, four draft slots, independent A selection, free reset, point ledger and live stats/passive/surplus sources. Drafts commit through the server; moving/removing/refunding never changes other players. Outside the arena the same information is read-only. Escape closes and restores gameplay focus. Full canvas size and invasion/defeat notification layers remain intact.

The HUD shows available points, actual ranks and unlearned/unavailable state; mana/CD use the effective rank definition. Stable menu DOM avoids rebuilding icons on every30Hz world tick. Existing PNG frames/icons, atlases and generated VFX are reused. **No new artwork or Aseprite export was produced for M3B.** Approved-file guards and PNG/JSON validation remain part of final verification. Legacy hurt/death and unapproved world/dungeon art are not declared finished by this feature.

## Verification checkpoint

Focused checks actually run:

- `pnpm check:quick tests/cai-bang-skills.test.ts tests/skill-assets.test.ts`:28 passed; M3A mechanics/asset contracts preserved.
- `pnpm check:quick tests/progression.test.ts`:32 passed at the initial checkpoint; additional real-stat and hostile-control cases were subsequently added for final validation.
- `pnpm check:quick tests/progression-room.test.ts tests/skill-room.test.ts`:7 passed at that checkpoint.
- `pnpm check:quick tests/progression.test.ts tests/progression-room.test.ts`:38 passed before the final hostile-control case was added.
- Focused real-browser checks passed the compact/large menu scenario and both two-client gameplay scenarios. They used actual keyboard/mouse actions and earned combat EXP; no XP/rank/hero-HP injection or client simulation. Isolated server uses30s invasions and high statue HP only, preserving production180s timing and normal hero/enemy tuning.
- `pnpm --filter @volam/game-server exec tsx ../../tools/m3b-balance.ts`:48 legal eight-second probes, levels1/6/15/30, both A styles, mixed normal/ultimate builds and seeds42/1337/9001. Outputs under `artifacts/m3b-balance.json` and copied evidence. Damage/second ranges58.25–93.375,166.75–246.375,293.75–486.75,579.25–1083 respectively. Level30 Attack Power111.5/112.7 with14/15 surplus. Stationary immortal targets, three-target aggregate, no gear; these are not sustained optimal DPS, survival/economy/campaign/boss/PvP or six-player performance claims.

Early browser failures were investigated rather than counted as passes: an idle participant died during another player's test; a route tried to cross the solid statue pedestal; a warning assertion waited less than the server's remaining lead time. Tests now use a safe idle position, valid routes and actual warning-state polling. One diagnostic trace archive was corrupt after gameplay assertions, so this suite uses PNG/state/frame evidence with tracing/video off. No recordings were made. Initial formatter writes on three files were transiently unavailable; patch formatting and subsequent checks resolved them.

Final command actually run:

```powershell
pnpm check:final --config playwright.progression.config.ts --grep-invert 'two clients agree on combat'
```

**PASS,362.02s total.** One preparation, project compilation and test/tool typecheck;2 workflow tests;174 unit/network tests across17 files (26.74s Vitest duration); production build; all6 current asset validators;16 Chromium browser scenarios (5.4min). The new progression cases cover independent earned builds/real farming and respec, open-menu control/warning behavior plus actual invasion hits, compact/large viewport bounds, and unsupported-school ownership. The other12 cases cover shared/private dungeons, movement/camera/occlusion, straight projectiles, animation registry, late joining and viewport/focus/menu recovery. No page/console/asset-loading errors were detected by the checked scenarios. Existing large-client-chunk advisory remains.

The old M1 test assuming two free level1 skills is deliberately retained in the explicit M3A legacy configuration; normal M3B learns skills with real points. The existing input-recovery regression now learns Q through the real UI and verifies unlearned W does not cast. One first final attempt stopped on an untyped balance-result array; a later run passed all173 then-current unit tests but found an old English rejection-text assertion. Both were corrected, the unsupported-school guard/test was added, and the final174/16 run above passed. Earlier failed runs are not reported as successes.

Additional targeted verification after the full pipeline: the same compact/large scenario gained explicit visible hotbar-rank1/point0 assertions and an actual PNG; `pnpm check:browser --config playwright.progression.config.ts tests/e2e/progression.spec.ts --grep 'stays inside compact'` passed (14.3s Playwright,23.02s whole helper). The probe output was corrected to use an absolute repository artifact path, rerun with identical48 results, and tools typechecked. Later report/script-selection metadata changes do not alter runtime behavior; no successful full suite was repeated solely for them.

Final asset validators reported23 runtime PNG entries /680 frame references in the shared main manifest, plus ART-01/arena-v2 and approved school-source guards. These include concurrent other-character art already present in the shared checkout, not M3B art production. The Cái Bang skill-contract test separately verifies21 skill components /464 frame references; live M3B clients loaded21 components and registered105 tags. Only the learned skills exercised in the M3B scenarios are claimed as newly observed gameplay motion; the unchanged M3A pack's earlier full observations remain historical evidence.

Actual gameplay PNGs (not concepts): `skill-menu-1280.png`, `rank2-mixed-loadout.png`, `dungeon-readonly.png`, `menu-invasion-warning.png`, `two-player-casts.png`, `skill-menu-944.png`, `skill-menu-1920.png`, `hotbar-rank-1920.png` under docs/evidence/m3b. They were opened and visually inspected. State/frame evidence is in independent-builds.json and live-effects.json. Level30/cap/surplus are deterministic core and real-SDK fixtures, not a claim of a manual level30 full-match playthrough. PvP is unavailable; its edit restriction is tested as zone ownership, not a live duel.

Reproduce the four M3B browser cases with `pnpm test:e2e:progression`; reproduce numeric fixtures with `pnpm test:balance:m3b`. Final command/result metadata is in docs/evidence/m3b/verification-results.json.

## Manual test

Restart the server and refresh all clients for protocol7. From the repository root, run `.\start-game.cmd` (normally open `http://127.0.0.1:5173`). Clear `VOLAM_DEV_LEGACY_SKILLS` for normal progression; no development flag is needed. Choose Cái Bang in two clients.

1. Open Võ Học. Put Hỏa Vân Chưởng in Q and any Bổng skill in W; apply, then learn one using the initial point. Choose either A style independently.
2. Close with Escape. Fight arena practice/invasion creeps or enter Rừng Trúc. Earn60 EXP to level2,120 cumulative to level3. Both pools are the same character. Q/W/E/R only cast learned equipped ranks; A always follows the independent style.
3. Open the skill menu in the dungeon: information remains visible, edits are disabled. Walk to the physical exit to return.
4. Upgrade a rank at its gate, swap skills and reset in the arena. Observe point refunds, rank badges, stat changes and cooldown debt. Other player's build stays unchanged.
5. At level30, fully rank four normals for14 surplus, or three normals + one ultimate for15. Remove/reset a slot to remove bonuses. Repeated reset is free and cannot multiply points, HP/MP or stats.

## Changed files and remaining decisions

- Core: new `progression-types.ts` / `progression.ts`; integrations in `types`, `simulation`, `skills`, `combat`, `dungeons`, exports.
- Data: new `ability-schema.ts` / `progression-data.ts`; existing ability validation factored without changing rank1 values; `m1`, `schools` and exports updated.
- Network/server: protocol7 nested build state and strict requests; MatchRoom initialization/validation/synchronization and health milestone.
- Client: new `skill-menu.ts` / CSS; UI/main request binding, point/rank/EXP hotbar/HUD state; original arena/camera/art retained.
- Tests/tooling: progression unit/SDK/browser tests and isolated setup/config; explicit historical sandbox fixtures; default suite exclusion;48-probe tool and package scripts.
- Documentation: rules audit, this report, ROADMAP, DECISIONS, COMBAT_SYSTEM, BALANCING, ACCEPTANCE_TESTS and architecture checkpoints; actual PNG and state/frame evidence in `docs/evidence/m3b/`.

Remaining balance proposals: gates/caps, rank values, MP/defense growth, surplus coefficients, clamps and existing EXP pacing. No final balance approval is claimed. No other-school combat, equipment/crafting, boss dungeons, PvP, production20-wave content or M3C is implemented. Integrated UI remains available for director review; previous world/character art approval statuses are preserved.
