# Hoàn Nhan Hồng Liệt · VFX v05

The director approved v05 for the normal Hồng Liệt encounter on 2026-11-13. The match renderer draws the approved effects from the server's warning geometry and cast, contact and expiry ticks.

## Raster source and export

The original transparent 1254 × 1254 component sheet was generated with OpenAI ImageGen. Prompt intent was a nine-cell sheet of isolated detailed wuxia fire and basalt effects in a 3 × 3 layout with transparent gutters. The approved Hồng Liệt V04 effect atlases and live arena provided the palette and camera reference for the integration. The live Tru Tà sweep provided the movement and silhouette reference. The eight selected raster parts share a 288 × 288 cel canvas, with an individual normalized pivot exported in the atlas metadata. The generated bloom cell was excluded because of its opaque white edge and overlap with adjacent cells.

```text
Top row: directly overhead branching glowing basalt cracks, top-down molten crust patch, angled dark meteor with a tapered orange flame tail.
Middle row: low wide fire burst with hot flying rocks, tall eruption plume with ground-contact base, narrow right-facing semicircular saber crescent with open center.
Bottom row: small glowing basalt ember, translucent ground glow, shallow upward flame lick.
Use charcoal basalt, red-orange fire and controlled gold highlights. Isolate every component with true alpha, clear gutters and no scenery, characters, text or grid.
```

Run the repository's Aseprite CLI from its root with `-b --script assets/source/bosses/hoan_nhan_hong_liet_vfx_v05/export.lua`. The script exports an editable eight-cel Aseprite document and the PNG/JSON atlas in the corresponding `assets/exports/bosses` directory. The cels are individual components. Their motion, reveal, fade and attachment to the ground follow the server cue clock in `apps/game-client/src/hong-liet-vfx.ts`.

| File | SHA-256 |
| --- | --- |
| generated-components.png | 24c4e8267cfa1942e5bc35a2db5468d8b791442f8cf643b4ff20ae9aa0236cb7 |
| fire-effects.aseprite | ae3962498bfcc691d3fb05853b5ac989a1b13c1c1d6d17dd605f8e57795bfeba |
| fire-effects.png | fc7beaf31e2e0b786f595c33ae5ba730741e304061b032dba483bb9d3a339042 |
| fire-effects.json | 1bf7dec2b7b343e0413c11c662a143a10a038c05784f20b7a076aab306d2810f |

The v05 effects reuse Hồng Liệt's existing cast body and the current gameplay camera.

## Playback and checks

- Enter Hoàn Nhan Hồng Liệt through the Phó Bản menu. Watch the ground charge and eruption, meteor travel and impact, the separate lava patches under the dash and the anchored frontal sweep.
