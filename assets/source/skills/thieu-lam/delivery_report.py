from pathlib import Path
import json,hashlib
BASE=Path(__file__).resolve().parent;ROOT=BASE.parents[3];OUT=ROOT/'assets/exports/skills/thieu-lam';REVIEW=ROOT/'assets/reviews/skills/thieu-lam'
def read(p):return json.loads(p.read_text(encoding='utf-8-sig'))
def write(p,v):
 p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def rel(p):return p.relative_to(ROOT).as_posix()
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
m=read(OUT/'production_manifest_v01.json');v=read(OUT/'validation_v01.json');p=read(REVIEW/'phaser_verification_v01.json')
assert v['status']==p['status']=='PASS' and p['exportedAnimationTagsObserved']==182 and len(p['icons'])==14 and not p['errors']
prompts=[]
for path in sorted((BASE/'prompts').glob('*.json')):
 r=read(path);asset=ROOT/r['savedPath'];assert asset.exists(),asset
 r['savedFileSha256']=sha(asset);r['promptRecord']=rel(path);prompts.append(r)
assert len(prompts)==46,len(prompts)
write(BASE/'generation_prompts_v01.json',{'tool':'OpenAI built-in image_gen.imagegen','approvalGate':'approval gate waived by user','records':prompts})
coverage=[]
for e in m['entries']:
 assets=[a for a in m['assets'] if a['skillId']==e['id']];icon=next(i for i in m['icons'] if i['id']==e['id'])
 row=dict(id=e['id'],nameVi=e['nameVi'],kind=e['kind'],concept=e['concept'],editableSources=[a['source'] for a in assets]+[icon['editableSource']],atlasPNGs=[a['sheet'] for a in assets],atlasJSONs=[a['atlas'] for a in assets],animationMetadata=[a['atlas'].replace('.json','.animations.json') for a in assets],frameDirectories=[str(Path(a['sheet']).parent/a['kind']/'frames').replace('\\','/') for a in assets],icon=icon['path'],characterFrames=sum(n['frameCount'] for a in assets if a['kind']=='character' for n in a['animations']),vfxFrames=sum(n['frameCount'] for a in assets if a['kind']=='vfx' for n in a['animations']),characterDirections=['down','left','right','up'] if assets else [],characterMsPerFrame=next((a['animations'][0]['durationMsPerFrame'] for a in assets if a['kind']=='character'),None),pivots={a['kind']:a['pivot'] for a in assets},componentReuse={a['kind']:a['reuseNotes'] for a in assets},status='verified_prototype_approval_gate_waived')
 coverage.append(row);e['phaserVerification']='PASS';e['validation']='PASS'
m['verification']={'assets':'assets/exports/skills/thieu-lam/validation_v01.json','phaser':'assets/reviews/skills/thieu-lam/phaser_verification_v01.json','playwright':'assets/reviews/skills/thieu-lam/playwright_results_v01.json'}
m['verification']['fullPipelinePlaywright']='assets/reviews/skills/thieu-lam/final_pipeline_playwright_v01.json'
m['verification']['postRefinementScope']='All13 active skill animations/facings/stages/icons and normal-clip reuse rerun after ultimate presentation-only offset refinement; mechanics unchanged.'
m['verification']['approvedBasicTiming']='assets/reviews/skills/thieu-lam/approved_basic_timing_v01.json'
m['approvalWaiver']='assets/source/skills/thieu-lam/approval_waiver_v01.json'
m['provenance']['exactPrompts']='assets/source/skills/thieu-lam/generation_prompts_v01.json'
write(OUT/'production_manifest_v01.json',m)
write(OUT/'coverage_manifest_v01.json',{'approvalGate':'approval gate waived by user','entries':coverage})
concepts=[]
for e in m['entries']:
 r=next(r for r in prompts if r['savedPath']==e['concept']);concepts.append({'id':e['id'],'nameVi':e['nameVi'],'concept':e['concept'],'sha256':sha(ROOT/e['concept']),'prompt':r['promptRecord'],'status':'concept_generated_approval_gate_waived','independentlyReviewedApproval':False})
write(ROOT/'assets/concepts/skills/thieu-lam/concept_manifest_v01.json',{'approvalGate':'approval gate waived by user','records':concepts})
brief=read(BASE/'production_brief_v01.json');brief['status']='produced_and_verified_approval_gate_waived';write(BASE/'production_brief_v01.json',brief)
files={}
for folder in [ROOT/'assets/concepts/skills/thieu-lam',BASE,OUT]:
 for path in sorted(folder.rglob('*')):
  if path.is_file() and path.suffix in ['.png','.aseprite','.lua','.json','.py','.mjs','.html'] and path.name!='provenance_manifest_v01.json':files[rel(path)]=sha(path)
write(OUT/'provenance_manifest_v01.json',{'schemaVersion':1,'schoolId':'thieu_lam','approvalGate':'approval gate waived by user','independentlyReviewedApproval':False,'productionArtApproved':False,'generationCount':len(prompts),'originalGeneratedPNGs':[{'path':r['savedPath'],'sha256':r['savedFileSha256'],'prompt':r['promptRecord'],'originalFilename':r['originalGeneratedFilename']} for r in prompts],'protectedBaselineAudit':'assets/source/skills/thieu-lam/baseline_audit_v01.json','files':files,'history':'assets/reviews/skills/thieu-lam/pre_correction_v01/','officialToolDocumentation':['https://docs.phaser.io/phaser/concepts/animations','https://www.aseprite.org/docs/cli/'],'license':'Original AI-assisted project raster art. References guide identity/style; no third-party sprite pack, human hand-pixelled authorship or independently reviewed approval claimed.'})
lines=['# Thiếu Lâm skill artwork — complete batch','','**Approval gate waived by user.** New skill art remains a verified prototype; no separate director approval or new approval lock is claimed. Approved base character art and all275 protected files remain byte-identical.','','| ID / exact Vietnamese name | Character cels | VFX cels | Cast cadence |','|---|---:|---:|---|']
for r in coverage:lines.append(f"| {r['id']} — {r['nameVi']} | {r['characterFrames']} | {r['vfxFrames']} | {r['characterMsPerFrame']}ms/frame |" if r['kind']=='active' else f"| {r['id']} — {r['nameVi']} | — | — | Passive icon only |")
lines+=['',
'Every active has a versioned concept, four-facing action clip, separate VFX, icon, editable sources, transparent individual cels, PNG/hash-JSON atlases and .animations.json. Passive Dịch Cân Kinh has an icon only.',
'',
'Character:4cels per facing (down,left,right,up), one-shot360ms or440ms. Canvas128x120, feet(64,96), normalized origin(0.5,0.8), approximately44px upright body. Vô Ảnh Cước contact art has intentional2px/1px lift within the fixed world anchor. Larger transparent canvases retain body scale.',
'',
'VFX:4cels per stage,70ms/cel=280ms one-shot; loop/travel stages100ms/cel=400ms loop. Canvas128x128,192x192 or256x256 with centered sprite origins, stage offsets and drawn ground-plane anchors. Timings, radii and preview lifetimes are presentation proposals for later authoritative integration.',
'',
'Totals:26 components,182 animation tags,728 exported transparent cels;204 distinct character rasters plus4 explicitly shared support cels;520 VFX rasters including declared cardinal transforms;14 icons64x64;40 editable Aseprite sources. Four left-facing Bất Động Minh Vương support cels share the new Kim Quang Hộ Trận support clip to correct facing; its other12 cels and healing VFX remain separate. No approved normal-attack clips were regenerated.',
'',
'Complete per-skill paths and parameters: assets/exports/skills/thieu-lam/coverage_manifest_v01.json and production_manifest_v01.json. File hashes and original PNG mapping:provenance_manifest_v01.json. Exact46 generation/correction prompts:assets/source/skills/thieu-lam/generation_prompts_v01.json. Measured placements:frame_placements_v01.json. Waiver:approval_waiver_v01.json.',
'',
'For each active ID:concept assets/concepts/skills/thieu-lam/<id>/<id>_concept_v01.png; editable sources assets/source/skills/thieu-lam/<id>/{character,vfx}/<id>_{character,vfx}.aseprite and <id>/icon/icon.aseprite. Exports assets/exports/skills/thieu-lam/<id>/<id>_{character,vfx}.{png,json,animations.json}, icon.png and {character,vfx}/frames/. Original PNGs and correction versions remain in source/generated. First prototype exports/editables are preserved under assets/reviews/skills/thieu-lam/pre_correction_v01/.',
'',
'Actual Phaser verification:all182 tags and every frame advanced; all four facings composed; stable origins/world anchors; recovery to approved idle; effect cleanup; character-only,VFX-only,combined,light/dark,six simultaneous effects; approved normal clips;14 icon pairings at64/44/32px. Normal/empowered finishers were checked separately. Passive produced no world aura. PNGs/frame events/logs only, no recordings.',
'',
'Evidence:phaser_verification_v01.json, phaser_command_v01.log and playwright_results_v01.json in this folder. Each skill folder contains character,vfx,combined_down/left/right/up,light,dark,six PNGs. icons_hud_1280x720.png shows all14 icons. No screenshot alone is claimed to prove animation.',
'',
'Commands actually run:',
'',
'~~~powershell',
'python assets/source/skills/thieu-lam/prepare.py',
'node assets/source/skills/thieu-lam/build.mjs --assemble',
'python -X utf8 scripts/verify-thieu-lam-skills.py',
'node assets/source/skills/thieu-lam/smoke.mjs',
"pnpm check:final --config playwright.thieu-lam-skills.config.ts tests/e2e/thieu-lam-skills.spec.ts tests/e2e/gameplay.spec.ts --grep 'complete Thiếu Lâm|two clients agree|ranged projectile'",
'node tools/run-playwright.mjs test --config playwright.thieu-lam-skills.config.ts tests/e2e/thieu-lam-skills.spec.ts',
'node assets/source/skills/thieu-lam/verify_basics.mjs',
'~~~',
'',
'After the full pipeline, final PNG inspection prompted a presentation-only Như Lai Thiên Diệp release/travel offset and preview-arrival refinement to keep the face clear. The complete13-skill Phaser test passed its focused rerun afterward; full-pipeline results are preserved in final_pipeline_playwright_v01.json and latest focused results in playwright_results_v01.json.',
'Final results:TypeScript and test/tool typechecks PASS;2 workflow tests PASS;174 unit/integration tests PASS;production build PASS;all asset validators PASS;3 Chromium tests PASS (full skill-art preview, two-client combat/cadence/progression, fixed projectile trajectory). Final pipeline233.66s. Existing large-client-chunk warning remains. Aseprite1.3.18.6 and actual Phaser4.2.1 used.',
'',
'Corrected iteration failures:Playwright initially initialized before the repository browser-cache setting; dynamic import fixed it. Correcting the drawn ground-plane anchor initially triggered a clipping assertion; larger transparent VFX canvases resolved it. Incorrect left rows and attack-like support casts were replaced with separately preserved original correction drawings. Tiny disconnected alpha debris was removed.',
'',
'Approved normal-clip playback reads exact per-frame durations directly from the approved atlases. A final focused Phaser check verified every timing boundary, all4facings, both weapon sets, idle recovery and zero new normal-attack VFX. Evidence:approved_basic_timing_v01.json. No approved sprite bytes changed.',
'',
'Presentation-only scope:no network/simulation imports or live skill integration. Combat mechanics,balance,targeting,damage,healing,collision,RNG,server authority and combo eligibility remain unchanged. Bất Động Minh Vương follows currently documented healing art; possible mitigation redesign remains open. Empowerment is an optional same-target presentation, never an automatic global bonus. Dịch Cân Kinh has no cast/permanent aura. Existing approved idle appears between clips; no new hurt/death states requested.',
'',
'Preview:run node assets/source/skills/thieu-lam/serve.mjs 8768 then open http://127.0.0.1:8768/assets/source/skills/thieu-lam/review.html. All controls/overlays remain within one dominant game viewport.'
]
(REVIEW/'README.md').write_text('\n'.join(lines)+'\n',encoding='utf-8')
print('Recorded full batch coverage, exact prompts, original PNG hashes, source/export paths, verification and explicit approval waiver.')
