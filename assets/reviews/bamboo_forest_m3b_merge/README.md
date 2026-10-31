# Bamboo Forest merge into milestone/m3b

Merged approved feature commit6251f7c from codex/bamboo-forest-concepts into milestone/m3b.
The active checkout is the project checkout, not the original isolated art worktree.

The target had90 tracked modifications and more than8000 untracked files. Only art.ts and package.json overlapped. Their pending M3B content was preserved; Bamboo preload and asset commands were added without removing existing loader logic or any of34 package commands. No unrelated work was committed. All88 other tracked changes matched their snapshots immediately after integration. Concurrent edits during validation were left untouched.

All60 approved Bamboo source/export/map hashes match. Git eol=lf conversion changed five metadata/map files during checkout; restored approved bytes and added Git attributes scoped to Bamboo source/exports and its map. No art pixels or map geometry were changed.

Bamboo-owned browser setup now starts isolated Vite/server services on5187/2587. Like the existing M3B regression configuration, the historical free-skill scenario is excluded because M3B starts with earned points and empty active slots. Original approved PNG evidence is preserved; this folder contains fresh screenshots from the merged checkout.

## Actual merge validation

- pnpm check:final --config playwright.bamboo.config.ts: asset preparation, project/tool typechecks and2 workflow checks passed. Full unit/network run:222 passed,2 failed out of224.
- Failures: progression-room.test.ts expects the old unsupported-Thien-Son rejection text (chua mo), but current school support returns the foreign-school message. This reproduced with original pre-Bamboo collision data in a test-only mock. thien-son-room.test.ts initially observed60 rather than90 XP; it passed on a focused rerun with the merged map.
- Focused rerun: thien-son-room.test.ts plus bamboo-map.test.ts,4/4 passed.
- Continued remaining stages without repeating full unit suite: production Vite build PASS; all9 asset validators PASS.
- Browser run:5/6 passed, including all3 forest/shared/private dungeon cases plus projectile and PNG-animation cases.
- The unchanged arena movement case failed its existing8px route tolerance at(1220,820) with11.81px error. Focused rerun failed on a keyboard-sequence timeout instead. Arena renderer, route helper and movement code were not changed by this merge. This remains an outstanding broader-check failure; the overall suite is not reported green.
- Inspected the new actual six-player forest screenshot. No missing assets, map/layer errors or console errors in the passing forest case.
- Approved Bamboo and character hashes verified; no recordings produced.

The full suite was run against concurrent work in progress, so this report is a measured snapshot, not a claim that all M3B/M3C work passes.

Feature-owned compatibility changes are limited to Git byte preservation and Bamboo test setup. Existing milestone/m3b pending code remains uncommitted as before.
