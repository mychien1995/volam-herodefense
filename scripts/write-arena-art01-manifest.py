"""Record production provenance and measured exports; approval is always manual."""
from pathlib import Path
from PIL import Image
import hashlib
import json
import sys

ROOT = Path(__file__).resolve().parent.parent
DEST = ROOT/'assets/arena_art01.manifest.json'
verified = '--runtime-verified' in sys.argv
assets = []


def entry(id, source, export, pivot, integrated=True, **extra):
    image = Image.open(ROOT/export)
    alpha = image.getchannel('A')
    assets.append({
        'id': id, 'source': source, 'export': export,
        'dimensions': list(image.size), 'visibleBounds': list(alpha.getbbox()),
        'footPivotPixels': pivot, 'displayScale': '1 logical world pixel; HUD responsive in viewport',
        'sha256': hashlib.sha256((ROOT/export).read_bytes()).hexdigest(),
        'status': {'producedAsset': True, 'integratedAsset': integrated, 'runtimeVerified': verified and integrated, 'directorApproved': False},
        'provenance': 'Original project artwork generated with built-in image_gen from user-provided art direction; prepared and exported in Aseprite 1.3.18.6. No third-party game asset pack.',
        **extra,
    })


S = 'assets/source/arena_art01/'
E = 'assets/exports/arena_art01/'
entry('arena_ground', S+'arena_ground.aseprite', E+'arena_ground.png', [0, 0],
      layers=['Continuous authored soil and stone substrate', 'Separated authored moss, grass and flowers', 'Reconstructed north approach edge continuation', 'Fine arena paving and natural verge - editable density pass'],
      collision='Unchanged authoritative maps/arena.tmj. Ground art does not own collision.', animation='static')
for atlas_name, pivot in [('world', [96, 184]), ('garden', [112, 216]), ('ambient', [112, 216]), ('hud', [0, 0]), ('hud_frames', [0, 0]), ('hud_states', [0, 0])]:
    atlas = json.loads((ROOT/E/(atlas_name+'.json')).read_text())
    if atlas_name == 'ambient':
        for tag in atlas['meta']['frameTags']:
            names = list(atlas['frames'])[tag['from']:tag['to']+1]
            assets.append({'id': tag['name'], 'source': S+'ambient.aseprite', 'sheet': E+'ambient.png', 'atlas': E+'ambient.json',
                           'dimensions': [224, 224], 'footPivotPixels': pivot, 'frames': names, 'durationMs': 160, 'repeat': -1,
                           'layers': atlas['meta']['layers'],
                           'provenance': 'Original generated garden/lantern artwork; Aseprite adjacent-water sampling and lantern-window luminance cels. Fixed geometry and binary alpha across loop.',
                           'status': {'producedAsset': True, 'integratedAsset': True, 'runtimeVerified': verified, 'directorApproved': False}})
        continue
    for frame_name in atlas['frames']:
        individual = ROOT/E/(frame_name+'.png')
        if not individual.exists():
            continue
        integrated = not (frame_name in ['icon_potion_hp', 'icon_potion_mp', 'icon_empty', 'slot_normal', 'slot_selected', 'slot_disabled', 'lantern', 'red_banner_base', 'red_banner_top'])
        if atlas_name == 'garden' and frame_name in ['cascade', 'stream_pool', 'bridge']:
            integrated = True  # same production art consumed through flow/deck/rail exports
        details = {'atlas': E+atlas_name+'.json', 'sheet': E+atlas_name+'.png', 'frame': frame_name, 'layers': atlas['meta']['layers'], 'animation': 'static'}
        if frame_name == 'statue_male':
            details.update({'worldPosition': [800, 576], 'collision': 'Existing M1 marker is non-solid. No client collider invented.', 'layersPurpose': 'Stone sculpture separated from pedestal and steps.'})
        elif frame_name in ['tree_jade', 'tree_blossom']:
            details.update({'collision': 'Three existing authoritative trunk footprints; original map positions retained.', 'occlusion': 'Separate base/canopy PNGs, both aligned to foot pivot; Y-sorted against actor feet.'})
        elif frame_name == 'bridge':
            details.update({'collision': 'Existing walkable ground retained; no new barrier or navigation rule.', 'occlusion': 'Deck below actors; foreground rail Y-sorted separately.'})
        elif frame_name == 'red_banner':
            details['animation'] = 'static; no fabricated wind frames'
        entry(frame_name, S+atlas_name+'.aseprite', E+frame_name+'.png', pivot, integrated, **details)
entry('icon_palm', S+'icon_palm.aseprite', E+'icon_palm.png', [0, 0], animation='static; single projectile for ranged basic')
entry('key_badge', S+'hud.aseprite', E+'key_badge.png', [0, 0], animation='static; live DOM key labels')
entry('north_wall_face', S+'wall.aseprite', E+'wall.png', [0, 0], animation='static; existing wall bounds only')

manifest = {
    'version': 1, 'scope': 'ART-01 arena and compact HUD only', 'date': '2026-10-30',
    'approval': {'concept': 'User-approved direction: clean-arena-concept.png and arena-concept-1.png', 'runtime': 'PENDING director review at normal gameplay zoom'},
    'referenceFiles': ['assets/concept/clean-arena-concept.png', 'assets/concept/arena-concept-1.png', 'assets/concept/current-build.png'],
    'sourceProcess': 'Separate original generated ground, props, garden, icons and blank UI frames. Named layers were explicitly reconstructed in Aseprite; original layers were not recovered from the flattened concept.',
    'generationInputs': [{'path': p.relative_to(ROOT).as_posix(), 'sha256': hashlib.sha256(p.read_bytes()).hexdigest()} for p in sorted((ROOT/S).glob('generated_*.png'))],
    'productionScripts': ['scripts/assemble-arena-art01.lua', 'scripts/export-arena-art01.lua', 'scripts/export-arena-art01.mjs'],
    'layout': {'courtyardCenter': [800, 576], 'statueMarker': [800, 576], 'navigation': 'Existing server map and spawn markers unchanged; only painted surfaces are adapted.'},
    'verification': ['scripts/verify-arena-art01.py', 'tests/e2e/art01.spec.ts', 'docs/ART01_RUNTIME_REVIEW.md'],
    'remainingPlaceholders': ['creep_outlaw enemy', 'fire projectile/impact', 'staff arc', 'cast/hurt/death fallback aliases', 'item-category icons and destination art outside ART-01', 'remote map edge continuation'],
    'limitations': ['M1 has no statue collider/health or invasions; no authoritative geometry was changed.', 'Inventory/shop/dungeon/PvP are real existing preview overlays without the later-milestone backends.', 'M1 has no quick-item backend or skill ranks, so no potion counts or rank values are invented.', 'Banner is static; water and lantern loops are texture flow/glow, not a claimed hand-drawn full-fluid animation.'],
    'assets': assets,
}
DEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
print(f'Recorded {len(assets)} ART-01 components; runtime verification={verified}; director approval=PENDING')
