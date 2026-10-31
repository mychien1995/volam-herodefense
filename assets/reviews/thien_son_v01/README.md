# Thiên Sơn v01 — final runtime art review

**APPROVED on 2026-10-30** by the user: “approved, please proceed”, after this final runtime review. Concept `thien-son-concept-v01.png` was approved in this chat on 2026-10-30. Approval covers the requested four-facing idle/walk and fan/đao attacks. [Approved-byte lock](../../approved_thien_son.lock.json) preserves the reviewed source/export/concept bytes.

[Production provenance and all source/export paths](../../source/characters/thien_son_v01/production_manifest_v01.json) · [approved concept](../../concepts/heroes/thien-son/thien-son-concept-v01.png) · [exact generation prompts](../../source/characters/thien_son_v01/generation_prompts_v01.json)

## Delivered

Two editable Aseprite sources, two 800×320 transparent PNG + Aseprite hash-JSON atlases, two idle previews and 80 individual transparent 80×80 frame PNGs. Each weapon style has down/left/right/up idle (2×350ms), walk (4×120ms) and attack (4×75ms). Body height is approximately 44 logical pixels; fixed feet pivot (40,64), normalized (0.5,0.8). Each of the 80 source cels is distinct. All cardinal directions were separately authored; asymmetric weapons were not mirrored.

- [Fan atlas](../../exports/characters/hero_thien_son.png) · [atlas metadata](../../exports/characters/hero_thien_son.json)
- [Đao atlas](../../exports/characters/hero_thien_son_dao.png) · [atlas metadata](../../exports/characters/hero_thien_son_dao.json)
- [Fan individual frames](../../exports/characters/thien_son_v01/fan/frames/) · [đao individual frames](../../exports/characters/thien_son_v01/dao/frames/)

School selection `thien_son` uses fan artwork and the matching existing HUD portrait/paper doll. `/?debug=1&thienSonWeapon=dao` selects a **local presentation-only review variant** before joining/selecting Thiên Sơn. `/?artPreview=1&thienSonReview=1` previews both sets using the real loader/animation registry. No Thiên Sơn combat abilities, tuning, stats, damage, networking authority or new loadout choices were implemented. Existing prototype combat remains inherited; the đao review query does not change the server's basicId. Cast/hurt/death reuse is disclosed and is outside this authored animation set.

## Actual Phaser evidence

| Check | Result and evidence |
|---|---|
| Both weapon sets | PASS: all 24 authored tags loaded and every distinct idle/walk/attack frame appeared during live observation. [Phaser preview](both_weapons_phaser_2x.png), [frame changes and configured rates](animation_observations.json). |
| Fan real match | PASS: four facings, walk → idle → attack → idle, unchanged planted idle position, origin/scale, server movement/HP/basicId agreement between two clients. [1280×720](fan_gameplay_1280x720.png), [1920×1080](fan_gameplay_1920x1080.png), [native 1× canvas](fan_logical_1x.png), [observations](fan_match_observations.json). |
| Đao real match review | PASS: same four-facing and two-client assertions using the local art-only variant. Live short-attack sampling captured 3–4 different frames per facing; the full four-frame set was also observed in the Phaser preview. [1280×720](dao_gameplay_1280x720.png), [1920×1080](dao_gameplay_1920x1080.png), [native 1× canvas](dao_logical_1x.png), [observations](dao_match_observations.json). |
| Six-player fit | PASS: four Thiên Sơn and two approved Cái Bang players joined one actual server room, moved using keyboard input and rendered at scale 1 with feet depth equal to Y. The primary capture uses normal desktop 2× display/camera zoom 1. [1280×720](six_players_1280x720.png), [1920×1080](six_players_1920x1080.png), [six-client state](six_player_observations.json). |
| Foreground occlusion | PASS: genuine movement to (1220,905) places Thiên Sơn in front of the tree; movement around its right side to (1220,820) places the character behind its canopy. [In front](front_of_tree_1280x720.png), [behind canopy](behind_tree_1280x720.png), [feet/depth state](occlusion_observations.json). Both actual saved screenshots were opened and visually inspected. |

No page errors or missing asset responses were reported by the passing character checks. No video, GIF or other recordings were made. Screenshots are evidence of visual fit, while live frame observations/assertions provide playback and transition evidence.

## Reference comparison and director concerns

The new character retains the approved concept's ivory silk mass, pale-blue lining, jade sash/trim, silver/jade topknot, long dark hair and ribbons, open right-hand folding fan and curved đao. Thin dark contours keep the white robe readable over the pale arena paving and green foliage. Fan and blade silhouettes remain distinguishable at normal zoom, and the body height matches the approved Cái Bang baseline. The rear view contains no face; side-facing hair, clothing and strikes follow their direction.

Compared with the Võ Đang/Cái Bang character references, the result preserves compact chibi proportions and elevated orthographic overworld perspective. It uses real original raster cels and intentional stride/attack silhouettes, rather than the rejected rectangular actors in the placeholder anti-reference. The world/HUD layout is unchanged.

Fine embroidery, tiny silver ornaments and fan rib details simplify at 44px body height. Their exact appearance and residual decorative variation between directions were presented in the final review and accepted. Approval does not assert human hand-pixelled authorship. Wind is expressed through cloth, hair and ribbons; no new wind combat/VFX or ice/snow effects were added. Existing environment, creep and ability-VFX quality is outside this character approval.

## Commands and actual results

- `node scripts/export-thien-son.mjs --assemble`: PASS, two editable 40-cel sources, 12 authored tags each, transparent PNG/JSON and individual frame exports. Default export without `--assemble` preserves artist edits.
- `pnpm typecheck`: PASS.
- `pnpm test`: PASS, **134 tests in 15 files** in the final run.
- `pnpm build`: PASS, with the existing Vite bundle-size warning.
- `pnpm verify:assets`: PASS, including the new `verify-thien-son.py` check for all 80 unique cels, binary alpha, unclipped bounds, baseline64, exact durations, pivot metadata and individual-PNG/atlas equality.
- `python scripts/asset-intake.py baseline`: PASS, eight approved Cái Bang source/export hashes unchanged.
- `node tools/run-playwright.mjs test --config playwright.thien-son.config.ts tests/e2e/thien-son-art.spec.ts`: PASS, four character/party checks; [machine report](playwright_character_results_v01.json).
- `node tools/run-playwright.mjs test --config playwright.thien-son.config.ts tests/e2e/thien-son-art.spec.ts --grep 'feet sort'`: PASS, one actual tree-depth check; [machine report](playwright_occlusion_results_v01.json).

Earlier broad runs had shared-service shutdowns, development reload/focus interruptions and fragile movement/projectile probes. Dedicated ports/output paths, disabled HMR/watch and focused real keyboard input resolved the character-verification failures. The passing scoped reports above are the final character evidence; earlier failed runs were not silently relabeled as passes. The two previously unresolved combat/progression and fixed-projectile smoke checks subsequently passed unchanged on the dedicated services. The old same-school six-player positioning case was not rerun again; the final six-player requirement was verified with the mixed Thiên Sơn/Cái Bang test above.

Additional regression command:

`node tools/run-playwright.mjs test --config playwright.thien-son.config.ts tests/e2e/gameplay.spec.ts --grep 'two clients agree|ranged projectile'`

**PASS: 2 tests** in the final isolated run, covering real shared combat/manual cadence/skills/progression and observed fixed projectile trajectory. [Machine report](playwright_combat_results_v01.json). In total, **7 final scoped browser checks passed** across the character (4), occlusion (1) and combat (2) runs.

## Final approval

The director explicitly approved the actual normal-zoom result on 2026-10-30. Both runtime entries are `approved`. Two editable sources, their PNG/JSON atlases/previews, all 80 individual frame PNGs and the exact concept are SHA-256 locked. Cast/hurt/death remain disclosed reused poses outside the authored approval. No other schools, environments or combat abilities are authorized by this approval.

## Post-approval verification

After the explicit final approval, both runtime entries were marked `approved` and 89 exact concept/source/export files were recorded in `assets/approved_thien_son.lock.json`. Asset preparation/build and `verify-thien-son.py` enforce those hashes; the exporter and direct assembly script reject overwriting approved baseline IDs. No artwork bytes changed. Historical pre-approval preview/observations are preserved as `both_weapons_pre_approval_phaser_2x.png` and `animation_observations_pre_approval.json`.

Rechecked `pnpm typecheck`, `pnpm test` (**134 passed / 15 files**), `pnpm build`, and `pnpm verify:assets`: PASS. The exporter refusal was checked and all 89 approved files remained unchanged. `node tools/run-playwright.mjs test --config playwright.thien-son.config.ts tests/e2e/thien-son-art.spec.ts --grep 'both weapon'`: **1 passed**, all 24 authored tags observed with the approved review label. [Machine report](playwright_approval_results_v01.json). The existing bundle-size warning remains unchanged.
