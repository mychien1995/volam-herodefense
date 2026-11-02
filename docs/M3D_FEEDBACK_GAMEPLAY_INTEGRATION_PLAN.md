# M3D — integration of approved playtest feedback and visual r3/review6

Worktree `wip/m3d/feedback-integration`, baseline integration `0b79e483`. Source of user decisions: `M3D_PLAYTEST_FEEDBACK_2026-11-02.md` and latest messages in this chat. This is an implementation checklist, not a claim that the changes have shipped. Do not merge `milestone/m3d`.

## Approval and final clarification

Director approved review6 visuals. Approval: `assets/m3d-feedback-review-r3/director_approval_r3.json`; batch03 register and321-file immutable lock: `batch03-remaining/director_approval_review6.json` and `approved_review6.lock.json`. Prior Ca Diệp/Phá Giáp locks remain unchanged. Frozen viewer/export metadata retains historical pending flags; approval register is authoritative for visual scope. No preview timing/trajectory/stat is gameplay authority.

All four clarification answers are confirmed:

1. While every connected player occupies the same boss instance, freeze **all exterior arena combat**: live creeps/invasion bosses, projectiles, statue damage and wave clock. Boss dungeon continues. Inviter enters immediately; accept teleports into that boss, refusal/timeout leaves player outside; invitations expire after30 real seconds.
2. First boss death automatically revives after5s at the dungeon entry, full HP/MP. Second death is a gray spectator with arrow-key camera. Spectator may leave to main arena, but re-entry stays spectator until that boss attempt resets. Exit/re-entry/reconnect never replenish revival. Only boss reset does.
3. Ca Diệp hits/stuns every eligible target on its path **once per target/cast** and continues. Sanskrit field triggers on first entry **once per target/cast**, no standing ticks or re-entry damage.
4. Director delegates initial test tuning based on existing tech and deterministic simulation. Preserve damage/mana/cooldown where possible, change explicitly requested values, keep all new numbers in data and report them. Do not borrow gameplay numbers from art viewer.

## Complete implementation checklist

| ID | Final behavior | State |
| --- | --- | --- |
| UI01 | Remove Đồng Đội Kết Nối button/feature; O martial arts, P dungeons, ESC closes overlay then quit confirmation; hotkey badges directly below buttons | implemented; verified, director gameplay review pending |
| UI02 | Dungeon order Lý Mạc Sầu → Hoàn Nhan Hồng Liệt → Chu Bá Thông → Kim Luân; boss I modal explains current mechanisms | implemented; verified, director gameplay review pending |
| TEAM01 | Creep dungeons private; bosses shared; remove access selector, enforce on server | implemented; verified, director gameplay review pending |
| TEAM02 | Help prompt, invitations only to peers outside that boss,30s realtime expiry, accept/refuse/timeout; repeat invitations do not include existing occupants | implemented; verified, director gameplay review pending |
| TEAM03 | Full exterior pause and wave-clock pause based on current connected occupancy; refusal/exit resumes; later re-entry can satisfy pause again | implemented; verified, director gameplay review pending |
| TEAM04 | Disconnect clears owned effects and occupancy; reconnect returns to main arena, stable player identity preserves per-boss life ledger | implemented; verified, director gameplay review pending |
| LIFE01 |5s first-death revival, second-death spectator, camera pan, exit/re-entry ledger, reset-only refill for every boss | implemented; verified, director gameplay review pending |
| CREEP01 | One approved sprite identity per wave, next wave differs; speed90% of owner's actual buffed speed captured on entry | implemented; verified, director gameplay review pending |
| MAP01 | Every boss arena width and height ×1.1 from current game, area ×1.21; replace previous0.8 proposal; update actual bounds/collision/spawn/exit/scenery without camera zoom tricks | implemented; verified, director gameplay review pending |
| AI01 | Increase boss movement and continuous appropriate close/ranged basics; Đạt Nhĩ Ba higher skill cadence/shorter telegraph; tuning separate | implemented; verified, director gameplay review pending |
| LMS01 | Wide360 whisk with approved +20% revision; body-centred needle out-ranges A Cái Bang Chưởng320 and A Thiên Sơn Phiến220 | implemented; verified, director gameplay review pending |
| LMS02 | Cổ Mộ randomly summons4/6/8 minions, every minion ranged; **Phất Trần Công unchanged** | implemented; verified, director gameplay review pending |
| HHL01 | A1 five blades from boss centre, range600→720; A2 one front180° melee arc, reach220×1.1=242; no flying arc | implemented; verified, director gameplay review pending |
| CBT01 | Keep current spin/ghost/ring/wind Túy Tiên Bộ, add player-directed basic palms during glide; no replacement airborne/dash choreography | implemented; verified, director gameplay review pending |
| CBT02 | Càn Khôn pull affects entire arena; Âm Dương ground circles move continuously without fixed lattice; keep accepted ground visuals, remove large_formation and rotating_waves overlays | implemented; verified, director gameplay review pending |
| KIM01 | Hoắc Đô exact original nail source/scale/pattern, brighter only; measured per-frame tip orientation correction; retain spin/whirlwind | implemented; verified, director gameplay review pending |
| KIM02 | Bất Động shield off/on between owners, no transfer beam; Đạt cadence tuning | implemented; verified, director gameplay review pending |
| KIM03 | Faster round basic wheel, new large fast hand-chop crescent, torso-centred emissions; seven Truy Hồn radial wall-ricochet wheels with existing20s life; seven Hộ Thể wheels orbit existing3s then release in7 directions | implemented; verified, director gameplay review pending |
| SCHOOL01 | Shift two charges retained, sequential8s recharge/charge; Võ Đang Quyền A and Võ Đang sword-qi knockback chance10% | implemented; verified, director gameplay review pending |
| CB01 | Thiên Hạ Vô Cẩu duration+30%, larger whirl AOE/final slam, restore fire dogs, correct ground contact; Phá Giáp raise→long ground slam only, no spin/charge/elongate hold | implemented; verified, director gameplay review pending |
| TS01 | Liệt Phong hilt begins above head; left cutting edge contacts first, correct facing/ground-break; use approved transforms | implemented; verified, director gameplay review pending |
| SL01 | Vi Đà forward eruption distance+50%; manual A punch/punch/kick/roundhouse+one crescent, no cooldown between first stages,1s after finisher, partial idle2s then cooldown1s | implemented; verified, director gameplay review pending |
| SL02 | Vô Ảnh longer reach/duration, three staggered parallel foot lanes from body centre; Toàn Phong straight gold tornado projectile, piercing once per target/cast | implemented; verified, director gameplay review pending |
| SL03 | Hoành Tảo replaced by Ca Diệp stomp→traveling mound, no player lunge; piercing damage/stun once per target/cast; retain stable ASCII ID/build compatibility | implemented; verified, director gameplay review pending |
| SL04 | Như Lai Niết Bàn Buddha behind caster→sky palm wide impact→finite stationary Sanskrit entry field; once/target/cast; retain defenses where applicable | implemented; verified, director gameplay review pending |
| SL05 | Tru Tà single attached enlarged melee slash, no projectile; Kim Quang readable owner-centred aura; Tam Giới renamed Sư Tử Hống with lion roar, wide damage/armor break/slow; stable IDs | implemented; verified, director gameplay review pending |
| ART01 | Consume exact selected frames/transforms/pivots/phases from approved batch01, batch02review3 and batch03review6; loader/registry/render bind real server events/effect IDs, cleanup cancel/death/travel/reconnect | implemented; verified, director gameplay review pending |
| QA01 | Deterministic combat/invitation/pause/life tests; protocol validation; live normal-zoom Phaser frame/reference PNG checks, multiplayer reconciliation and final six-player gameplay/readability | implemented; verified, director gameplay review pending |
| DOC01 | Record actual test tuning and results here/feedback handoff; final `check:final` after last implementation change; canonical skill/design MD reconciliation after actual merge as director requested | handoff verified; canonical docs/memory after actual merge pending |

## Implementation order and acceptance

1. Protocol/core lifecycle: fixed dungeon access, connection identity, invitations, pause clocks and per-attempt lives. Separate room realtime deadlines from paused arena/zone clocks. One authoritative instance/attempt identity controls counters.
2. Data-driven school/projectile/area behavior and boss AI/maps. Maintain exact localization and stable ASCII IDs; preserve existing unrelated progression/items/loot rules.
3. Integrate frozen visual references into production Phaser; geometry and authoritative hits come from tech, never frame callbacks. Diagnostic review viewer remains frozen.
4. Implement in-viewport UI/spectator camera; retain dominant game viewport and keyboard controls.
5. Focused tests during iteration; deterministic balance report; after final implementation run one relevant `pnpm check:final` with real Phaser/multiplayer coverage. PNG plus motion/state observations, never routine video/GIF.

Post-merge canonical documentation updates remain deferred until merge actually happens. No merge is authorized here.

## Implementation progress (not final acceptance)

- Added per-instance boss attempt generations, life ledger,5s auto revival/spectator, fixed access, realtime invitations, disconnect/reconnect and a separate paused arena clock. `tests/m3d-feedback-party.test.ts`:7 passing core cases, covering all four bosses.
- Added data-driven line strikes, delayed projectile release, per-target projectile combo context, one-entry residual fields and manual basic-chain recovery. `tests/m3d-feedback-skills.test.ts`:8 passing core cases, including piercing Ca Diệp, Sanskrit re-entry, six staggered foot projectiles and one finisher per four manual A presses.
- Initial school trial values live in `packages/game-data/src/m3d-feedback-tuning.ts`; damage/mana/base cooldown retained except the explicitly requested A/Shift changes. Skill IDs remain stable while Ca Diệp/Sư Tử names change.
- Boss tuning in their existing data files: LMS speed115,360 whisk reach144, needle864/speed480,4/6/8 ranged minions; Hồng Liệt speed130, A1 five720-range blades at existing configured projectileSpeed600 and shared once-per-cast hit group, A2 front semicircle242; Kim/Đạt/Hoắc speed145/105/180, basic wheels620, new crescent760, seven ricochet/orbit wheels. Boss ability cooldowns no longer block every other ability through a single actor timer. Chu keeps24s spin phase and existing visual body, with basic palms every1.1s during permitted phases; whole-arena pull; only moving ground rings damage in ultimate.
- All boss geometry increases linearly1.1 from the pre-feedback maps, including authoritative collision/spawn/exit/emitter/bounds and retained layered tile/scenery presentation. New approved arena concept PNGs are imported as menu illustrations; they are not falsely labelled tilemaps.
- Production importer checks all three immutable approval locks and builds71 components/346 selected tags. R3 painter/registry now consumes authoritative action/projectile/area clocks.17 landmark mappings use16 original transparent scenery frames; retained Tiled floors/collisions are not replaced by flattened concepts. Runtime director acceptance remains pending.
- Superseded private-boss, five-wheel, old-speed/coordinate and instant-A1 fixtures are reconciled with the confirmed contract, retaining boundary/hit/cleanup/reward assertions. All522 unit/integration and18 workflow tests pass. Live boss lifecycle, revised cast facings, retained hold/blink/burn and six-client natural invasion/rewards pass in focused runs; final production pipeline PASS619.43s (522 unit/integration,18 workflow,15 validators,6 browser), plus a capture-only phase/landmark case PASS. Read docs/M3D_R3_GAMEPLAY_HANDOFF.md for tuning, remaining presentation limits and exact evidence.
