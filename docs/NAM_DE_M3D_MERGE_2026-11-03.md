# Nam Đế → milestone/m3d — 2026-11-03

The director explicitly requested integration into milestone/m3d with only necessary tests. This supersedes the historical worktree-only/no-merge instruction. Source commit3205d565 is reconciled with milestone baseline4cfde98b (Đông Tà/Tây Độc, current feedback/controls/party/economy). Existing boss-prompt.txt remains untouched and untracked. No push/deployment is requested.

## Reconciliation
- Protocol24 preserves all protocol23 schemas/messages and adds Nam Đế public phase/effects plus owner-filtered per-key QTE state. No client success/damage/heal authority is accepted.
- Actual Tây Độc dead state is a production prerequisite for Nam Đế's wave15 clear/rest gate. Its arena-world clock respects the current all-in-boss pause; there is no new recall, arena, statue immunity or retry policy. Existing Đông Tà/Tây Độc rules remain.
- Current shared hurt pipeline retains Chu wine penetration, equipment mitigation and Tây Độc unavoidable max-HP loss. Nam Đế uses that existing unavoidable-loss path for QTE failure; its main ray retains90%max-HP direct loss. Pending seal rejects incoming damage before those paths.
- Potion1/2, Shift dash, spectator controls, current menu bindings and reconnect policy are retained. Physical QTE capture follows existing input callbacks without replacing them. onDrop closes its dialog immediately; existing transfer/remove hooks clear server challenges before reconnect/full-heal.
- Approved PNG bytes are unchanged. Git attributes preserve Nam Đế's retained preview metadata. Seven unchanged legacy Nam Đế JSONs and two Chu wine JSONs in this checkout used CRLF while the locked committed inputs were LF; restored only those exact matching blobs and preserved their byte rules, without changing locks/artwork.
- No inventory-v2/M4 migration, other boss implementation, balancing rerun or new art approval is inferred.

## Focused checks actually run
- `pnpm check:quick tests/nam-de.test.ts tests/nam-de-room.test.ts tests/m3d-nam-de-integration.test.ts tests/m3d-tay-doc-integration.test.ts tests/dong-ta-m3d-merge.test.ts tests/tay-doc.test.ts tests/dong-ta.test.ts tests/invasions.test.ts tests/m3d-kim-integration.test.ts tests/m3d-hell-integration.test.ts tests/m3d-feedback-party.test.ts` —87tests/11files PASS. Includes real accepted A kills for predecessor → wave15 clear → rest → single spawn, overlapping180s invasions, pause timing, QTE disconnect/reconnect, protocol and inherited boss/party regressions.
- `pnpm exec tsc -b` — PASS, fresh incremental client/server outputs.
- `pnpm exec tsc -p tsconfig.tools.json --noEmit` — PASS.
- `python -X utf8 scripts/verify-nam-de.py` — PASS, pins/208frames/pivot/runtime bytes.
- `$env:VOLAM_NAM_DE_QA_OUTPUT = 'docs/evidence/nam-de-m3d-merge'` then `node tools/run-playwright.mjs test --config playwright.nam-de-gameplay.config.ts --grep '2 real Phaser clients'` —1case PASS, two real clients, warnings/world geometry, named special phases and three normals, physical QTE under menu focus, success/wrong/timeout close, recovered movement, physical A boss death and gold/XP/no items. Browser error list empty. Fresh compiled server + live Vite/Phaser; no production bundle rebuild or full-suite/six-client rerun was performed, as requested.

Preparation initially stopped on byte-lock newline mismatches; exact blob restoration above resolved them. The first anchored browser grep matched no complete test titles; the corrected filter ran the intended one case. Earlier full character/balance evidence remains historical; it is not relabelled as a new milestone test.

Evidence: [summary](evidence/nam-de-m3d-merge/verification.json), [focused workflow timings](evidence/nam-de-m3d-merge/focused-checks.json), [actual browser frame/state observations](evidence/nam-de-m3d-merge/2-clients-observations.json). PNGs are in the same directory. No video/GIF/trace recording.

## Retained limits
Nam Đế raw HP/damage/reward tuning remains provisional. Sky warning0.28s rounds to0.30s at30Hz. Accelerated gate prerequisites are server-only fixtures; actual predecessor kills are separately exercised by the new core regression. Runtime art-approval metadata stays at its previous pending state; branch integration is authorized without inventing a new art approval.
