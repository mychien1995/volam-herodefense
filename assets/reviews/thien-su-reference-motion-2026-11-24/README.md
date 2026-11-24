# Thiền Sư — motion-reference study, 2026-11-24

Single-facing review of the user's four-phase photo reference: overhead load behind the crown, rear-leg load, forward drive, and hinged ground contact. This is a four-key-pose stepped study for choreography review, not a finished animation or approved game replacement. The existing game assets and combat remain untouched.

Open `http://127.0.0.1:5634/`. Start with `node assets/reviews/thien-su-reference-motion-2026-11-24/serve.mjs`. The page has looping playback, pause, 0.5× / 0.25× speeds, seeking and pose buttons; the original photo is alongside the actor. A retained idle and a gameplay-size rendering provide scale context. The loop holds its contact pose and resets after a 500ms review gap; no recovery motion is claimed.

All four selected poses come from the same generated sheet, with one uniform anatomical density and manually annotated boot centres. The atlas retains 4× raster density for crisp hand inspection. There is no procedural character drawing, single-still rotation or fabricated in-between motion. Durations are 220 / 240 / 90 / 400ms and are review timings, not gameplay timings.

Source: `assets/source/thien-su-reference-motion-2026-11-24/`. `generation.json` preserves exploratory prompts/takes, `selection.json` identifies the selected sheet and exact prompt, and `build.py` reuses `tools/hero_unified_assets.py` for alpha extraction. Earlier takes are retained rather than overwritten. `validation.json` records PNG/atlas hashes, alpha and registration checks; approved art locks are checked during export.

Validation run: `pnpm qa:preflight --mode browser` with isolated session ports, then `node assets/reviews/thien-su-reference-motion-2026-11-24/verify.mjs`. Actual Phaser post-render observations covered all four poses over two loops, stable actor position/scale, seek, pause, half-speed and gameplay-size controls, with no browser errors. Reports and two useful phase PNGs: `docs/evidence/thien-su-reference-motion-2026-11-24/`. No gameplay, multiplayer or final animation approval is claimed.
