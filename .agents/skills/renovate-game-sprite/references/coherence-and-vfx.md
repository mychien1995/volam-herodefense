# Character continuity and skill presentation

Use this reference for state-dependent body changes, action-size jumps or skill attachment/choreography defects. For source sharpness and export quality, see [process.md](process.md).

## Inventory the actual presentation path

Trace the final body drawn each frame, not just the first animation request. Legacy presenters, movement overlays, transformation handlers and skill-specific bodies may successively replace a texture. Compare idle, walk, basic attack, requested skills, hurt/status, death and respawn; include diagonals and rear views within scope.

For each path record identity/master, texture/frame family, source density, runtime scale, foot pivot, opacity/tint ownership and weapon state. A single atlas alone does not prove consistent art. Different atlases can also be valid when they share the same identity and registration; use the project's established architecture rather than requiring one storage layout universally.

Choose the accepted sharp identity as the reference and keep its face, costume, weapon proportions and drawing language across states. Portraits should use the same identity, unless the user explicitly preserves the current HUD art. Author real gait/idle poses instead of fading between a sharp and blurred drawing or using scale changes as breathing.

## Anatomical density, not silhouette extent

Keep physical head/torso density consistent across coherent source poses. Hair spread, bows, sleeves, staff skulls, hammer heads and long blades are unreliable size landmarks. A crouch can be shorter on screen without being a smaller person; do not force every pose to the same bounding-box height.

Use a common measured source-to-atlas density for poses drawn at the same scale. Register feet independently of weapon tips. If a replacement idle sheet has a different resolution, register that sheet independently; retained actions must still reference their original source group's density. A scale measured in replacement-sheet pixels cannot be applied to the old action pixels. Conversely, unrelated source sheets may need separately measured scales to reach the same anatomical size.

Inspect front, side and rear poses after export. A hair-width heuristic that works for one direction may shrink an attack in another. Fix the source registration rather than applying a transient runtime enlargement to hide it. Intentional transformations may have a distinct density, but keep it consistent through their idle, walk, attacks and reactions and label reused/derived cels accurately.

## Preserve choreography and authority

Map existing server action IDs, accepted start/duration, attack variants and native visual cues to the new body poses. Keep anticipation, contact/release and recovery where the action needs them. Do not replace several distinct attacks, stances or finishers with one generic cast pose and call the set complete.

Use presentation clocks appropriate to the current architecture. Repeatedly restarting an animation each update can pin it to cel0. Verify transitions and observed frames in the running game before choosing a timing fix. Animation must not create authoritative damage, change cooldowns or fabricate hit outcomes.

Read actual skill behavior: a passive slot may never cast; a private owner-only event need not appear on a peer; a planted weapon/detonation sequence may require a different input from a double tap. Keep body/VFX timing and skill rules separate. Do not modify gameplay or event visibility to satisfy an incorrect visual test.

## Attachments, separated weapons and doubles

Measure hand/weapon sockets on the final registered body, per pose/facing where necessary. Check them after final body sampling and transforms; old-body sockets can become wrong even when the VFX is unchanged. Distinguish visible raster measurements from explicitly occluded/behind-body anchors. A color classifier can mistake face, belt or ornaments for hands, so inspect socket proofs at native scale.

Retain the existing effect owner, timing, orientation, scale and object lifecycle unless the task requests a change. Check weapon-away/swordless bodies while a projectile is active, weapon return, form expiry, hurt/death cancellation, zone transitions and cleanup as applicable. Shadows, clones and summons need correct identity, feet/Y-depth and fade rules; do not substitute a static master for a moving body double. Existing minion art need not be redrawn for a hero-only request.

## Validation that answers the defect

- Reproduce the reported action through accepted input and server acknowledgment; inspect the actual body and effect that appear.
- Check authored frames and registration, then motion, contact/release cadence, facing, sockets and cleanup in the renderer. A still cannot prove a loop or state recovery.
- Compare expired status alpha/tint with a known neutral baseline taken before applying the effect. The first observed effect frame may already be tinted and is not a neutral reference.
- Cover a prototype's actual directions/actions. A one-facing atlas cannot prove a turning multi-pass skill. Limit the preview claim, then run the full choreography when its required facings exist; do not weaken the complete-set gate.
- Scope multiplayer checks to the claim. Visual crowding alone is not synchronized combat; controlled targets do not establish creep AI, rewards or balance. Use existing focused profiles and applicable repository party checks.
- Retain FAIL reports. A probe-only correction needs affected probe/type checks against the same bundle; art/runtime changes require rebuilding the changed dependencies. Combine scoped coverage transparently without relabeling an interrupted full run PASS.

## Review boundary

Keep the sample contract visible: new cel/state/facing set, retained set, comparison settings and tested behavior. Use before/after runtime PNGs with honest phase labels and observed animation metadata. Open the requested playable review before handing off. Continue without another approval pause when the user already authorized expansion; stop before bulk generation when the user requested a sample first. Candidate artwork and automated verification are distinct from director approval.
