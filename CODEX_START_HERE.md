# Original Bootstrap Task — Historical M0 Prompt

Current checkpoint: M0 and M1 engineering are implemented; see `README.md`, `ROADMAP.md` and `docs/M1_VERIFICATION.md`. The prompt below is retained as the original handoff, not an instruction to restart M0. Continue only the milestone explicitly requested by the user.

## How to use

1. Unzip the full handoff folder in an **empty Git repository** and open the repository root in ChatGPT Desktop Codex.
2. Paste the task below into Codex. Attach this folder/repository if Codex cannot see local files.
3. **Do not ask Codex to build the entire game yet**; M0 is a reviewable infrastructure and multiplayer bootstrap milestone.
4. After M0, review the demo. Send a new task referencing the next milestone from `ROADMAP.md`.

---

## Prompt to send to Codex

You are the lead engineer implementing **Võ Lâm Hero Defense**, a browser-first 2D top-down multiplayer martial-arts hero-defense game. This Git repository contains the authoritative pre-implementation handoff documents; read them before coding.

**First read and summarize**: `AGENTS.md`, `README.md`, `DECISIONS.md`, `GAME_DESIGN.md`, `TECHNICAL_ARCHITECTURE.md`, `COMBAT_SYSTEM.md`, `BALANCING.md`, `ITEMS_AND_CRAFTING.md`, `CONTENT_DATA.md`, `ACCEPTANCE_TESTS.md`, `OPEN_QUESTIONS.md`, `ART_ASSET_GUIDE.md`, and `ROADMAP.md`. Distinguish confirmed choices from proposed tuning defaults and open decisions. In any conflict, confirmed decisions win. Preserve all canonical Vietnamese skill names and player input mappings.

**Your immediate assignment is ONLY Milestone M0 from `ROADMAP.md`.** Do not implement the full combat system, four schools, dungeons, crafting, invasion bosses or PvP in this task.

1. Validate the recommended 2026 stack against installed versions and current official docs: Phaser 4 + TypeScript browser client, Colyseus 0.18 + TypeScript authoritative server, pnpm workspaces, shared `game-core`, `game-data`, `game-protocol`, Vite, Vitest and basic browser smoke test facilities. Use current Colyseus APIs, not outdated 0.17 code. You may recommend a small version change if required; explain why.
2. Create a small, maintainable monorepo skeleton with client, server, shared packages and scripts. `game-core` must not depend on browser, Phaser or Colyseus. Add a placeholder Phaser scene and an independent Colyseus match room with a 6-player cap and nickname-only join; permit two browser clients to connect to the same room. No database or login. Configure pixel-art-friendly rendering and preserve `assets/` manifest/example conventions; colored/procedural placeholders are sufficient in M0. Do not attempt to generate a complete art pack in this milestone.
3. Create and validate minimal typed server/client messages. Server owns room state. Provide a simple connection/lobby HUD or status screen to prove connectivity.
4. Set up strict TypeScript typechecking, formatting/lint if appropriate, Vitest starter tests, and useful `pnpm dev`, `pnpm test`, `pnpm typecheck` commands. Add starter Playwright smoke test only if feasible without slowing M0 substantially.
5. Write exact Windows-friendly setup instructions, run the project and tests if this environment allows, and report *actual* outputs. Identify anything that could not run. Do not invent screenshots or green test results.
6. Keep design documentation and agent skills in the repository. Update `ROADMAP.md` to mark M0 tasks completed only after verification; record new uncertainty in `OPEN_QUESTIONS.md` rather than changing approved mechanics.
7. Stop after M0. Provide a summary of files changed, test commands/results, manual demo steps for two browser clients, known limitations and suggested M1 breakdown. Ask me to review before moving to M1.

Architecture should prioritize extensible data-driven content, headless deterministic combat simulation, server-authoritative networking and practical automated playtesting. Avoid overengineering infrastructure that does not serve the first vertical slice.

---

## Optional technical pointers (not mandatory install steps)

- For any sprite/animation import, use the repository-local `.agents/skills/pixel-art-pipeline/` skill and `ART_ASSET_GUIDE.md`. No extra global skill installation is required.
- Current Colyseus docs recommend an official agent skill: `npx skills add colyseus/skill`. Review the skill source and project trust requirements before installing. The handoff's three `.agents/skills/` folders are already repository-local and ready for Codex to discover.
- Reference docs are linked in `TECHNICAL_ARCHITECTURE.md`. Avoid copy-pasting tutorials for older APIs.
