# Asset intake pipeline

Original inbox files are immutable inputs. `audit.json` records dimensions, formats, real alpha and SHA-256 hashes; `ASSET_INVENTORY.md` contains visual classifications and correction requirements. Automated metadata inspection never establishes production readiness.

```powershell
python scripts/asset-intake.py audit
python scripts/asset-intake.py baseline
python tests/asset-intake.test.py
python scripts/asset-intake.py validate assets/intake/your_recipe.json
python scripts/asset-intake.py process assets/intake/your_recipe.json
```

Use `character_template.json` as the actual approved convention template. Add explicit ordered frames (`file`, source `rect`, canvas `offset`, `durationMs`) and zero-based inclusive tag ranges (`name`, `from`, `to`). Origins/offsets must be measured from feet or declared VFX pivots. New characters require all four idle/walk/normal-attack directions. Unproduced states must be disclosed, never invented. Set `reviewed:true` only after actual visual inspection and provenance review. Variable timing needs explicit handling before runtime integration; this importer requires uniform duration per tag for the existing frameRate registry.

The importer rejects JPEG, opaque sprite/VFX/object PNGs, empty frames, clipping, missing directions, untagged/overlapping frames, unexplained duplicates, missing provenance and protected hero IDs. Terrain can be opaque. No background removal, scaling, distortion, generated replacement art or automatic direction guessing occurs. Aseprite copies source rectangles at declared offsets, saves editable cels, builds tags after all frames exist, and exports PNG plus hash JSON with a pivot slice. Set `ASEPRITE_PATH` if needed; default is the locally verified Aseprite installation.

Outputs go to a new `assets/intake/staged/<id>/` directory: preserved recipe, `source.aseprite`, `sheet.png`, `atlas.json`, runtime-shaped `manifest.json`. Existing staged IDs cannot be overwritten. These files are **not installed into runtime**. After first-batch visual review, copy exports into the appropriate export category, merge the staged manifest using repository-relative source paths and category-relative PNG/JSON paths, and add the actor ID to the existing metadata loader registry in `apps/game-client/src/art.ts`. That loader already validates frames, registers animation names and uses nearest filtering. Environment/terrain/VFX require their own existing scene bindings and visual verification; source collisions never become server authority automatically.

The current six inbox files fail intake; no new scene or gameplay code is warranted. The staged `intake_validation_fixture` exercises Aseprite with a single existing approved still (copied pixels, not regenerated). It is a pipeline fixture, not a merchant, enemy or new production asset. Native-scale decoded pixels must match its approved input exactly.

Approved Cái Bang source/exports are hash-locked in `assets/approved_cai_bang.lock.json`. The old hero exporter refuses approved IDs. `baseline` and the regression test verify those bytes. Approval covers authored idle/walk/normal attacks only; runtime fallback aliases remain disclosed.
