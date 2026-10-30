# Room join after school selection — 2026-10-30

Fixed the reported grey Join button. Previously host Start explicitly locked the Colyseus room, the listing disabled every phase except WAITING_LOBBY, and the server rejected later joins. That prevented a friend from joining even when five seats were free.

Non-full rooms now accept listed-room or code joins in WAITING_LOBBY, SCHOOL_SELECTION and IN_GAME. The six-seat limit still applies; defeated matches remain closed.

- During initial school selection, a new entrant participates in the existing confirmation barrier. Initial match time stays zero until all participants confirm.
- During active play, the new entrant alone sees school selection. Existing players keep playing. Only server-validated confirmation creates the entrant's level-1 hero, with one point and zero XP/gold. Repeated confirmation is rejected.
- Existing heroes/progression, statue HP, dungeon worlds and the invasion deadline are retained. Pending entrants cannot move, fight or enter dungeons; they are not rendered as arena actors and are not included in simulation participant scaling until spawned.
- Live tick changes no longer rebuild the school-selection DOM, preserving control focus. Confirmation unlocks the usual arrow/A/QWER input path.

Changed code: `apps/game-server/src/rooms/MatchRoom.ts`, `apps/game-client/src/pregame.ts`, `main.ts`, `arena-scene.ts`. Tests: `tests/room.test.ts`, `tests/invasion-room.test.ts`, new `tests/e2e/late-join.spec.ts`. Join policy/acceptance/architecture notes are appended to the repository documents; M2B remains the completed milestone, with no M2C work.

## Actually executed

- `pnpm typecheck` — passed.
- `pnpm test` — 98 passed in 11 files, including selection admission, late spawn, early input/dungeon rejection, unchanged progression/HP/deadline, repeat-confirm rejection, full-room rejection/reopened seat and defeat admission denial.
- `pnpm build` — passed; existing Vite bundle-size advisory remains.
- `node tools/run-playwright.mjs test tests/e2e/late-join.spec.ts tests/e2e/phase1.spec.ts` — initial run: 4 passed, 1 failed. The failed focus check ran before the selected-school acknowledgement replaced its button. The test now waits for authoritative `aria-pressed=true` before testing focus stability.
- `node tools/run-playwright.mjs test tests/e2e/late-join.spec.ts` — 2 passed (27 seconds). Both used two independent Chromium contexts, real Room Browser Join buttons, mouse selection, confirmation and arrow input. The three original pre-game tests passed in the preceding combined run. No page/console errors in the late-join tests. The existing local developer server was reused (30-second invasion countdown visible); no production-timing claim is made for this browser check.

Actual runtime captures, visually inspected at 1280×720:

- `docs/evidence/late-join/active-school-selection.png`: late entrant chooses while the host is already active.
- `docs/evidence/late-join/both-in-arena.png`: both players present after confirmation, existing match countdown continuing.

Restart the game server and refresh both browser tabs to load the fix. Existing processes/rooms created by the old code can retain the previous lock. Create a new room, select/confirm on the host, then use Join from the second browser. No need to wait for everyone before selecting a school.

This correction does not implement reconnect/progress restoration, host migration, other-school combat or a new milestone. The existing school gameplay/art fallback remains unchanged.
