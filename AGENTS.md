# Võ Lâm Hero Defense — agent instructions

## Scope and source of truth

- Continue the existing M3D baseline; implement only the user's requested scope. `CODEX_START_HERE.md` and its M0 bootstrap are historical, not instructions to restart the game.
- Preserve approved rules. Use the latest explicit user decisions and task-specific canonical overrides; distinguish implemented behavior, proposals and art approval. Read relevant sections, not the entire historical handoff on every turn.
- Campaign override: [2026-11-06 rules](docs/CAMPAIGN_BALANCE_2026_11_06.md) supersede older two-gate/no-Long-Châu/one-revive restrictions. Keep inventory-v2 migration separate.

## Read only what the task needs

| Task | Required context |
| --- | --- |
| Existing feature or bug | Relevant source/tests; applicable sections of [DECISIONS](DECISIONS.md), [M3D memory](docs/M3D_INTEGRATION_MEMORY.md) and [architecture](TECHNICAL_ARCHITECTURE.md) |
| Combat, school, progression or balance | Above + [content](CONTENT_DATA.md), [combat](COMBAT_SYSTEM.md), [balancing](BALANCING.md), [game design](GAME_DESIGN.md); use the matching ability/balance skill |
| Items, rewards or crafting | [Items and crafting](ITEMS_AND_CRAFTING.md), campaign override, current implementation; do not infer approval for future migration |
| UI or artwork | [Reference index](assets/references/README.md), [UI spec](UI_UX_SPEC.md), [art direction](ART_DIRECTION_REFERENCE.md), [production gate](ART_PRODUCTION_STANDARD.md), [asset guide](ART_ASSET_GUIDE.md); inspect the relevant actual PNGs |
| Validation | [Session lessons](docs/SESSION_EXECUTION_LESSONS.md), [development workflow](docs/DEVELOPMENT_WORKFLOW.md), relevant [acceptance criteria](ACCEPTANCE_TESTS.md) |

Use [roadmap](ROADMAP.md) and [open questions](OPEN_QUESTIONS.md) for unresolved scope, not as permission to start another milestone. For Phaser/Colyseus changes, check installed versions and official docs; Colyseus 0.18 differs from older APIs.

## Invariants

- Server owns movement, collision, targeting, damage, RNG, skills, resources, inventory, rewards, clocks and match state. Never trust client-submitted results or positions. Keep `game-core` independent of Phaser, Colyseus, DOM and UI, with deterministic seeded tests.
- Preserve existing keyboard/mouse controls (arrows, A, QWERT, F stance and current mouse/menu controls), targeting, straight non-homing projectiles and melee/cleave contracts. Vietnamese names are canonical; use stable ASCII IDs and separate localization.
- After joining, show one dominant game viewport. HUD and every menu belong inside it, including DOM overlays. No persistent exterior dashboard column/title/footer; do not shrink the map for panels. A separate pre-match lobby is allowed.
- Keep original/licensed art and provenance. Detailed chibi wuxia, elevated orthographic three-quarter view, fixed camera perspective and foot/Y-depth occlusion remain required. No proprietary Warcraft/Pokémon assets or procedural/geometric placeholders presented as final art.

## Execution and verification

- State the brief plan and context read. Reproduce defects first; use server-acknowledged inputs. Reuse existing helpers, exporters, menu components and scoped references. Keep data/tuning separate from mechanics.
- Iterate with focused tests. After the final implementation change run `pnpm check:final [relevant Playwright arguments]` once. Retry failed stages with changed dependencies; do not repeat passing full suites for summaries or approval metadata. Documentation/reference-only changes need link/hash/metadata checks, not a gameplay rebuild.
- Add meaningful regressions for new combat/status/progression/inventory/wave behavior. Report commands actually run and limits; never infer a PASS from an old report.
- New art: one representative slice at normal gameplay zoom before a batch. Validate PNG/JSON, pivots, facing, frames/timing, transitions, effects and multiplayer readability in live Phaser. PNG alone does not prove motion or authority. Required director concept/final-art approval remains explicit; a preview or passing test grants neither. Preserve approved bytes and historical evidence.
- No routine WebM/MP4/GIF/animated-image evidence, recording/encoding/conversion tools or trace screenshot streams. Use lightweight PNGs and live frame/event observations. Record only when explicitly requested for this task; preserve existing recordings.
- Respect other in-progress work. Update specs only for actual approved behavior changes; keep source modular and report remaining prototype/approval status honestly.

## History

The [exact pre-cleanup instructions](docs/history/AGENTS-2026-11-19.md) preserve the original detailed constraints and milestone history. Consult them only when relevant; superseded historical rules do not override current decisions. Reference moves and misnamed originals are indexed in [the reference manifest](assets/references/manifest.json).
