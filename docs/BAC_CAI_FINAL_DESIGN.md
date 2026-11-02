# Bắc Cái — final director brief, 2026-11-02

This brief supersedes conflicting skill descriptions in `BAC_CAI_ASSET_NOTES.md` for this boss only. School skills are unchanged. This task delivers an art/animation preview before combat integration; no client preview values are authoritative game rules.

- Wave boss in the existing main arena, enters from the north. Targets players, never the statue. Freely switches staff and palms. No dedicated dungeon, arena, portal or item drops.
- **Đả Cẩu Bổng Pháp (basic):** continuous bamboo-staff sweeps while lunging forward.
- **Hàng Long 18 Chưởng (basic):** dragon heads launch from the hands.
- **Đả Cẩu Bổng Kích:** billiards-like forward staff jab, very long straight qi beam, short warning.
- **Bổng Đả Ác Khuyển:** summon exactly four black dogs; they bite players, have HP, can be attacked and killed.
- **Mục Hạ Vô Nhân:** eight Hồng Thất Công at eight surrounding positions. The real one slowly flies to a position during splitting. Shuffle exactly five times, slowly swapping crossing pairs rather than rotating together around the perimeter; immune during shuffling. Afterwards, hitting the real body removes the copies; hitting a copy explodes and damages players across the map.
- **Thiên Hạ Vô Cẩu:** spins at the arena center, pulls players from across the map, then staff slam with area damage and stun.
- **Kháng Long Hữu Hối:** pulls two random players in, tethers them to each other; they must separate far enough to break the tether, otherwise their HP drains. Disabled with only one player.
- **Kiến Long Tại Điền:** jumps to a random player and rapidly palms the ground into a broad 田-shaped damage area. Ground explosion must leave Hồng Thất Công visible above it.
- **Phi Long Tại Thiên:** casts/releases a fire dragon once. The dragon independently follows a spiral with continuously increasing radius; the boss can use other skills after release.
- **Changing preferences:** wine, beautiful women, chicken, pork, chess, sparring. Overhead spoken dialogue changes every few seconds and does not lock the boss out of other skills. Later, three floor-choice zones appear. The option occupied by the most players is the team's selection. Match the boss's last stated preference: sleeps about ten seconds and can take free damage. Otherwise disappointed, drinks wine and restores 10% HP.

## Preview assumptions, not additions to the final mechanics

### Director resolutions — 2026-11-02

Visual v03 is explicitly approved for integration. If an AoE hits a clone and the real body in the same attack/tick, the clone still explodes; resolving the real hit first must not erase that penalty. A tied preference vote or zero votes is wrong immediately, without an extension. If either tethered player dies, leaves the arena or disconnects, the tether breaks and HP drain on the other player stops immediately. These answers are final and supersede earlier open-question notes below. Approval is for reviewed visuals/choreography, not unimplemented live combat or final balance.

Eight figures means one real body plus seven copies. Preview timings/ranges are configurable choreography examples, not balance. The demo supports success/failure, tether break/drain and solo views. Actual random selection, health, voting, invulnerability, damage, movement, spawn and collision belong on the server during later integration. Cooldowns, damage, stun duration, dog health/lifetime and exact preference cadence remain tuning inputs. Tie/no-vote and tether endpoint-loss policy are resolved above.

## Reuse audit

Preserve the existing concept, 224 character cels, five VFX atlases and all originals. Reuse idle/walk, staff sweeps/spin, dragon-release, jumping-palm, impact and warning drawings. Reassign the old leap to Kiến Long; the old counter-shield and old lane ultimate are not mechanics in this brief. New art is needed for a proper billiards thrust, drinking/sleeping, plain black dogs, long qi beam, pair tether, 田 ground effect and fire-dragon spiral. Clone actors reuse the real character identically after splitting so art does not reveal the answer.

## Art readout

The retained boss uses a white topknot/beard, patched olive robes, rope belt, wine gourd and jade bamboo staff. Keep the native 160×112 canvas, feet (80,88), approximately 56px standing body versus the approximately 44px hero. Keep elevated orthographic projection, crisp nearest sampling, full authored poses and separate raster VFX. Existing golden qi can serve palm basics; the explicitly requested spiral dragon needs red/orange fire. No new arena artwork is required.

Mandatory references inspected: actual Võ Đang character reference (the old `vo_dang_art_direction_reference.png` path is absent), main-world/arena and five dungeon/menu references, current placeholder anti-reference and dashboard anti-reference. The dashboard anti-reference file currently contains a Võ Đang concept sheet rather than the described dashboard screenshot; the written full-viewport UI rule still applies.
