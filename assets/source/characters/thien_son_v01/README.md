# Thiên Sơn production v01

Concept v01 approved on 2026-10-30 (user: “approved, please proceed”). Runtime idle/walk/fan/đao art **APPROVED on 2026-10-30** by the subsequent explicit user approval. [Approved-byte lock](../../../approved_thien_son.lock.json) protects both sources, both atlases, previews, 80 individual frames and the exact concept.

[Production provenance](production_manifest_v01.json) links the exact approved concept, generated sources, editable Aseprite sources and every final PNG/JSON/frame hash. [Prompts](generation_prompts_v01.json), [measured placements](frame_sources_v01.json), [source alpha regions](source_components_v01.json) and [export validation](export_validation_v01.json) preserve the workflow.

Two weapon styles × four facings × (2 idle + 4 walk + 4 basic attack) = 80 distinct authored cels. Canvas 80×80, roughly 44px body, feet (40,64), 350/120/75ms frames. Fan stays in the right hand, đao sheathed left; đao style holds the blade right and stows the fan left. Directions are separately authored. Fine embroidery and accessory detail were presented and accepted in the final runtime review. Cast/hurt/death reuse is disclosed and outside this authored set.

Original generated transparent poses were cleaned/aligned in Aseprite using source pixels, per-strip nearest scaling and measured roots. No concept cutouts, geometry-generated characters or motion via static-image transforms. The initial wrong-layout source is preserved and rejected.

```powershell
node scripts/export-thien-son.mjs
python scripts/verify-thien-son.py
pnpm assets:prepare
```

The commands above document the production workflow. After approval, the exporter refuses overwriting the approved IDs. Future changes require a separately reviewed revision. Before approval, default export kept artist edits to the Aseprite files. Use `node scripts/export-thien-son.mjs --assemble` only to rebuild those sources deliberately from the original generated poses. No Aseprite dependency is needed by the runtime.

Select Thiên Sơn normally to see fan art. For the separate local đao art review use `/?debug=1&thienSonWeapon=dao` before joining/selecting Thiên Sơn. Both weapon cycles are visible at `/?artPreview=1&thienSonReview=1`. The review override changes presentation only; it does not create school combat abilities. Existing prototype combat/loadouts and server-authoritative hit/damage rules remain unchanged.

Actual PNG evidence and live animation observations are under [runtime review](../../../reviews/thien_son_v01/README.md). No recordings are produced.
