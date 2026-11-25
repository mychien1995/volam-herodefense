Latest arena/cooldown follow-up: [R3 native ground surfaces and anchored torches](M4D_ARENA_REVIEW_R3.md).

# M4D — arena feedback R2, 2026-11-25

Follow-up to the selected DH-B, TD-B and TH-B integration. The five requested fixes are implemented in the same milestone/m4d worktree; unrelated combat, rewards, school sprites and inventory migration are unchanged.

## Movement and room creation

- `arena-props.ts` is now the shared placement source for scenery and server foot colliders. Trunks, rocks, tower bases, masonry, pavilion floors and bridge rails are solid. Canopies and roofs still occlude with foot-based Y sorting; they do not create sprite-sized invisible walls. Movement and Shift use swept circle collision, with the same prop footprints in client prediction.
- Move the first peach tree and two towers back from the entry lanes. Move the manor hall away from the north approach. Split the fortress gate collider into two sides so its opening remains traversable.
- Room list contains no arena/gate selects. “Tạo phòng” opens an in-viewport native modal containing both options; confirmation sends the selected values. Cancel/Escape preserves selections without creating a room. Background list refresh does not replace the open modal.
- Measure cardinal road centerlines from actual floor pixels with the retained uniform cover transform: DH (804,512), TD (801,498), TH (802,535). Server gates use those centers; two rows remain symmetric at ±18 units. An entry waypoint preserves each row until the plaza. Player aggro may still divert creeps. Correct lotus pond/bridge registration to the same painted center rather than the old assumed y576.

## Sharpness and motion

Art route: built-in image generator (`host_image`). [Exact prompts](../assets/source/m4d-arena-v02/generation.json), [registered exports and measured dimensions](../assets/exports/m4d/r2/manifest.json). Original v01 sources/exports are retained.

- Redraw all three underlays with clearer material contours, stone seams and foliage silhouettes, retaining selected B composition. Select nearest sampling for these ground textures only. Do not change character/prop texture sampling, body scale, camera zoom or background aspect.
- The returned ground rasters remain approximately 1480×1060. These are sharper authored redraws, **not claimed 4K assets**. The current floor is still a layered raster underlay rather than a newly authored tilemap; native-scale screenshots are the visual review evidence.
- DH streams and TH water use eight cached UV phases of the actual authored water pixels, under a fixed color/region mask. Shore, paving, rocks and bridge decks stay fixed. DH cascade highlights have a narrow separate mask. Motion work is prepared once per arena entry, not a per-frame full image readback.
- TD has eight small instances of the retained original flame/ember atlas, with independent flicker, stretch and rising embers. No combat damage, projectile or authoritative hazard is attached to ambient art.
- TH clean pond underlay contains no baked floating flowers. Four new native-alpha lotus variants are extracted using the existing prop-pack tool and placed as twelve independent sprites with slight bob/rotation. Extraction initially rejected non-divisible grid dimensions, then edge alpha noise; rounded cells and the established alpha-floor-8 cleanup produced four complete props with zero warnings. Preserve native partial alpha above that floor.
- Ambient objects/listeners/owned textures are cleaned up when leaving the arena. Existing contact/projected shadows, ambient shading, lamps and boss cluster visibility remain in use.

## Focused verification

The user requested only necessary tests. Current verification is recorded separately in [R2 results](evidence/m4d-r2/verification.json); earlier M4D evidence is not relabeled as this revision.

- Focused core/room checks: six files, 46 tests PASS (arena review, M4D, invasion/room, local movement, navigation).
- TypeScript project build, tests/tools typecheck and new-art hash/PNG/anchor checks.
- DH representative production slice: two real clients, actual movement/Shift, popup cancel/confirm, water frame changes and paired entry rows PASS before expanding the other two ground redraws.
- Final production browser scope: **4/4 PASS**, three two-client arena reviews plus the six-client TH combat/bridge/death/boss-cluster regression. It observes actual water texture changes, flame transform changes and lotus motion; PNGs alone are not presented as animation proof.

The first DH browser attempt tested row centering while a hero was near enough to attract aggro. Corrected the prerequisite by moving reviewers away before spawning; the repeat passed. The projectile regression position was also moved to the newly registered solid bank, within its original attack range. No combat range or aggro behavior was weakened to satisfy tests.

Concept selection remains approved. Newly integrated R2 art still needs director review at gameplay zoom; automated verification is not final art approval. No video/GIF/trace stream or full-campaign/FPS claim.

Review PNGs at normal zoom: [Đào Hoa Đảo](evidence/m4d-r2/dao_hoa_dao.png), [Tương Dương](evidence/m4d-r2/tuong_duong.png), [Tụ Hiền Trang](evidence/m4d-r2/tu_hien_trang.png), [six-player TH](evidence/m4d-r2/th-b-six-player.png).
