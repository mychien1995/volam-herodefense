# Thiền Sư two-strike A — v05

Latest director request replaces the four-strike A with alternating **chọc → đập**, emphasizing a clear two-handed inward grip, lifting the whole hammer above the head and a powerful ground contact. Branch `wip/m3d/skill-revise`. New art remains a runtime review candidate; old V01–V04 source/export/approval evidence is preserved.

The canonical runtime override filters the combo to `thrust`, `overhead`. Per-strike damage multipliers1/1.2, the overhead residual13/radius37 field, melee range and the existing zero manual-A cooldown remain. Only accepted inputs advance the chain, including misses. The thrust, idle and corrected walk art remain from V04.

Built-in `image_gen.imagegen` produced five original ten-phase sheets: right/down/down-right/up/up-right. The three left directions derive from explicit horizontal mirrors. [Exact prompts and receipts](generation.json), raw PNGs and [registration](registration.json) remain here. The first up-facing prompt was rejected by the image service; a solo pose/mechanics description generated the retained up sheet. The right slice was verified in two actual Phaser clients before expansion.

Each take shows neutral, gather, chest lift, face lift, overhead raise, loaded overhead, downstroke, ground contact, low follow-through, neutral recovery. Source0/9 are replaced with exact retained neutral pixels to preserve identity. One anatomical scale per source and the common canvas512×448 / foot256,320 remain; no runtime per-pose enlargement. Both hands stay on the haft, with inward wrist/palm rotation; grip quality is checked visually, not inferred from a PNG hash test.

The presentation uses durations `[15,20,25,25,35,25,15,45,40,25]` ms,270ms total. The lift/loading is longer than the downstroke, followed by a visible grounded hold. On low FPS it advances at most one cel per draw. Walk/hurt/stun/death/new accepted actions still interrupt it. The retained `con_luan_thien_su_fx:slam` burst waits for contact cel7, using the server's residual-area coordinates. This is visual timing only; server damage timing remains authoritative.

`build.py` reuses connected-alpha extraction; the native driver reuses `tools/make-skill-revise-native.lua`, now accepting optional per-cel durations. [Validation](validation.json) verifies all80 PNG/native cels, exact alpha/visible RGB, mirrored cels, neutral continuity, full silhouettes and actual native frame durations. No recordings.

```powershell
python -X utf8 assets/source/skill-revise-thien-su-v05/build.py
node tools/prepare-skill-revise-runtime.mjs
& assets/source/skill-revise-thien-su-v05/native-export.ps1
```

Balance evidence uses the existing deterministic exposure probe with the previous four-stage definition versus the two-stage definition:288 runs each, all12branches, levels1/6/15/30, solo/six, seeds42/1337/9001. Only the monk stage list differs. Across24monk cases DPS/player changes+1.73% to+12.04%, median+7.32%, because the stronger overhead and its residual occur more frequently. Other branch configurations remain the control. This stationary-target/artificial-pressure diagnostic is not campaign/PVP balance approval. Reports: `docs/evidence/skill-revise-thien-su-v05/balance-comparison.json` and per-variant JSON/CSV.

QA reuses the existing skill-revise profile: two-client iteration, then six connected clients with two renderers during authored-motion checks and all six during natural combat. It observes both server stages, every six-cel thrust and ten-cel slam in eight facings, the contact burst, walking, real damage/death/rewards and cleanup. Final outcomes are recorded after execution.

Timing follow-up: the initial600ms candidate exceeded the unchanged server pose budget (9 ticks /30Hz =300ms), reproduced in `pose-window-reproduction.log`. The final slam is270ms with a fast15ms downstroke and85ms combined contact/settle. Thrust playback uses50ms/cel (300ms), an explicit2× playback of retained source cels. The600ms native candidate and validation are preserved. No server cooldown/damage timing changed. Under low FPS the renderer still shows at most one next cel per draw; a fresh accepted action can interrupt it.

The first final browser run missed one unchanged walking cel under six-window load and remains FAIL. Fresh two-client walking coverage (all12cels) is retained explicitly; the focused six-client retry checks every new A cel and natural combat, not a repeated walk-animation acceptance claim.
