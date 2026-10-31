"""Validate isolated v2 art files and protected baseline hashes; no game build or runtime mutation."""
from pathlib import Path
import json,hashlib,struct
import numpy as np
from PIL import Image
ROOT=Path(__file__).resolve().parents[6];SRC=Path(__file__).resolve().parents[1]
OUT=ROOT/'assets/exports/skills/cai-bang/cai_bang_bong_a_m3c3_feedback_v2'
REVIEW=ROOT/'assets/reviews/skills/cai-bang-bong-combo-v2'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
report={'status':'PASS','runtimeIntegrated':False,'runtimeApproved':False,'phaserChecked':False,'gameTestsRun':False,'recordingsCreated':False,'components':{},'seams':[]}
for kind,size,pivot in [('character',[112,100],[56,80]),('vfx',[160,160],[80,80])]:
 name='cai_bang_bong_combo_v2_'+kind;png=OUT/(name+'.png');j=json.loads((OUT/(name+'.json')).read_text(encoding='utf-8'));meta=json.loads((OUT/(name+'.animations.json')).read_text(encoding='utf-8'))
 source=SRC/(name+'.aseprite');raw=source.read_bytes();header=struct.unpack('<IHHHHH',raw[:14])
 assert header[1]==0xA5E0 and header[2]==96 and list(header[3:5])==size and header[5]==32
 im=Image.open(png).convert('RGBA');arr=np.asarray(im);assert set(np.unique(arr[:,:,3]))=={0,255}
 assert len(j['frames'])==96 and len(j['meta']['frameTags'])==16 and len(meta['animations'])==16
 assert meta['frameDimensions']==size and meta['pivot']==pivot and meta['displayScale']==1 and meta['runtimeApproved']==False
 counts=[];reds=[];allcolors=set();names=set()
 for a in meta['animations']:
  assert len(a['frames'])==6 and a['frameDurationsMs']==[40,40,40,50,70,60] and a['durationMsTotal']==300 and a['loop']==False and a['pivot']==pivot
  assert a['direction'] in ['down','left','right','up'] and a['phases']
  for n in a['frames']:
   assert n not in names;names.add(n)
   record=j['frames'][n];f=record['frame'];assert [f['w'],f['h']]==size and f['x']>=0 and f['y']>=0 and f['x']+f['w']<=im.width and f['y']+f['h']<=im.height and not record['rotated'] and not record['trimmed']
   cel=im.crop((f['x'],f['y'],f['x']+f['w'],f['y']+f['h']));a2=np.asarray(cel);fg=a2[:,:,3]>0;assert fg.any(),n
   assert np.array_equal(a2,np.asarray(Image.open(OUT/(kind+'_frames')/(n+'.png')).convert('RGBA'))),n
   assert not fg[0,:].any() and not fg[-1,:].any() and not fg[:,0].any() and not fg[:,-1].any(),('edge clipping',n)
   counts.append(int(fg.sum()));rgb=a2[:,:,:3].astype(int)
   red=fg&(rgb[:,:,0]>90)&(rgb[:,:,0]>rgb[:,:,1]*1.7)&(rgb[:,:,0]>rgb[:,:,2]*1.7)
   reds.append(int(red.sum()))
   if kind=='character':
    assert red.sum()>=25,('lost red costume',n,int(red.sum()))
    allcolors.update(tuple(x) for x in a2[fg,:3].tolist())
 if kind=='character':
  assert len(allcolors)<=192
  for a in meta['animations']:
   last=OUT/'character_frames'/(a['frames'][-1]+'.png');nextcel=OUT/'character_frames'/(a['handoffTo']+'.png')
   same=Image.open(last).tobytes()==Image.open(nextcel).tobytes()
   assert same,('handoff mismatch',a['name'])
   report['seams'].append({'from':a['frames'][-1],'to':a['handoffTo'],'pixelIdentical':same})
 report['components'][kind]={'frames':96,'tags':16,'canvas':size,'pivot':pivot,'atlasDimensions':list(im.size),'binaryAlpha':True,'allFramesNonempty':True,'noEdgeClipping':True,'atlasMatchesIndividualFrames':True,'editableAsepriteRgbaHeaderValid':True,'minOpaquePixels':min(counts),'maxOpaquePixels':max(counts),'minimumRedPixelsPerFrame':min(reds),'characterPaletteColorCount':len(allcolors) if kind=='character' else None,'sourceSha256':sha(source),'sheetSha256':sha(png),'atlasSha256':sha(OUT/(name+'.json')),'animationMetadataSha256':sha(OUT/(name+'.animations.json'))}
snapshot=json.loads((SRC/'protected_art_snapshot.json').read_text(encoding='utf-8'))
changes=[n for n,h in {**snapshot['locks'],**snapshot['files']}.items() if not (ROOT/n).is_file() or sha(ROOT/n)!=h]
assert not changes,changes
report.update({'protectedLocks':len(snapshot['locks']),'protectedFiles':len(snapshot['files']),'protectedHashChanges':changes,'visualTimelineMsPerBeat':300,'visualTimelineMsFourBeats':1200,'damageTimingAuthority':'No gameplay timing or events added; presentation metadata only.','baselineScalePolicy':'Fixed per source/facing strip, ~44logical px guard body; handoffs are explicit duplicates; no per-frame fitting.'})
for p in list(SRC.rglob('*.json'))+list(OUT.glob('*.json')):json.loads(p.read_text(encoding='utf-8-sig'))
for p in list(OUT.rglob('*.png'))+list(REVIEW.glob('*.png')):
 with Image.open(p) as image:
  assert getattr(image,'n_frames',1)==1
  image.verify()
for p in [SRC,OUT,REVIEW]:assert not any(x.suffix.lower() in ['.gif','.mp4','.webm','.apng','.mov'] for x in p.rglob('*'))
assert Image.open(REVIEW/'gameplay_mockup_display_2x_1280.png').size==(1280,720)
assert Image.open(REVIEW/'gameplay_mockup_logical_1x_640.png').size==(640,360)
assert sha(REVIEW/'reference_actual_gameplay_1280.png')==sha(ROOT/'docs/evidence/m3c3/six-player-combat-1280.png')
(REVIEW/'file_validation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(report,ensure_ascii=False))
