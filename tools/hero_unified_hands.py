"""Bare-hand attachment data measured against canonical body cels.
Pose anchors constrain color sampling so bronze ornaments/face never win a global skin-area ranking.
Occluded hands retain an explicit behind-body anchor; they are not claimed as visible measurements.
"""
from pathlib import Path
import json, shutil
import numpy as np
from PIL import Image, ImageDraw
ROOT=Path(__file__).resolve().parent.parent
ANCHORS={
 'idle_0':[[-14,-25],[14,-27]],'idle_1':[[-14,-25],[14,-27]],'idle_2':[[-14,-25],[14,-27]],'idle_3':[[-14,-25],[14,-27]],
 'walk_0':[[-12,-31],[13,-30]],'walk_1':[[-12,-29],[13,-29]],'walk_2':[[-13,-29],[13,-31]],'walk_3':[[-13,-29],[13,-29]],
 'windup':[[-7,-38],[12,-27]],'palm_release':[[-12,-32],[26,-46]],'double_palm':[[6,-43],[20,-43]],'poison_charge':[[-8,-35],[10,-36]],
 'pool_press':[[-12,-31],[17,-28]],'aura_spread':[[-26,-42],[28,-42]],'counter_guard':[[-3,-38],[5,-39]],'hands_up':[[-27,-55],[26,-55]],
 'swarm_release':[[-25,-41],[27,-41]],'channel':[[0,-32],[5,-31]],'recover':[[-14,-26],[14,-27]],'lunge':[[-5,-29],[26,-40]],
 'hurt_0':[[-6,-36],[26,-46]],'hurt_1':[[7,-37],[18,-18]]}
def export_hands(profile):
 cfg=json.loads(Path(profile).read_text());folder=cfg['folder'];out=ROOT/'assets/exports'/folder;src=ROOT/'assets/source'/folder
 atlas=json.loads((out/'body.json').read_text());sheet=Image.open(out/'body.png').convert('RGBA');records={};notes={};proof=Image.new('RGB',(8*192,len(cfg['poses'])*128),(40,48,40));draw=ImageDraw.Draw(proof)
 for di,d in enumerate(json.loads((out/'manifest.json').read_text())['directions']):
  for pi,pose in enumerate(cfg['poses']):
   name=pose+'_'+d;a=atlas['frames'][name];f=a['frame'];s=a['spriteSourceSize'];tile=Image.new('RGBA',tuple(cfg['canvas']));tile.paste(sheet.crop((f['x'],f['y'],f['x']+f['w'],f['y']+f['h'])),(s['x'],s['y']));p=np.array(tile);r,g,b=p[:,:,0].astype(float),p[:,:,1].astype(float),p[:,:,2].astype(float)
   points=[];details=[]
   if not pose.startswith('death_'):
    skin=(p[:,:,3]>=100)&(r>120)&(g>45)&(r>g*1.10)&(r-b>35)&(b>g*.55)&((g-b)/(r-b+.01)<.52);yy,xx=np.nonzero(skin)
    for anchor in ANCHORS[pose]:
     ax=cfg['foot'][0]+anchor[0]*(-1 if 'left' in d else 1);ay=cfg['foot'][1]+anchor[1];distance=(xx-ax)**2+(yy-ay)**2;nearest=int(np.argmin(distance));error=float(distance[nearest]**.5)
     visible=error<=12;px=float(xx[nearest]) if visible else ax;py=float(yy[nearest]) if visible else ay
     points.append({'x':round(px-cfg['foot'][0],3),'y':round(py-cfg['foot'][1],3),**({'hidden':True} if not visible else {})});details.append({'anchor':[ax-cfg['foot'][0],ay-cfg['foot'][1]],'skinDistance':round(error,3),'visibleSkin':visible})
    points.sort(key=lambda c:c['x'])
   for override in cfg.get('handSocketOverrides',[]):
    if override['frame']==name:points=override['points'];details=[{'manualRasterMeasurement':True}]
   records[name]=points;notes[name]={'samples':details,'points':points}
   thumb=tile.resize((cfg['canvas'][0]//2,cfg['canvas'][1]//2),Image.Resampling.LANCZOS);proof.paste(thumb,(di*192,pi*128+104-cfg['foot'][1]//2),thumb)
   for point in points:
    x=di*192+(cfg['foot'][0]+point['x'])/2;y=pi*128+104+point['y']/2;color='orange' if point.get('hidden') else 'red';draw.line((x-3,y,x+3,y),fill=color);draw.line((x,y-3,x,y+3),fill=color)
   draw.text((di*192,pi*128+110),name,fill='white')
 (out/'hands.json').write_text(json.dumps(records,indent=2)+'\n');(src/'hands-review.json').write_text(json.dumps(notes,indent=2)+'\n');proof.save(src/'hands-contact.png');shutil.copyfile(out/'hands.json',ROOT/'apps/game-client/public/assets'/folder/'hands.json');print('Canonical hand attachments:',len(records),'frames; inferred occluded points:',sum(bool(p.get('hidden')) for points in records.values() for p in points))
 return []
