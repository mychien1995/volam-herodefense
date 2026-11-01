"""Build an offline art reviewer; reuse retained raster extraction, never game code."""
from pathlib import Path
import base64
import hashlib
import importlib.util
import json

from PIL import Image

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
BOSS = ROOT / 'assets/sprites/bosses/ly-mac-sau'
FX = ROOT / 'assets/effects/bosses/ly-mac-sau'
PURPLE = FX / 'purple_v02'
ARENA = ROOT / 'assets/concepts/arenas/co-mo-phai/arena_empty_review_v02.png'


def read(path):
    return json.loads(path.read_text(encoding='utf8'))


def data_url(path):
    return 'data:image/png;base64,' + base64.b64encode(path.read_bytes()).decode('ascii')


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def build():
    # Import the existing raster-cell extractor/atlas packer without running its main().
    spec = importlib.util.spec_from_file_location('retained_exporter', BOSS / 'source/package_assets.py')
    exporter = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(exporter)
    source = PURPLE / 'source/palm_sweep_source_v02.png'
    cells = exporter.cells(source, 8)
    frames, clips = [], {}
    for row, name in enumerate(['palm_charge', 'palm_lane_warning', 'palm_projectile', 'palm_impact']):
        scale = min(112 / max(c[0].width for c in cells[row]), 112 / max(c[0].height for c in cells[row]))
        ids = []
        for index, (image, recipe) in enumerate(cells[row]):
            image = image.resize((round(image.width * scale), round(image.height * scale)), Image.Resampling.NEAREST)
            canvas = Image.new('RGBA', (160, 160))
            xy = ((160 - image.width) // 2, (160 - image.height) // 2)
            canvas.alpha_composite(image, xy)
            frame = f'{name}_{index}'
            ids.append(frame)
            frames.append((frame, canvas, 100))
            exporter.RECIPES.append(dict(recipe, frame=frame, scale=scale, destination=xy, canvas=[160, 160], pivot=[80, 80]))
        clips[name] = dict(frames=ids, durationsMs=[100] * 4, loop=name == 'palm_projectile', canonicalDirection='right', origin=[0.5, 0.5])
    exporter.pack(PURPLE, frames, clips, (160, 160), (80, 80), 'vfx_ly_mac_sau_purple_v02', {
        'status': 'prototype_pending_director_review',
        'conceptApproval': 'pending_current_review',
        'source': 'Built-in image_gen targeted purple revision of retained palm_sweep_source_v01.png; flattened raster.',
        'sourceFile': 'source/palm_sweep_source_v02.png',
        'sourceSha256': digest(source),
        'license': 'Generated for this project with built-in image_gen; no external pack; no exclusive copyright claim.',
        'runtimeIntegrated': False, 'runtimeVerified': False, 'runtimeApproved': False,
    })
    exporter.save_json(PURPLE / 'source/extraction_recipes_v02.json', exporter.RECIPES)

    packages = {}
    for name, folder in [('boss', BOSS), ('summon', ROOT / 'assets/sprites/summons/co-mo-am-binh'), ('fx', FX), ('purple', PURPLE)]:
        packages[name] = dict(image=data_url(folder / 'spritesheet.png'), atlas=read(folder / 'atlas.json')['frames'], animations=read(folder / 'animations.json')['animations'], manifest=read(folder / 'manifest.json'))
    hero = ROOT / 'assets/exports/characters/vo_dang_v01/quyen/frames'
    hero_frames = {p.stem: data_url(p) for p in hero.glob('*.png') if p.stem.startswith(('idle_', 'walk_'))}
    environment = ROOT / 'assets/sprites/environment/co-mo-phai'
    env = {p.stem: data_url(p) for p in environment.glob('*.png') if p.stem not in ['spritesheet', 'contact_sheet', 'terrain']}
    tiles = {p.stem: data_url(p) for p in (environment / 'tiles').glob('*.png')}
    config = read(HERE / 'choreography.json')
    payload = dict(packages=packages, hero=hero_frames, arena=data_url(ARENA), environment=env, tiles=tiles, config=config)
    (HERE / 'asset-data.js').write_text('window.LY_MAC_SAU_ASSETS = ' + json.dumps(payload, ensure_ascii=False, separators=(',', ':')) + ';\n', encoding='utf8')
    inputs = [ARENA, source, HERE / 'choreography.json']
    inputs += [folder / filename for folder in [BOSS, ROOT / 'assets/sprites/summons/co-mo-am-binh', FX, PURPLE] for filename in ['spritesheet.png', 'atlas.json', 'animations.json', 'manifest.json']]
    inputs += sorted(hero.glob('*.png'))
    inputs += sorted(environment.glob('*.png')) + sorted((environment / 'tiles').glob('*.png'))
    exporter.save_json(HERE / 'preview_manifest.json', dict(
        status='prototype_pending_director_review', date='2026-11-01',
        scope='Standalone Canvas2D art choreography only. No Phaser, server, AI, collision, damage or networking integration.',
        source='Retained original image_gen v01 boss/summon/environment/effects; two targeted built-in image_gen v02 revisions.',
        license='Original/generated assets retained with their existing provenance. No external pack or exclusive copyright claim.',
        newArt=['assets/effects/bosses/ly-mac-sau/purple_v02/', ARENA.relative_to(ROOT).as_posix()],
        runtimeIntegrated=False, runtimeVerified=False, runtimeApproved=False,
        arenaBackdrop='Flattened empty illustration for art review only; not a production tilemap. Alternate tileset mode uses actual separate exported tiles/props.',
        boss=dict(canvas=[144, 128], pivot=[72, 104], bodyHeightPx=56, frames=128, directions=['down', 'left', 'right', 'up']),
        summon=dict(canvas=[112, 112], pivot=[56, 88], bodyHeightPx=44, frames=64),
        effects=dict(canvas=[160, 160], pivot=[80, 80], retainedFrames=92, newPurpleFrames=16),
        references=[dict(path='assets/references/' + name, sha256=digest(ROOT / 'assets/references' / name)) for name in [
            'vo_dang_character_reference.png', 'in_game_world_reference.png',
            'current_game_2026_10_29_placeholder_anti_reference.png', 'current_codex_dashboard_anti_reference.png',
            'central_arena_hub_reference.png', 'arena_battle_reference.png', 'forest_dungeon_reference.png',
            'desert_dungeon_reference.png', 'sea_dungeon_reference.png', 'hell_dungeon_reference.png',
            'dungeon_selection_menu_reference.png', 'merchant_shop_menu_reference.png', 'inventory_menu_reference.png']],
        referenceNotes='The older vo_dang_art_direction_reference.png name is absent; inspected the present vo_dang_character_reference.png. The retained current_codex_dashboard_anti_reference.png visibly contains a Võ Đang sheet, so the current_game placeholder screenshot supplies the actual negative visual benchmark. No reference files were changed.',
        inputs=[dict(path=p.relative_to(ROOT).as_posix(), sha256=digest(p)) for p in inputs],
        limitations=['Retained directional cast gestures sometimes turn toward viewer.', 'Artwork motion review in this viewer does not establish Phaser or multiplayer acceptance.', 'Illustrated backdrop is more detailed than separable environment exports; exact terrain seams/foreground splits remain pending.', 'All ranges, release timings, summon count and edge volleys are review defaults, not approved combat tuning.'],
    ))
    print(json.dumps(dict(status='built', output='assets/reviews/ly_mac_sau_v02/index.html', purpleFrames=16, bossFrames=128, summonFrames=64, retainedFxFrames=92, offlineBytes=(HERE / 'asset-data.js').stat().st_size)))


if __name__ == '__main__':
    build()
