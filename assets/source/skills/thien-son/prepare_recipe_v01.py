from pathlib import Path
from PIL import Image
import json, math
root=Path.cwd();base='assets/source/skills/thien-son'
recipe={'assets':[],'icons':[]}
configs={
'lien_hoa_phien':{'style':'fan','charVersion':'v02','ms':70,'canvas':96,'stages':[('sweep','frontal_multi_sweep',False,True,.125,[0,-20]),('contact','local_contact',False,True,.065,[0,-20])]},
}
def readalpha(file):
 im=Image.open(root/file).convert('RGBA');return im,im.getchannel('A').point(lambda v:255 if v>=220 else 0)
def cuts(mask,axis,count,lo,hi):
 size=mask.width if axis=='x' else mask.height;out=[0]
 for i in range(1,count):
  ideal=round(size*i/count);options=[]
  for v in range(max(out[-1]+1,ideal-70),min(size,ideal+71)):
   b=mask.crop((v,lo,v+1,hi) if axis=='x' else (lo,v,hi,v+1)).getbbox()
   if b is None:options.append(v)
  if not options:raise ValueError('No transparent separator '+axis+':'+str(i))
  out.append(min(options,key=lambda v:abs(v-ideal)))
 out.append(size);return out
for slug,cfg in configs.items():
 f=base+'/generated/'+slug+'_character_'+cfg['charVersion']+'.png'
 if not (root/f).exists():continue
 im,mask=readalpha(f)
 xc=cuts(mask,'x',4,0,im.height)
 a={'id':slug+'_character','skillId':slug,'kind':'character','canvas':[80,80],'pivot':[40,64],'sourceFolder':base+'/'+slug+'/character','exportFolder':'assets/exports/skills/thien-son/'+slug,'animations':[],'artMethod':'New image-generated skill-specific character cels; Aseprite binary-alpha/palette-fringe cleanup and fixed sequence scale, foot alignment; no approved character pixels overwritten'}
 row_data=[[] for _ in range(4)]
 for col in range(4):
  yc=cuts(mask,'y',4,xc[col],xc[col+1])
  for row in range(4):
   rect=[xc[col],yc[row],xc[col+1]-xc[col],yc[row+1]-yc[row]]
   cut=mask.crop((rect[0],rect[1],rect[0]+rect[2],rect[1]+rect[3]));b=cut.getbbox()
   assert b
   bottom=b[3]-1;shoe=[]
   for y in range(max(b[1],bottom-9),bottom+1):
    for x in range(b[0],b[2]):
     rgba=im.getpixel((rect[0]+x,rect[1]+y))
     if rgba[3]>=220 and max(rgba[:3])<145:shoe.append(x)
   footx=(min(shoe)+max(shoe))/2 if shoe else (b[0]+b[2])/2
   row_data[row].append({'file':f,'rect':rect,'anchor':[footx,bottom+1],'alphaThreshold':220,'cleanupNeonFringe':True,'sourceBounds':list(b)})
 for row,d in enumerate(['down','left','right','up']):
  first=row_data[row][0];bh=first['sourceBounds'][3]-first['sourceBounds'][1];scale=44/bh
  for frame in row_data[row]:frame['scale']=scale
  a['animations'].append({'name':'cast_'+d,'durationMs':cfg['ms'],'loop':False,'direction':d,'stage':'anticipation_action_followthrough_recovery','placement':'character_feet','effectPlacementOffset':[0,0],'frames':row_data[row]})
 recipe['assets'].append(a)
 f=base+'/generated/'+slug+'_vfx_v01.png'
 if not (root/f).exists():continue
 im,mask=readalpha(f);yc=cuts(mask,'y',len(cfg['stages']),0,im.width)
 a={'id':slug+'_vfx','skillId':slug,'kind':'vfx','canvas':[cfg['canvas']]*2,'pivot':[cfg['canvas']//2]*2,'sourceFolder':base+'/'+slug+'/vfx','exportFolder':'assets/exports/skills/thien-son/'+slug,'animations':[],'artMethod':'Original generated isolated wind drawings; Aseprite hard-alpha cleanup; directional variants use exact cardinal pixel rotations; nondirectional ground rings retain overworld ellipse'}
 for row,(tag,stage,loop,directional,scale,offset) in enumerate(cfg['stages']):
  xc=cuts(mask,'x',4,yc[row],yc[row+1])
  cw=im.width/4;rh=im.height/len(cfg['stages'])
  # Fixed semantic source centers for the first supplied wind sheet.
  cy=320 if row==0 else 790
  for d,rot in ([('right',0),('down',90),('left',180),('up',270)] if directional else [('none',0)]):
   frames=[]
   for col in range(4):
    rect=[xc[col],yc[row],xc[col+1]-xc[col],yc[row+1]-yc[row]]
    frames.append({'file':f,'rect':rect,'anchor':[cw*(col+.5)-rect[0],cy-rect[1]],'scale':scale,'alphaThreshold':220,'rotation':rot})
   a['animations'].append({'name':tag+('_'+d if directional else ''),'durationMs':65,'loop':loop,'direction':d,'stage':stage,'placement':'caster_body','effectPlacementOffset':offset,'frames':frames})
 recipe['assets'].append(a)
concept=json.loads((root/'assets/concepts/skills/thien-son/concept_manifest_v01.json').read_text(encoding='utf-8'))
for e in concept['entries']:
 recipe['icons'].append({'id':e['id'],'name':e['name'],'file':e['iconConceptPath'],'sourceFolder':base+'/'+e['id']+'/icon','exportFolder':'assets/exports/skills/thien-son/'+e['id'],'approvedConcept':e['iconConceptPath']})
for a in recipe['assets']:(root/a['sourceFolder']/'frames').mkdir(parents=True,exist_ok=True);(root/a['exportFolder']).mkdir(parents=True,exist_ok=True)
for a in recipe['icons']:(root/a['sourceFolder']).mkdir(parents=True,exist_ok=True);(root/a['exportFolder']).mkdir(parents=True,exist_ok=True)
(root/base/'recipe_v01.json').write_text(json.dumps(recipe,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Recipe',len(recipe['assets']),'components;',len(recipe['icons']),'approved icons')

