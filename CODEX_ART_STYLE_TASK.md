# Codex — Fix the game pixel-art style (copy/paste task)

> Historical task brief. Continue only the scope requested in the current chat; use root [AGENTS.md](AGENTS.md). Resolve original filenames and corrected roles through [the current reference index](assets/references/README.md). Do not restart M0 or completed art milestones from this brief.

Read `AGENTS.md`, `ART_ASSET_GUIDE.md`, `ART_DIRECTION_REFERENCE.md`, and inspect the image `assets/references/mood/characters/vo_dang_character_reference.png` **before changing artwork**.

The game's visual style must match the attached reference's **detailed chibi wuxia pixel art**, with a Pokémon-like elevated top-down 2D camera. Preserve the 2D orthographic projection, square-grid tiles and four directional views. Do not create minimalist sprites, SVG/cartoon drawings or geometric Phaser `Graphics` characters and claim they are finished artwork.

Please audit the current artwork and explain specifically why it differs from the reference (proportions, palette, pixel detail, animations, perspective, scale, VFX). Then make a **single Võ Đang vertical-slice art prototype** (not all four schools): transparent gameplay sprites for idle/walk facing up/down/left/right, one Quyền basic attack, one Kiếm basic attack and a white/blue Yin–Yang / sword-qi effect. The head, robe, ribbons, and colors must remain consistent across every frame.

Keep source art, PNG/atlas exports, filenames, frame dimensions, feet origin, and provenance in the prescribed folders. Integrate sprites into the Phaser test scene with one tree/building and a creep, using crisp nearest-neighbor rendering and correct foot-based occlusion. Capture screenshots of the real running game at intended zoom. Report which visuals are genuinely painted/finished, which are placeholders, and any limitations creating frame-by-frame pixel art in your environment.

**STOP at the art approval gate.** Show me the prototype and request visual feedback before creating more characters or 43 skill effects. Do not change gameplay, networking, combat damage or previously accepted rules just to improve artwork.
