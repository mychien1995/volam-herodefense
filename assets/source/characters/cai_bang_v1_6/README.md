# Cái Bang character candidate v1.6

Status: **APPROVED initial visual quality baseline on 2026-10-30** (explicit user approval; idle/walk/normal attacks in both current styles). Approved source/export bytes are locked in `assets/approved_cai_bang.lock.json`. Cast/hurt/death reuse remains outside authored-art approval. Earlier revision notes below are historical. This is the single-character prototype requested on 2026-10-29, not approval of the complete ART-01 environment slice.

## Current refinement: Bổng sweep and Chưởng

The director called the first version "almost good" and requested the unarmed Chưởng style plus a sweeping left/right Bổng attack. This is feedback to revise the same hero, not final art approval or permission to expand to other schools/environments.

- **Bổng:** `hero_cai_bang.aseprite` now has **44 cels**. Left/right basic attacks use six different rotational sweep poses at 50ms each, replacing the four-frame linear thrust. Down/up retain the four-frame strikes. The total basic-attack animation remains 300ms; no server timing changed. Staff length was corrected in the generated source to stay near the original carry length.
- **Chưởng:** `hero_cai_bang_chuong.aseprite` has **40 cels**: four facings × two idle, four walk, four open-palm attack poses. All frames are unarmed, including movement and recovery. Right-facing poses mirror left as in the Bổng set. A separate corrected front attack preserves front-facing eyes/shoulders throughout.
- Both styles use **80×80 RGBA**, about 44px bodies, and foot pivot **(40,64)** / `(0.5,0.8)`. Bổng exports to an **800×400** atlas; Chưởng exports to **800×320**.
- The renderer selects the texture from the existing replicated `basicId`. Existing portrait/paper-doll slots and A-icon follow the same selection. No new gameplay input, attack rule, projectile trajectory or UI architecture was added.
- `generated/left_sweep.png`, `chuong.png`, `chuong_front.png` are new original generated source poses. `left_sweep_initial.png` retains the earlier too-long staff candidate. Prompts are saved in `prompts_v2.json` and `sweep_correction_prompt.json`; measured extraction/foot coordinates are in `frame_sources_v2.json`. Concept-sheet pixels are still never used as runtime frames.
- The first editable Bổng version is preserved at `revisions/bong_v1.aseprite`.
- Current actual-run review and smooth Phaser playback are in `assets/reviews/cai_bang_v1_6_v2/`. Older screenshots below describe the first revision.

```powershell
node scripts/export-cai-bang.mjs --assemble
node scripts/export-cai-bang.mjs --chuong --assemble
pnpm assets:prepare
```

Omit `--assemble` to export manual edits without rebuilding source cels. `--chuong` selects the Chưởng source/export; the default selects Bổng. Runtime builds still need only committed PNG/JSON exports. Cast/hurt/death remain explicit reused-pose fallbacks in both styles and are not newly authored animation sets. Fire projectile/impact art is unchanged.

## Provenance and editing

Original raster poses were generated with the session's built-in OpenAI `image_gen.imagegen` tool, using the director-supplied `assets/references/cai_bang_character_reference.png` as design guidance. No concept-sheet pixels were cropped into gameplay frames. No external sprite pack was imported; no separate third-party asset license is asserted. The reference's underlying ownership is not independently established. This candidate is AI-assisted artwork, not a claim of human hand-pixelled authorship or exclusive copyright.

`prompts.json` preserves all generation/correction prompts. `generated/initial.png` and `generated/corrected.png` retain earlier candidates and their visible weapon defects; only selected corrected front/back frames are used. `generated/left.png` supplies the coherent left sequence; `generated/front_attack.png` supplies the corrected frontal staff strike. Right-facing cels are mirrored from the left set. The unused candidate poses remain source evidence, not runtime assets.

`assemble.lua` uses Aseprite to isolate these **newly generated** poses at measured bounds, remove low-alpha generated haze, resample with nearest-neighbour filtering at a fixed scale per source, and place them at a common foot pivot. It does not draw rectangles, geometric characters, or newly invented replacement pixels. Manual pixel finishing in Aseprite remains possible on the editable `hero_cai_bang.aseprite` cels.

- Canvas: **80×80 transparent RGBA**, chosen to retain the extended staff without clipping; the proposed 64px canvas clipped the horizontal thrust.
- Body height: approximately **44 logical pixels**; constant source scale within each facing/action source, never per-frame fit-to-box scaling.
- Feet/ground pivot: **(40, 64)**, normalized `(0.5, 0.8)`. The PNG has transparent room below the feet for the front staff tip; Phaser uses this pivot rather than the canvas bottom.
- Initial revision: **40 cels**, **12 authored tags**: `idle_{down,left,right,up}` (2 frames, 350ms/frame), `walk_*` (4 frames, 120ms/frame), `basic_attack_*` (4 frames, 75ms/frame). Current frame counts are in the refinement section above.
- Staff attack is visual only. The original server pose lifetime, damage, collision, targeting and cooldown remain authoritative and unchanged.
- Additional protocol poses remain supported through explicit manifest reuse: `cast` reuses staff attack, `hurt` and `death` hold idle frames. These are **unproduced animation states**, not finished cast/hurt/death art. Existing creeps/environment/VFX stay placeholders.

## Re-export with Aseprite

Detected binary: `C:\Program Files\Aseprite\Aseprite.exe`, verified version `1.3.18.6-x64`.

From the repository root:

```powershell
node scripts/export-cai-bang.mjs
pnpm assets:prepare
```

The default exports the editable source and synchronizes only this hero's manifest entry. Set `ASEPRITE_PATH` if your installed binary is elsewhere. Runtime builds use committed exports and do not require Aseprite.

To explicitly rebuild the editable cels from the saved generated source poses (overwrites manual source edits):

```powershell
node scripts/export-cai-bang.mjs --assemble
```

The exporter runs the documented CLI `--sheet-type rows --sheet-columns 10 --filename-format {tag}_{tagframe} --format json-hash --list-tags --list-slices`, exporting `assets/exports/characters/hero_cai_bang.png` and `.json`. The `feet` slice retains the pivot. A separate first-frame PNG feeds existing HUD/inventory art slots without changing their UI structure.

## Review limits

Generated source art required multiple corrections for disappearing/duplicated staff and incorrect front attack direction. The final candidate must be judged in actual Phaser playback at normal zoom. Mirrored side art, low frame count, idle subtlety, weapon continuity, and front/back/side style consistency remain director review points. No other character or environment artwork is authorized before approval.
# Approved Cái Bang baseline — 2026-10-30

The user explicitly approved the current Bổng and Chưởng idle/walk/normal-attack animations as the initial visual quality baseline. Exact editable source, atlas PNG/JSON and idle PNG bytes are recorded in `assets/approved_cai_bang.lock.json`. Do not regenerate or overwrite them. The old export script refuses approved IDs; use a separate revision ID for any future art review.

Both sources retain original generated raster poses assembled in Aseprite 1.3.18.6. No concept-sheet pixels were cropped into runtime animation frames. Original prompts and corrective prompts are retained in `prompts.json`, `prompts_v2.json` and `sweep_correction_prompt.json`; generated originals remain in `generated/`; measured source bounds/pivots remain in `frame_sources_v2.json`. Right poses mirror left. The first Bổng source is retained in `revisions/bong_v1.aseprite`.

| Style | Editable source | Export | Authored tags |
|---|---|---|---|
| Bổng | `hero_cai_bang.aseprite` | `assets/exports/characters/hero_cai_bang.png` + JSON, 800×400, 44 cels | Four-direction idle 2×350ms, walk 4×120ms; basic attack down/up 4×75ms, left/right sweep 6×50ms |
| Chưởng | `hero_cai_bang_chuong.aseprite` | `assets/exports/characters/hero_cai_bang_chuong.png` + JSON, 800×320, 40 cels | Four-direction idle 2×350ms, walk 4×120ms, palm attack 4×75ms |

Canvases are transparent 80×80 RGBA; bodies approximately 44 logical pixels; feet pivot (40,64), normalized (0.5,0.8). Atlas frame names follow `{state}_{direction}_{zero_based_tag_frame}`. Aseprite preserves 12 authored tags and a `feet` pivot slice. Nearest filtering, camera zoom 1, normal desktop integer display scale 2. Pixel art size does not determine authoritative collision or damage. The replicated `basicId` selects the style, including existing portrait/paper-doll slots and A icon.

Cast reuses normal-attack frames; hurt/death reuse idle frames. These remain unproduced art and are outside the authored animation approval. Environment, enemy, fire VFX and UI frame quality are not approved by this character decision.

Historical captures and development reviews are in `assets/reviews/cai_bang_v1_6/` and `assets/reviews/cai_bang_v1_6_v2/`; their earlier pending-approval statements describe those review dates. Original AI sources are project-generated assets, not a claim of human hand-pixelled authorship or exclusive copyright.

Use `assets/intake/character_template.json` and `assets/intake/README.md` for new assets. `python scripts/asset-intake.py baseline` verifies approved bytes. Existing assemble scripts are preserved as historical production sources, not commands to run against the approved files.
