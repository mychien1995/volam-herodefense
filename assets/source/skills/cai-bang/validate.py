from pathlib import Path
from PIL import Image
import hashlib,json
root=Path.cwd()
folder=root/'assets/exports/skills/cai-bang'
manifest=json.loads((folder/'production_manifest_v1.json').read_text(encoding='utf-8-sig'))
recipe=json.loads((root/'assets/source/skills/cai-bang/recipe.json').read_text(encoding='utf-8-sig'))
reports=[];warnings=[];count=0;sourcecells=set()
for a in recipe['assets']:
 if a['kind']!='vfx':continue
 for anim in a['animations']:
  for frame in anim['frames']:
   key=(frame['file'],tuple(frame['rect']))
   if key in sourcecells:continue
   sourcecells.add(key)
   x,y,w,h=frame['rect']
   al=Image.open(root/frame['file']).convert('RGBA').crop((x,y,x+w,y+h)).getchannel('A').point(lambda v:255 if v>=220 else 0)
   edge=list(al.crop((0,0,1,h)).getdata())+list(al.crop((w-1,0,w,h)).getdata())+list(al.crop((0,0,w,1)).getdata())+list(al.crop((0,h-1,w,h)).getdata())
   assert not any(edge),frame['file']+': source-cell boundary bleed'
for a in manifest['assets']:
 atlas=json.loads((root/a['atlas']).read_text(encoding='utf-8-sig'))
 sheet=Image.open(root/a['sheet']).convert('RGBA')
 expected=next(x for x in recipe['assets'] if x['id']==a['id'])
 assert sheet.size==(atlas['meta']['size']['w'],atlas['meta']['size']['h'])
 for anim in a['animations']:
  hashes=[]
  for name in anim['frames']:
   rec=atlas['frames'][name];b=rec['frame']
   assert b['x']>=0 and b['y']>=0 and b['x']+b['w']<=sheet.width and b['y']+b['h']<=sheet.height
   assert [b['w'],b['h']]==a['frameDimensions']
   im=sheet.crop((b['x'],b['y'],b['x']+b['w'],b['y']+b['h']))
   framepath=root/expected['sourceFolder']/'frames'/(name+'.png')
   raw=Image.open(framepath).convert('RGBA')
   assert raw.size==im.size and raw.tobytes()==im.tobytes(),str(framepath)
   alpha=im.getchannel('A');values=set(alpha.getdata())
   assert values=={0,255},name+': alpha'
   bbox=alpha.getbbox();assert bbox,name
   assert bbox[0]>0 and bbox[1]>0 and bbox[2]<im.width and bbox[3]<im.height,name+': touches canvas edge'
   hashes.append(hashlib.sha256(im.tobytes()).hexdigest());count+=1
  assert len(set(hashes))>=min(3,len(hashes)),a['id']+': static sequence '+anim['name']
  assert all(hashes[i]!=hashes[i-1] for i in range(1,len(hashes))),a['id']+': duplicated adjacent frames '+anim['name']
  if len(set(hashes))<len(hashes):warnings.append(a['id']+': repeated natural recovery/reference pose in '+anim['name'])
  assert anim['frameCount']==len(anim['frames']) and anim['frameRate']>0
  assert len(anim['effectPlacementOffset'])==2 and len(anim['origin'])==2
 reports.append({'id':a['id'],'frames':sum(n['frameCount'] for n in a['animations']),'animations':len(a['animations']),'frameDimensions':a['frameDimensions'],'sheetDimensions':list(sheet.size),'rgba':True,'binaryAlpha':True,'frameBoundsMatch':True,'noCanvasEdgeClipping':True,'nonStaticSequences':True,'sheetSha256':hashlib.sha256((root/a['sheet']).read_bytes()).hexdigest()})
lock=json.loads((root/'assets/approved_cai_bang.lock.json').read_text(encoding='utf-8-sig'))
for file,wanted in lock['files'].items():assert hashlib.sha256((root/file).read_bytes()).hexdigest()==wanted,file
report={'status':'PASS','scope':'PNG/JSON/individual-frame equality, genuine binary alpha, canvas bounds, distinct-frame sequences, anchors, metadata and approved baseline preservation. No gameplay integration or director production-art approval.','componentCount':len(reports),'totalFrames':count,'totalAnimationTags':sum(r['animations'] for r in reports),'approvedBaselineFilesUnchanged':len(lock['files']),'warnings':warnings,'components':reports}
report['separateVfxSourceCellsChecked']=len(sourcecells)
report['sourceCellBoundaryBleed']=False
(folder/'validation_v1.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
print(json.dumps({k:v for k,v in report.items() if k!='components'},indent=2))

