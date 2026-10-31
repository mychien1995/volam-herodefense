# Phase 1F — Arena creeps Waves 9–12

Waves 9–12 now use their concept-derived PNG atlases in the actual arena. The existing renderer was extended. This art integration makes no changes to authoritative combat, collision, ranges, enemy statistics, invasion definitions, map or HUD. Runtime artwork is ready for director review; it is not marked owner-approved.

## Assets and provenance

The established production location is `sprites/creeps/arena/`. Each character folder contains `spritesheet.png`, `atlas.json`, `manifest.json`, transparent `frames/*.png`, editable `source/*.aseprite`, and generated-source/extraction records.

| Wave | Approved concept under `assets/concepts/arena-creeps/waves-09-12/` | Production folder under `sprites/creeps/arena/` | Frames | Canvas | Body height |
| --- | --- | --- | ---: | --- | ---: |
| 9 — Cương Thi | `cuong_thi_concept.png` | `jiangshi-zombie/` | 64 | 96×96 | 44px |
| 10 — Oán Linh | `oan_linh_concept.png` | `vengeful-spirit/` | 64 | 112×112 | 52px |
| 11 — Thiết Giáp Khô Lâu | `thiet_giap_kho_lau_concept.png` | `armored-skeleton/` | 63 | 160×112 | 54px |
| 12 — Thạch Nhân | `thach_nhan_concept.png` | `stone-golem/` | 64 | 176×144 | 66px |

All four have idle, walk, basic attack, hurt and death in down/left/right/up facings: **255 character frames and 80 animation tags**. Idle uses two poses, walk three/four, attack four, hurt two and death four. Larger transparent canvases provide weapon/fist clearance without changing collision or range. Sprites use native logical scale, nearest filtering and normalized foot pivots.

The character assets generated during the preceding production pass were reused unchanged for integration. [Production provenance](../sprites/creeps/arena/waves-09-12-production/README.md) retains exact concepts, direct-reference generation requests, extraction decisions and isolated-renderer evidence. Each generation call supplied the relevant approved image directly. Historical source manifests describe the earlier staged state; the new [runtime manifest](../assets/arena_creeps.manifest.json) records the current integration and exact concept/sprite hashes.

Four original contact effects were generated with all four approved individual concepts supplied directly: jade undead contact, blue-violet spectral contact, bronze/steel contact and stone/jade dust contact. Each has four transparent 64×64 frames exported through Aseprite. They play only for existing confirmed hit events.

- Source/editable effects: `assets/source/effects/arena_creep_impacts/`
- Exported effects/provenance: `assets/exports/effects/arena_creep_impacts/`
- Exact image-generation request: `assets/source/effects/arena_creep_impacts/generation_prompt_v1.json`
- Re-export: `node scripts/export-arena-creep-impacts.mjs`

## Integration

`scripts/prepare-arena-creeps.mjs` derives twelve art bindings from existing manifests, checks approved-concept hashes, prepares runtime PNG/JSON copies and writes a Phaser loader pack through `assets:prepare`. Mapping uses the server-owned `invasionWave` and arena zone. Dungeon/practice enemies and future waves retain their existing fallback.

The existing `arena-scene.ts` interpolation, feet-based Y depth and environment ordering remain. Every enemy has independent animation state. Authored one-shots finish across shorter network poses; removed enemies remain visually long enough to finish death. The spirit completes its collapse before a 340ms presentation-only dissolve. Its living body retains a dense luminous core for visibility over grass. Animation timing never triggers damage.

The server still uses its three prototype invasion stat/attack recipes. This pass supplies visual identities without replacing those recipes. The spirit's cast pose currently presents the existing `creep_strike`; no enemy spectral projectile behavior is defined. Shield-block abilities, shield slams and golem ground shockwaves/area damage were not added. Existing player projectile/skill presentation is preserved.

## Validation

[Final six-client verification](evidence/phase1f-integration/integration_verification.json) is **PASS**, including the final same-texture independent-instance check. It uses the real MatchRoom, client and ArenaScene with six separate browser contexts joined through the existing lobby.

The server-owned fixture triggers the existing director's deadlines to obtain authentic Waves 1–12 spawns without waiting through the normal cadence. Original six-player-scaled stats remain unchanged. Existing stun holds positions/poses for frame coverage. Controlled death samples set fixture HP to zero and restore it between poses. These samples are separate from the later natural AI/real keyboard combat test. There is no production debug command or browser state injection.

Verified:

- All twelve texture mappings and 240 animation registrations loaded; Waves 1–8 still render.
- All 255 Wave 9–12 frames were observed through Phaser animation events across all 80 tags.
- Two genuine Wave 9 spawns sharing one texture independently played idle/down and walk/right.
- Native scale, fixed foot origins, facing and feet-based depth were checked in the live renderer.
- Six clients synchronized movement and enemy HP; actual kills awarded shared rewards.
- Natural AI attacks displayed all four contact effects at stock enemy HP/stats.
- Real A commands killed all four enemies; timestamped logs confirm natural-combat hurt/death completion independently of controlled samples.
- Spirit collapse/dissolve completed. No missing textures, failed asset requests or browser errors occurred.
- Fixture stat values and invasion definition remained unchanged. The production interval remains 180 seconds. This is accelerated fixture validation, not a real-time twelve-wave endurance test.

[Asset verification](evidence/phase1f-integration/asset_verification.json) checks every character/effect frame: PNG/atlas pixel equality, nonempty safe transparent bounds, binary alpha, editable Aseprite frame counts, concept hashes and runtime-copy equality.

| Command | Result |
| --- | --- |
| `node scripts/export-arena-creep-impacts.mjs` | PASS — 16 frames, four effect tags |
| `python tools/verify-arena-creep-assets.py` | PASS — 255 character frames plus 16 effect frames |
| `pnpm typecheck` | PASS |
| `pnpm build` | PASS; large-bundle warning remains |
| `pnpm test` | PASS — 133 tests in 15 files, including five creep-presentation regressions |
| `node tools/verify-arena-creeps.mjs` | PASS — six clients, frames, combat and independent instances |
| `node tools/compare-arena-creeps.mjs` | PASS — master plus four individual comparison PNGs |
| Existing selected `gameplay.spec.ts` checks | PNG registry PASS. Initial camera-route attempt failed its waypoint deadline; isolated recheck PASS (43.7s), including movement, fixed camera and foreground occlusion. |

The initial camera-route failure is retained under `evidence/phase1f-integration/gameplay-regression/`. It stopped about 129px short of `(1260,900)` and then timed out during teardown. The unchanged test passed when rerun alone with `node tools/run-playwright.mjs test tests/e2e/gameplay.spec.ts --grep "fixed follow camera" --output docs/evidence/phase1f-integration/camera-route-recheck`; evidence is in that directory. This establishes an intermittent test failure; its root cause was not proven. No test, map or movement workaround was made. Earlier `failure.json`, `arena-failure.png` and `combat_diagnostic.json` are superseded diagnostics; `integration_verification.json` is the final dedicated creep result. Only PNG screenshots and live frame observations were produced. No video/GIF recording or encoding was used; historical recordings were preserved.

## Visual comparison and review notes

Source concepts, production PNGs and actual arena renders were opened and compared. They retain the elevated orthographic perspective, dark stepped outlines, compact chibi proportions and material palettes. Jiangshi cap/talisman/crimson trim and stiff arms remain; the spirit keeps navy hair, plum sash, bright eyes and connected wisps. The armored skeleton retains Wave 7's ivory skull/bronze/teal lineage with a larger sword/shield silhouette. The jade-core moss golem is visibly heavier than the approximately 44px hero.

- [Master concept → production → arena comparison](evidence/phase1f-integration/concept-production-arena-comparison.png)
- [Jiangshi](evidence/phase1f-integration/jiangshi-zombie-comparison.png), [Spirit](evidence/phase1f-integration/vengeful-spirit-comparison.png), [Armored skeleton](evidence/phase1f-integration/armored-skeleton-comparison.png), [Golem](evidence/phase1f-integration/stone-golem-comparison.png)
- [Actual arena: four enemies and six clients](evidence/phase1f-integration/arena-idle-down.png)
- [Existing Waves 1–8](evidence/phase1f-integration/arena-waves-01-08.png)
- [Independent instances](evidence/phase1f-integration/arena-independent-instances.png)
- [Natural attacks](evidence/phase1f-integration/arena-natural-attacks.png), [natural golem death](evidence/phase1f-integration/arena-death-wave-12.png)

Comparison layouts use existing source PNGs and original-pixel crops of actual arena screenshots without retouching. Orange overhead marks in controlled samples are fixture stun indicators.

Director review items:

- Jiangshi talisman ink becomes symbolic red pixels at 44px; a side wind-up briefly cocks one arm before extension.
- Spirit has binary-alpha luminous artwork rather than a continuously translucent body, then dissolves after death. Approve its brightness over grass.
- Armored skeleton front walk has three valid poses over 480ms. A source pose missing its sword was rejected. Small rivet/rust/cloud-scroll details vary between generated groups.
- Golem side strikes use pronounced three-quarter torso lean. Moss/cracks/rune microdetails simplify at 66px. Wide fists can obscure nearby units during ordinary Y-sorted overlaps; live combat evidence shows the scale.
- No cropped/corrupted production frames were found. Technical validation does not substitute for owner approval of animation feel at normal zoom.

## Files changed

Existing files extended: `apps/game-client/src/art.ts`, `apps/game-client/src/arena-scene.ts`, `scripts/prepare-assets.mjs`, `assets/ASSET_MANIFEST.md`.

New runtime/source files: `apps/game-client/src/arena-creeps.ts`, `scripts/prepare-arena-creeps.mjs`, `scripts/export-arena-creep-impacts.mjs`, `tests/arena-creep-presentation.test.ts`, `assets/arena_creeps.manifest.json`, plus the source/export effect directories listed above.

New validation/report files: `tools/verify-arena-creeps.mjs`, `tools/verify-arena-creep-assets.py`, `tools/compare-arena-creeps.mjs`, this report, and `docs/evidence/phase1f-integration/`. Prepared runtime copies under `apps/game-client/public/assets/arena_creeps/` are reproduced by `pnpm assets:prepare`.

[Preservation audit](evidence/phase1f-integration/preservation_audit.json): 977 of 993 initially locked inputs were unchanged, including approved creep concepts/sprites, hero artwork and maps. Sixteen server/core/data/protocol/UI files changed through concurrent workspace work and were preserved; they are not authored by this creep integration. Shared renderer/preparation changes preserve concurrent hero/skill work. No approved character PNG/Aseprite/atlas was overwritten.

Phase 1F stops here. No Waves 13–20, dungeon enemies, bosses or later-phase artwork was generated or integrated.
