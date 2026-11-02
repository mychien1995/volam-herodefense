# M3D feedback integration into milestone — 2026-11-03

Director approved all feedback/runtime through `521f73cd`, then approved saving process knowledge in `f1e90462`, and explicitly requested integration into `milestone/m3d`. Prior no-merge instructions in historical handoffs are superseded by this request.

## Combined scope

Source `wip/m3d/feedback-integration` at `f1e90462`; target `milestone/m3d` at `3b0c1ebc`. The target added Hell, inventory/merchant UI, trial basic/potion transactions and potion1/2. Both sets are retained. Merge is prepared/tested in the existing feedback worktree; the main checkout will receive the verified combined commit. No other feature worktree or service is changed. The main checkout's untracked `boss-prompt.txt` is preserved (SHA256122bd7951f88c346a02c682922dae695d498c4f08412a07fb8d36f0341b585d5).

Resolved11 conflict files by composing functionality: dash+Z hotbar; O skills/P dungeons/Escape; potion1/2 alongside spectator arrows/Space and Shift; Hell animation fallback plus r3 body/blink; all8 destinations including Hell, boss arena thumbnails/order/I and fixed private/shared policies; Hero inventory alongside combo/dash/life fields; protocol21 and tests; retain both branches' historical spec sections. No source/PNG/atlas/selected-tag lock is rewritten. Protocol21 rejects both prior branch versions19/20; no new client-authoritative field is added.

Hell uses the approved global creep rules: private per player, speed0.648×actual buffed entry speed, one identity/wave then a different identity next wave, soft footprint separation. Updated old Hell tests that assumed shared/mixed-species/old-speed behavior; retained world isolation, collision, physical exit and pause assertions. Trial economy and retained encounter rewards coexist; inventory-v2 materials/Long Châu/crafting/Z/PvP migration remains future scope.

Canonical updates cover CONTENT_DATA (Ca Diệp Thoái/Sư Tử Hống and revised skill rows), COMBAT_SYSTEM, GAME_DESIGN, DECISIONS, BALANCING, TECHNICAL_ARCHITECTURE and ACCEPTANCE_TESTS. `M3D_INTEGRATION_MEMORY.md` is linked from AGENTS.md so future sessions read the actual current baseline. Exact approved values/historical evidence remain in the three gameplay/followup/Vô Ảnh handoffs and chronological feedback ledger.

## Verification

Focused server/protocol/economy/Hell/combo regressions passed, including36 tests in the last focused group. Two dev-client browser composition/potion checks passed (1.1m). First dev iteration used stale server application output because check:quick only compiles shared packages; recompiled the server and supplied the historical practice-creep test prerequisite explicitly. No QA prerequisite is enabled in the user-facing production server. Failures are retained in ignored Playwright outputs; the lesson is recorded in SESSION_EXECUTION_LESSONS.

Final command, isolated server3197/client5797/fixture3198, production build, video/trace off:

```powershell
pnpm check:final --config playwright.m3d-milestone.config.ts --grep 'followup|vo anh actual|r3 production multiplayer|milestone composition|farms real gold|1 and 2 consume'
```

Final session **m3d-milestone-final: PASS exit0,479.00s**. Project/tools typechecks,18 workflow tests,**561 unit/integration in53 files**, production build,**17 asset validators** and **8 real Chromium/Phaser cases** passed. Browser332.46s covers private creep pack, solo revival/return, two-client r3 wine/reflect/artillery, two-client Hell/UI composition, six-client combat/rewards/readability, real QWE one-/six-foot finisher and both merchant purchase/potion1/2 cases. `python -X utf8 scripts/verify_handoff.py` also passed20 required docs/skills/assets and43 unique actives. Timing JSON: `docs/evidence/sessions/m3d-milestone-final/check-workflow/final-timings.json`.

New evidence remains in that session's subdirectories; merchant PNGs copied from the exact Playwright output have a SHA capture index. Opened actual Hell and six-player PNGs at normal zoom1: retained lava/stone/creeps and actor feet remain readable; full viewport contains portrait/statue/utility menus, potion1/2, A/QWER/dash/Z/O without exterior panels. New tests observe real authoritative state and frame metadata, not just stills. Source asset locks pass unchanged; no new art approval is invented for retained Hell assets. No video/GIF.

Canonical documentation and memory updates are part of this integration. Merge identity will be recorded once the verified commit is placed on the milestone. No remote push or deployment is part of this request.
