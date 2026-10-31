# Bamboo Forest creep candidate delivery — 2026-10-31

**Subsequent director approval — 2026-10-31:** user: “I approved the artwork”. The selected six-enemy production art and VFX are now approved and pinned by `assets/approved_forest_creeps.lock.json`; see `docs/FOREST_CREEP_ART_APPROVAL.md`. This report retains its original candidate-delivery history. Approval does not supply the missing authoritative Forest spawn roster or authorize new gameplay.

All six requested species have original concept sheets, 64-cel gameplay packages and separate VFX. These are **candidates**, not director-approved art. The existing Bamboo environment remains approved and unchanged. Ordinary dungeon gameplay still uses the labelled `creep_outlaw` placeholder; no forest type registration, AI, ability, collision, damage, status, balance, wave or loot rule was added by this batch.

## Deliverables

- `assets/concepts/dungeon-creeps/forest/`: comparison board, six selected individual concept sheets, the retained superseded swordsman v01, and a concept manifest. Selected swordsman concept is v02. Concepts were never cropped into runtime cels.
- `assets/sprites/creeps/dungeons/forest/<typeId>/`: `spritesheet.png`, named `atlas.json`, `manifest.json`, 64 individual frame PNGs, actual tagged raster-cel `source/<typeId>_v01.aseprite`, and verification metadata for each species.
- `assets/sprites/creeps/dungeons/forest/forest_manifest_v01.json`: six-species batch manifest. `source/` retains prompts, generation times, reference SHA-256 hashes, generated direction sheets, corrections and the complete editable-source recipe.
- `assets/effects/dungeons/forest/`: separate 112-cel / 28-sequence atlas, manifest, individual frame PNGs, seven generated source pages and an actual 112-frame `source/forest_v01.aseprite`.
- This review directory: native contact sheets, real Phaser PNGs, frame/event observations, validation reports, generation timing ledger and exact delivery file inventory.

## Character contract

Every row below contains **64 distinct cels / 20 clips**, at runtime scale 1. Directions are down, left, right and up. The canvas provides pose clearance; it is not the body size.

| Vietnamese name / proposed type ID | Canvas | Ground pivot in pixels | Idle body target |
| --- | --- | --- | --- |
| Trúc Xà / `truc_xa` | 144×128 | 72,106 | 60px longest axis |
| Độc Chu / `doc_chu` | 144×128 | 72,106 | 56px width |
| Sơn Viên / `son_vien` | 144×128 | 72,106 | 48px height |
| Trúc Lâm Kiếm Khách / `truc_lam_kiem_khach` | 144×128 | 72,106 | 44px body height, sword excluded |
| Mộc Linh / `moc_linh` | 144×128 | 72,106 | 50px silhouette height |
| Trúc Yêu / `truc_yeu` | 192×128 | 96,106 | Intentionally taller, 56px silhouette height |

All normalized origins are `[0.5, 0.828125]`. Low creatures use a lower contact-pixel anchor; the swordsman uses the existing warm-boot detector to exclude pale sword pixels. Trúc Yêu's wider canvas clears the sprawled death pose without enlarging the creature. Fixed nearest sampling is chosen from the two idle source cels **per direction**, then retained across that direction's actions. Exact measured source factors and extraction rectangles are in each manifest; there is no per-frame body fitting.

| State | Frames per direction | Duration per cel | Repeat | Full cycle |
| --- | --- | --- | --- | --- |
| idle | 2 | 350ms | infinite | 700ms |
| walk | 4 | 120ms | infinite | 480ms |
| basic_attack | 4 | 100ms | once | 400ms |
| hurt | 2 | 140ms | once | 280ms |
| death | 4 | 170ms | once | 680ms |

Names are explicit, for example `basic_attack_left_2`; atlas rectangles and durations are explicit. Attack cels depict anticipation, wind-up, contact and recovery. Walk cels have independently drawn limb/body poses; hurt recoils and death settles. No bob/rotation/scale-only synthetic cels or mirrored directions are used.

## VFX contract

All 28 sequences have four independently drawn cels, 90ms per cel (11.111…fps), 128×128 canvas, scale 1 and origin `[0.5,0.5]`. Contacts finish after 360ms. Flight artwork loops; the isolated review removes it after 650ms and asserts a real repeat event plus cleanup. This lifetime is a review fixture value, not an authoritative projectile duration.

| Owner | Sequences |
| --- | --- |
| Trúc Xà | bite contact, venom release, right-facing venom flight, venom impact |
| Độc Chu | fang contact, poison impact, right-facing web flight, web impact |
| Sơn Viên | wind-up dust, slam impact, dust burst, pebble scatter |
| Trúc Lâm Kiếm Khách | four directional sword slashes, sword contact, leaf burst |
| Mộc Linh | root emergence, leaf burst, wooden contact, bark fragments |
| Trúc Yêu | four directional bamboo slashes, splinter impact, right-facing thorn flight |

Slashes have separately generated cardinal artwork. Shared nondirectional contacts and elliptical ground bursts are explicitly marked `shared`. Projectiles have right-facing art only; later presentation may rotate once to a server launch vector, without homing or movement authority. There are no mirrored flight directions, gameplay root/web/poison effects or inferred statuses. Exact stage, placement, frame list, offset and origin are in the VFX manifest. Review placements anchor to the owner sprite: down `[0,-4]`, left `[-22,-22]`, right `[22,-22]`, up `[0,-40]`, shared `[0,0]`; ground depth is owner Y−1, contact depth Y+1.

## Provenance and corrections

Artwork was generated using the OpenAI built-in `image_gen.imagegen` tool from retained project references and original prompts. No external arena/desert/beach/hell enemy was recolored or substituted. Existing Beach **tooling** was reused by import: its connected-alpha extraction, anchor, atlas writer and Aseprite Lua assembly. The helper's console still says “Beach raster sources”; actual source paths and atlas metadata are Forest. No Beach artwork was imported.

The Aseprite files contain genuine editable, tagged raster cels, assembled from retained generated sources. They do not reconstruct original illustration layers. Prompt/reference/output hashes and request timestamps are in `source/generation_prompts_v01.json`; the timing ledger separates measured generator seconds from production wall time. One recovered snake-VFX cleanup request lacks an exact individual start time and is marked unknown rather than estimated.

Initial dense 8×8 snake/spider/ape attempts had unusable layout/facing and remain retained, unselected. Selected runtime sources use four 4×4 directional sheets per species. Spider sources v02 remove baked character-contact venom. Swordsman down/left v02 restore missing swords. The remaining successful directions were preserved. An attempted snake VFX alpha-cleanup v02 is retained but unselected: compositing proved the v01 foreground alpha was already clean. Transparent RGB in exported FX is now normalized to zero so viewers cannot display discarded haze. Export alpha thresholds are 245 for character extraction and 200 for effects; source PNGs remain untouched.

## Verification and actual observations

Static checks decode actual PNGs and compare each frame against its atlas crop, hashes, durations, alpha, clearance, frame/tag coverage, editable source headers and retained reference hashes. All 384 actor cels are distinct; all 112 effects are present. Protected-file hashes cover all 60 Bamboo approval-lock files and all eight approved Cái Bang files. Preparation copies review exports separately under `public/assets/forest_creep_review/`; normal gameplay does not load/register this batch.

The actual Phaser 4 standalone page is `/forest-creep-review.html?players=6&vfx=1`, served by the game client's Vite development server. It reuses the existing Bamboo map/scenery presentation and atlas animation APIs. The world fills the viewport and controls are in-viewport overlays. Camera zoom is 1, nonrotating; normal large-screen display scale is 2. The production game entry does not import this review entry.

Two-client representative snake verification passed before expanding the batch. Complete two-client verification then passed for all six: 120 clips / 384 observed frames, 28 FX sequences / 112 frames, actual loop events, one-shot completion, independent paired instances, fixed declared origins, feet-based depth and foreground tree ordering. Browser errors were empty. The final owner-alignment/held-PNG two-client run passed in 77.64s end to end (64.70s browser stage).

The repeated six-client review also passed. Its cross-client pose-coverage waits range from 333.3ms to 8116.3ms under concurrent local load; those values include waiting for every client and are not per-cel durations or a smoothness benchmark. Authored cel durations remain the explicit values above. Performance at steady multiplayer load and final artistic timing remain subject to director/runtime integration review.

The PNGs show distinct low snake/spider silhouettes, stocky ape, single-sword human, branching wood spirit and taller jointed bamboo demon at hero scale. Foreground fence/foliage intentionally covers lower-row actors; the behind/front pair demonstrates tree occlusion. Attack screenshots captured after completion show recovery and do not prove the contact pose alone. `candidate-vfx-held-contact.png` is explicitly a **controlled held frame**, following separately observed free-running FX completion tests. Screenshots are evidence of appearance; event logs prove frame progression.

Six-client review and repository final-check results are recorded below after execution. Six review clients each display six approved hero **scale stand-ins** and paired candidate creatures. They are not six networked heroes fighting these new species. Natural combat, damage/reward synchronization and server collision for this new art remain outside scope until authoritative type IDs exist. Existing dungeon regressions exercise the normal gameplay path separately.

## Commands actually executed

- `python -X utf8 assets/sprites/creeps/dungeons/forest/source/package_forest_v01.py --enemy <typeId>` for each of the six selected packages; targeted re-exports after the spider/swordsman corrections.
- `python -X utf8 assets/sprites/creeps/dungeons/forest/source/package_forest_v01.py --effects` for the 112-effect export and normalized transparent RGB.
- `python -X utf8 scripts/verify-forest-creeps.py --enemy truc_xa` and full `python -X utf8 scripts/verify-forest-creeps.py`: PASS.
- Representative: `FOREST_REVIEW_PLAYERS=2 FOREST_REVIEW_ENEMY=truc_xa node tools/run-playwright.mjs test --config playwright.forest-creeps.config.ts tests/e2e/forest-creep-review.spec.ts`: PASS (environment variables were set with PowerShell).
- Full iteration: `FOREST_REVIEW_PLAYERS=2 pnpm check:browser --config playwright.forest-creeps.config.ts tests/e2e/forest-creep-review.spec.ts`: PASS, including the final owner-aligned VFX/held-PNG run. Logs are retained here.
- Scoped Prettier checks and `git diff --check -- scripts/prepare-assets.mjs package.json`: PASS.
- `FOREST_REVIEW_PLAYERS=6 pnpm check:final --config playwright.forest-creeps.config.ts`: first attempt stopped at test/tool typechecking, TS1543 in concurrently added `apps/game-client/src/feedback-art.ts`. It had reached/passed preparation and project compilation. The unrelated file was not changed by this task; this failure is retained in `final-check.log`.
- Subsequent final/browser results: see the execution addendum below.

## Exact future art-to-type mapping (proposal, not implemented)

The server must supply a stable creature **type** separately from the spawned entity's instance ID. Concurrent Desert work now provides `CreepState.archetypeId`; a later forest implementation should populate that existing authoritative field with the exact values below, in forest zones. Package `typeId` is an asset identifier, not a new network field added by this batch. Do not derive it from instance ID, spawn order, wave number or position.

| Future authoritative `archetypeId` | Client art key | Package |
| --- | --- | --- |
| `truc_xa` | `forest_truc_xa` | `forest/truc_xa/manifest.json` |
| `doc_chu` | `forest_doc_chu` | `forest/doc_chu/manifest.json` |
| `son_vien` | `forest_son_vien` | `forest/son_vien/manifest.json` |
| `truc_lam_kiem_khach` | `forest_truc_lam_kiem_khach` | `forest/truc_lam_kiem_khach/manifest.json` |
| `moc_linh` | `forest_moc_linh` | `forest/moc_linh/manifest.json` |
| `truc_yeu` | `forest_truc_yeu` | `forest/truc_yeu/manifest.json` |

Later implementation must type/validate the forest archetype values, register/load approved packages only for forest zones, and use authoritative pose/facing/position and event timestamps. Presentation may select only documented clips/effects. Contact damage and projectile results must stay on server ticks; animation completion/update callbacks never apply hits or statuses. Unknown/missing types retain the clearly labelled placeholder. Any missing authoritative attack/hurt/death event contract must be designed and approved separately, not inferred from this art. No gameplay abilities are approved by these motifs.

## Remaining review and limitations

Director review of concept identity, anatomy, selective outlines/pixel density, palette, actor scale and all motion at normal zoom is still pending. Automated bounds checks cannot certify anatomy or artistic consistency. Raw generated sheets can contain transparent haze RGB; runtime exports remove it. Source sampling yields some small directional body-width differences; exact factors are disclosed rather than hidden with animated scale transforms. The compact four-frame root/web endings imply retraction/breakup, not persistent gameplay effects. No extra linger phases were added. New-species natural multiplayer combat/collision/readability is not claimed from this controlled gallery.

Task-authored code is limited to `apps/game-client/forest-creep-review.html`, `apps/game-client/src/forest-creep-review.ts`, `scripts/prepare-forest-creep-review.mjs`, its import/call in `scripts/prepare-assets.mjs`, `scripts/verify-forest-creeps.py`, the validator entry in `package.json`, `playwright.forest-creeps.config.ts`, and `tests/e2e/forest-creep-review.spec.ts`. The existing `tests/e2e/bamboo-forest.spec.ts` peer check now focuses the reviewed client and requires actual frame/completion observations for one-shots instead of simultaneous current animation keys. Production packaging and verification-recording scripts live with these new assets/reviews. Other checkout changes, including concurrent desert/feedback/skills work and earlier environment-audit changes, were preserved. `delivery_files.json` enumerates exact generated files and hashes rather than attributing the whole dirty checkout to this batch.

## Execution addendum

- Full isolated six-browser art review: PASS, all 384 character frames / 120 clips and 112 effects / 28 sequences; errors empty. PNGs and event observations are in `final-6/`. This is controlled art verification, not networked gameplay integration.
- Independent remaining stages after the first pipeline block: `pnpm test:workflow` PASS (two asset-file tests); `pnpm exec vitest run` PASS (338 tests / 28 files, 104.61s); `pnpm verify:assets` PASS (all 12 configured validators).
- The first combined browser scope passed both ordinary dungeon tests and the six-client forest review, but failed the old Bamboo peer-current-animation assertion. Failure log is preserved as `six-client-and-dungeon-browser.log`. The test-only correction observes the peer's real frames and completion instead of demanding a simultaneous animation key; no gameplay or artwork changed.
- After the concurrent feedback import was corrected externally, a second `FOREST_REVIEW_PLAYERS=6 pnpm check:final --config playwright.forest-creeps.config.ts` passed preparation, project compilation, test/tool typechecks, eight workflow checks and 335 unit/integration cases. The other three cases could not start because another process held port 2626 (`EADDRINUSE` in `tests/skill-room.test.ts`); log is preserved in `final-check-rerun.log`. No other process was stopped and no unrelated room test was edited.
- Only affected/deferred stages are retried, following the repository workflow: `pnpm exec vitest run tests/skill-room.test.ts` (`skill-room-stage-retry.log`), then `FOREST_REVIEW_PLAYERS=6 VOLAM_BAMBOO_EVIDENCE_DIR=assets/reviews/forest_creeps_v01/bamboo-regression pnpm check:browser --config playwright.forest-creeps.config.ts` (`final-browser-stage.log`). The latter rebuilds the production client, then runs the corrected Bamboo regression, two ordinary dungeon tests and six-client isolated art review. Their actual results are appended when complete. The prior 335 successful tests and static asset checks are retained, rather than rerunning them solely for a green summary.
- Room-stage retry initially met the same occupied port. After the other service released it, `pnpm exec vitest run tests/skill-room.test.ts` passed all three cases in 2.89s (`skill-room-final-retry.log`). Together with the retained 335 final-run cases, all 338 unit/integration cases have passing results.
- The production rebuild and three unaffected browser cases passed again (`final-browser-stage.log`, 3 passed / 1 failed). The remaining Bamboo fixture missed a complete 30ms key press between rendered frames. Its helper now holds a real keyboard key until the server acknowledges an input frame, always releasing in `finally`. Another focused run exposed idle SDK peers waiting undefended in the practice arena while browser menus rendered; the fixture now enters these peers immediately and explicitly requests Forest. These are test-service/input changes only. `pnpm exec tsc -p tsconfig.tools.json --noEmit` passed after the final helper change. Focused Bamboo retries retain separate logs and PNG directories; historical evidence is not deleted.
- **Final affected Bamboo retry: PASS**, one test in 1.5 minutes (`bamboo-final-stage-v2.log`). Exact invocation: `VOLAM_BAMBOO_EVIDENCE_DIR=assets/reviews/forest_creeps_v01/bamboo-regression-final-v2 node tools/run-playwright.mjs test --config playwright.forest-creeps.config.ts tests/e2e/bamboo-forest.spec.ts`. It verified six-player presence, authoritative movement/collision and peer position, normal viewport/HUD, front/behind layering, all present placeholder animation states in four directions on both browser clients, and physical exit while peers remain in the dungeon. Actual PNGs and `observations.json` are in `bamboo-regression-final-v2/`.
- **Final retained stage results:** project + test/tool typechecks PASS; eight workflow checks PASS; 338 unit/integration cases PASS (335 in the final run plus the three deferred room cases); production build PASS; 12 asset validators PASS; all four selected browser scenarios PASS across the retained runs and final affected retry. Neither `check:final` invocation completed uninterrupted: the first stopped on the concurrent JSON import, the second on the shared room-test port. This report does not relabel either command as an uninterrupted success. Only affected/deferred stages were retried after their fixes, as the repo workflow requires.
- No new gameplay footage or animated evidence was generated. All new visual evidence is PNG. New art stays `produced=true`, `runtimeVerified=true` **for isolated Phaser review only**, `runtimeIntegrated=false`, `directorApproved=false`. Approved Bamboo/Cái Bang protected hashes remain unchanged after the final metadata recording.
