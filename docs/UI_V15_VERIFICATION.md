# v1.5 UI refactor — actual verification, 2026-10-29

Status: engineering checks passed; **UI/art review pending**. This refactors the existing M1. M2 and later gameplay did not start.

## What changed

- `apps/game-client/src/main.ts`: retain existing Colyseus 0.18 room/message validation and callbacks; bind them to a full-window world/HUD, integer display resize and presentation scene switching.
- `ui.ts`, `menus.ts`: compact top-left hero bars, bottom-center A/QWER icons/cooldowns, lower-left bag/gold, top-right menus/party/room, bottom-right live arena minimap; one in-viewport modal manager. The old page title, exterior sidebar, stat/creep cards and footer are removed. Party and connection checks/Leave remain accessible through Đồng đội; enemy HP remains in the world and in a party-menu details section.
- `style.css`, `icons.css`: bronze/jade frames, readable Vietnamese DOM text, bounded scroll regions, action rows outside scroll content, focus indication and desktop responsive sizing. No page space is reserved for HUD. Dialogs do not change canvas size.
- `input.ts`: release held movement on menu/study open, gate Arrow/A/QWER while modal input owns controls, restore canvas focus on close, Tab containment/Escape/outside-click dismissal. No I/K shortcuts or mouse attacks were added.
- `arena-scene.ts`, `art.ts`, `forest-study.ts`: preserve orthogonal perspective, integer pixel rendering and foot-Y depth; add small original decorative environment studies and merchant/gate click targets. DOM pointer events are excluded from world NPC handlers. ForestStudy is a rendering study with no zone/travel mechanics.
- `assets/source/ui_world.py`, eleven `assets/exports/presentation/*.png`, refreshed tree/terrain, `manifest.json`, `scripts/verify-assets.py`, asset-generation script: original reproducible prototype art, explicit frame/provenance metadata and nonempty-cell checks. Existing hero/creep animation sheets are unchanged. Source PNGs and references are distinct.
- `tests/e2e/ui.spec.ts`: five additional browser tests (three desktop sizes, two-client focus/input/clock, NPC/study). Existing lobby and combat tests now navigate the in-game party/loadout windows. The melee check holds the hero at its real spawn while AI approaches, avoiding a stale-target facing/movement race.
- Design/agent handoff documents and all fourteen supplied references are retained. README Windows setup is restored alongside the updated v1.5 direction. Roadmap marks only this UI checkpoint verified, with director review still open.

No changes to `packages/`, `apps/game-server/`, `maps/arena.tmj` or `pnpm-lock.yaml`: confirmed with `git diff --exit-code -- packages apps/game-server maps/arena.tmj pnpm-lock.yaml` (exit 0). No new dependency, database, account, balance change, school implementation or networking protocol. The pre-existing untracked `artwork/` directory was left untouched.

## Actual environment and commands

Windows PowerShell, existing Node 26.0.0 / pnpm 11.25.0, Phaser 4.2.1, Colyseus 0.18.23 core / 0.18.8 SDK, Playwright 1.64.1 with cached Chromium. Existing `pnpm dev` services were reused at ports 5173/2567; real health response was `{"status":"ok","milestone":"M1","protocolVersion":2}`. No dependency/browser reinstall was needed.

| Command | Actual observed result |
|---|---|
| `python assets/source/ui_world.py` | Exported 11 original UI/environment studies; actor sheets and server map unchanged. |
| `pnpm verify:assets` | PASS: 16 original prototype PNGs, 192 nonempty character frames, atlas bounds/provenance valid; UI icon/destination cell dimensions/content also checked. |
| `pnpm typecheck` | Exit 0, strict shared/client/server/tools TypeScript compile. |
| `pnpm test` | **6 test files passed, 62 tests passed**, final observed duration 4.32s. Deterministic combat and real server integration remain green. |
| `pnpm test:e2e` | Production build succeeded, then **10 Chromium tests passed (1.2m)**, one worker. Includes existing two-client HP/combat/progression, room lifecycle, non-homing projectile, camera/occlusion and 48 animated gallery sprites. |
| `pnpm build` + `node tools/run-playwright.mjs test tests/e2e/lobby.spec.ts` | Final build passed; targeted two-client connection/lobby regression passed (1 test). Connection-error messages remain visible in the HUD/toast; reconnecting clears prior acknowledgement text. |
| `pnpm format:check` | All matched files use Prettier code style. |
| `pnpm verify:handoff` | PASS: 20 required docs/skills/assets, 43 unique active skills, example configs valid, key decisions consistent. |

Vite build output: 158 modules; approximately **1,673.12 KB JS / 450.05 KB gzip**, with the existing >500 KB chunk-size warning. This task did not optimize the Phaser bundle. Playwright also printed the harmless FORCE_COLOR/NO_COLOR environment warning.

Earlier browser iterations exposed and corrected: HUD clicks leaking into Phaser NPC input, narrow-window modal overflow, action rows below the initial scroll view, a fixed check-sequence assumption invalidated by menu stop input, and a melee test walking past the moving target during patch latency. Final full run passed all ten tests. No screenshots or test passes are synthesized. No browser console/page errors were observed in the monitored responsive/gameplay tests.

Current Phaser resize/camera API guidance was checked against the [official Scale Manager guide](https://docs.phaser.io/phaser/concepts/scale-manager), [camera guide](https://docs.phaser.io/phaser/concepts/cameras) and installed ScaleManager implementation. NONE mode resizes logical canvas dimensions, with integer display zoom and a fixed non-rotating camera.

## Actual captured screenshots

The five requested states are full browser screenshots from the successful test run, at 1280×720. They were opened and visually inspected; additional 1920×1080 / 900×640 samples and two-client evidence are retained in the same folder.

| State | Evidence |
|---|---|
| Normal M1 hub gameplay | [hub.png](evidence/ui-v15/hub.png) |
| Forest dungeon **environment study only** | [forest-study.png](evidence/ui-v15/forest-study.png) |
| Inventory open | [inventory.png](evidence/ui-v15/inventory.png) |
| Merchant open | [merchant.png](evidence/ui-v15/merchant.png) |
| Dungeon menu open | [dungeon-menu.png](evidence/ui-v15/dungeon-menu.png) |

Layout comparison: world reaches all viewport edges; no external dashboard column/title/footer; HUD uses the five approved anchor regions; ornate-framed menus overlay the visible world without shrinking it. Four equipment slots and a backpack study match the intended inventory hierarchy; merchant has tabs/catalogue/details; dungeon cards communicate themes. At short sizes content scrolls while action rows and Close stay visible. This is much closer to the references in **layout**; it is **not** equivalent to their finished illustration quality.

## Remaining placeholders and limits

- Existing 48px Cái Bang/creep art and new icons/terrain/scenery are simple original **prototypes**. Detailed reference-level characters, portraits, animation polish, ornate frame illustrations and dense production environments remain unfinished. No asset is marked approved. The mandatory one-Võ-Đang art candidate/review gate remains open; no additional school characters were generated.
- Four empty equipment slots and the 12-cell backpack are UI illustrations, not an implemented inventory or approved capacity/types. Shop catalogue examples have no invented prices/stats; buying/selling/equipping/dropping/crafting are disabled. PvP is an unavailable overlay.
- Dungeon entry is disabled. Only the forest has a full-screen composition study; desert/sea/hell have menu theme thumbnails, not playable maps. Study input is gated; **the live hero stays in the live M1 arena and can be hurt**. Return/Escape restores the arena renderer and controls.
- Statue is decorative/inactive. No fake statue HP, wave number, 180s countdown or raid-warning simulation is shown. The high-priority notification layer sits above menus, but real raid events/warnings await M2 and were not tested here. Server ticks and the other client’s movement were actually tested while a menu was open.
- Decorative stall, gate, statue, lanterns/bamboo/seal do not add authoritative collision. The existing three tree trunks and wall retain their server geometry. Future solid environment art must be paired with approved map/collision data.
- Normal M1 limitations persist: fallen hero has no respawn yet, only two skills, E/R empty, no saved progress, no reconnect grace. Use Đồng đội → Leave and a fresh room after death.
- Reference licensing is unverified and filenames partly disagree with image contents. All fourteen images were visually inspected; no reference pixels are shipped to clients. See [reference readout](../assets/references/README.md) and `OPEN_QUESTIONS.md`.
- No Aseprite/Tiled GUI workflow, production art approval, dungeon/raid playthrough, 60-minute wave test, PvP or crafting gameplay was claimed. Combat balance was not rerun because no mechanics/tuning changed.

## Manual two-client demo

1. In PowerShell: `Set-Location D:\Projects\volam-hero-defense`, then `pnpm install --frozen-lockfile` if needed and `pnpm dev`. Open http://127.0.0.1:5173/ in two browser tabs/windows.
2. A: enter nickname → Create room. Copy the top-right room ID. B: enter a different nickname → paste Room ID → Join room. Both show 2 / 6; Đồng đội lists both players and exposes Check connection / Leave.
3. Focus the world; Arrow keys move (including diagonals), A manually attacks, Q is Hỏa Vân Chưởng and W is Cuồng Long Loạn Vũ. Võ học changes the normal attack between Cái Bang Bổng and Cái Bang Chưởng. Closing restores keyboard focus; E/R remain unequipped.
4. Open Túi đồ. Hold/press gameplay keys: no movement/casts should occur while the menu owns input. Move B and observe its continued movement/state in A. Escape/× closes, then Arrow/A/Q/W work again.
5. Click the merchant stall or Thương gia HUD button; switch Cửa hàng/Chế tạo. Transactions are disabled. Click the portal/gate or Phó bản HUD button; dungeon entry is disabled. View forest art study → Return to arena/Escape. No teleport/reward happens.
6. Resize to 1920×1080 or 900×640. Menus stay bounded; scroll content if needed; action rows/Close stay available. Leave or close B and observe A’s player count drop.

**Stop point:** review the current UI and prototype art before authorizing another gameplay milestone. M2 remains unstarted.
