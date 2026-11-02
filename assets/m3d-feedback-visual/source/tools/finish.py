"""Finalize isolated handoff metadata/previews; never modifies approved or production files."""
from pathlib import Path
import json,hashlib,csv,math,subprocess
from PIL import Image,ImageDraw,ImageFont
import numpy as np
ROOT=Path(__file__).resolve().parents[4];BASE=ROOT/'assets/m3d-feedback-visual';PRE=BASE/'previews';SRC=BASE/'source'
def read(p):return json.loads(p.read_text(encoding='utf-8-sig'))
def save(p,j):p.write_text(json.dumps(j,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def rel(p):return p.relative_to(ROOT).as_posix()
if (BASE/'director_approval_r2.json').exists():
 approval=read(BASE/'director_approval_r2.json');lock=read(BASE/'approved_visual_r2.lock.json')
 assert approval['visualApproved'] and approval['lockSha256']==sha(BASE/'approved_visual_r2.lock.json')
 for p,h in lock['files'].items():assert sha(ROOT/p)==h,p
 summary=read(PRE/'handoff_summary.json');summary.update({'status':'visual-approved','directorApproved':True,'visualApproved':True,'approvalScope':'Selected r2 visual/choreography only; tag/frame selection in approval lock','approvalRecord':'assets/m3d-feedback-visual/director_approval_r2.json','productionIntegrated':False,'phaserProductionVerified':False,'runtimeDirectorApproved':False})
 save(PRE/'handoff_summary.json',summary)
 files=[]
 for p in sorted(BASE.rglob('*')):
  if p.is_file() and p.name!='file_inventory.json' and '__pycache__' not in p.parts:files.append({'path':rel(p),'bytes':p.stat().st_size,'sha256':sha(p),'status':'visual-approved-selected' if rel(p) in lock['files'] else 'historical-or-support'})
 save(BASE/'file_inventory.json',{'excludesSelf':True,'files':files,'totalBytes':sum(f['bytes'] for f in files)})
 print(json.dumps(summary));raise SystemExit(0)
m=read(BASE/'manifest.json');browser=read(PRE/'browser_validation.json')
assert browser['status']=='PASS' and not browser['errors']
records=read(SRC/'generation_records.json');plan=read(SRC/'plan.json')
# Verify existing approval locks without changing any of them.
locks=[];protected=0
for p in sorted((ROOT/'assets').glob('approved*.lock.json')):
 j=read(p);files=j.get('files',{})
 if not isinstance(files,dict):continue
 problems=[]
 for f,h in files.items():
  if not isinstance(h,str) or len(h)!=64:continue
  q=ROOT/f;protected+=1
  if not q.exists() or sha(q)!=h:problems.append(f)
 locks.append({'path':rel(p),'sha256':sha(p),'checkedFiles':len(files),'mismatches':problems})
assert not [x for x in locks if x['mismatches']],locks
save(PRE/'protected_assets_validation.json',{'status':'PASS','checks':protected,'locks':locks,'approvedBytesModified':False})
source_records=[]
for r in records:
 refs=r.get('refs',r.get('references',[]))
 source_records.append({**r,'status':'draft','sha256':sha(BASE/r['source']),'references':[{'path':p,'sha256':sha(ROOT/p)} for p in refs]})
save(BASE/'provenance.json',{
 'createdOn':'2026-11-01','tool':'OpenAI built-in image_gen.imagegen; exact model version not supplied by tool',
 'sourceMethod':'New AI-assisted raster pose/effect sources; original raw PNGs retained. Concept images used for identity/style direction only, not cut into atlases.',
 'licenseDeclaration':'Generated for this project; no external sprite pack or third-party asset license introduced. No CC0, exclusive copyright, human hand-pixelled authorship, or independent legal rights clearance is asserted.',
 'referencesRights':'Existing director/project references are direction inputs; their external ownership is not independently established. Existing approved project palettes retained.',
 'exportMethod':'Retained M3C3 connected-raster measurement and Aseprite 1.3 RGBA cel/tag/pivot export, adapted only inside this output directory. Alpha>=220 masks, nearest-neighbor downsampling, fixed per-strip scale. New school character cels map to a 192-color palette measured from approved baseline. Editable sources contain flattened raster cels; no recovered original layers claimed.',
 'directionDerivation':'Shaolin left-facing combo mirrors the new right poses and swaps fist semantics; vertical opposite fists use mirrored new left-fist strip. Tam Gioi left mirrors the actual right-facing source row; mislabeled source row excluded. Directional VFX rotate original raster around fixed origin with 0.55/0.65/0.70 projection factors recorded per selection. Ground eruptions/burn ovals and overhead gather stay upright; only placement follows facing.',
 'statuses':{'generatedSources':'draft','exports':'preview-validated','directorApproved':False,'productionIntegrated':False,'phaserProductionVerified':False},
 'sourceRecords':source_records,
 'previewPerformance':{'page':'performance.html','plans':'performance-plans.js','retainedActorSupport':'previews/support/manifest.json','validation':'previews/performance_validation.json','newArtworkGenerated':True,'newRasterSource':'source/generated/liet_phong_ground_r2.png','productionIntegrated':False},
 'feedbackRevision':{'revision':2,'date':'2026-11-02','contract':'feedback-r2-handoff.json','tuning':'feedback-r2.js','waveRevision':'m3d_vo_dang_sonic_vfx_r2','newGroundImpact':'m3d_liet_phong_ground_vfx_r2','approval':'pending'},
 'rejectedOrUnused':{
 'bamboo_swordsman_clarity':'Retained original; selected alpha revision is bamboo_swordsman_alpha. Soft semitransparent background remnants are excluded by whole-cluster alpha mask.',
 'emptySourceCells':'source/omitted_source_cells.json','emptyAfterDownsample':'source/removed_export_frames.json'},
 'protectedApprovalChecks':'previews/protected_assets_validation.json'})
font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',13);small=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',11)
overview=Image.new('RGB',(1120,44+math.ceil(len(m['components'])/4)*192),(23,28,33));draw=ImageDraw.Draw(overview)
draw.text((12,10),'M3D / EXACT EXPORT PIXELS AT 1x / INDEPENDENT PREVIEW / PENDING DIRECTOR',font=font,fill='#ead5a8')
rows=[];seams=[];palettes=[]
for k,c in enumerate(m['components']):
 folder=BASE/'exported'/c['id'];allnames=[];opaque_bounds=[]
 for a in c['animations']:
  a['suggestedFps']=a['frameRate'];allnames.extend(a['frames'])
  arrays=[]
  for i,n in enumerate(a['frames']):
   f=folder/'frames'/(n+'.png');im=Image.open(f).convert('RGBA');arr=np.asarray(im);assert set(np.unique(arr[:,:,3]))<={0,255}
   bbox=im.getbbox();assert bbox;opaque_bounds.append(bbox);arrays.append(arr)
   rows.append([c['id'],a['name'],i,n,a['direction'],a['phase'],a['frameDurationsMs'][i],a['loop'],*c['canvas'],*c['pivot'],str(bbox),sha(f)])
  if a['loop']:
   # Numeric seam is advisory; actual two-cycle playback is separately observed.
   pairs=list(zip(arrays,arrays[1:]+arrays[:1]))
   changed=[int(np.any(x!=y,axis=2).sum()) for x,y in pairs]
   seams.append({'id':c['id'],'clip':a['name'],'frameCount':len(arrays),'lastToFirstChangedPixels':changed[-1],'largestAdjacentChangedPixels':max(changed),'playbackObservedCycles':2,'staticHold':len(arrays)==1})
  assert a['frames'] and len(a['frames'])==len(a['frameDurationsMs'])
 c['status']='preview-validated';c['directorApproved']=False;c['productionIntegrated']=False;c['phaserProductionVerified']=False
 c['opaqueWorldBoundsUnion']=[min(b[0] for b in opaque_bounds)-c['pivot'][0],min(b[1] for b in opaque_bounds)-c['pivot'][1],max(b[2] for b in opaque_bounds)-c['pivot'][0],max(b[3] for b in opaque_bounds)-c['pivot'][1]]
 if c.get('paletteReference'):
  allowed={tuple(x) for x in c['palette']};count=0
  for n in allnames:
   arr=np.asarray(Image.open(folder/'frames'/(n+'.png')).convert('RGBA'));colors={tuple(x) for x in arr[:,:,:3][arr[:,:,3]>0]};assert colors<=allowed;count+=len(colors)
  palettes.append({'id':c['id'],'allFrameColorsInApprovedDerivedPalette':True,'paletteReference':c['paletteReference']})
 save(folder/(c['id']+'.animations.json'),c)
 candidates=[a for a in c['animations'] if a['direction'] in ['right','nondirectional']]
 a=next((a for a in candidates if 'roundhouse' in a['name'] or 'dragon_loop' in a['name'] or 'flight_loop' in a['name'] or a['name']=='burn_loop'),candidates[0])
 im=Image.open(folder/'frames'/(a['frames'][min(2,len(a['frames'])-1)]+'.png')).convert('RGBA');box=im.getbbox();cel=im.crop(box)
 x=(k%4)*280;y=44+(k//4)*192
 draw.text((x+8,y+4),c['id'].replace('m3d_','')[:34],font=small,fill='#e3cc9a')
 draw.text((x+8,y+22),a['name'][:36],font=small,fill='#9fb2b7')
 overview.paste(cel,(x+140-cel.width//2,y+104-cel.height//2),cel)
 draw.text((x+8,y+168),str(len(allnames))+' frame refs / '+str(len(c['animations']))+' clips / 1x',font=small,fill='#9fb2b7')
overview.save(PRE/'overview_1x.png')
overview.resize((2240,overview.height*2),Image.Resampling.NEAREST).save(PRE/'overview_2x.png')
save(PRE/'loop_seams.json',{'scope':'Numeric last/first comparison plus real independent two-cycle browser playback; not Phaser/director approval','seams':seams,'paletteChecks':palettes})
with (BASE/'frame_inventory.csv').open('w',encoding='utf-8-sig',newline='') as f:
 w=csv.writer(f);w.writerow(['component','clip','index','frame','facing','phase','suggested_ms','loop','canvas_w','canvas_h','pivot_x','pivot_y','opaque_bbox','png_sha256']);w.writerows(rows)
m['status']='preview-validated';m['recordingsCreated']=False;m['frameReferences']=len(rows);m['clips']=sum(len(c['animations']) for c in m['components']);save(BASE/'manifest.json',m)
save(PRE/'handoff_summary.json',{'components':len(m['components']),'frameReferences':len(rows),'clips':m['clips'],'generatedSourcePngs':len(records),'editableAsepriteSources':len(list(SRC.glob('*.aseprite'))),'protectedFilesChecked':protected,'browserFrames':browser['atlasFrameReferences'],'browserClips':browser['clipsPlayed'],'status':'preview-validated','directorApproved':False,'productionIntegrated':False,'phaserProductionVerified':False,'recordingsCreated':False})
files=[]
for p in sorted(BASE.rglob('*')):
 if p.is_file() and p.name!='file_inventory.json' and '__pycache__' not in p.parts:files.append({'path':rel(p),'bytes':p.stat().st_size,'sha256':sha(p),'status':'draft' if '/source/generated/' in p.as_posix() else 'preview-validated'})
save(BASE/'file_inventory.json',{'excludesSelf':True,'files':files,'totalBytes':sum(f['bytes'] for f in files)})
print(json.dumps(read(PRE/'handoff_summary.json')))
