# Thiên Sơn skill review — 2026-11-09

Two Chromium clients in one production Phaser match, camera zoom 2, fixed Thiên Sơn Đao branch. The fixture only set legal ranks, restored resources and positioned the caster on open ground. The clients cast with R/E/Q; the server processed the casts and both clients agreed on the final dash endpoints.

| Check | Baseline | After |
| --- | --- | --- |
| Liệt Phong Đao, left-facing strike | General Đao body still held the blade overhead at contact | Authored `review3_ts_dao:liet_phong_slash_left_0` displayed with blade lowered forward at contact. Right still uses the existing body. |
| Phong Ảnh Hoán Vị, rank 4, starting at x=1000 | 89 px backward | 174 px backward |
| Phi Ảnh Trảm, rank 4, starting at x=1000 | 174 px forward | 174 px forward |

[Before, left strike](../thien-son-skill-review-baseline/m3d-r3-gameplay/dao-left.png) · [After, left strike](m3d-r3-gameplay/dao-left.png) · [Right-facing comparison](m3d-r3-gameplay/dao-right.png) · [Final replicated distances](m3d-r3-gameplay/dash-distances.json).

`pnpm check:final --config playwright.m3d-r3.config.ts tests/e2e/m3d-r3-integration.spec.ts --grep "Thiên Sơn review" --timeout 120000`: asset preparation, project/tool/test typechecks, 18 workflow checks, 942 unit/integration tests, production build and all configured asset validators passed. The browser stage initially timed out at branch selection before combat. Retrying the same bundle and scope with `node tools/run-playwright.mjs test` and the same arguments passed (one test, 48.3 s). Server/client/fixture ports: 2841/5441/2899. No recording was made.

New [artwork review](../../../../assets/exports/skills/thien-son/skill-review-2026-11-09/review.html) is independent of the match. The generated PNGs follow the approved Thiên Sơn ivory, jade and dark-hair identity and the reference's elevated four-facing composition. The wind ring keeps the hub fixed as the vanes turn; four shadows keep distinct silhouettes and aim at the same open center. Their [manifest](../../../../assets/exports/skills/thien-son/skill-review-2026-11-09/manifest.json) records native alpha, 8 exported cels, anchors, bounds, timings and source hashes. Built-in ImageGen returned both sources in about 89 s for the batch. Chromium decoded and played both sheets, including launch and recall in the review. Director approval, match integration and party readability for these two new effects are still pending.
