# Waves 17–20 — Phase 1I + 1J production

Original AI-assisted pixel-art poses, using the auto-approved master under `assets/concepts/arena-creeps/waves-17-20/` as the design source. The current user explicitly waived intermediate concept approval. Runtime/director approval is a separate state; no independent final director review is claimed.

Four cardinal facings per enemy. Each facing has idle2, walk4, basic_attack4, hurt2, death4: 64 PNG cels and20 tags per enemy, 256 cels/80 tags total. Casting/release and overhead/contact are keyposes of existing basic attacks, not additional combat rules. Every frame has true binary alpha, a fixed foot pivot and a named atlas rectangle. Retained generated PNGs and exact requests are in each enemy's `source/`; Aseprite sources are editable assembled cels, not a claim of manual illustration.

- 17 `creep_shadow_assassin` / Ảnh Ma: violet mask, spectral black/purple armor, two shadow blades, split ethereal coat; 48px body,128×112 canvas,feet64/88.
- 18 `creep_armored_demon_general` / Ma Tướng Thiết Giáp: closed horned helmet, black/crimson lamellar armor, dark red cape, one halberd;58px body,160×144 canvas,feet80/112.
- 19 `creep_blood_demon_warlock` / Huyết Ma Pháp Sư: visible pale face, crimson ceremonial headdress/runes, red crystal staff;52px body,144×128 canvas,feet72/100.
- 20 `creep_demon_vanguard` / Ma Vương Tiên Phong: dark gold/crimson heavy armor, two swept horns and broad two-handed warblade;66px body,160×144 canvas,feet80/112. Same regular-creep scale class as Ngưu Ma, not a main boss.

`effects/` has28 separate cels/seven clips: shadow_contact, general_contact, blood_contact, vanguard_contact, blood_projectile, shadow_trail and vanguard_aura. Contact effects follow confirmed hits. Walking trails/auras are bounded presentation sprites. The stock invasion AI remains melee; blood projectile art follows existing server-owned projectile state and is fixture-tested only. No dash, status, damage, spawn, wave timing or balance changes.

## Reference inspection

Inspected all four approved creep master sheets, representative actual production cels from every Wave1–16 family, the latest demon atlases and approved Cái Bang live gallery. The old Võ Đang art-direction alias is absent, as documented in the reference inventory; inspected the actual `vo_dang_character_reference.png`. Also inspected the rejected2026-10-29 runtime screenshot. Positive standard: compact readable heads/bodies, stepped dark outlines,3–4 material shades, layered wuxia armor/robes, warm upper-left light and elevated fixed orthographic camera. Final production uses native scale1 and the existing nearest-filtered renderer/Y-depth.

## Extraction and corrections

`production_config_v1.json` selects exact generated sources/pose indices. `build_sprites.py` analyzes retained alpha components and delegates pixel extraction, fixed nearest-neighbor scale, foot anchoring and PNG/atlas export to the existing Aseprite assembler. It never samples the concept board for animation pixels and never creates procedural replacement character art. The General's body reference excludes the tall halberd. Vanguard boot anchoring excludes the low outlying weapon guard so the left contact frame cannot shift outside its canvas.

Rejected raw sources are preserved. Corrected Vanguard down/right walk/hurt keep a visible right-hand blade. Fresh back idle/walk/hurt corrects weapon-side switching; the failed first back edit is not selected. Corrected Warlock back source places the neutral staff on viewer-left. Corrected Shadow right hurt retains two visible blades. Source hashes, concepts, exact texture/animation keys, frame bounds and extraction spans are recorded in manifests. Small rivets/runes simplify at normal gameplay scale; large concept detail is not pixel-identical to a48–66px body.

## Commands

- `python -u assets/sprites/creeps/arena/waves-17-20-production/build_sprites.py` (optionally pass a slug for focused work)
- `python -u assets/sprites/creeps/arena/waves-17-20-production/build_effects.py`
- `python -X utf8 tools/verify-arena-creeps-17-20.py`
- `pnpm check:quick tests/arena-creep-presentation.test.ts`
- `pnpm check:final --config playwright.arena-creeps-final.config.ts`
- `node tools/compare-arena-creeps-17-20.mjs`

No WebM, MP4, GIF or trace playback evidence is produced. Live evidence and actual results belong under `docs/evidence/phase1j-integration/` and `docs/PHASE_1J_INTEGRATION.md`.
