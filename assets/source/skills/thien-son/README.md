# Thiên Sơn skill production v01

All10 active concepts and all13 icon concepts were explicitly approved on2026-10-31. Production art remains a prototype awaiting final approval.

- [Production manifest](../../../exports/skills/thien-son/production_manifest_v01.json)
- [Complete coverage and reuse](../../../exports/skills/thien-son/coverage_manifest_v01.json)
- [Actual visual review](../../../reviews/skills/thien-son/README.md)
- [Exact generation prompts](generation_prompts_v01.json)
- [Measured extraction recipe](recipe_v01.json)

Editable per-skill sources are <id>/character/<id>_character.aseprite, <id>/vfx/<id>_vfx.aseprite and <id>/icon/icon.aseprite. Source cels are under frames/. Runtime PNG/hash-JSON atlases and semantic animation metadata are under assets/exports/skills/thien-son/<id>/. The family icon atlas has13 static64px frames.

Export retained editable sources:
    pnpm assets:export:thien-son-skills

Only when intentionally rebuilding editable cels from retained generated sources:
    python -X utf8 assets/source/skills/thien-son/prepare_recipe_v02.py
    node assets/source/skills/thien-son/build_v01.mjs --assemble
    node assets/source/skills/thien-son/build_icons_v01.mjs

Verify pixels:
    python -X utf8 assets/source/skills/thien-son/validate_v01.py

Launch the frontend-only review:
    node assets/source/skills/thien-son/serve_review_v01.mjs

Observe all composed facings and create PNG evidence:
    node assets/source/skills/thien-son/verify_all_facings_v01.mjs

The source_regions.py helper only measures connected alpha regions into extraction metadata; Aseprite performs actual raster isolation, alpha/fringe cleanup, fixed-scale shoe alignment and packing. No procedural character/VFX geometry is used. Original generated PNGs and superseded drafts are retained. Native sources are editable raster cels, not recovered original concept layers.

All timing/motion in preview_plan_v01.json is presentation-only. The common client raster registry loads metadata but never supplies combat authority. No Thiên Sơn abilities, stats, cooldowns, costs, hitboxes, statuses or loadout changes are implemented.
