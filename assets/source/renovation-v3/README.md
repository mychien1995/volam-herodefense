# Renovation v3 — school and boss actions

Candidate art for director review. The director accepted the v2 pilot style, identified three defects, and explicitly requested extension to every school and boss skill. The v1 idle/walk and v2 sources/exports remain intact. No new final-art approval is inferred from tests.

`generation-jobs.json` contains 75 original generation prompts: 29 four-facing body groups, 33 remaining school-effect groups and 13 boss/helper-effect groups. `extra-jobs.json` adds a single fire dog, physical staff extension and five separately coloured elements. `chiet_mai_clean.png` fixes the pilot matte. Five defective pale-matte sources were edited again; their earlier rasters remain in `rejected-matte/`. Full hashes, prompts and available measured timings are in `provenance.json`. Missing individual generation timings are recorded as null.

There are 464 new body keyposes and 372 new effect source cels. Four accepted pilot body sheets supply 64 retained keyposes. Actions share semantic weapon/guard/meditation poses; the thousands of runtime frame references are not independently painted drawings. Original AI-generated project art uses approved project identities, without external game pixels.

The runtime body redraw samples the retained animator, keeps a fixed foot pivot and uses native raster scale 0.5. Single-cel Phaser progress can be NaN, so routes provide a finite fallback. All 43 skills retain their original effect execution, hit clocks, target rules, origins, projectiles and areas. Four Thất Tinh slashes now use the existing directional hand sockets, and the Vạn Kiếm channel keeps the new meditation body until the real channel ends. Hurt/death remain outside this cast renovation.

Production and review:

```powershell
node scripts/prepare-assets.mjs
node scripts/export-renovation-v3.mjs
python -X utf8 scripts/verify-renovation-v3.py
# Scoped FX retry: --only=<comma-separated atlas IDs>; retain valid sources.
node scripts/prepare-renovation-v3-review.mjs
```

Exports use Aseprite. Python only reads/measures pixels; it does not draw or edit images. Body groups align actual connected figures and row foot baselines rather than assuming an image generator obeyed a nominal grid. FX preserve old virtual frame names/sizes/durations, with new packed physical metadata. Inline atlas JSON loaders are redirected as well as ordinary file URLs. Effects keep tight edge alpha, with a six-pixel source-cell feather; body outlines are never feathered. Actual alpha and gutters are checked against the pale-square regression.

PNG comparisons, actual frame/state observations and exact browser coverage are under `docs/evidence/renovation-v3/`. No routine recordings are produced.
