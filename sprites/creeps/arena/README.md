# Arena creeps — Phase 1A concept-to-sprite production

Status: **staged production candidates, not integrated or director-approved**.
The requested five states are authored in four directions: idle, walk, basic attack, hurt and death.

## Approved reference inspected

The concept directory contains exactly one image:
`assets/concepts/arena-creeps/waves-01-04/arena_creeps_01_04_master_v1.png` (1536×1024).
It was opened and visually inspected before inspecting the Phaser system or generating any sprite.
The current user explicitly identifies this Phase 1A artwork as approved; older concept metadata saying approval was pending describes its creation stage.

Every image-generation call received that actual PNG directly. Faithful generated four-facing idle drawings were secondary identity references. No generic sprites, unrelated references, or concept-sheet crops became animation frames. Exact prompts are in `generation_prompts_v1.json`.

## Outputs

| Approved character | Folder | Frames | Canvas / foot pivot |
|---|---|---:|---|
| Chó Hoang | `wild-dog/` | 64 | 80×80 / (40,64) |
| Thổ Phỉ | `bandit-grunt/` | 64 | 80×80 / (40,64) |
| Sơn Tặc Đao | `bandit-swordsman/` | 63 | 112×96 / (56,76) |
| Cung Thủ Sơn Tặc | `bandit-archer/` | 64 | 80×80 / (40,64) |

Each folder contains:

- `frames/{state}_{direction}_{index}.png`: individual transparent poses.
- `spritesheet.png` and `atlas.json`: Aseprite hash atlas, including 20 animation tags and a feet pivot slice.
- `manifest.json`: animation definitions, dimensions, pivot, source/provenance, review status, hashes and concept reference for every exported frame.
- `source/*.aseprite`: editable generated raster cels.
- `source/animation_v1.png`, `idle_reference_v1.png`, `hurt_death_v1.png`, plus `front_attack_v1.png` where corrections were needed: retained original generated PNGs.
- `source/extraction_v1.json`: measured connected-pixel masks, bounds, fixed source scales, anchors and durations.

Logical standing heights are about 27px dog, 42px grunt, 44px swordsman and 43px archer, alongside the exact approved ~44px Cái Bang hero. The swordsman's larger canvas provides weapon clearance without shrinking his body.

Default timing: idle 2×350ms; walk 4×120ms; attack 4×75ms; hurt 2×140ms; death 4×140ms. Swordsman rear attack uses 3×100ms after rejecting a pose with a missing sword. Its frontal recovery holds the original idle pose after rejecting a hand-swapped correction. Manifests repeat idle/walk only; attack/hurt/death finish once. No cast or skill animation is added.

## Fidelity review

- **Dog:** approved oversized pointed ears, stocky quadruped silhouette, amber eyes, brown-gray saddle, tan muzzle/chest/paws and short coarse tail. Its approved scruffy/wolf-like character was retained rather than redesigned.
- **Grunt:** spiky brown hair, tied ochre headband, ragged ochre tunic, pale wraps, charcoal trousers, sandals and crude short wooden club.
- **Swordsman:** slate-blue scarf/jacket, tied hair, brown leather shoulder guard and straps, dark boots, broad curved Chinese dao and brass guard.
- **Archer:** olive headscarf and robe, lighter leather protection, narrow build, recurved wooden bow and pale-fletched diagonal quiver.
- All retain dark warm pixel outlines, clustered shading, upper-left lighting and the elevated orthographic overworld view.

Wrong-facing frontal attacks and missing/hand-swapped dao poses were rejected, not exported. The approved archer concept contains inconsistent handedness; front-view carrying identity was retained. Its transition into a shooting grip remains a director continuity review point. Fine facial and costume details simplify at gameplay resolution. This is a recognizability/fidelity review, not a claim of pixel-exact identity to the larger concept illustration.

See `concept_fidelity_review.json` for the source inventory, preserved characteristics, rejected poses and limitations.

## Actual Phaser evidence

Routine verification uses PNG screenshots and live Phaser frame-observation reports; no recording is generated. The existing `review/phaser_animation_preview.webm` is preserved as historical evidence.
`review/concept_comparison.png` compares the actual approved concept against staged sprites at 1× logical scale / 2× desktop display, beside the unchanged approved hero.
Separate idle, walk, attack, hurt and death screenshots are included.
`review/phaser_verification.json` records all 80 observed tags and 255 observed frames with zero page/loader errors.

This is an isolated renderer check before integration. It does not claim live-match gameplay, server pose transitions, multiplayer, occlusion or six-player crowded combat have been verified for these assets. No approved character files or gameplay/Phaser application code were changed. Runtime selection still uses its existing enemy assets.

## Reproduce

- `python -u sprites/creeps/arena/build_sprites.py` rebuilds staged cels/exports from the retained generated source pixels. This replaces staged editable cels; export manually edited Aseprite sources directly to preserve later cleanup.
- `node sprites/creeps/arena/verify_phaser.mjs` starts a temporary localhost-only server, runs the installed Chromium/Phaser, observes every frame and captures evidence; it closes the server afterward.
- Aseprite 1.3.18.6 performs all source masking, alpha cleanup, nearest-neighbour scaling, alignment and export. Python/Pillow only inspect pixels and metadata. Scales are fixed per generated source, never fitted independently per pose. Masks avoid including neighboring sprites where weapon bounds overlap.
- Approved Cái Bang source/export hashes are checked before/after building. No concept image is sampled into runtime frames.

Commands actually run: build/export validation PASS; Phaser verification PASS; `pnpm typecheck` PASS; existing asset tests 3/3 PASS; `pnpm test` 98/98 PASS across 11 files.

API references consulted: [Phaser textures](https://docs.phaser.io/phaser/concepts/textures), [Phaser atlas loader](https://docs.phaser.io/api-documentation/class/loader-loaderplugin#atlas), [Aseprite Image API](https://aseprite.org/api/image#imageresize).

Original AI-assisted artwork generated with the built-in OpenAI image generator using project references. No commercial sprite pack imported, separate third-party asset license or exclusive copyright asserted. Source reference ownership was not independently established.

**Stop at these four staged enemies for animation review.**


Recordings require an explicit user request for the current task, per `AGENTS.md`; routine verification must not run video recording, encoding or conversion tools. Inspect motion, transitions and positioning live in Phaser.
