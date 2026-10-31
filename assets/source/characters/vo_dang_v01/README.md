# Võ Đang character prototype v01

The user explicitly approved `assets/concepts/heroes/vo-dang/vo-dang-concept-v01.png` with “approved” on 2026-10-30. **Final runtime character art APPROVED on 2026-10-30**, following a separate explicit user approval. The89 exact concept/source/export files are protected by `assets/approved_vo_dang.lock.json`.

The 14 untouched AI-generated source PNGs in `generated/` and exact `generation_prompts_v01.json` retain production history. These are newly generated animation poses derived from the approved costume, not concept-sheet crops or downscaled concept portraits. All four facings were generated separately. No approved Cái Bang or Thiên Sơn pixels were changed.

| Style | Editable source | Runtime export | Canvas / foot pivot |
|---|---|---|---|
| Quyền | `hero_vo_dang.aseprite` | `assets/exports/characters/hero_vo_dang.png` + JSON | 80×80 / (40,64) |
| Kiếm | `hero_vo_dang_kiem.aseprite` | `assets/exports/characters/hero_vo_dang_kiem.png` + JSON | 96×80 / (48,64) |

Both sources have 40 distinct cels and 12 authored tags: four-direction idle 2×350ms, walk 4×120ms and normal attack 4×75ms. Normalized origin is (0.5,0.8), body height approximately 44 logical pixels, nearest texture filtering and existing camera zoom1. The sword canvas is wider solely to clear the extended rightward thrust at the same body scale. Atlas frames are `{state}_{direction}_{zero_based_tagframe}` with a `feet` pivot slice. Individual transparent frame PNGs live under `assets/exports/characters/vo_dang_v01/{quyen,kiem}/frames/`.

`inspect_sources.py` records connected alpha>=220 source runs. `measure_frames.py` retains fixed scale per strip and measured dark shoe-run feet anchors in `frame_sources_v01.json`. `assemble.lua` uses Aseprite to copy original RGB runs, normalize retained alpha, resize with nearest-neighbor and align cels; it does not draw replacement illustration. Original walk attempts were superseded by separately retained walk corrections. The original touching right-facing sword contact/follow-through component is excluded; a separate source supplies isolated replacement frames. The up walk uses a separately generated opposite-leg contact. Full provenance is in `production_manifest_v01.json`.

```powershell
pnpm assets:export:vo-dang
python scripts/verify-vo-dang.py
pnpm assets:prepare
```

Default export preserves manual Aseprite edits. To intentionally rebuild the editable sources from measured source poses:

```powershell
python assets/source/characters/vo_dang_v01/inspect_sources.py
python assets/source/characters/vo_dang_v01/measure_frames.py
node scripts/export-vo-dang.mjs --assemble
```

Both scripts refuse a future `assets/approved_vo_dang.lock.json` approval lock. Runtime builds require exported PNG/JSON, not Aseprite. Cast aliases the normal attack; hurt/death alias idle and are not authored or approved animations.

Server-selected Võ Đang uses the Quyền artwork. `?debug=1&voDangWeapon=kiem` selects the Kiếm **presentation review only**, including shared actors on that reviewing client. It does not send equipment commands or modify the replicated `basicId`, damage, timing, targeting, collision, mana, RNG or control mappings. Võ Đang combat mechanics, passives and sword-qi chance remain outside this character task. `?artPreview=1&voDangReview=1` plays all 24 authored tags in the existing Phaser review scene.

`node tools/run-playwright.mjs test --config playwright.vo-dang.config.ts` owns isolated server2602/client5192 services. All browser video and traces are off. Static PNGs and sampled frame observations are in `assets/reviews/vo_dang_v01/`. Final live validation and approval status are recorded separately from concept approval.
