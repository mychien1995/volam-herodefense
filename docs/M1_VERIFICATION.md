# M1 verification · v1.2 art direction · 2026-10-29

M1 engineering is implemented and verified; **final art approval remains OPEN**. All new artwork is `prototype`. M2 has not started. Existing user edits to the v1.1 handoff, art skill and asset conventions were retained and extended with the confirmed v1.2 direction. The deleted old browser launcher remains deleted; scripts now use `tools/run-playwright.mjs`.

## Decisions and boundaries

Confirmed by the user: original elevated top-down / three-quarter **orthographic square-tile 2D** pixel art; non-rotating local-player follow camera; eight-way movement/four-facing initial animations; correct foreground layering; crisp pixels. These rules are now durable in `AGENTS.md`, `ART_ASSET_GUIDE.md` and `DECISIONS.md` and apply to future maps without implementing them here.

Provisional: 32px tiles, 48px sprites, 480×300 logical viewport with integer 1×/2× display, 30 Hz simulation, palette, animation count, and damage/economy values. Full ranks/passives/respec, host/ready/reconnect policy and later gameplay remain open or assigned to later milestones in `OPEN_QUESTIONS.md`.

## Changes

- `packages/game-core/src/`: seeded deterministic simulation, normalized movement, footprint/scenery collision, frontal melee/reduced cleave, nearest-at-fire straight projectiles, paced shots, explosion/burn, cooldown/mana, creep HP/AI/death, fixed-pool XP/gold, level and earned-point count. No Phaser, Colyseus, DOM, wall clock or I/O imports.
- `packages/game-data/src/`: validated shared map and M1 configuration. One Cái Bang training archetype, **Cái Bang Bổng** / **Cái Bang Chưởng**, Q **Hỏa Vân Chưởng**, W **Cuồng Long Loạn Vũ**. E/R are unassigned. No full four-school framework.
- `packages/game-protocol` and `apps/game-server`: protocol **2**, sequenced validated direction/action commands, replay/rate/resource/cooldown enforcement, server-chosen room RNG seed, Colyseus `setFixedTimestep`, actor/projectile patches and combat events. Six nickname-only seats, disposable state, no login/DB. Clients never provide authoritative position/damage/rewards.
- `apps/game-client/src/`: actual PNG/atlas loading, data-driven animation registry, rounded interpolation, fixed follow camera, rendered-foot Y depth sorting, terrain below actors and occluding tree canopy, keyboard input, shared HP/XP/mana/cooldown HUD. Client animation frames never apply server damage. `?debug=1` is a read-only evidence bridge; `?artPreview=1` is an animation gallery.
- `assets/source/m1_art.py`, `assets/exports/`, `assets/manifest.json`, `maps/arena.tmj`: original hand-authored pixel primitives, reproducible PNG/JSON, provenance and orthogonal Tiled-compatible map. Preparation feeds the same map JSON to the client and validated shared server data.
- Root tooling, strict tests, asset validation and `tools/m1-balance.ts`; README, guide, architecture, acceptance, open questions and roadmap updated.

Five actual PNGs exist: hero, creep, terrain, tree and fire effect. Each character has **96 frames** (six states × four facings × four frames), including idle/walk/basic attack/cast/hurt/death. Source and provenance are recorded. This is simple original prototype artwork, not approved final art. No Aseprite/Tiled GUI executable was found; no commercial-tool export is claimed. Phaser actually loaded the PNG/JSON/map assets.

## Actual checks

Environment: Windows PowerShell, Node **26.0.0**, pnpm **11.25.0**, Python **3.13.5**, Pillow **11.3.0**. Pinned Phaser **4.2.1**, Colyseus core **0.18.23**, Schema **5.0.42**, SDK **0.18.8**, TypeScript **7.0.2**, Vite **8.3.5**, Vitest **5.0.5**, Playwright **1.64.1**, Chromium **156.0.8078.4**. No major stack version changed.

| Command | Observed result |
|---|---|
| `pnpm install` | PASS, six workspace projects; explicit shared-core links installed |
| `pnpm typecheck` | PASS; app/shared/test/tool code and compile-time message assertions |
| `pnpm test` | PASS: **6 files, 62 tests** |
| `pnpm test:e2e` | PASS: **5 Chromium tests**, including two isolated clients; no collected page/console errors |
| `pnpm build` (also run by e2e) | PASS; 155 browser modules; approximately 1.66 MB JS / 445 kB gzip; large-bundle warning retained |
| `pnpm verify:assets` | PASS: five real prototype PNGs, **192 nonempty character frames**, valid atlas bounds/provenance |
| `pnpm verify:handoff` | PASS: 20 required docs/skills/assets, **43 unique canonical active skill names**, confirmed sample rules intact |
| `pnpm test:balance` | PASS: **100 fixed-seed runs**; repeated JSON SHA-256 matched |

Additional final checks: `pnpm format:check` passed, `pnpm install --frozen-lockfile` passed (`Already up to date`), and `pnpm dev` started the shared watcher with zero errors, Vite on 5173 and `M1 server ready` on 2567. The final full browser run reported **5 passed (17.5s)**; the focused combat case also passed two consecutive repetitions. The demo remains running for review. Local Git checkpoint includes the implementation/docs/evidence; user reference files under `artwork/` remain untracked and untouched. Preserved evidence below comes from real runs; reruns write ignored `test-results/` and `artifacts/` outputs.

An early browser combat attempt missed because its keyboard movement helper left the hero facing away; the recorded state confirmed the frontal attack should miss. The test now faces the enemy and compares the actual server-reported hit target, rather than assuming a particular creep stayed in front. It uses additional real manual presses for progression because shots can miss. No melee auto-aim shortcut or guaranteed-hit test cheat was added. A network assertion was adjusted for <0.001 world-pixel number-encoding precision while requiring both clients to agree. Regression fixes preserve recent dead-player assists without revival, snapshot one action's damage across level-ups, and block melee/projectiles through solid scenery. Final PASS results supersede those iterations.

## Visual evidence

Browser checks used actual keyboard movement, camera scroll/zero rotation, integer scaling and loaded four-facing animation frames. The player walked around the solid trunk, behind the non-solid canopy and back in front. Two clients agreed on enemy HP, manual attack cadence/held-A behavior, Q/W mana/cooldowns, E rejection, kill XP/level-up and leave/rejoin/tab-close. The gallery checked 48 state/facing combinations across two actors, four real frames per animation, changing walk frames and death end frames. This was automated browser testing, not a claim of human gameplay-feel review.

Preserved screenshots, actually captured and visually inspected:

- [In front of the tree](evidence/m1/front-of-tree.png), [behind the canopy](evidence/m1/behind-tree.png)
- [Arena panel](evidence/m1/arena-panel.png)
- [Client A combat/level-up](evidence/m1/combat-a.png), [client B in the same room](evidence/m1/combat-b.png)
- [Straight projectile](evidence/m1/straight-projectile.png)
- [Actual PNG animation gallery](evidence/m1/animation-gallery.png)

The front/behind pair visibly shows the character below the tree in front, then occluded by the canopy behind. Source PNGs were inspected separately; every atlas frame was checked for nonempty alpha/bounds.

## Measured M1 probe

[JSON/config/seeds/results](evidence/m1/balance.json), [CSV](evidence/m1/balance.csv). Five seeds (1/42/99/888/2026), levels 1/6/15/30, five scenarios, 20 seconds each: **100 runs**. A repeated manual-press test bot attacks one immortal defense-5 dummy, with enemy AI disabled and no gear/passives. The dodge case moves the dummy perpendicularly along a sinusoidal path. This adds no hold-to-auto-attack gameplay.

| Level-1 scenario | Mean damage/sec |
|---|---:|
| Melee stationary | 46.45 |
| Ranged stationary | 36.10 |
| Ranged dodging | 3.75 |
| Hỏa Vân Chưởng | 19.47 |
| Cuồng Long Loạn Vũ | 9.36 |

This demonstrates straight shots can miss. Spell-only single-dummy DPS does not measure AoE usefulness or full-game fairness. The probe does not simulate farming rewards, four-school balance, dungeon/boss/statue/PvP behavior or player survival. No automatic retuning was applied. XP/gold/level rules are checked separately by tests.

## Demo and limitations

See exact PowerShell instructions in `README.md`: install, `pnpm dev`, open port 5173, create/join one room in two windows. Arrow keys move; face the target and press A for melee, choose the other basic from the menu for ranged; Q/W cast and E/R are empty. Walk around the western tree. Open `/?artPreview=1` separately for all frames. No Python/commercial art tool is needed to play committed exports.

M1 has no full school/passive/rank/respec system, dungeon, invasion/statue clock, crafting, boss or PvP. A fallen hero retains earned progress but has no respawn flow until M2; training creeps refresh for practice. AI uses simple patrol/chase and world collision, without pathfinding or actor-body blocking. Snapshot interpolation has no prediction/rollback. Host/start/late-join/reconnect policy remains provisional. These are scope boundaries, not changes to approved future rules.

The user-provided `artwork/` reference PNGs that appeared during implementation were left unchanged and are not part of the runtime manifest or this implementation commit.

Final art/palette/detail approval is open. No six-browser load, Firefox/WebKit/mobile, deployment, latency benchmark, full-school balance or hour-long playthrough is claimed. Stop after M1 and review before M2.


API checks used current [Colyseus room/timestep documentation](https://docs.colyseus.io/room), [Phaser camera documentation](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera) and the official [Phaser 4 pixel-art guide](https://github.com/phaserjs/phaser/blob/master/docs/Phaser%204%20Pixel%20Art%20Guide/Phaser%204%20Pixel%20Art%20Guide.md), cross-checked against installed declarations/runtime.
