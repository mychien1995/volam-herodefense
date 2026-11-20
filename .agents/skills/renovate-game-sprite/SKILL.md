---
name: renovate-game-sprite
description: Sharpen or renovate existing 2D character sprites, skill VFX and associated scene art while preserving identity, proportions and action continuity. Use for blurry game-size art, inconsistent idle/walk/attack/skill bodies, or visual skill attachments and choreography. Covers versioned raster production, atlas integration and live game review; gameplay ability changes remain a separate scope.
---

# Renovate game sprites

Produce a versioned replacement that reads clearly at gameplay size and stays recognizable through the requested states. Preserve the chosen identity, perspective, weapons and palette. Treat body art, animation sampling and skill effects as related parts with separate owners.

Read only the guidance relevant to the defect:

- For sharpness, source production, alpha and render density, read [process.md](references/process.md).
- For body continuity, state transitions, skill choreography or VFX sockets, read [coherence-and-vfx.md](references/coherence-and-vfx.md).
- For request/prompt examples, use [request-templates.md](references/request-templates.md).
- In Võ Lâm Hero Defense, [volam-example.md](references/volam-example.md) maps retained examples and existing tools. Discover current paths and versions; historical measurements and test results are not defaults or current acceptance.

## Establish the scope

Locate the normal loader, atlas, animation/body presenter and relevant effect owner. Inspect source art, exported PNG/JSON and a real runtime frame. Reproduce the reported action before choosing a fix. Record the renderer/camera scale, physical body size, foot pivot, facings and timing needed for that comparison.

Distinguish a still preview, a limited playable prototype and a full match replacement. Identify which facings/states are new and which remain reused. For visual-only work, preserve gameplay, authority, controls, HUD and existing comparison toggles. Infer routine choices from the project and existing authorization.

Work in the requested checkout and retain reviewed originals in their existing version. Use sibling source/exports for replacements. A request for a sample before expansion stops at that sample; authorization to complete all branches can permit staged continuation without another approval pause. Neither automation PASS nor an earlier version's approval approves newly generated art.

## Produce and integrate

Use the available image-generation workflow for original raster redraws, separating identity, quality and runtime reference roles. Export a representative sample and inspect it in the actual renderer before expanding within the authorized scope. Correct the layer responsible for the defect: source drawing, registration/export, animation sampling or rendering.

Register coherent poses at stable anatomical density and feet pivots; inspect camera and display transforms together. Keep body and VFX separate, preserve required weapon/contact phases, and disclose shared poses or derived transformation cels. Validate real alpha, transparent gutters and complete silhouettes before integration. Retain originals, exact prompts, provenance and rejected takes needed to explain a retry.

## Verify and hand off

Compare equivalent states at the same gameplay zoom and body size; prefer the same facing and neutral/blink phase. Label independent moments or different attack variants. Keep original runtime PNGs alongside crops. PNGs document appearance; observe frame changes, cadence, foot contact, facing, status recovery and effect cleanup live to verify motion.

Validate affected assets/native sources, relevant policies and the running client. For match replacements, use real accepted inputs, server acknowledgments and applicable multiplayer checks. Follow the repository's validation and recording rules, narrowed by the user's explicit scope. Skill/documentation-only edits need skill validation, not a game rebuild or gameplay run.

Preserve failed evidence and retry the affected stage with its actual dependencies. Report what ran, what remains reused or untested, and whether the result is a candidate or approved. Deliver versioned PNG/JSON/native assets, provenance, useful before/after PNGs and a playable review when requested. Stop at the agreed review boundary.

Invoking this skill authorizes the requested art work within its stated scope, not unrelated gameplay changes, bulk expansion or external publication.
