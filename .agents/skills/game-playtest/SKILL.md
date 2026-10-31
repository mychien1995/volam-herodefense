---
name: game-playtest
description: Test Võ Lâm Hero Defense gameplay in the browser, including arrow-key movement, A/QWER combat controls, multiplayer room synchronization, NPC menu interaction, visual regressions and server/client errors. Use when a playable feature or milestone needs browser verification.
---

# Game playtesting workflow

Follow the recording policy in `AGENTS.md`: use PNG screenshots, frame observations and logs; keep routine browser video and trace screenshot streams disabled. Do not run video recording, encoding or conversion tools or create WebM/MP4/GIF evidence unless the user explicitly requests recordings for the current task. Preserve existing recordings. Validate animation frames/timing, transitions, facing, pivots/positioning and gameplay live in Phaser; still images alone do not prove motion.

1. Read `AGENTS.md`, `DECISIONS.md`, `ACCEPTANCE_TESTS.md` and the target milestone in `ROADMAP.md`.
2. Discover real scripts and prerequisites from package manifests; do not assume the game exists in M0. Start server and browser client locally with existing repo commands. Confirm health/readiness, not just process start.
3. Launch two separate browser contexts/sessions joining the same room with different nicknames. Keep consoles and server logs visible. Use Playwright where possible; keyboard ArrowLeft/Up/Right/Down, `A` and `Q/W/E/R` are the canonical actions. Use mouse only for menus/NPCs.
   For asset iteration, follow `docs/ART_ITERATION_WORKFLOW.md`: two clients by default, optionally three, with a separate final six-client combat/readability pass. A frame-only profile must not claim natural-combat/reward or six-player acceptance. Record measured phase timings; preserve prior approved evidence.
4. Check at least one authoritative state outcome, e.g. both contexts observe same player movement or enemy HP; never infer server correctness from animation alone. Verify ranged projectile does not home, melee arc and cleave, and status/XP rules relevant to the change.
5. Inspect rendered states (not just text DOM). Use the minimal-evidence policy in `docs/ART_ITERATION_WORKFLOW.md`: successful routine art iterations need no PNGs; failures and final new-art review retain useful screenshots. Detailed capture is opt-in. Check overlay legibility, camera/map clipping, missing assets, console errors, and network disconnect behavior.
6. Record exact test environment, commands, PASS/FAIL, evidence paths and reproducible defects. Separate manual gameplay feel feedback from objective correctness. Do not claim 60-minute wave test occurred unless it ran; a fast test mode must be identified.
7. Stop on a genuine blocker, provide minimal reproduction and a specific proposed fix. Never skip tests or silently invent screenshots.
