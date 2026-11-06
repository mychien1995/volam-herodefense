# Preview từng creep — 2026-11-06

Open **http://127.0.0.1:5627/?creepPreview=1**. The review server must run in development with `VOLAM_DEV_CREEP_TEST=1`. Choose Vào game → Tạo phòng → Bắt đầu, then confirm a school and branch. The URL requests a separate sandbox room; the regular URL still runs the timed-wave test. Production rejects sandbox creation even when the environment flag is present.

The in-viewport selector includes all 49 current combat profiles: 20 invasion waves, 24 regular dungeon species and five boss-support units. Choose one, or use Trước/Sau. Tạo lại restores the test positions and removes previous creeps, projectiles, scheduled attacks, areas, combos and creep effects. Only the confirmed room host can control the selector; peers see the same authoritative creature and can move/fight normally. Preview dungeon entry is disabled so selection stays in this arena sandbox.

- **Dùng skill:** make the signature ready at the next legal AI opportunity. Normal windup, captured aim, reach and current action recovery still apply. It does not fabricate an immediate hit. Disabled when the profile has no signature or Chỉ đánh thường is enabled.
- **Thử khi chết:** kill the selected test creature server-side to run its real death effect. Disabled when no death ability exists. Use Tạo lại afterwards.
- **Chỉ đánh thường:** suppress the signature for this room, keeping canonical data untouched. Passive reflection/death behavior remains.
- **Creep đứng tại chỗ:** set ordinary walk speed to zero. Skill dashes still use their actual mechanics.
- **Tự hồi máu / mana:** refill the test heroes before each tick, while allowing real damage and slow/root/stun to resolve. Test heroes have 10,000 HP. This uses no invulnerability, because invulnerability would suppress hit-dependent statuses. Turn it off to inspect HP loss; Hồi đầy restores HP/mana and clears statuses.

Arrow keys, A, QWERT, Shift and mouse menu ownership remain unchanged. A click on the preview panel releases held movement; selects/text inputs retain keyboard focus. Buttons return focus to the game canvas. No invasion wave, boss schedule or dungeon progression is simulated in the sandbox. Test creatures grant zero XP/gold. These are explicit preview fixtures, not new production balance values.

The existing Phaser scene and server effect projection render the sandbox. Regular creature atlases are selected by authoritative profile ID across their usual zone boundaries **only** in this preview room. Mông Cổ support sprites reuse `assets/exports/bosses/hoan_nhan_hong_liet_v01/`; the wine disciple uses the retained `chu-art.generated.json` clips; Bắc Cái's dog uses the retained `bac-cai-preview/manifest.json`. No raster, atlas, source artwork or approved lock changes. Missing hurt/death poses on Mông Cổ support retain the source's idle fallback; the dog retains its authored right-facing sheet and mirrors left. This mode does not invent missing four-direction art or approve these new compositions.

Protocol **33** adds a strict creator preview option, validated host actions and one preview projection string. Older protocol-32 services must be restarted together, and users must create a new room. The server accepts only profile IDs/options/actions; clients cannot submit damage, coordinates or status outcomes.

Validation targets: `tests/creep-preview.test.ts`, `tests/e2e/creep-preview.spec.ts`, and `pnpm check:final --config playwright.creep-upgrade.config.ts tests/e2e/creep-preview.spec.ts`. Evidence is saved under `docs/evidence/creep-preview/` using PNG/frame observations, without recordings. Run results are recorded after execution.

## Executed verification

Final **PASS**, `pnpm check:final --config playwright.creep-upgrade.config.ts tests/e2e/creep-preview.spec.ts`: **837 unit/integration tests / 82 files**, 18 workflow checks, both typechecks, production build, all20 asset validators, and the two-client real Phaser preview case. Total450.51s; browser231.61s. All49 profiles rendered one at a time, with actual released signature/death rasters, real A damage, arrow movement, slow, host ownership, basic-only and previous/next controls. The panel remains inside1280×720. Opened both final PNGs and inspected the retained world/HUD and forward warning/slow presentation. No recordings, raster changes, new director approval or balance conclusions.

Iteration caught old tick snapshots resetting the basic-only checkbox before acknowledgement; fixed the control projection update and verified it in the final case. An initial SDK fixture used a custom port ignored by the installed testing helper; it now follows the existing2568 test endpoint. The prior failed browser report is retained separately.

Evidence: [verification](evidence/creep-preview/verification.json), [pipeline](evidence/sessions/creep-preview-final/check-workflow/final-timings.json), [browser](evidence/creep-preview/browser.json), [forest PNG](evidence/creep-preview/preview-forest.png), [forward PNG](evidence/creep-preview/preview-forward.png). Live review health confirms protocol33/run identity `creep-preview-review-p33-20261106`, clientHTTP200 and endpoint3427. Start a new room.
