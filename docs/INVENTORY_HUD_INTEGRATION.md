# Merchant / Inventory / Auxiliary Z — runtime UI integration

Date: **2026-11-02**. Director approved [concept v01](INVENTORY_MERCHANT_HUD_DESIGN.md) and requested Phaser integration. Concept approval is separate from actual runtime visual approval and balance.

Subsequent runtime UI approval is recorded below; UI commit `60498c09`. The separately authorized [trial economy](ECONOMY_TRIAL.md) now activates basic/potion transactions and live quantities. The disabled-price/potion statements in this report describe the original presentation-only commit; crafting/Z and boss reward migration remain unavailable.

## Scope and behavior

Integrated into the existing Phaser 4.2.1 viewport through its permitted DOM overlay. No new Phaser/Colyseus API, server mechanics, protocol, camera, map, retained hero/VFX animation or loot migration is introduced.

- Merchant has working **Trang bị / Bình dược / Chế tạo** tabs, four-item selection, potion-type selection and all twelve crafting-branch previews. Arrow/Home/End navigation works on merchant tabs.
- Inventory has exactly **weapon/armor/hat/boots**, retained selected-school hero art, live server gold/derived stats and read-only rewards from both `bossItems` and `bossLoot`. No fictitious items, prices, ranks or ownership. Twelve display cells do not establish backend capacity.
- **Z** is separate from A/QWER with an unavailable tooltip until equipment support exists. Potion HUD icons show an unavailable dash, not fabricated quantities. No client-only Z cast/cleanse/blink/damage exists.
- Purchase/upgrade/craft/equip remain disabled with honest unavailable copy. No 120/400/800-price or 2,450-gold concept fixtures enter runtime. Potion preview describes the confirmed 5s cooldown and dungeon purchase restriction.
- New inventory omits resale/drop/trade controls. Retained encounter roll/ground-claim backends and their separate loot HUD are not migrated. `ChuHud` defers to the new inventory renderer instead of overwriting it with old sell/drop controls.
- Menus remain inside the full viewport with internal scrolling, sticky merchant tabs and existing close/Escape/input ownership. Opening releases held movement; peers and clock continue. Snapshot redraws preserve focused choices.

## Art and provenance

Eleven static PNG icon backplates in `assets/exports/inventory_ui/` derive from approved original concepts. Export copies artwork-only regions, not full screens/text/counts/prices. Opaque dark backplates are intentional. Retained ART-01 PNG nine-slice supplies window/card frames; hero, key badge and gourd art are reused unchanged.

- `pnpm assets:export:inventory-ui` / `scripts/export-inventory-ui.py`: deterministic extraction with concept hash checks; no generator, encoding or recording.
- Adjacent `manifest.json`: regions, sizes, output hashes and provenance/status.
- `scripts/verify-inventory-ui.py`: validates five exact concept inputs and eleven PNGs against source pixels/hashes; included in final asset validation. Existing preparation copies exports into client public assets.

References actually inspected: world, merchant/inventory, hub/battle, dungeons, school sheets and anti-references listed in the concept report. Actual UI keeps the map scale and retained actors rather than regenerating the scene. Empty/unavailable gear deliberately differs from illustrative owned gear in the concept. Armor/hat effect cards reuse category art with distinct descriptions; no separately authored effect icon/animation is claimed. Concept PNGs are not runtime screenshots.

## Verification

- Iteration on isolated server2793/client5393: `pnpm check:browser tests/e2e/ui.spec.ts --grep 'fit 1280'`: **PASS**, one Chromium case, 27.2s browser / 96.95s whole pipeline. Actual hub/merchant/inventory PNGs opened; tab scrolling and icon-label remnants identified and then refined.
- Focused TypeScript checks and `python scripts/verify-inventory-ui.py`: **PASS** after refinements.
- Final code checks: **18 workflow tests, 476 unit/integration tests in 43 files, project/test/tool typechecks, production build and all 17 asset validators PASS**. Full command on server2793/client5393:

  `pnpm check:final tests/e2e/ui.spec.ts tests/e2e/gameplay.spec.ts --grep 'world and in-game menus|menus release|utility menus|merchant exposes|six-player inventory|two clients agree|ranged projectile'`

- First final attempt: seven browser cases passed; focused-tab navigation failed, two-client scenario exceeded its 30s fixture budget, and the six-client scenario completed assertions/PNGs but exceeded budget while closing trace-heavy contexts. Corrected navigation to originate from the focused tab; UI traces disabled in favor of PNG/state assertions; two-client budget60s. [Initial recorded result](evidence/inventory-hud/initial-final-timings.json).
- Second final invocation: all non-browser stages above passed again; **9/10 browser cases PASS**, including combat/trajectory, menu/input, twelve branch previews and 1280×720,1920×1080,900×640,944×466. The six-client case failed during a fifth-client join (1006), before UI acceptance. [Exact pipeline timings](evidence/inventory-hud/final-pipeline-timings.json): total351.75s, browser229.95s. This was not a single green ten-case final invocation.
- Six-client fixture-only follow-up: a code-form/roster attempt failed; replaced join automation with the existing six-player art QA's room-list path, verified every room ID and waited for the initial player map. One host viewport1920×1080 and five944×466 peers; players walked through real Arrow inputs into a 3×2 formation, without changing positions/stats via a fixture. A fresh isolated run **PASS**, one test in2.9min /3.0min runner total:

  `node tools/run-playwright.mjs test tests/e2e/ui.spec.ts --grep 'six-player inventory'`

  Environment additionally used `VOLAM_QA_PLAYWRIGHT_OUTPUT=artifacts/inventory-hud-six-verified/gameplay`. All six room joins, real A/Q hit events, six visible actors at retained zoom1, peer movement while inventory is open, advancing server ticks, four equipment slots and zero page errors were asserted. Context teardown completed. **All ten targeted browser scenarios now have passing latest relevant results across the final run and focused follow-up.** Production code/assets were unchanged during fixture follow-ups; no successful full unit/build/asset suite was repeated for the final test-only adjustments.

## Actual PNG review and remaining art status

Opened and reviewed the following real Phaser screenshots, not concept composites:

- [HUD1920](evidence/inventory-hud/hud-1920.png), [merchant1920](evidence/inventory-hud/merchant-1920.png), [inventory1920](evidence/inventory-hud/inventory-1920.png), [short desktop inventory944](evidence/inventory-hud/inventory-944.png).
- [Six visible players after natural combat](evidence/inventory-hud/six-player-arena.png), [six-client live inventory](evidence/inventory-hud/six-player-inventory.png), [six-client crafting](evidence/inventory-hud/six-player-crafting.png).

Comparison to approved concepts: window/card PNG frames, dark/bronze palette, four typed equipment slots, jade-associated shoe skill, three branch choices and full in-world placement are retained. Live unavailable/empty states replace sample ownership and prices; the current map, camera and actor sprites remain unchanged. At short heights the body scrolls rather than shrinking the map/text. Sticky tabs and close controls remain accessible; part of a card may scroll behind the sticky row. Effect-card icons reuse category art where no dedicated icon exists. Existing debug practice-creep placeholder art in these QA scenes is unchanged and is not newly approved.

Runtime UI status: **APPROVED 2026-11-02** — director: “Duyệt giao diện, hay commit”. Approval covers the reviewed runtime UI; backend economy is separately authorized by the same request. No animation was authored for static UI icons; existing attack/straight-projectile rendering was exercised in real combat, with server outcomes asserted separately. [Verification summary](evidence/inventory-hud/verification.json) records the scope and limits.

No videos or screenshot-playback traces. Runtime visual approval was granted on 2026-11-02. Backend inventory v2, personal reward migration, prices/tuning and PvP remain separate implementation work.
