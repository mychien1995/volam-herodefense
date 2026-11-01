# Kim Luân Pháp Vương → milestone/m3d

The director approved the real encounter with “duyệt, hãy tích hợp nó vào milestone/m3d”. The separate runtime approval record is `assets/reviews/bosses/kim_luan_phap_vuong_v01/runtime_approval_2026_11_01.json`; the original feedback_02 lock and verification remain historical and unchanged.

The approved implementation is retained in `1d829ac9`. Reconciliation commit `18973f20` includes milestone baseline `f13dc1c9`, including Lý Mạc Sầu / Cổ Mộ Phái. Both boss adapters, simulation lifecycles, loaders, renderers, HUDs and dungeon destinations are retained. No boss artwork, tuning or canonical skill behavior was regenerated or changed for the merge. Protocol17 disambiguates the incompatible version16 parent schemas.

Kim Luân retains the two-disciple gate,3×4Thiết Phiến rays,280px Chấn Thiên and moving five-wheel Thập Tầng shots every1.8s. The four boss destinations occupy the same selector grid row with the existing private/shared/Enter flow. Source/input line endings are preserved by exact recorded hashes; three Lý Mạc Sầu metadata files were restored only after LF/CRLF conversion reproduced their retained hashes. See `docs/evidence/kim-luan-m3d-merge/checkout-byte-restoration.json`.

Validation uses `playwright.kim-luan-m3d.config.ts`: original Kim53clip/184frame and natural six-client checks; Lý Mạc Sầu six-client checks; ordinary shared/private dungeon tests; and normal selector entry for all seven available destinations at960/1280/1920 widths. The dedicated QA services use separate ports; tests retain PNG/JSON evidence only. Original evidence is not overwritten.

The full final command passed18workflow checks,471unit/integration tests across41files, production build and15asset validators, including all246Kim and400Lý pins. Its browser startup was blocked by the still-running demo on2794. The test configuration was changed to accept dedicated Kim ports2804/5404, re-typechecked, then only the failed browser stage was retried. The original failed stage record is preserved under `docs/evidence/sessions/kim-luan-m3d-merge/check-workflow/final-timings.json`; no stage status is rewritten to imply the original command succeeded.

Commands:

- `pnpm check:quick tests/m3d-kim-integration.test.ts tests/kim-luan.test.ts tests/kim-luan-room.test.ts tests/kim-assets.test.ts tests/ly-mac-sau.test.ts`:36passed.
- `pnpm check:final --config playwright.kim-luan-m3d.config.ts`: all stages through asset validation passed; browser startup blocked by occupied2794.
- `KIM_LUAN_QA_SERVER_PORT=2804 KIM_LUAN_QA_CLIENT_PORT=5404 LY_MAC_SAU_QA_PLAYERS=6 node tools/run-playwright.mjs test --config playwright.kim-luan-m3d.config.ts`: browser retry, final result recorded in the merge verification JSON.

Evidence roots: `docs/evidence/kim-luan-m3d-merge/kim-luan/` and `docs/evidence/kim-luan-m3d-merge/ly-mac-sau/`. Kim natural combat and explicit phase/frame fixtures remain separate evidence. Existing trial balance/art limitations from `docs/KIM_LUAN_RUNTIME.md` are retained; the merge adds no new numerical balance claim.

## Result

All7browser cases passed in7.5minutes on the retry. Six ordinary-input Kim clients naturally defeated both disciples, reached Thập Tầng and killed Kim; no HP/location fixture was used in that combat case. The retained Lý six-client test passed its192actor-frame, six-action, kill/loot and cleanup checks (its declared level15/frame arrangements remain test fixtures). The selector passed normal entry for all seven available destinations and the960/1280/1920 layouts; four boss cards share one row. New PNGs were opened and visually inspected. All246Kim and400Lý pins were rechecked unchanged. See `docs/evidence/kim-luan-m3d-merge/verification.json`.
