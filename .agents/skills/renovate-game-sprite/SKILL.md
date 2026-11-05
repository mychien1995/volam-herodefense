---
name: renovate-game-sprite
description: Renovate existing 2D game sprites, VFX or associated scene art for sharper native-scale rendering and coherent animation. Use when asked to redraw, sharpen or modernize old assets while retaining their identity, or to repeat the Võ Đang visual-upgrade-2 process. Covers reference-driven image generation, alpha-preserving exports and live Phaser review.
---

# Renovate game sprites

Produce a versioned replacement that reads clearly at its intended gameplay size. Preserve the identity, perspective, weapon and school palette specified by the user. For Võ Lâm Hero Defense, use the visual-upgrade-2 hero and arena as a rendering-quality benchmark.

Read [references/process.md](references/process.md) for the production decisions and [references/request-templates.md](references/request-templates.md) when interpreting or preparing a request. The measured Võ Đang example, paths and reusable export recipe are in [references/volam-example.md](references/volam-example.md).

## Establish the replacement contract

- Locate the requested asset through its normal loader and animation registry. Inspect an actual runtime screenshot, the source PNG, atlas metadata, approved design and the nearest suitable visual reference. Record current frame dimensions, body size, foot pivot, facings and action timings.
- Infer routine choices from the repo and user context. Resolve only consequential missing identity, scope or destination information with the user.
- Record whether the user requests a static comparison, an interactive art preview, or replacement in a server-backed match. Keep that choice visible in the deliverable and test scope.
- Work in the requested checkout. Create sibling versioned source/exports so reviewed originals remain available.

## Produce and inspect

- Use the available imagegen workflow for new original raster artwork. Use the old sprite/design for identity, the approved scene for render quality and a real gameplay frame for perspective and proportions. Preserve those roles in the generation prompt.
- Start with one representative cel, pass it through the actual export path and inspect it at target size before expanding the requested actions. Treat this as an internal quality check. Apply user/repository approval gates at their stated scope, carrying forward authorization already given.
- Generate coherent pose groups with stable body proportions, costume, handedness and a fixed camera. Provide genuine alternating walk poses and the action poses needed by the request. Retain valid sources and retry the defective group.
- Separate body, VFX, ground and occluding props. Inspect actual alpha, cell gutters, blade clearance and frame edges. Preserve continuous outlines through resizing and compositing.
- Reuse an existing exporter where it fits. Align frames by feet and use one consistent scale per coherent pose group. Export actual editable Aseprite sources and PNG/JSON atlases, with tags, durations and pivots.

## Verify the displayed result

- Compare old and renovated sprites at equal visible body height, on the same background and camera view. Measure actual canvas/CSS dimensions and sprite bounds.
- Select filtering and render density for the requested visual language. The accepted Võ Đang experiment uses native screen-sized rendering, retained edge alpha and linear sampling. Strict hand-pixelled styles can need nearest sampling. Validate the result in the actual target renderer.
- Check frame changes, foot contact, facing/handedness, silhouettes, weapon continuity, foreground occlusion and VFX cleanup live. A sprite moving across the screen should show the requested authored gait.
- For an art preview, label scene-only effects and any shared cast poses accurately. For a match replacement, verify the normal client entry point, server-owned events, two-client synchronization and required six-player combat/readability checks.
- Follow the repository's final validation command after the last implementation change. For metadata-only skill/approval edits, validate affected metadata and guards. Use PNGs and live frame observations under the repo's recording policy.
- Deliver the review link, native-scale screenshot, original PNG/JSON, editable sources, generation prompts, provenance and measured checks. State any reused/fallback poses and remaining approval or integration work.

A skill invocation authorizes the requested art work within its stated scope. Asset-specific drawings, collision data, gameplay rules and unrelated milestones remain governed by the user's current request and repository instructions.

