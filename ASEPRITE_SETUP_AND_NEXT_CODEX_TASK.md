# Võ Lâm Hero Defense — Aseprite setup & next Codex task

## Install on Windows

1. Purchase/download from the official website: https://www.aseprite.org/buy/ (Windows installer or portable ZIP), or install via Steam.
2. After installation open Windows PowerShell.
3. Locate `Aseprite.exe` and test the CLI:

```powershell
$paths = @(
  'C:\Program Files\Aseprite\Aseprite.exe',
  'C:\Program Files (x86)\Aseprite\Aseprite.exe',
  'C:\Program Files (x86)\Steam\steamapps\common\Aseprite\Aseprite.exe'
)
$aseprite = $paths | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $aseprite) { Write-Warning 'Aseprite.exe not found in common locations. Locate it manually (e.g. Steam library on another drive).'; return }
& $aseprite --version
& $aseprite --help
```

Optional export test after an actual editable `.aseprite` file has been created:

```powershell
& $aseprite -b 'assets\source\characters\cai_bang.aseprite' --sheet 'assets\exports\characters\cai_bang.png' --data 'assets\exports\characters\cai_bang.json'
```

Note: Installing Aseprite does NOT provide an AI art generator. The concept sheet is not a production-ready spritesheet. First source/create consistent original sprites, then use Aseprite's editing/CLI for cleanup and export.

## Codex task to paste (existing project only)

Read `AGENTS.md`, `ART_PRODUCTION_STANDARD.md`, `ART_DIRECTION_REFERENCE.md`, `ART_ASSET_GUIDE.md`, and `CODEX_ART_QUALITY_RESCUE_TASK.md`. Inspect the actual reference PNGs and the current ugly prototype image under `assets/references/`.

**Goal: one Cái Bang character art vertical slice**, not the whole game. Do not restart the project or change Phaser 4, multiplayer, combat rules, key mappings, or existing working UI.

1. **Audit:** Find exactly which assets are procedurally drawn, which PNGs/spritesheets truly exist, and why the art quality differs from the reference. Report paths and findings before producing assets.
2. **Tool check:** Locate Aseprite on this Windows machine. Use the Aseprite CLI if available; show the detected binary path and version. Check whether you have an actual image-generation or usable licensed-art pipeline. Do not assume either.
3. **Art source:** Use `cai_bang_character_reference.png` as a *style and character-design reference*, but do not crop the presentation sheet and call it an animation. Produce or request original transparent sprites with consistent front/back/left/right poses. Make idle, walking and one staff-attack animation, plus one separated VFX. If you cannot produce real art of comparable quality, stop and report missing source assets; do NOT output colored rectangles and call them finished.
4. **Pipeline:** Organize source assets under `assets/source/characters/`, export spritesheets with frame tags and JSON under `assets/exports/characters/`, track foot pivot/frame sizes and record provenance. Automate exports through Aseprite CLI where possible.
5. **Verify:** Import only the approved new character assets into a small Phaser test scene, show real idle/walk/staff animation at actual gameplay scale, and capture PNG screenshots and live Phaser animation/transition observations. Follow the recording policy in `AGENTS.md`; recordings require an explicit user request. Preserve all controls and server authority. Report any placeholders and ask for my visual approval.

Do not expand to other schools/dungeons and do not claim art quality approval without my explicit review.

## Useful sources

- https://www.aseprite.org/buy/
- https://www.aseprite.org/docs/cli/
- https://www.aseprite.org/docs/sprite-sheet/
