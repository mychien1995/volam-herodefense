# IIS asset delivery — 2026-11-26

The IIS build now delivers pixel-verified lossless WebP when smaller, keeps original PNG for unsupported color metadata or larger WebP output, and gives each delivery file a SHA-256 URL. Approved source/export/public PNGs and atlas coordinates are unchanged. No gameplay, balance, protocol or art approval changes are included.

## Measurements

- Live `hero-defense.stackfolio.cloud` before changes: the tested HTML and PNG responses had ETag/Last-Modified and no explicit Cache-Control. This does not mean the browser had no cache; freshness was left to browser heuristics.
- Unique input PNG catalogue: **759,526,885 bytes**. Actual delivery rasters: **570,012,273 bytes**, a **24.95% reduction**. These are catalogue totals, not the download required to start one match.
- Representative 1600 × 1152 ground: **3,730,381-byte PNG → 2,445,274-byte WebP**. All decoded RGBA pixels match, including hidden transparent RGB values.
- Chromium ResourceTiming: cold transfer **2,445,574 bytes** including response overhead; after page reload **0 transferred bytes**, with the same decoded body size and dimensions.
- Final focused two-client run reached the game after 29,071 ms on this test machine. This is a startup observation, not a before/after latency comparison or a network speed promise.

## Implementation and deployment

`scripts/stage-runtime-assets.mjs` runs `scripts/runtime-rasters.py` with UTF-8. The conversion cache is under ignored `artifacts/runtime-rasters-v1`; cached images are decoded and compared against source pixels before use. Corrupt cache entries are rebuilt. Equal delivery bytes share one URL even if original PNG metadata differs.

The existing Phaser URL alias hook also covers spritesheets. Vite preview can serve the same staged aliases and cache policy for local QA. Production build remains through `build-windows-iis.ps1`.

`scripts/iis-client-config.mjs` writes the root web.config and small per-directory raster maps. IIS also limits external configSource files to 250 KB, so one large external map is insufficient. The generator rejects an oversized directory map. Native IIS Express verified the final distributed configuration, including deep paths and PNG fallback.

- Direct `/assets/immutable/<sha256>.webp` or `.png`: `public, max-age=31536000, immutable`.
- HTML, manifests and legacy image paths: revalidate. Legacy PNG URLs internally serve their corresponding delivery file with the correct MIME type.
- The immutable policy excludes `/game-api`. The existing WebSocket/API proxy rule remains.
- The IIS build enables static compression; the IIS Static Content Compression role feature must be available.
- When updating an existing site, retain older immutable assets for already-open clients. Do not ship the local QA bundle: it points to the isolated local server. Run the IIS build for the production endpoint.

**The live site was not deployed or modified.** The temporary localhost IIS Express process was stopped after verification.

## Validation actually run

- `pnpm qa:preflight --mode browser`: PASS (pnpm flags below were needed to prevent its automatic dependency reinstall in this environment).
- `node --test scripts/tests/runtime-assets.test.mjs`: **2 passed** after the final script change. Covers exact pixels/alpha, metadata fallback, raw and encoded deduplication, content invalidation, corrupt conversion cache, authoring-frame exclusion, mutable URL exclusion and IIS configuration size/XML.
- `pnpm exec tsc -p tsconfig.tools.json --noEmit`: PASS after the final browser assertions.
- Production Vite build against the staged delivery assets: PASS.
- `pnpm exec vitest run`: **129 files / 1,284 tests passed**; see `unit-tests.log`.
- `node tools/run-playwright.mjs test tests/e2e/asset-cache.spec.ts`: **2 passed** after the final assertions: reload cache; both heroes rendered in both clients; real keyboard movement acknowledged by server and replicated to the other client. No failed asset responses or page errors. See `focused-browser.log`.
- `tests/e2e/art-preload.spec.ts`: PASS against the staged build, including delayed desert loading, a failed-load retry and authoritative zone transition.
- Native IIS Express on owned localhost port 5488: HTML/manifest/legacy/hash headers and MIME types PASS; nested legacy paths and original PNG fallback PASS; conditional ETag request returned 304. See [headers](iis-headers.json) and [extra checks](iis-extra-checks.json).
- Inspected the final 1280 × 720 multiplayer PNG at `artifacts/asset-delivery-focused/gameplay/asset-cache-packaged-multi-9324e-s-and-acknowledges-movement-chromium/optimized-multiplayer.png`. No new visual-art approval is claimed.

The actual pnpm invocations used `--config.verify-deps-before-run=false --config.manage-package-manager-versions=false`. QA used server/client ports 2877/5477 and owned session directories. No unrelated processes or site configuration were changed.

## Remaining full-check failures

The requested final command was run once:

```powershell
pnpm check:final tests/e2e/asset-cache.spec.ts tests/e2e/art-preload.spec.ts tests/e2e/gameplay.spec.ts --grep 'packaged rasters|arena art starts|two clients agree|ranged projectile'
```

Its original [timing report](check-workflow/final-timings.json) remains **FAIL**, not relabeled PASS. Preparation, TypeScript compilation and tools typecheck passed. Workflow checks had **71 passed / 1 failed**: tracked `playwright.boss-combat-review.config.ts` has no QA contract and is also explicitly listed as excluded by the existing profile test. HEAD also lacks this contract; this task leaves that separate QA work unchanged.

The remaining stages were run separately without repeating passing full suites:

- **34 of 35 asset validators passed** across the original run and the UTF-8 retry. `verify-bac-cai-preview.py` initially failed printing Vietnamese to the redirected Windows code page; its UTF-8 retry passed. The final `verify-skill-revise-thien-su.py` fails an existing source lock for `assets/exports/skill-revise-feedback-v04/hammer-coherent-v4/body.json`. Expected SHA-256: `9bc6c128eb59e8021f06c87fa552d9f65f2128d09048309c997df81acb8ea059`; both working-tree bytes and HEAD have `252d24ccc85caf360a446531db1345ece6896471c41017144b403a81d7c41d5e`. No locked art or approval manifest was modified to conceal this mismatch. See `asset-validation.log` and [retry results](asset-validation-retry.json).
- Two existing broader gameplay cases did not pass, including a retry after the heavy checks finished. The combat/progression test expects `renovated-hero_cai_bang_chuong` but the current renderer returns `cai-bang-chuong-unified`. The ranged-projectile test times out waiting for a short-lived projectile after A. These assertions/timing were not weakened or used as asset-cache acceptance. The separate final asset/multiplayer smoke passed; full combat acceptance is not claimed.

Logs and screenshots are retained in their original sessions. No video or frame-stream recording was created.
