# Generation provenance and production prompt set

Date: 2026-10-30. Tool: built-in `image_gen.imagegen` (no API-key runner or external asset pack). Inputs were the director's repository images. Output paths below are repository-preserved originals. Normalized production briefs are recorded here; the conversation tool log contains the full requests. PNGs were then actually opened/processed/exported by Aseprite batch Lua. Generation alone did not mark assets integrated, verified or approved.

| Original output | Reference input | Tool output basename | Purpose |
|---|---|---|---|
| generated_ground.png | assets/concept/clean-arena-concept.png | exec-6e9f0c3d-f8c5-4107-842a-890be805676f.png | Fully reconstructed unobscured ground; used in fine-density central pass |
| generated_world.png | assets/concept/clean-arena-concept.png | exec-34399dfd-41cb-4f53-b2b0-fdcb3844c7aa.png | Separate statue, trees, bamboo, lantern, banner |
| generated_garden.png | assets/concept/clean-arena-concept.png | exec-e9dcc407-4228-413a-b02a-0dffeb3e75bc.png | Separate water gardens, bridge, flower rocks |
| generated_hud.png | assets/concept/arena-concept-1.png | exec-0f7ce271-8bb7-42eb-9b9e-fccafbfc2436.png | Actual equipped-ability and utility icon artwork |
| generated_frames.png | assets/concept/arena-concept-1.png | exec-44c26d8e-5be7-4bde-bcca-d5c93173bcd5.png | Empty frames and bar strips, no baked sample UI values |
| generated_ground_native.png | generated_ground.png | exec-3874d7e6-0baf-4f32-a647-c109dd7de3f4.png | Continuous lawn revision, removing rejected mirrored extension |

## Ground production brief

Production game asset, not a concept screenshot. Reconstructed empty ground plate for a playable top-down three-quarter pixel-art RPG arena. Warm grey sandstone, moss and jade grass. Generous circular courtyard with radial concentric irregular paving and decorative stone rings. Broad axis-aligned approaches reach all four image edges. Complete unobscured stone beneath where the statue would stand. No statue, shadows, characters, trees, bamboo, lanterns, rocks, buildings, water, bridges, banners, HUD or text. Orthographic north-up, no horizon, isometric grid or perspective convergence. Crisp deliberate pixel detail and varied masonry, not a repeating beige brick tile. Ground and lawn are walkable; props will be separate alpha sprites.

The initial mirrored extension failed actual visual inspection. A second original continuous ground plate was requested with a smaller central circular courtyard, narrow continuous stone approaches and unique jade lawn across the image: no repeated, mirrored or striped texture. No characters, props or UI. The two real painted surfaces are combined in editable Aseprite ground layers, with a pixel-dithered perimeter transition to retain the finer center density. No complete concept screenshot is loaded as the map.

## World prop production brief

Original transparent production props in six isolated cells: (1) clearly male Chinese martial-artist stone statue, male face/topknot/moustache, punching arm and grounded martial stance, grey weathered robes, low rectangular plinth and steps; (2) lush irregular jade broadleaf tree with visible gnarled trunk and roots; (3) pink/coral blossom tree with curved brown trunk; (4) segmented green-gold bamboo with pointed jade leaves; (5) black pagoda-cap stone lantern with amber window and carved shaft; (6) scarlet vertical silk banner on wooden pole with gold finial and abstract cloud embroidery. Consistent upper-left lighting, elevated orthographic RPG perspective, no backdrop, text, extra characters or copied game assets. True alpha around each component. Aseprite removes low-alpha matte, aligns feet and reconstructs base/top layers. The banner is static.

## Garden production brief

Four separate transparent original pixel-art components: rocky mossy garden cascade into a shallow turquoise pool with lily pads and foam; a distinct winding shallow stream garden with waterfall and lotus; straight horizontal wood footbridge with visible deck, back rail and front rail, no ground beneath; low mossy rocks/shrubs/white-yellow-pink flowers. Elevated orthographic three-quarter view, warm grey rocks and jade vegetation, no UI, buildings, trees, characters or text. No matte/checkerboard. Actual generated dimensions were measured rather than assuming the requested cell size. Aseprite separates water/banks and bridge deck/foreground railing. Water motion and lantern glow are four-phase texture/light cels, not generated character poses or hand-drawn fluid-animation claims.

## HUD icon production brief

Sixteen isolated readable square pixel-art icons, matching black-charcoal and antique-gold compact wuxia HUD frames, no text/labels/numbers. Row order: gear, exit door/right arrow, blue portal, merchant pouch; crossed swords, leather backpack, coin stack, red potion; blue potion, wooden staff, THREE fiery projectiles, exploding fireball; parchment scroll, jade pendant, lock, empty slot. Same-size gilded border, transparent outside corners, bold material silhouettes readable at 48px. Actual M1 Q is three fire shots; W is explosive fire, not the illustrative meditation/buff icons. Aseprite also derives the single-projectile normal icon from one original painted projectile over the empty slot. No ranks or potion counts are invented.

## HUD frame production brief

Transparent empty original game-UI artwork: wide player panel frame, horizontal hotbar frame, square portrait frame with transparent center, and three separate ruby/cyan/amber bar strips. Thin double antique-gold bevel and sculpted cloud corners, subtly textured charcoal interior. No words, names, numbers, icons, sample portrait, baked health values, backdrop or whole-screen HUD. Aseprite separates the painted frame from the interior/surface; DOM text, bar clipping, keyboard labels and cooldown values remain live. Responsive nine-slicing preserves the corners. Selected/disabled slot and key-badge assets are prepared from the actual empty-frame source.

## Tool and source limits

These are AI-assisted original raster assets with scripted Aseprite cleanup/layer preparation, not a claim of manual frame-by-frame pixel painting. Concepts established direction only. The actual runtime candidate still requires director approval at normal zoom. Enemies, combat VFX, fallback cast/hurt/death, item-category art, destination cards and remote map edge continuation remain separately identified prototypes.
