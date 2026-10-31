from pathlib import Path
import json,hashlib,re,os,html
ROOT=Path(__file__).resolve().parents[4]
SOURCE=ROOT/'assets/source/skills/thien-son'
EXPORT=ROOT/'assets/exports/skills/thien-son'
REVIEW=ROOT/'assets/reviews/skills/thien-son'
CONCEPT=ROOT/'assets/concepts/skills/thien-son'
def read(p):return json.loads(p.read_text(encoding='utf-8-sig'))
def write(p,obj):p.write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def relative(path):return os.path.relpath(ROOT/path,REVIEW).replace('\\','/')
m=read(EXPORT/'production_manifest_v01.json');v=read(EXPORT/'validation_v01.json')
frames=read(REVIEW/'phaser_frames_v01.json');composition=read(REVIEW/'phaser_composition_v01.json')
authority=read(REVIEW/'preview_authority_guard_v01.json');facings=read(REVIEW/'all_facings/verification_v01.json')
assert all(d['status']=='PASS' for d in [v,frames,composition,authority,facings])
assert len(frames['observations'])==146 and len(facings['snapshots'])==10
assert authority['gameWebsockets']==[]
full=read(REVIEW/'verification_runs/final_pipeline_v01/playwright_results_v01.json')
retry=read(REVIEW/'playwright_results_v01.json')
assert full['stats']['expected']==4 and full['stats']['unexpected']==1
assert retry['stats']['expected']>=1 and retry['stats']['unexpected']==0
log=(REVIEW/'final_check_v01.txt').read_text(encoding='utf-8-sig')
clean=re.sub(r'\x1b\[[0-9;]*m','',log)
unit=int(re.search(r'Tests\s+(\d+) passed',clean).group(1))
report={'status':'PASS_after_focused_fixture_rerun','scope':'Skill art, actual exports and actual Phaser preview; gameplay implementation remains pending',
'commands':[
{'command':'node assets/source/skills/thien-son/build_v01.mjs --assemble','result':'PASS: 20 components, 146 tags, 534 cels, 13 icons; original approved art guarded'},
{'command':'node assets/source/skills/thien-son/build_icons_v01.mjs','result':'PASS: 13 icon PNGs, editable sources, family PNG/hash-JSON atlas'},
{'command':'python -X utf8 assets/source/skills/thien-son/validate_v01.py','result':'PASS: source/atlas equality, binary transparency, distinct frames, bounds, pivots, timing and 17 approved reused cels'},
{'command':'pnpm check:final --config playwright.thien-son-skills.config.ts tests/e2e/thien-son-skills.spec.ts tests/e2e/gameplay.spec.ts --grep "Thiên Sơn skill art|two clients agree|ranged projectile"','result':'Typechecks, 2 workflow tests, '+str(unit)+' unit/integration tests, build and all asset validators PASS; 4 of 5 browser scenarios PASS. Legacy two-client fixture failed because its Q/W slots were empty under the normal M3B fixture. Failed run retained.'},
{'command':'pnpm exec tsc -p tsconfig.tools.json --noEmit','result':'PASS after browser-fixture correction'},
{'command':'node tools/run-playwright.mjs test --config playwright.thien-son-skills.config.ts tests/e2e/gameplay.spec.ts --grep "two clients agree"','result':'PASS: 1 scenario after matching the existing development legacy-loadout fixture. Final dedicated ports: client5196, server2596. One intermediate setup attempt used a port occupied by another task and ran no tests; that service was not borrowed or stopped.'},
{'command':'node assets/source/skills/thien-son/verify_all_facings_v01.mjs','result':'PASS: ten active skills composed in all four facings, offsets/depth/recovery/cleanup, plus light/dark QA PNGs; no room connection.'},
{'command':'node assets/source/skills/thien-son/make_overview_v01.mjs','result':'PASS: contact overview from actual PNG screenshots at native display scale; not a recording'}],
'unitIntegrationTestsPassed':unit,'workflowTestsPassed':2,'uniqueBrowserScenariosPassed':5,
'phaserVersion':frames['phaser'],'animationTagsObserved':146,'exportedCels':534,'iconsAtActualHudCssSize':64,
'fourFacingComposedActiveSkills':10,'protectedAndConceptFilesUnchanged':v['protectedAndConceptFilesUnchanged'],
'knownWarnings':['Existing large client bundle warning; build passed.'],
'limitations':['Visual assets verified in preview; gameplay implementation pending.','Six-actor render is a presentation readability check, not a six-client multiplayer or performance benchmark.','Authoritative Thiên Sơn skills, passive bonuses, costs, cooldowns, hitboxes and loadout integration were not implemented or combat-tested.','New production art remains prototype pending explicit final director approval.'],
'recordingsGenerated':False}
write(REVIEW/'verification_report_v01.json',report)
assets={a['id']:a for a in m['assets']};coverage=[]
approval=read(CONCEPT/'concept_approval_v01.json');approved={e['id']:e for e in approval['entries']}
concepts=read(CONCEPT/'concept_manifest_v01.json')
for info in m['skills']:
 id=info['id'];ca=approved[id]
 assert sha(ROOT/ca['conceptPath'])==ca['conceptSha256']
 assert sha(ROOT/ca['iconConceptPath'])==ca['iconConceptSha256']
 if info['kind']=='active':
  a=assets[id+'_character'];e=assets[id+'_vfx']
  character={'kind':'new_skill_specific','sheet':a['sheet'],'atlas':a['atlas'],'metadata':'assets/exports/skills/thien-son/'+id+'/'+id+'_character.animations.json','source':a['source'],'newPoseCels':15 if id=='liet_phong_dao' else 16,'approvedReuseCels':1 if id=='liet_phong_dao' else 16 if id=='phong_anh_hoan_vi' else 0,'frameCanvas':a['frameDimensions'],'footPivot':a['pivot'],'logicalScale':'Approximately44px body; horizontal canvas padding only; origin0.5,0.8 and feetY64'}
  vfx={'sheet':e['sheet'],'atlas':e['atlas'],'metadata':'assets/exports/skills/thien-son/'+id+'/'+id+'_vfx.animations.json','source':e['source']}
  if id=='phong_anh_hoan_vi':vfx['conditionalCounterReuse']='assets/exports/skills/thien-son/phi_anh_tram/phi_anh_tram_vfx.animations.json : slash_{direction}'
 elif info['kind']=='normal':
  actor='hero_thien_son'+('_dao' if info['style']=='dao' else '')
  character={'kind':'reused_approved_basic_attack','atlas':'assets/exports/characters/'+actor+'.json','sheet':'assets/exports/characters/'+actor+'.png','tags':'basic_attack_{direction}','approvedPixelsUnchanged':True}
  vfx={'notApplicable':'No new normal-attack VFX requested; approved basic clip reused.'}
 else:
  character={'notApplicable':'Icon only. Approved fan idle in preview is context, not a passive animation.'}
  vfx={'notApplicable':'No persistent aura requested or produced.'}
 coverage.append({'id':id,'nameVi':info['nameVi'],'approvedConceptPath':ca['conceptPath'],'approvedIconConceptPath':ca['iconConceptPath'],'conceptApproved':True,'characterAnimation':character,'vfx':vfx,'iconPath':info['icon'],'exportValidation':'PASS','phaserVisualVerification':'PASS_in_presentation_only_preview','gameplayIntegration':'pending; Thiên Sơn progression metadata is prepared/implemented:false, no combat or loadout changes in this task','finalArtApproval':'pending_explicit_user_approval','screenshot':'assets/reviews/skills/thien-son/'+id+'_combined_v01.png'})
for a in m['assets']:
 a['previewIntegrated']=True;a['visualPreviewVerified']=True;a['productionArtApproved']=False
 a['gameplayIntegration']='pending; no authoritative implementation added'
 a['previewVerification']='assets/reviews/skills/thien-son/verification_report_v01.json'
 write(EXPORT/a['skillId']/(a['id']+'.animations.json'),a)
m['previewIntegrated']=True;m['visualPreviewVerified']=True
m['verificationReport']='assets/reviews/skills/thien-son/verification_report_v01.json'
m['coverageManifest']='assets/exports/skills/thien-son/coverage_manifest_v01.json'
m['authorshipCounts']={'newCharacterPoseCels':159,'newWindSourceCels':100,'approvedCharacterCelReuse':17,'withinSkillCharacterSemanticReuseCels':48,'cardinalWindVariantsBeyondSourceCels':192,'windExpiryReuseCels':18,'exportedCelsTotal':534,'iconsFromApprovedConceptArt':13}
m['gameplayIntegration']='pending; preview only; existing controls and authority unchanged'
write(EXPORT/'production_manifest_v01.json',m)
write(EXPORT/'coverage_manifest_v01.json',{'schemaVersion':1,'status':'prototype_pending_final_art_approval','entries':coverage})
for icon in m['icons']:
 icon['visualPreviewVerified']=True;icon['productionArtApproved']=False
 write(EXPORT/icon['id']/'icon.provenance.json',icon)
icons=read(EXPORT/'icons_manifest_v01.json');icons['icons']=m['icons'];icons['visualPreviewVerified']=True;write(EXPORT/'icons_manifest_v01.json',icons)
write(EXPORT/'production_manifest_v01.json',m)
used={f['file'] for a in read(SOURCE/'recipe_v01.json')['assets'] for t in a['animations'] for f in t['frames']}
records=[]
for p in sorted((SOURCE/'generated').glob('*.generation.json')):
 record=read(p);record['usedByExports']=record['file'] in used
 record['status']='selected_source_for_prototype_exports' if record['usedByExports'] else 'retained_superseded_source_draft'
 write(p,record);records.append(record)
write(SOURCE/'generation_prompts_v01.json',{'schemaVersion':1,'tool':'OpenAI built-in image_gen.imagegen','records':records})
for e in concepts['entries']:
 e['productionStatus']='produced_prototype_pending_final_art_approval'
 e['phaserVisualVerification']='PASS_in_presentation_only_preview'
 e['gameplayIntegration']='pending; no gameplay implementation in this task'
 e['finalArtApproval']='pending_explicit_user_approval'
concepts['status']='concepts_approved_production_verified_final_art_pending'
concepts['productionManifest']='assets/exports/skills/thien-son/production_manifest_v01.json'
write(CONCEPT/'concept_manifest_v01.json',concepts)
rows=[]
for e in coverage:
 id=e['id'];char=e['characterAnimation']
 c='New16 poses'
 if id=='liet_phong_dao':c='New15 +1 approved windup'
 if id=='phong_anh_hoan_vi':c='New16 step/guard +16 approved counter cels'
 if char.get('kind')=='reused_approved_basic_attack':c='Approved basic clip reused'
 if 'notApplicable' in char:c='Not applicable; context idle only'
 cp=char.get('metadata',char.get('atlas'));ct='['+c+']('+relative(cp)+')' if cp else c
 vp=e['vfx'].get('metadata');vt='[Wind stages]('+relative(vp)+')' if vp else 'Not applicable'
 if id=='phong_anh_hoan_vi':vt+=' + shared close slash'
 rows.append('| '+id+' — '+e['nameVi']+' | [Concept]('+relative(e['approvedConceptPath'])+') / [icon concept]('+relative(e['approvedIconConceptPath'])+') | '+ct+' | '+vt+' | [64px PNG]('+relative(e['iconPath'])+') | PASS / PASS preview | Pending | Pending |')
readme=['# Thiên Sơn skill art v01','','**All concepts approved. Production assets are prototypes awaiting explicit final art approval.**','','[Open the live art-only preview](http://127.0.0.1:5194/?artPreview=1&thienSonSkills=1) · [Visual review index](index.html) · [Coverage JSON](../../../exports/skills/thien-son/coverage_manifest_v01.json) · [Verification](verification_report_v01.json)','','![Native-scale screenshot contact overview](skill_preview_overview_v01.png)','','The overview composes cropped actual Phaser screenshots without rescaling. Camera zoom1, normal display scale2; approximately44px logical body and64 CSS-pixel icons. All ten active skills were also composed in all four facings under [all_facings/](all_facings/verification_v01.json).','','| Stable ID / Vietnamese name | Approved concepts | Character animation | VFX | Icon | Export / Phaser | Gameplay | Final art approval |','|---|---|---|---|---|---|---|---|']+rows+['','Visual assets verified in preview; gameplay implementation pending. No damage, cooldown, costs, hitboxes, movement rules, status effects, loadouts or authoritative simulation were added or changed. The13-icon strip is an asset review palette, not a new combat hotbar. Six displayed actors are presentation replicas, not a six-client benchmark.','','Twenty character/VFX components provide146 tags and534 exported cels. This includes159 new character pose cels,100 new Wind source cels,17 reused approved character cels,48 within-skill semantic character reuses,192 exact cardinal Wind variants and18 expiry-stage reuses. All13 production icons derive from the explicitly approved icon art with4-to-1 Aseprite nearest reduction; no new icon motifs were invented.','','Character bodies retain approximately44px height, feetY64 and origin(0.5,0.8). Canvases are80–128px wide by80px high for transparent cloth/blade clearance. VFX use96/128/160px canvases and recorded relative origins/offsets. The fixed overworld view and world foot point are unchanged. Wrapping rings/helix render a rear upper half and foreground lower half so faces remain clear.','','Normal fan/đao clips remain the approved files. Liệt Phong Đao reuses one approved down-facing windup instead of the cropped draft blade. Phong Ảnh Hoán Vị reuses the approved four-facing dao attack for the conditional counter and Phi Ảnh Trảm’s local slash Wind. Counter and expiry are separate preview branches; the passive has no aura.','','Actual final verification: typechecks,2 workflow tests,'+str(unit)+' unit/integration tests, build, all asset validators and five unique browser scenarios passed across the full pipeline and focused fixture rerun. The full pipeline first ended with4/5 browser cases passing: the existing two-client test required the existing legacy Q/W development fixture. Correcting only those test flags made its focused rerun pass. An intermediate retry encountered another task’s frontend port; it was not borrowed or stopped, and the dedicated test frontend moved to5196. All test flags are process-local and restored. See verification_report_v01.json, final_check_v01.txt and multiplayer_fixture_retry_v02.txt.','','The initial toolbar screenshots and first authority-check failure are preserved under iterations/initial_toolbar_v01/. That guard initially counted Vite’s development socket; endpoint diagnostics now distinguish it from game transport. No game connection, room or gameplay events occurred in the art route. No video, GIF or trace recording was generated.','','The locked approved Thiên Sơn character and all213 snapshotted protected/concept files remain hash-identical. Production art is not locked or approved by automated validation. Awaiting explicit final approval per entry.']
(REVIEW/'README.md').write_text('\n'.join(readme)+'\n',encoding='utf-8')
style='body{margin:0;background:#142e32;color:#eee9d6;font:16px/1.5 system-ui}main{max-width:1280px;margin:auto;padding:24px}a{color:#a5d9c3}img{max-width:100%;image-rendering:pixelated}section{padding:24px 0;border-top:1px solid #77998b}.icon{width:64px;height:64px}.pending{color:#e7c58b}code{font-size:13px}.links{display:flex;gap:16px;flex-wrap:wrap}'
out=['<!doctype html><html lang="vi"><meta charset="utf-8"><title>Thiên Sơn skill art review v01</title><style>'+style+'</style><main><h1>Thiên Sơn skill art v01</h1><p class="pending">Concepts approved · Production prototype · Final art approval pending</p><p>Visual assets verified in preview; gameplay implementation pending.</p><p class="links"><a href="http://127.0.0.1:5194/?artPreview=1&thienSonSkills=1">Live Phaser art preview</a><a href="README.md">Full13-entry delivery table</a><a href="verification_report_v01.json">Commands and results</a></p><img src="skill_preview_overview_v01.png" alt="Actual Phaser screenshot contact overview">']
for e in coverage:
 out.append('<section id="'+e['id']+'"><h2>'+html.escape(e['nameVi'])+' <code>'+e['id']+'</code></h2><p class="pending">Export PASS · Phaser preview PASS · Gameplay pending · Final art approval pending</p><img class="icon" src="'+relative(e['iconPath'])+'" alt="'+html.escape(e['nameVi'])+' production icon at64px"><p class="links"><a href="'+relative(e['approvedConceptPath'])+'">Approved concept</a><a href="'+relative(e['approvedIconConceptPath'])+'">Approved icon concept</a><a href="http://127.0.0.1:5194/?artPreview=1&amp;thienSonSkills=1&amp;skill='+e['id']+'">Play this preview</a></p><img src="'+e['id']+'_combined_v01.png" alt="Actual normal-zoom Phaser '+html.escape(e['nameVi'])+' preview">')
 fp=REVIEW/'all_facings'/(e['id']+'_four_v01.png')
 if fp.exists():out.append('<p>Four facings: down · left · right · up. Native-scale screenshot crop.</p><img src="all_facings/'+fp.name+'" alt="Four facing composed preview">')
 out.append('</section>')
out.append('</main></html>');(REVIEW/'index.html').write_text(''.join(out),encoding='utf-8')
source_readme='''# Thiên Sơn skill production v01

All10 active concepts and all13 icon concepts were explicitly approved on2026-10-31. Production art remains a prototype awaiting final approval.

- [Production manifest](../../../exports/skills/thien-son/production_manifest_v01.json)
- [Complete coverage and reuse](../../../exports/skills/thien-son/coverage_manifest_v01.json)
- [Actual visual review](../../../reviews/skills/thien-son/README.md)
- [Exact generation prompts](generation_prompts_v01.json)
- [Measured extraction recipe](recipe_v01.json)

Editable per-skill sources are <id>/character/<id>_character.aseprite, <id>/vfx/<id>_vfx.aseprite and <id>/icon/icon.aseprite. Source cels are under frames/. Runtime PNG/hash-JSON atlases and semantic animation metadata are under assets/exports/skills/thien-son/<id>/. The family icon atlas has13 static64px frames.

Export retained editable sources:
    pnpm assets:export:thien-son-skills

Only when intentionally rebuilding editable cels from retained generated sources:
    python -X utf8 assets/source/skills/thien-son/prepare_recipe_v02.py
    node assets/source/skills/thien-son/build_v01.mjs --assemble
    node assets/source/skills/thien-son/build_icons_v01.mjs

Verify pixels:
    python -X utf8 assets/source/skills/thien-son/validate_v01.py

Launch the frontend-only review:
    node assets/source/skills/thien-son/serve_review_v01.mjs

Observe all composed facings and create PNG evidence:
    node assets/source/skills/thien-son/verify_all_facings_v01.mjs

The source_regions.py helper only measures connected alpha regions into extraction metadata; Aseprite performs actual raster isolation, alpha/fringe cleanup, fixed-scale shoe alignment and packing. No procedural character/VFX geometry is used. Original generated PNGs and superseded drafts are retained. Native sources are editable raster cels, not recovered original concept layers.

All timing/motion in preview_plan_v01.json is presentation-only. The common client raster registry loads metadata but never supplies combat authority. No Thiên Sơn abilities, stats, cooldowns, costs, hitboxes, statuses or loadout changes are implemented.
'''
(SOURCE/'README.md').write_text(source_readme,encoding='utf-8')
inventory=[]
for folder in [SOURCE,EXPORT]:
 for p in sorted(folder.rglob('*')):
  if p.is_file() and '__pycache__' not in p.parts and p.name!='provenance_manifest_v01.json':
   inventory.append({'path':p.relative_to(ROOT).as_posix(),'sha256':sha(p),'bytes':p.stat().st_size})
write(EXPORT/'provenance_manifest_v01.json',{'schemaVersion':1,'status':'prototype_pending_final_art_approval','conceptApproval':'assets/concepts/skills/thien-son/concept_approval_v01.json','approvedCharacterLock':'assets/approved_thien_son.lock.json','source':'OpenAI built-in image_gen.imagegen; Aseprite1.3.18.6 extraction/editable cels/exports; approved project-raster reuse explicitly recorded','generationPrompts':'assets/source/skills/thien-son/generation_prompts_v01.json','license':'Original AI-assisted project art using approved project references. No external sprite pack or exclusive-rights claim.','coverage':'assets/exports/skills/thien-son/coverage_manifest_v01.json','verification':'assets/reviews/skills/thien-son/verification_report_v01.json','files':inventory})
print(json.dumps({'status':report['status'],'entries':len(coverage),'sourceRecords':len(records),'inventoryFiles':len(inventory),'unitTests':unit,'browserScenarios':5,'allFacingSkills':10},ensure_ascii=False))

