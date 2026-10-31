# Bamboo Forest creep artwork — director approval

Approved on **2026-10-31** by the game director. Exact approval: **“I approved the artwork”**.

This approves the selected six-enemy Bamboo Forest artwork delivered and reviewed in this chat: Trúc Xà, Độc Chu, Sơn Viên, Trúc Lâm Kiếm Khách, Mộc Linh and Trúc Yêu; selected concepts/comparison; **384 directional character frames / 120 clips**; **112 VFX frames / 28 sequences**; and the reviewed normal-zoom appearance.

Canonical approval and immutable hashes: `assets/approved_forest_creeps.lock.json` — **565 selected files**, including production PNGs, atlases, individual frames, editable sources, selected generated sources and provenance. Superseded/rejected source variants are retained but are not approved as production frames. The Bamboo environment approval remains in its existing, unchanged lock.

No artwork PNG/atlas/source bytes were changed or regenerated when recording approval. Original production manifests and older candidate reviews remain immutable historical records. The runtime adapter derives `status=approved` and `directorApproved=true` from the validated approval lock. Generated approval metadata drives the HUD/review labels; unknown server archetypes still show the placeholder label.

Approval does **not** authorize a Forest spawn roster/wave distribution, new AI or abilities, poison/web/root statuses, projectile mechanics, balance or loot. `normalForestRosterIntegrated=false` remains correct. Natural combat of these species cannot be claimed until authoritative spawn/type data is supplied and tested. Existing loader/event integration scope is documented in `FOREST_CREEP_RUNTIME_INTEGRATION.md`.

Protection:

- Normal preparation and standalone Forest preparation verify the approved hashes before copying assets.
- The Forest v01 packager refuses overwriting the approved revision.
- The old production verification recorder refuses rewriting the pinned historical metadata. New runtime evidence is recorded separately.
- Static validation checks the approval quote, all pinned hashes and approved runtime status, while keeping normal-spawn and art-approval fields distinct.

Validation for this approval update is under `docs/evidence/forest-creep-approval-2026-10-31/`: focused art tests, test/tool typecheck, source/atlas/hash checks, expected exporter/metadata guard refusals and two-client Phaser checks for labels/status. The prior full 342-test run and six-client render/network evidence remain retained; unchanged full/six-client suites are not repeated for approval bookkeeping.

Actual results: four focused tests PASS; project compilation and test/tool typecheck PASS; static validation of 384 character frames, 112 effects and all 565 approved hashes PASS. Both overwrite-guard invocations exited 1 as expected, before writing assets. Two relevant Phaser cases PASS (2.6m): the shared-scene review and real-room renderer/event fixture. The approved review heading was inspected in the actual PNG. The pre-approval runtime static report was retained byte-for-byte, including its original line endings; new reports and PNGs use the separate approval evidence directory.
