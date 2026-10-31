"""Runtime-only lossless atlas packing. Reads supplied frames; never edits source artwork."""
from pathlib import Path
from PIL import Image
import json,hashlib,math,sys
ROOT=Path(__file__).resolve().parents[1]
DEST=ROOT/'apps/game-client/public/assets/feedback_v2_runtime'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def main():
 handoff=json.loads((ROOT/'assets/reviews/skills/m3c3_feedback_v2_batches/asset_handoff.json').read_text(encoding='utf-8'))
 metas=[c['metadata'] for c in handoff['components']]+[f'assets/exports/skills/cai-bang/cai_bang_bong_a_m3c3_feedback_v2/cai_bang_bong_combo_v2_{r}.animations.json' for r in ['character','vfx']]
 DEST.mkdir(parents=True,exist_ok=True);records=[];version=sha(Path(__file__))
 for mp in metas:
  m=json.loads((ROOT/mp).read_text(encoding='utf-8'));source=ROOT/m['sheet'];ap=ROOT/m['atlas'];png=DEST/(m['id']+'.png');out=DEST/(m['id']+'.json');cache=DEST/(m['id']+'.packing.json')
  signature=sha(source)+sha(ap)+version
  if cache.exists() and png.exists() and out.exists():
   old=json.loads(cache.read_text())
   if old['signature']==signature and old['pngSha256']==sha(png) and old['atlasSha256']==sha(out):records.append(old);continue
  original=Image.open(source).convert('RGBA');atlas=json.loads(ap.read_text());cels={}
  for name,rec in atlas['frames'].items():
   r=rec['frame'];full=original.crop((r['x'],r['y'],r['x']+r['w'],r['y']+r['h']));bbox=full.getchannel('A').getbbox()
   if not bbox:raise ValueError('Empty supplied frame '+m['id']+':'+name)
   cels[name]=(full,bbox,full.crop(bbox))
  area=sum((v[2].width+4)*(v[2].height+4) for v in cels.values());width=max(256,2**math.ceil(math.log2(math.sqrt(area))))
  while True:
   x=y=2;rowh=0;positions={}
   for name,(_,_,cel) in sorted(cels.items(),key=lambda p:-p[1][2].height):
    if x+cel.width+2>width:x=2;y+=rowh+4;rowh=0
    positions[name]=(x,y);x+=cel.width+4;rowh=max(rowh,cel.height)
   height=y+rowh+2
   if height<=2048 and width<=2048:break
   width*=2
   if width>2048:raise ValueError('Runtime texture exceeds2048 '+m['id'])
  result=Image.new('RGBA',(width,height))
  for name,(full,bbox,cel) in cels.items():
   x,y=positions[name];result.paste(cel,(x,y));r=atlas['frames'][name];r['frame']={'x':x,'y':y,'w':cel.width,'h':cel.height};r['trimmed']=True;r['rotated']=False
   r['spriteSourceSize']={'x':bbox[0],'y':bbox[1],'w':cel.width,'h':cel.height};r['sourceSize']={'w':full.width,'h':full.height}
   restored=Image.new('RGBA',full.size);restored.paste(cel,bbox[:2])
   assert restored.getchannel('A').tobytes()==full.getchannel('A').tobytes()
   # Transparent RGB is semantically irrelevant; all visible RGBA pixels stay exact.
   mask=full.getchannel('A');assert Image.composite(restored,full,mask).tobytes()==full.tobytes()
  atlas['meta'].update({'image':png.name,'size':{'w':width,'h':height},'runtimeDerivation':'lossless alpha-bounds crop and packing; unchanged sourceSize/pivot/native pixels'})
  result.save(png);out.write_text(json.dumps(atlas,separators=(',',':')),encoding='utf-8')
  record={'id':m['id'],'signature':signature,'sourceSheet':m['sheet'],'sourceAtlas':m['atlas'],'sourcePixels':original.width*original.height,'runtimePixels':width*height,'frames':len(cels),'visiblePixelsIdentical':True,'sourceSizePreserved':True,'pngSha256':sha(png),'atlasSha256':sha(out)}
  cache.write_text(json.dumps(record,indent=2),encoding='utf-8');records.append(record)
 (DEST/'packing_manifest.json').write_text(json.dumps({'status':'RUNTIME_DERIVATION_NOT_ART_REGENERATION','components':records,'sourcePixels':sum(r['sourcePixels'] for r in records),'runtimePixels':sum(r['runtimePixels'] for r in records)},indent=2),encoding='utf-8')
if __name__=='__main__':main()
