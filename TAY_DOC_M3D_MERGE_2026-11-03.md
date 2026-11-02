# Tây Độc integration into milestone/m3d — 2026-11-03

Explicit request: integrate into `milestone/m3d` and run only necessary tests. This supersedes the historical no-merge instruction for Tây Độc. No push or deployment.

Base milestone: `acfded82`; source feature commit: `d8b7d5a3`. Reconciliation retains protocol22’s Đông Tà, current M3D feedback/skill fixes, Hell, party lifecycle, reconnect, pause and inventory/merchant scope. Protocol23 adds the arena-scoped Tây Độc projection without replacing existing fields. The new optional constructor argument follows the existing Đông Tà argument.

The actual Đông Tà `cleared` state now unlocks Tây Độc’s wave10clear+8second rest gate. A new regression uses accepted basic-attack input to kill an arranged HP1Đông Tà and final HP1wave10invader, then checks rest timing, west road entryY616, intact/unprotected statue and180second clock. No other boss is invented. Tây Độc adds no arena lock, recall, hidden statue or wipe-retry override. Existing all-in-boss-dungeon pause and full-heal reconnect rules remain canonical. Marks settle before the normal arena-transfer path on transient disconnect, with no stale/double detonation afterwards.

Approved artwork remains byte-identical; no new artwork or recordings were generated during integration. Git attributes protect retained source/metadata/candidate bytes across checkouts. The60directional cels retain candidate/runtime-director-review-pending status. HP/damage remain provisional. Previous implementation evidence is retained in `docs/evidence/tay-doc`; current merge PNGs/observations are in `docs/evidence/tay-doc-m3d-merge`.

## Actual focused validation

- `pnpm check:quick tests/tay-doc.test.ts tests/tay-doc-room.test.ts tests/m3d-tay-doc-integration.test.ts tests/dong-ta-m3d-merge.test.ts tests/dong-ta-room.test.ts tests/combat.test.ts tests/m3d-feedback-party.test.ts tests/m3d-kim-integration.test.ts tests/m3d-hell-integration.test.ts`:9files /66tests PASS. Preparation also passed all current locks, including630Đông Tà and593Tây Độc hashes.
- `pnpm exec tsc -b apps/game-server apps/game-client`: PASS.
- `pnpm exec tsc -p tsconfig.tools.json --noEmit`: PASS.
- `pnpm --filter @volam/game-client exec vite build`: PASS; existing large-chunk advisory only.
- `python -X utf8 scripts/verify-tay-doc.py`: PASS,593approved hashes,60candidate cels/15clips and exact runtime registry/copies.
- `node tools/run-playwright.mjs test --config playwright.tay-doc.config.ts --grep 'two real'`:1/1PASS. Two actual Phaser clients cover all newly supplied directions, transition, eight pillar heads, projectiles/hazards and zone/death cleanup with current M3D client/server. No video/trace.

No full-suite, repeated six-client art acceptance or balance run was performed in this merge-only task, following the user’s explicit scope. Numerical/art acceptance status is unchanged. New rooms after rebuilding/restarting use protocol23; old live rooms/services were not reused or stopped for QA. The target checkout’s pre-existing untracked `boss-prompt.txt` is preserved.
