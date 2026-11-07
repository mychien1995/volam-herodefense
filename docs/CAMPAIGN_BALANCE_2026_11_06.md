# Campaign balance, boss progression and retries — 2026-11-06

Director approved the entire chat proposal and requested implementation and related documentation. This supersedes historical constant-60 EXP, per-creep production rewards, one-revival dungeon life, automatic unlimited wave-boss retries, invasion no-Long-Châu, and immediate post-Bắc-Cái final entry. Other combat, school, crafting, ownership and PvP rules remain intact. Numeric values are the first configurable campaign tuning, not a claim of measured human victory rates.

## Production configuration

`packages/game-data/src/campaign.ts` validates the authored campaign definition. `MatchRoom` enables it for normal matches. Explicit existing legacy progression/skill fixtures and DEV creep/wave-boss previews keep their own historical tuning; they are not production balance evidence. Protocol **35**, matching services and a new room are required. Existing uncommitted Vương Trùng Dương integration is retained.

| Before encounter | Target level | Total earned gold/person | Intended readiness |
| --- | ---: | ---: | --- |
| Đông Tà (~15 invasion minutes) | 6, first ultimate | 450–650 | Mostly basic stars1–2; next Lý Mạc Sầu |
| Tây Độc (~30) | 12, ultimate2 | 1,500–1,800 | Crafted boots, other basics~3; next Hồng Liệt |
| Nam Đế (~45) | 18, ultimate3 | 2,700–3,100 | Crafted boots+armor; next Chu Bá Thông |
| Bắc Cái (~60) | 24, ultimate4 | 4,000–4,600 | About three crafted slots; next Kim Luân |
| Vương Trùng Dương, after Kim | 26–28 | 5,000–5,600 | Four crafted slots attainable |

These are playtest targets, not forced level/gear locks or free rewards. Invasion minutes differ from wall time because existing all-in-one-boss pause and the newly approved ballot pause remain.

## Experience and money

Level L→L+1 costs `80 + 40*L`. Cumulative thresholds: L6=1,000; L12=3,520; L18=7,480; L24=12,880; L30=19,720. The five-slot branch, earned points, standard1/3/5/7 and ultimate6/12/18/24 gates are unchanged. No free ultimate rank is granted.

Farm EXP is multiplied by0.25 at two or more levels above the current defeated-master chapter target6/12/18/24/28. First-clear boss EXP bypasses this farm penalty. Fractional farm EXP/gold is retained in server-owned character remainders, so dense streams do not lose small rewards to integer rounding. EXP cap and HUD progress use the same thresholds.

| Chapter | Invasion EXP pool/wave/solo | Gold pool/wave/solo | Dungeon EXP/creep | Dungeon gold/creep |
| --- | ---: | ---: | ---: | ---: |
| Before Đông Tà |100|70|3|0.8|
| After Đông Tà |300|100|5|1.5|
| After Tây Độc |450|130|8|2|
| After Nam Đế |650|160|11|2.5|
| After Bắc Cái |650|160|14|3|

Invasions use wave1–5/6–10/11–15/16–20 chapter budgets, independently of delayed boss attempts. Their fixed pool is distributed across the actual scheduled creep count and scales by the room's snapshotted participating population. Each creep still splits its pool among eligible kills/assists. Two versus four gates change density, not total reward. Private dungeon pools remain personal. Their reward chapter follows the same elapsed-time floor as their threat; the over-level EXP penalty still follows actual defeated-master progression. Merely being connected never grants kill EXP.

Each new campaign character starts with five small HP potions and five small mana potions, including late entrants. The initial stock counts toward the 20-potion limit and uses the normal shared five-second cooldown. Travel, respawn and reconnect carry forward the inventory.

Basic shop prices/stat bonuses and potion prices/recovery/cap/shared5s cooldown are retained. The basic5 set costs2,035; all four crafted slots cost4,185 before potions. Full scheduled waves plus all eight first boss rewards supply4,570 gold/person when pools are shared evenly; the remaining farm/travel/potion choices determine actual completion time. No starting-gold grant, trading, resale or transferable drop is added.

## Boss pools and Long Châu

| Boss | Solo HP | First EXP pool | First gold pool | Long Châu |
| --- | ---: | ---: | ---: | ---: |
| Đông Tà |6,200|300|180|8%|
| Tây Độc |14,000|400|250|8%|
| Nam Đế |26,000|600|350|8%|
| Bắc Cái |38,000|1,400|450|8%|
| Lý Mạc Sầu |7,200|150|140|4%|
| Hoàn Nhan Hồng Liệt |17,000|300|200|4%|
| Chu Bá Thông |12,000|500|300|4%|
| Kim Luân Pháp Vương |45,000|1,700|400|4%|
| Vương Trùng Dương |48,000|350|800|none|

Every qualifying character who actually damaged the main boss and remains in its world at the damaging death receives their own first-clear stat growth. Dead spectators still present qualify; absent/disconnected characters do not. First-clear keys are match+character+stable boss ID, retained across travel/reconnect/retries. Boss EXP/gold is a room-scaled fixed pool split over eligible participants; an already-rewarded character's share is withheld, not redistributed. Repeated kills cannot generate more boss EXP/gold or pearls. Dungeon material eligibility and repeated material rewards remain unchanged; Kim disciples alone do not qualify for main-boss rewards.

Long Châu applies immediately, with a visible owned count in campaign state. Each adds the stated percent to school base+level growth+innate **HP, MP, attack power and defense**, before equipment and temporary effects. Percentages add, never compound; all eight give48%. Movement/attack speed, crit, CDR and regen are unchanged. There is no roll, sale, transfer or new ground item. This intentionally authorizes wave-boss Long Châu despite the older no-invasion-item wording.

Vương Trùng Dương requires the four real master defeats **and an actual team Kim Luân clear**, followed by60 seconds of preparation. Prerequisites never infer a boss clear from a timer or a vote. Failed final music mechanics retain their canonical whole-attempt loss.

## Density and population scaling

Four invasion gates are the default; creator choices2/3/4 remain. Streams last60 seconds, on the retained180-second invasion clock. Four-gate solo density is approximately120/140/160/180 creeps per chapter. Tick rounding determines actual counts; reward budgeting uses those actual counts.

Population P is connected participating room population, not lobby occupants. Invasion count/cadence uses`1+0.60*(P-1)`, HP`1+0.20*(P-1)`, damage`1+0.06*(P-1)`. At P6 these are4× count,2× HP,1.3× normal damage. Boss HP uses`1+1.10*(P-1)` (6.5× at six); ordinary boss damage uses the damage coefficient. Explicit direct-HP/fractional boss mechanics and reflected damage do not receive that multiplier.

HP population snapshots can rise on a later join while preserving the boss's remaining-health fraction; death/disconnect cannot lower the current attempt's established maximum. A new attempt resnapshots. Private creep dungeons use lighter room population coefficients: count+10%, HP+8%, damage+4% per extra player.

Dungeon floor chapter is the greater of actual master progression and elapsed invasion-clock time/900 seconds, capped at four. HP floors1/1.5/2.2/3/3.8, damage floors1/1.2/1.45/1.7/2. Existing per-wave HP/damage growth continues. Existing instances retain wave progress across travel; each new wave snapshots the current floor. Six authored sprite identities cycle modulo six forever, independently of growing stats. No new sprite generation or animation-driven damage is introduced.

## Three revivals and retry ballots

- Each encounter attempt grants each participant three revivals, **four lives total**, across all five wave bosses and all four dungeon bosses, including the Kim disciple stage.
- Each death consumes one available revival and schedules full HP/MP recovery after5 seconds at the encounter entry/arena center. Skill, dash and item cooldown debts remain. Fourth death becomes spectator. Pending revivals prevent a premature wipe. A first-clear pearl does not itself refill HP/MP.
- The ledger is tied to the encounter generation and character. Travel/reconnect does not grant fresh lives. Disconnect during a live attempt forfeits that life; a real reset/new attempt creates a fresh ledger.
- Once every present connected participant is eliminated, freeze the encounter, cancel hazards/summons/actions and open an in-viewport30-second ballot. The invasion clock pauses while any ballot is open; no time is rewound, no statue repair occurs. Other inventory/menu opening still does not pause anything.
- Snapshot the electorate at opening. Required yes=`ceil(N/2)`:1/1/2/2/3/3 for N1..6. Votes are one per identity+ballot, validated server-side, with stale/duplicate/outsider payloads rejected. Abstentions and disconnected/departed yes voters do not count as yes; denominator stays fixed. Resolve once all have answered or the30-second deadline expires, so every participant gets a chance to decline.
- Passing restarts the same boss at full HP and clears old hazards. Yes voters receive three fresh revivals and full HP/MP. Dungeon dissenters return to arena; wave dissenters spectate until that boss ends. Keep level, gear, pearls, statue HP and overall match progression.
- Failure/timeout returns the team to arena and leaves the boss uncleared. The in-viewport **Gọi đánh lại boss** action can reopen the encounter later. Wave boss waiting does not silently clear the gate or auto-retry. Regular world progression resumes outside the ballot.
- Successful potion uses during the failed attempt are refunded exactly once at wipe. Purchases/crafting are rejected during a locked wave boss; dungeon purchase restrictions remain. Existing cooldown debt is retained. Winning attempts keep actual potion consumption. Summons and retries cannot generate additional EXP/gold, materials or first-clear rewards.
- Vương Trùng Dương's failed music mechanic ends the entire attempt even when personal revivals remain, then opens the same ballot.

## Verification and limits

Focused regression: `tests/campaign.test.ts` covers thresholds, real damaging rewards, six-sprite cycling/time floor, population budgets, first-clear/material ownership, final gate, all nine encounter life paths, N1..6 ballots, timeout/refund/travel/reconnect, malformed input and the actual failed final-music path. Existing progression/economy/invasion/dungeon tests are retained.

`tools/campaign-balance.ts` emits`artifacts/campaign-balance.json`:144 fixed-seed legal five-slot DPS probes and24 five-minute private-dungeon farm probes. Bots do not provide a60-minute campaign, optimal human dodge/pathfinding, PvP, statue-survival or final victory-rate acceptance. Gear and invulnerability are disclosed fixtures, never production grants. Target level/gold ranges must be evaluated in normal human playtests.

`playwright.campaign.config.ts` uses isolated owned services, two real Phaser peers, real boss attacks for deaths, normal network votes and a physical finishing attack for reward verification. Prerequisites only adjust legal encounter/HP/position; they do not inject death, vote or reward outcomes. PNG evidence only; no recordings or artwork regeneration. Exact final results are recorded in`docs/evidence/campaign/verification.json` after execution.

Final scoped verification: **52/52** final focused unit/protocol/integration cases passed; related room regression batch **68/68** passed earlier (overlapping cases, not additive). Both two-client boss flows passed; the latest HUD/pearl case passed separately after display-only fixes. Typechecks and production build passed; 144 DPS +24 farm probes completed. See [exact execution and limitations](evidence/campaign/verification.json). No full-suite or60-minute human-campaign acceptance is claimed.
