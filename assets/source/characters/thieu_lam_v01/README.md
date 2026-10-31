# Thiếu Lâm approved character v01

The director approved **thieu-lam-concept-v02.png** on 2026-10-31 with the exact message "approved", for the same monk's Quyền and Đao idle/walk/basic-attack production. Concept approval is recorded in `assets/concepts/heroes/thieu-lam/concept_manifest_v02.json`. Final runtime artwork was explicitly approved on2026-10-31; assets/approved_thieu_lam.lock.json protects89 exact concept/source/export files.

Twelve untouched generated source PNGs and their exact prompts are retained in `generated/` and `generation_prompts_v01.json`. Newly drawn poses were generated from the approved design; no concept-sheet crops, static-image bobbing, geometric illustration or third-party sprite pack was used. Four facings were authored separately. Original walk attempts and the wrong-side left đao strike remain preserved; measured frame selection explicitly uses their corrections.

| Set | Editable source | PNG/JSON export | Canvas / feet |
| --- | --- | --- | --- |
| Quyền | `hero_thieu_lam.aseprite` | `assets/exports/characters/hero_thieu_lam.{png,json}` | 80×80 / (40,64) |
| Đao | `hero_thieu_lam_dao.aseprite` | `assets/exports/characters/hero_thieu_lam_dao.{png,json}` | 112×80 / (56,64) |

Both have normalized origin (0.5,0.8), approximately44px body height,40 distinct cels and12 authored tags: down/left/right/up × idle2×350ms, walk4×120ms and basic_attack4×75ms. The wider đao canvas clears the corrected left slash without shrinking the monk. Atlas format is Aseprite hash JSON with ordered tags, `{state}_{direction}_{zero_based_tag_frame}` names and a `feet` pivot slice.80 individual transparent frame PNGs live in `assets/exports/characters/thieu_lam_v01/{quyen,dao}/frames/`.

`inspect_sources.py` measures connected alpha≥220 source pixels. `measure_frames.py` records fixed scales per source strip/row, scalp/body measurements and dark shoe anchors. `assemble.lua` copies original RGB runs into Aseprite cels, removes low-alpha generation haze, normalizes retained alpha and uses nearest-neighbor scaling/alignment. No character pixels are procedurally drawn. The sources are editable raster cels, not recovered semantic layers from flattened AI artwork.

```powershell
pnpm assets:export:thieu-lam
python -X utf8 scripts/verify-thieu-lam.py
```

Default export preserves manual Aseprite edits. Intentional source reconstruction uses:

```powershell
python -X utf8 assets/source/characters/thieu_lam_v01/inspect_sources.py
python -X utf8 assets/source/characters/thieu_lam_v01/measure_frames.py
node scripts/export-thieu-lam.mjs --assemble
```

Exporter/assembly refuse overwriting a future `assets/approved_thieu_lam.lock.json`. Preparation verifies that lock when present; it now protects the final reviewed files. Runtime builds consume retained exports and do not require Aseprite.

`?artPreview=1&thieuLamReview=1` uses the existing Phaser gallery with all24 authored tags. Server-selected Thiếu Lâm uses the unarmed presentation. `?debug=1&thieuLamWeapon=dao` is **local presentation review only** and never sends a weapon/loadout command. Existing authoritative basic IDs, damage, targeting, RNG, collision and combat timing remain unchanged. Thiếu Lâm school gameplay is outside this art task. Cast aliases basic attack; hurt/death alias idle, and none is an authored animation in this delivery.

`playwright.thieu-lam.config.ts` owns server2603/client5193 and separate output paths. Video and traces are disabled. Actual evidence and verification results are recorded in `assets/reviews/thieu_lam_v01/README.md`; production hashes and provenance are in `production_manifest_v01.json`. Final director approval is recorded. Export/assembly/preparation guards preserve the approved-byte lock.
