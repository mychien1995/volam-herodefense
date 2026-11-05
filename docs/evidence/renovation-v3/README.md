# Renovation v3 verification

Candidate artwork, pending director review. [Actual PNG comparisons](review.html), [source/provenance](../../../assets/source/renovation-v3/provenance.json), [scope and limitations](../../RENOVATION_ALL_SKILLS.md).

Measured focused checks:

- `node tools/reproduce-renovation-v3.mjs`: reproduced the Vạn Kiếm body fallback after startup. See `reproduce-before.json` and `van-kiem-before.png`.
- Aseprite body export: 29 groups / 464 new body cels passed connected-figure, foot-baseline and edge-clearance checks. FX export: 174 atlases / 4,396 new references. Original names, virtual frames and durations retained. `asset-check.json` includes alpha-corner regression checks for all 50 new effect groups.
- `pnpm exec vitest run tests/renovation-actions.test.ts`: four meaningful routing/phase/identity/registration tests passed. Client and tools/test typechecks passed.
- Two-client school iteration: 43 skills and eight basics, primary direction, real keyboard A/Q and replicated server events passed. Right-facing cases observe original active durations (up to the stated cap); other facings in the final matrix sample startup/active phases, without claiming full long-channel lifetimes in every facing.
- Scoped boss iterations: all 91 ability/phase selections exercised across Đông Tà/helpers, Tây Độc/forms, Nam Đế, Bắc Cái, Vương Trùng Dương/phases, Chu Bá Thông, Hồng Liệt/helpers, Kim Luân/helpers and Lý Mạc Sầu/summons. These use real encounter execution after labelled server-side selections, rather than a natural progression/defeat run. Boss lifetimes are sampled for up to the recorded cap; see reports for exact durations.

The final command is `pnpm check:final --config playwright.renovation-v3.config.ts`, with isolated session `renovation-v3-final`, server 2946, client 5546 and installed Chrome. `final-check.log` and `final-timings.json` retain the actual pipeline outcome. Final browser scope is 172 school casts, 32 basics, all boss abilities with representative extra facings, and six real clients' keyboard combat with damage agreement. Completion and any stage retry are appended after the run; an in-progress command is not PASS.

No routine recordings or screenshot playback traces. The new batch shares semantic body keyposes; retained hurt/death and unrelated inventory-v2 are outside scope. Automated checks do not imply director approval.

## Completed final verification

`pnpm check:final --config playwright.renovation-v3.config.ts`: **PASS**, 943.70 seconds total. 18 workflow checks, 750 unit/integration tests in 80 files, production build, all 25 asset validators and the production browser matrix passed. Browser stage: 753.06 seconds. No final-stage retries were needed.

The final matrix observed **172 school casts**, **32 basics**, and **136 boss cases** (91 distinct primary ability/phase cases plus 45 representative other-facing cases). Boss/helper action observations cover 21 forms, plus all eight hero styles; the elephant effect keeps its previously approved animated native charge/walk body. Natural six-client combat produced 18 replicated hit events with matching damage. See `live-matrix.json`, `boss-matrix.json` and `verification.json`.

A separate production six-client readability pass placed all six real casters inside the same unchanged gameplay viewport, used actual simultaneous Q input, observed new cast bodies for all six and verified replicated casts. `six-player-readability.png` is the final party image; `six-player-readability.json` records sampled frames and scope. This supplements the earlier combat image, where some actors lay near the viewport/HUD edge.

Source/provenance hashes (including rejected matte originals) and the affected asset guard were revalidated after metadata-only documentation/provenance updates. The full suite was not repeated for those metadata edits.

Current review services use client **5546** / server **2946** for the production build, and client **5547** / server **2947** for the development-only skill selector. Both report protocol **30**; create a new room. Older service URLs/bundles are not the current review target.

Comparison PNGs were refreshed in focused two-client development capture passes, polling a visible cast body instead of sleeping past fast attacks. Passed captures were retained; remaining branches were retried separately. The first accelerated pass switched weapons before a prior held pose settled; the capture helper now awaits presented locomotion before a branch change. Scoped Võ Đang and Thiên Sơn/dash retries passed, with the peer moved out of the dash endpoint for unobscured pictures. This changes capture fixtures only, not the production bundle, final assertions, combat or artwork. Final tools/tests typechecking passed afterward.

The review page was opened in Chrome: all 43 school pairs and 91 boss captures are present, native PNGs load, and both current services enter the normal match. The development selector correctly filters skills by the school chosen before the match (10 for Võ Đang, 13 for Thiếu Lâm).
