"""Provenance, native contacts and handoff. No generation, no recording, no runtime writes."""
from pathlib import Path
import json,hashlib,importlib.util,sys,csv
sys.dont_write_bytecode=True
ROOT=Path(__file__).resolve().parents[5];BASE=ROOT/'assets/m3d-feedback-review-r3/batch03-remaining'
def read(p):return json.loads(p.read_text('utf-8'))
def save(p,v):p.write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n','utf-8')
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def rel(p):return p.relative_to(ROOT).as_posix()
spec=importlib.util.spec_from_file_location('batch_builder',BASE/'source/tools/build.py');b=importlib.util.module_from_spec(spec);spec.loader.exec_module(b);protected=b.protected()
m=read(BASE/'manifest.json');b.validate(m['components'])
spec=importlib.util.spec_from_file_location('retained_contact_exporter',ROOT/'assets/m3d-feedback-visual/source/tools/build.py');c=importlib.util.module_from_spec(spec);spec.loader.exec_module(c);c.PRE=BASE/'previews'
for asset in m['components']:
    if asset.get('sourceFile'):c.contact(dict(asset,clips=asset['animations']),BASE/'exported'/asset['id'])
records=read(BASE/'source/generation_records.json')['records']
for r in records:r['sha256']=sha(ROOT/r['workspaceSource'])
save(BASE/'provenance.json',dict(status='candidate-awaiting-director-review',directorApproved=False,productionIntegrated=False,phaserProductionVerified=False,
    review4=dict(newRasterGeneration=False,renderCorrections='source/review4-render-corrections.json',history='history/review3/'),
    creationTool='OpenAI built-in image_gen, one request per distinct ability/effect source or arena concept; exact prompts retained',
    license='Original project-generated candidates, no external pack or exclusive copyright assertion. Retained assets inherit repository provenance/approval.',
    records=records,generationRequests=len(records),generationElapsedMs=sum(r['elapsedMs'] for r in records),
    processing='Retained adaptive alpha gutters + connected-stroke ownership, fixed component/source scale, nearest raster placement, Aseprite1.3.18.6 source/PNG/JSON export. Flattened editable raster cels, no recovered source layers claim.',
    retainedCopies='support-copy-manifest.json (byte-for-byte PNG/JSON copies)',
    newSources=[a['sourceFile'] for a in m['components'] if a.get('sourceFile')],
    references=[dict(path=p,sha256=sha(ROOT/p)) for p in ['assets/concepts/heroes/thieu-lam/thieu-lam-concept-v02.png','assets/references/in_game_world_reference.png','assets/concepts/arenas/co-mo-phai/arena_empty_review_v02.png','assets/concepts/arenas/mongolian-headquarters/arena_overview.png','assets/source/bosses/kim_luan_phap_vuong_v01/generated/tuong_duong_terrain.png','assets/source/bosses/kim_luan_phap_vuong_v01/generated/kim_luan_base.png']],
    protectedInputs='previews/protected-before.json + protected-after.json',
    superseded='No old Ca Diep sweep-lunge, PG spin, large decorative YinYang or baseline-only clips selected for new review.',
    excludedCels=[dict(asset='r3_sky_palm',frame='outro_billboard_0',reason='Near-empty opaque crop; excluded from selected clips, use renderer fade'),dict(asset='r3_buddha',tags=['intro_billboard','outro_billboard'],reason='Soft alpha reveals partial statue at opaque export threshold; selected loop art uses separate fade instead')]))
with (BASE/'frame_inventory.csv').open('w',encoding='utf-8',newline='') as f:
    w=csv.writer(f);w.writerow(['component','tag','facing','phase','frame','index','duration_ms','pivot_x','pivot_y','canvas_w','canvas_h'])
    for a in m['components']:
        for cl in a['animations']:
            if cl['name'] not in m['selectedTags'].get(a['id'],[]):continue
            for i,(n,ms) in enumerate(zip(cl['frames'],cl['frameDurationsMs'])):w.writerow([a['id'],cl['name'],cl.get('facing'),cl.get('phase'),n,i,ms,*a['pivot'],*a['canvas']])
inventory=read(ROOT/'assets/m3d-feedback-review-r3/review-inventory.json')
ids={s['id'] for s in read(BASE/'selected-tags.json')['scenes']}
scope_overrides={
 'liet_phong_dao':'Overhead hilt and runtime ground-break retained; horizontal mirror gives left slash edge-down/spine-up',
 'thien_ha_vo_cau':'Restore four runtime fire dogs, enlarge whirl AOE, +30% duration, final-smash ground contact aligned to feet',
 'vo_anh_cuoc':'Torso-centred three staggered parallel upper/middle/lower foot lanes, staircase presentation',
 'tru_ta':'One attached enlarged draw-and-slash, no traveling crescent/projectile',
 'kim_quang_ho_tran':'Accepted VFX style retained; centre hero inside aura with actual atlas feet pivot and shared owner motion',
 'ly_mac_sau_normal':'Torso-centred longer poison needle and +20% whisk360 AOE; final tuning pending',
 'hong_liet_a1_a2':'A1 five single blades share boss torso origin; A2 front180 melee sweep, not flying arc',
 'tuy_tien_bo':'Preserve current runtime spin/afterimages/ring/wind, only add player-directed palms during glide',
 'am_duong_nghich_chuyen':'Keep runtime ground ring/waves, move centres freely without fixed grid, remove only hazy large_formation core',
 'kim_luan_normal':'Fast circular wheel and new crescent both emitted from boss torso centre'
}
for item in inventory['items']:
    if item['id'] in ids:item.update(status='candidate-ready-for-director-review',package='batch03-remaining',directorApproved=False,manifest='batch03-remaining/manifest.json',selectedTags='batch03-remaining/selected-tags.json')
    if item['id'] in scope_overrides:item.update(scope=scope_overrides[item['id']],revision='review4')

    if item['id']=='phat_tran_cong':item.update(status='withdrawn-keep-current-game',scope='Keep current Phat Tran Cong, no animation/asset change in this review',directorApproved=False,revision='review4',reason='Director withdrew Phat Tran animation changes; no change in this review')
inventory['revision']=m['revision'];save(ROOT/'assets/m3d-feedback-review-r3/review-inventory.json',inventory)
save(BASE/'handoff.json',dict(revision=m['revision'],status='candidate-ready-for-director-review',directorApproved=False,productionIntegrated=False,phaserProductionVerified=False,
    viewer='http://127.0.0.1:5513/assets/m3d-feedback-review-r3/batch03-remaining/',items=sorted(ids),
    selectedTags='selected-tags.json',atlasRegistry='manifest.json',frames='frame_inventory.csv',provenance='provenance.json',
    body=dict(nativeSchoolHeight=44,nativeBossHeight='56-60',newKimChopHeight=60,newKimChopPivot=[80,128],newKimChopPhases=['anticipation','raise','chop','recovery'],newKimSourceRowOrder=['up','right','down','left'],newKimFourFacings=True,retainedKimHoacDatActions='DOWN only; four-facing idle/walk. Do not claim new authored other-facing action poses.'),
    review4Corrections='source/review4-render-corrections.json',withdrawn=['phat_tran_cong'],history='history/review3/',
    pivots='Exact canvas/pivot per component in manifest; never fit bodies by entire atlas/canvas. New body feet measured from dark boots; fixed scale60 from neutral. VFX anchor separate from feet, placement/travel in recipe.',
    phases='Per-scene actor/effect start/end/layer/coordinates in selected-tags.json are presentation fixtures only. Projectile travel, orbit and ground persistence are separate from atlas frame playback.',
    layers=dict(ground='Fixed world field; Sanskrit under caster remains at cast location. Impacts independent.',ownerAura='Kim Quang Ho Tran tracks moving caster feet, open center, behind body.',billboard='Buddha, lion head, true circular wheel not squashed as ground-plane ellipse.',stun='Existing approved Ca Diep status layer stays separate.'),
    confirmedContracts=['Ca Diep: every eligible target on path receives damage+stun; mound continues after first target','Toan Phong: straight gold tornado, pierces, one hit per target per cast','Sanskrit: damage on entry, not standing tick; retrigger policy pending','One A one cast; Shaolin four A presses one beat each; finisher single crescent','Minions4/6/8 all fire ranged shots','Seven independent wheels for Truy Hon and Ho The','Bat Dong: off/on only, no transfer beam','YinYang: retain runtime ground ring/waves with moving centres, no fixed grid; remove only large_formation core','Tru Ta one attached melee slash, no projectile','Vo Anh three staggered parallel lanes from body centre','HHL A2 front180 melee sweep, no flying arc','Tuy Tien Bo original runtime spin body plus aimed palms only'],
    previewDefaults=dict(voCauLoop='Total2500 to3250ms +30%; whirl1600 to2080ms +30%; all presentation phases stretched1.3',voCauFinalScale=1.45,viDaOffset='70 to105px +50%',voAnh='3 parallel lanes, centre at torso, releases200/510/820ms and spacing18px are preview defaults',truTa='attached slash scale2.4; no projectile; final reach pending',phatTran='withdrawn by director; keep current game',hhlA1='fixture170 to204px +20%, 5 single blades; game source600 implies requested720 after implementation',hhlA2='A Thien Son Phien220 from packages/game-data/src/thien-son.ts; requested+10%=242 demo',lmsNeedle='demo400 > A Cai Bang Chuong320 and A Thien Son Phien220; exact LMS finalrange still pending',arenaFootprint='width and height x0.8, area x0.64 overlay; no camera/sprite shrink'),
    pendingStats=['damage','stun duration','exact rework range/width/speed/cooldown','Ca Diep repeated hits vs same target policy','Sanskrit re-entry retrigger policy','AI cadence and movement tuning'],
    cleanup=['cancel','death','zone','facing-change','selection-change','complete'],
    productionNext='After scoped director approval create new lock revision, bind to real approved tech action/state/events. No animation-derived damage, range, cooldown, teleport or target tracking. Run live Phaser normal zoom plus multiplayer and final checks then.',
    backgrounds='Three original flattened arena CONCEPT PNGs, not production Tiled/collision maps. Chu Ba Thong retained unchanged. Review order LMS/HHL/CBT/Kim.',
    deferredGameplay=['Shift8s/charge','Wudang A/swordqi knockback10%','90% of buffed entry movement speed for creeps; one sprite type/wave','Creep private, boss shared; invitation30s only outsiders','All connected players same boss pauses exterior wave AND clock; refusal/exit resumes occupancy rule','Reconnect main arena','One boss revival/player/attempt; only boss reset refills, never exit/reentry/reconnect; second death gray spectator and arrow camera','O skills/P dungeon/ESC modal-first then quit; remove party button; boss I popup'],
    noMerge='Do not merge milestone/m3d; canonical spec/memory updates only after actual merge and implemented rules'))
files=[dict(path=rel(p),bytes=p.stat().st_size,sha256=sha(p)) for p in sorted(BASE.rglob('*')) if p.is_file() and p!=BASE/'file_inventory.json']
save(BASE/'file_inventory.json',dict(files=files,scope='All batch03 files except inventory itself'))
print(json.dumps(dict(status='PASS',items=len(ids),newSources=len(records),packageFiles=len(files),protectedFiles=sum(x['files'] for x in protected['records']))))
