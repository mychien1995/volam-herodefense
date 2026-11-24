# Thiền Sư sweep v03

Director correction: two hands hold the long hammer throughout ONE horizontal right-to-left sweep. Only `monk-sweep` and its segment in the four-hit chain use this bank. Three other v02 attacks, retained idle, other skill bodies/VFX and all earlier concept/atlas bytes are preserved.

Built-in `image_gen` authored a six-cel front pilot, then seven individual facing sheets. Effective output is 48 cels / eight clips. [Exact prompts](prompts), [generated facing jobs](generated-jobs.json), [registered source roots/scales](registration.json), [previous-asset hash lock](retained-hashes.json). The front pilot is `raw/front.png`, generated original `exec-8564780a-5204-4221-ac5d-26786fdd5e0c.png` in the thread's Codex generated-images directory. One compact 42-cel expansion was rejected for short shafts/weak motion and is retained in `raw/rejected/other-facings.png`; it is never exported. No video or animation recording was generated.

Each clip chambers at the right, crosses the torso, follows through left and recovers. Source cel order for down-right is explicitly sampled as `[2,1,0,3,4,5]` to remove a backwards preparation beat; the six distinct authored cels are all retained, without mirroring or pretending transformed cels are new drawings. Other clips retain source order. Lateral movement is projected into each world facing. The front view exposes the side-to-side stroke most clearly.

The front slice was inspected beside retained idle in live Phaser at 0.5 sprite scale / camera zoom 1 before expansion. [Measured pilot frames](../../../docs/evidence/skill-revise-sweep-v03/pilot/observations.json), [inspection PNG](../../../docs/evidence/skill-revise-sweep-v03/pilot/inspection.png). Source visual review and playback validation do not grant director approval. This remains an isolated motion candidate, with no combat/server change.

The exporter uses a fixed 512×448 canvas, foot (256,320), one neutral anatomical density per directional source, and transparent untrimmed atlas cells (max 4096). It retains the weapon silhouette rather than shrinking individual attack frames. Native `.aseprite` and roundtrip PNG are in `native/`; [pixel/hash validation](validation.json) checks all 48 frames and retained bytes.

```powershell
python -X utf8 assets/source/skill-revise-sweep-v03/build.py
& assets/source/skill-revise-sweep-v03/native-export.ps1
node tools/verify-skill-revise-end-to-end.mjs
```

[Open sweep review, front view at 0.5×](http://127.0.0.1:5608/?action=monk-sweep&direction=down&speed=0.5). Change direction, replay or select the full combo in the existing review controls. [Current playback observations](../../../docs/evidence/skill-revise-sweep-v03/playback.json).

Final verification: `pnpm check:final tests/e2e/skill-revise-end-to-end.spec.ts` PASS (427.83 seconds). [Current full stage logs](../../../docs/evidence/skill-revise-sweep-v03/final/check-workflow/final-timings.json). Native 48-frame roundtrip, retained-byte hashes, 17 selections and 24 continuous takes passed; the combo exposed all six new sweep cels in each facing. These are rendering/source checks, not director art approval.
