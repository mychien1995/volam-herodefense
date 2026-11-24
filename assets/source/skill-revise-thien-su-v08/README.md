# Thiền Sư sweep V08 — compact body continuity

Visual-only response to the director reporting that V07 grows during the sweep. V07 enlarged an anatomically taller source; a single scale adjustment could not align both its face and torso with retained idle/thrust.

Five generated directional sheets redraw the existing two-hand sweep using the compact retained character model. Each sheet has six figures: two neutral calibration controls and four motion drawings. Exact prompts, reference roles, generated receipts and raw files are preserved in `generation.json` and `directional-generation.json`. The initial right take is retained; its preview looked colored, but it must not be described as proven opaque.

`registration-config.json` records manually estimated head, forearm cuff, neutral crown-to-sole and neck-to-belt landmarks. Their independent density ratios agree within 8% per source group. `build.py` applies one uniform density per direction, registers feet separately, and mirrors the three left-facing groups. It does not scale individual body parts or calibrate by weapon/hair bounds. These landmarks are manual estimates, not automatic anatomical measurements.

The runtime bank contains 48 cels: 20 new motion drawings, 12 mirrored motion cels and 16 exact retained V04 neutral cels. Ten generated calibration idles are deliberately excluded. Runtime scale remains 0.5, logical canvas 512×448, pivot (256,320); animation remains 375ms inside the existing authoritative 400ms beat. Thrust, overhead, lightning, damage, HUD and server rules remain unchanged.

Rebuild with `python assets/source/skill-revise-thien-su-v08/build.py`, then the sibling `native-export.ps1`. The latter exports the Aseprite source and roundtrip evidence; `verify.py` checks source hashes, transparent bounds, mirrors, retained neutral bytes, timings and native roundtrip. Canonical verification also checks copied public PNG/JSON.

Review evidence: `docs/evidence/skill-revise-thien-su-v08/`. `pilot/` is isolated actual Phaser viewing at scale 0.5, with retained idle/thrust; it is not multiplayer evidence. `before/` preserves the reproduced V07 defect. New art is a candidate for director review; automated acceptance does not grant final art approval.
