"""Assemble concept-review crops/contact sheets; never creates production artwork."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps
import hashlib
import json

ROOT = Path(__file__).resolve().parents[4]
OUT = Path(__file__).resolve().parent
REL = OUT.relative_to(ROOT).as_posix()

# A later explicit approval must survive review-tool reruns.
for register_path in OUT.glob('approval_register_*.json'):
    prior = json.loads(register_path.read_text(encoding='utf-8'))
    for entry in prior.get('entries', []):
        for scope in ['skillConcept', 'iconConcept']:
            state = entry.get(scope, {})
            if state.get('evidence') or state.get('status') == 'approved':
                raise RuntimeError('Approved concept exists; create a separate reviewed revision instead of rebuilding.')

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def write_json(name, value):
    (OUT / name).write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

def font(size):
    for path in ['C:/Windows/Fonts/arial.ttf', 'C:/Windows/Fonts/segoeui.ttf']:
        if Path(path).exists():
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()

briefs = json.loads((OUT / 'briefs_v01.json').read_text(encoding='utf-8'))
skills = briefs['skills']
extras = briefs['additionalIcons']
crop_boxes = [
    (1229, 604, 1500, 875), (1158, 548, 1493, 883),
    (1171, 555, 1500, 884), (1166, 575, 1499, 908),
    (1214, 598, 1503, 897), (1188, 605, 1500, 921),
    (1273, 765, 1483, 975), (1089, 530, 1482, 923),
    (1168, 576, 1499, 907), (1232, 741, 1437, 950),
]

lock_path = ROOT / 'assets/approved_vo_dang.lock.json'
lock = json.loads(lock_path.read_text(encoding='utf-8'))
mismatches = [p for p, h in lock['files'].items() if not (ROOT / p).exists() or sha(ROOT / p) != h]
assert not mismatches, mismatches

records = []
for index, skill in enumerate(skills):
    sid = skill['id']
    version = 'v02' if sid == 'thai_cuc_tran' else 'v01'
    board = OUT / f'{sid}-concept-{version}.png'
    im = Image.open(board).convert('RGB')
    assert im.size == (1536, 1024), (sid, im.size)
    box = crop_boxes[index]
    assert 0 <= box[0] < box[2] <= im.width and 0 <= box[1] < box[3] <= im.height
    crop = im.crop(box)
    # Preserve every selected pixel, square-pad only. This is an icon CONCEPT,
    # not final icon artwork or a runtime export.
    side = max(crop.size)
    icon = Image.new('RGB', (side, side), '#1d2736')
    icon.paste(crop, ((side - crop.width) // 2, (side - crop.height) // 2))
    icon_name = f'{sid}-icon-concept-v01.png'
    icon.save(OUT / icon_name)
    records.append({**skill, 'kind': 'active', 'concept': f'{REL}/{board.name}',
        'approvedConcept': None, 'conceptApproval': 'pending',
        'icon': f'{REL}/{icon_name}', 'iconApproval': 'pending',
        'iconDerivation': {'source': board.name, 'cropBoxPx': list(box),
            'operation': 'Exact raster crop with square padding; no generated animation frames.'},
        'characterAnimation': 'Missing skill-specific clips; four key poses are concept illustrations only.',
        'vfx': 'Concept stages only; production transparent frames/atlases missing.',
        'exportStatus': 'not_started_requires_per_skill_and_icon_concept_approval',
        'phaserVerification': 'not_started_phase_1_gate',
        'gameplayIntegration': 'pending; no Võ Đang ability mechanics implemented by this task',
        'finalArtApproval': 'pending; no production artwork yet'})

for skill in extras:
    sid = skill['id']
    icon_name = f'{sid}-icon-concept-v01.png'
    assert (OUT / icon_name).exists()
    is_basic = sid != 'thai_cuc_tam_phap'
    records.append({**skill, 'kind': 'basic' if is_basic else 'innate',
        'concept': None, 'approvedConcept': 'assets/concepts/heroes/vo-dang/vo-dang-concept-v01.png' if is_basic else None,
        'conceptApproval': 'approved_character_basic_animation_only' if is_basic else 'not_applicable_icon_only',
        'icon': f'{REL}/{icon_name}', 'iconApproval': 'pending',
        'iconDerivation': {'operation': 'Original standalone image_gen icon concept'},
        'characterAnimation': ('Reuse approved hero_vo_dang' + ('_kiem' if sid == 'vo_dang_kiem' else '') + ' basic_attack_{direction}; 4 x75ms; preserve source/export bytes.') if is_basic else 'Not applicable; passive icon only.',
        'vfx': 'Missing school-specific Kiếm Khí production asset; supplementary VFX not approved.' if sid == 'vo_dang_kiem' else 'Not applicable; no additional VFX requested or approved.',
        'exportStatus': 'approved basic character retained; new icon production blocked on approval' if is_basic else 'icon_concept_only',
        'phaserVerification': 'Existing approved basic character verification retained; no new preview run.' if is_basic else 'not_started_icon_concept_only',
        'gameplayIntegration': 'Existing fallback combat only; school-specific normal/passive mechanics pending.',
        'finalArtApproval': 'basic character approved; icon pending' if is_basic else 'pending_icon_only'})

# Select simplified icon revisions; keep every v01 source/crop for history.
revised_ids = {'duong_khi_kich', 'toa_sat_bac_do', 'vo_dang_kiem', 'thai_cuc_tam_phap'}
for record in records:
    if record['id'] in revised_ids:
        record['icon'] = f"{REL}/{record['id']}-icon-concept-v02.png"
        record['iconDerivation'] = {'operation': 'Original standalone image_gen HUD-readability revision; prior v01 retained',
            'promptRecord': f'{REL}/generation_prompts_v02.json'}

# Exact source-board overview: documentation-only resizing, never frame production.
overview = Image.new('RGB', (1800, 3220), '#182332')
d = ImageDraw.Draw(overview)
d.text((28, 16), 'VÕ ĐANG — 10 ACTIVE SKILL CONCEPTS', font=font(28), fill='#eee8dc')
d.text((28, 53), 'PHASE 1 / APPROVAL PENDING — illustrations are not runtime frames or approved mechanics', font=font(17), fill='#bac5d5')
for i, record in enumerate(records[:10]):
    x = (i % 2) * 900 + 12
    y = (i // 2) * 620 + 98
    im = Image.open(ROOT / record['concept']).convert('RGB')
    im.thumbnail((870, 580), Image.Resampling.LANCZOS)
    overview.paste(im, (x, y))
    d.text((x, y + 585), f"{i+1:02}. {record['name']}", font=font(18), fill='#eee8dc')
overview.save(OUT / 'vo-dang-skill-overview-v02.png')

icons = Image.new('RGB', (1400, 1130), '#182332')
d = ImageDraw.Draw(icons)
d.text((24, 12), 'VÕ ĐANG — 13 ICON CONCEPTS / APPROVAL PENDING', font=font(25), fill='#eee8dc')
d.text((24, 48), 'Large review • actual 44px • compact 32px • grayscale 44px. Labels are outside artwork.', font=font(18), fill='#bac5d5')
for i, record in enumerate(records):
    x = (i % 4) * 350 + 14
    y = (i // 4) * 260 + 88
    original = Image.open(ROOT / record['icon']).convert('RGB')
    d.text((x, y), f"{i+1:02}. {record['name']}", font=font(17), fill='#eee8dc')
    icons.paste(original.resize((144, 144), Image.Resampling.NEAREST), (x, y + 30))
    for size, dx, dy in [(44, 166, 34), (32, 244, 34)]:
        small = original.resize((size, size), Image.Resampling.NEAREST)
        icons.paste(small, (x + dx, y + dy))
        d.text((x + dx, y + dy + size + 6), f'{size}px', font=font(14), fill='#bac5d5')
    gray = ImageOps.grayscale(original).convert('RGB').resize((44, 44), Image.Resampling.NEAREST)
    icons.paste(gray, (x + 166, y + 124))
    d.text((x + 217, y + 136), 'gray', font=font(14), fill='#bac5d5')
    d.text((x, y + 189), record['id'], font=font(14), fill='#bac5d5')
icons.save(OUT / 'vo-dang-icon-overview-v02.png')

reference_paths = [
    'assets/concepts/heroes/vo-dang/vo-dang-concept-v01.png',
    'assets/exports/characters/hero_vo_dang.png', 'assets/exports/characters/hero_vo_dang.json',
    'assets/exports/characters/hero_vo_dang_kiem.png', 'assets/exports/characters/hero_vo_dang_kiem.json',
    'assets/references/vo_dang_character_reference.png',
    'assets/references/cai_bang_character_reference.png',
    'assets/references/thien_son_thieu_lam_character_reference.png',
    'assets/references/in_game_world_reference.png',
    'assets/references/current_codex_dashboard_anti_reference.png',
    'assets/references/current_game_2026_10_29_placeholder_anti_reference.png',
    'assets/references/wuxia_town_world_reference.png',
    'assets/references/central_arena_hub_reference.png', 'assets/references/arena_battle_reference.png',
    'assets/references/forest_dungeon_reference.png', 'assets/references/desert_dungeon_reference.png',
    'assets/references/sea_dungeon_reference.png', 'assets/references/hell_dungeon_reference.png',
    'assets/references/dungeon_selection_menu_reference.png',
    'assets/references/merchant_shop_menu_reference.png', 'assets/references/inventory_menu_reference.png',
    'assets/concepts/skills/cai-bang/concept_manifest_v1.json',
    'assets/exports/skills/cai-bang/production_manifest_v1.json',
]
manifest = {
    'schemaVersion': 1, 'createdOn': '2026-10-31', 'schoolId': 'vo_dang',
    'status': 'concepts_pending_director_approval', 'phase': 1,
    'scope': 'Ten active skill concepts and thirteen icon concepts. No production or gameplay changes.',
    'productionGate': 'Explicit approval separately per active-skill concept and per icon; partial approval never approves remaining entries.',
    'provenance': {'method': 'OpenAI built-in image_gen.imagegen',
        'authorship': 'Original AI-assisted raster concept art. No third-party sprite pack imported; no human hand-pixelled or exclusive copyright claim.',
        'referenceLicense': 'Director references are direction-only; third-party rights not independently established. No reference pixels sampled into new art.',
        'prompts': [f'{REL}/generation_prompts_v01.json', f'{REL}/generation_prompts_v02.json'],
        'briefs': f'{REL}/briefs_v01.json',
        'conceptIconCrops': 'Ten icons extracted from newly generated skill boards; standalone normal/passive icons generated separately. These crops are not production sprites or animation frames.',
        'references': [{'path': p, 'sha256': sha(ROOT / p)} for p in reference_paths]},
    'baseline': {'approvalLock': 'assets/approved_vo_dang.lock.json', 'lockSha256': sha(lock_path),
        'protectedFilesChecked': len(lock['files']), 'unchanged': not mismatches,
        'bodyHeightLogicalPxApprox': 44, 'quyen': {'canvasPx': [80, 80], 'footPivotPx': [40, 64]},
        'kiem': {'canvasPx': [96, 80], 'footPivotPx': [48, 64]}, 'origin': [0.5, 0.8],
        'productionPolicy': 'New skill poses outside character lock; maintain fixed body scale/feet, separate character and VFX.'},
    'auditBeforeGeneration': {'activeSkillConcepts': 'missing', 'activeConceptApprovals': 'none found',
        'skillSpecificAnimations': 'missing; baseline cast aliases reuse normal attack and are not approved skill art',
        'schoolVfx': 'missing; generic fire.png/shared fire and generic icon_palm are not Võ Đang assets',
        'schoolIcons': 'all13 missing; no approved Võ Đang icon found',
        'basicAnimations': 'both approved and retained',
        'gameplay': 'Võ Đang progression marked implemented:false; no school skill-art bindings found.'},
    'mechanicDependencies': [
        'CONTENT_DATA describes proposed effects. Concepts illustrate user-requested identities without finalizing rank values, costs, cooldowns or numbers.',
        'Thái Cực Thần Công toggle/timed duration unresolved. Reusable activation/state/absorption/end concept is lifetime-neutral.',
        'Exact slash/wave/pulse counts, area dimensions, field placement, duration and cadence depend on future authoritative skill data.',
        'Counter trigger eligibility/window/recovery depends on authoritative events; no block, invulnerability, dash or forced evasion is implied.',
        'Basic sword Kiếm Khí proc chance/timing/range is unimplemented/provisional; no extra VFX or guarantee approved by the icon.',
        'Innate passive has icon only; no in-world effect approved.'
    ],
    'referenceDiscrepancies': [
        'vo_dang_art_direction_reference.png absent; inspected vo_dang_character_reference.png and approved hero concept/atlases instead.',
        'current_codex_dashboard_anti_reference.png contains Võ Đang direction artwork; wuxia_town_world_reference.png contains the dashboard negative. Follow actual contents.',
        'thien_son_thieu_lam_character_reference.png depicts a town overworld. in_game_world_reference.png exists despite older README absence note.'
    ],
    'illustrationGuardrails': [
        'Large key poses and small gameplay illustrations are conceptual drawings, not Phaser screenshots or logical-scale verification.',
        'Side-view wording on projectile study labels describes the isolated VFX profile, not permission to change the elevated world camera.',
        'Nhân Kiếm lower footprint row lays out successive poses horizontally; caster stays fixed, no dash or root movement.',
        'Thất Tinh stars and Bát Quái edge swords are visual motifs, not authoritative hit counts.',
        'Thái Cực Trận boundary-adjacent targets in inset illustrate feedback only; statuses must be clipped to authoritative inside-zone eligibility.',
        'Thái Cực Trận v01 is superseded by v02: remove incidental sword props and vertical streaks. Both are retained unapproved.',
        'All generated icon frames share silver corners/dark backing; exact border thickness and detail simplification require a shared production template after approval.'
    ],
    'records': records,
    'verification': {'status': 'concept_file_and_hash_checks_only', 'phaserRun': False, 'recordingsGenerated': False},
    'outputs': []
}
for p in sorted(OUT.glob('*.png')):
    im = Image.open(p)
    im.verify()
    with Image.open(p) as im:
        manifest['outputs'].append({'path': f'{REL}/{p.name}', 'dimensionsPx': list(im.size), 'sha256': sha(p),
            'status': 'superseded_unapproved' if (p.name == 'thai_cuc_tran-concept-v01.png' or p.name in {f'{sid}-icon-concept-v01.png' for sid in revised_ids} or p.name in {'vo-dang-skill-overview-v01.png', 'vo-dang-icon-overview-v01.png'}) else 'concept_pending_approval',
            'animationAtlas': False, 'runtimeExport': False})
write_json('concept_manifest_v02.json', manifest)
write_json('approval_register_v02.json', {'schemaVersion': 1, 'createdOn': '2026-10-31',
    'policy': 'Record explicit user evidence and exact reviewed file hash for each skill and icon separately. Do not infer approval.',
    'entries': [{'id': r['id'], 'nameVi': r['name'],
        'skillConcept': {'path': r['concept'], 'sha256': sha(ROOT / r['concept']) if r['concept'] else None,
            'status': 'pending' if r['kind'] == 'active' else 'not_requested_reuse_basic_or_icon_only', 'evidence': None},
        'iconConcept': {'path': r['icon'], 'sha256': sha(ROOT / r['icon']), 'status': 'pending', 'evidence': None},
        'productionApproval': 'not_started', 'finalArtApproval': 'pending'} for r in records]})
print(f'PASS: {len(records)} canonical entries, 10 selected action boards, 13 icon concepts, {len(manifest["outputs"])} PNGs.')
print(f'PASS: all {len(lock["files"])} approved character files unchanged; no runtime, server or gameplay files written.')
