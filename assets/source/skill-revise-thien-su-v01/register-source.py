"""Source annotations for new hammer artwork; reuse existing assembly, no art drawn here."""
import sys,json,statistics
from pathlib import Path
import numpy as np
from scipy import ndimage
ROOT=Path(__file__).resolve().parents[3]
sys.path.insert(0,str(ROOT/'tools'))
from hero_unified_assets import figures,hair_width
src=Path(__file__).resolve().parent
cfg=json.loads((src/'profile.json').read_text())
records=[];overrides=[]
for raw in sorted((src/'raw').glob('*.png')):
    direction=raw.stem
    cels=figures(raw,8,4,cfg.get('sourceSegmentationCuts',{}).get(direction,[]));measure=[]
    repaired=set()
    for repair in cfg.get('sourcePoseRepairs',[]):
        if repair['direction']!=direction:continue
        replacements=figures(src/repair['path'],repair['rows'],repair['columns'])
        for offset,index in enumerate(repair['indices']):
            cel_index=repair['start']+offset;cels[cel_index]=replacements[index];repaired.add(cel_index)
    out=src/'raw/cels'/direction;out.mkdir(parents=True,exist_ok=True)
    for i,(im,box) in enumerate(cels):
        a=np.array(im);rgb=a[:,:,:3].astype(float);r,g,b=rgb[:,:,0],rgb[:,:,1],rgb[:,:,2];alpha=a[:,:,3]>=24
        # Head is a broad dark-hair mass in upper half; exclude detached top ribbons.
        hair=alpha&(r>g*1.1)&(r<g*2.5)&(r<170)&(g<125)&(b<140)
        hair[int(im.height*.48):]=False
        labels,n=ndimage.label(hair,np.ones((3,3)));counts=np.bincount(labels.ravel());assert n
        yy,xx=np.nonzero(labels==1+int(np.argmax(counts[1:])));cx=float(np.median(xx))
        prone=cfg['poses'][i]=='death_1'
        yy0,xx0=np.nonzero(alpha)
        # Wide boot region around anatomical head/torso, never the far hammer endpoint.
        band=(np.arange(im.width)>=cx-im.height*.42)&(np.arange(im.width)<=cx+im.height*.36)
        shoe=alpha&(r<120)&(g<105)&(b<120)&band[None,:]
        shoe[:int(im.height*.60)]=False
        row=shoe.sum(axis=1);ys=np.flatnonzero(row>=max(3,float(row.max())*.12));assert len(ys)
        foot=float(ys[-1]);bottom=shoe[max(0,int(foot)-12):int(foot)+1];by,bx=np.nonzero(bottom)
        rx=float((bx.min()+bx.max())/2)
        headband=(np.arange(im.width)>=cx-im.height*.18)&(np.arange(im.width)<=cx+im.height*.18)
        hc=(alpha&headband[None,:]).sum(axis=1);top=float(np.flatnonzero(hc>=max(5,float(hc.max())*.20))[0])
        if prone:rx=float(np.median(xx0));foot=float(yy0.max())
        measure.append((rx,foot,top));im.save(out/(cfg['poses'][i]+'.png'))
    corrections=json.loads((src/'root-corrections.json').read_text()) if (src/'root-corrections.json').exists() else {}
    for index,point in corrections.get(direction,{}).items():
        i=int(index);measure[i]=(point[0],point[1],measure[i][2])
    ratio=cfg['bodyHeight']/statistics.median(foot-top+1 for _,foot,top in measure[:4])
    head_target=ratio*statistics.median(hair_width(cels[i][0],measure[i],'fur_hammer') for i in range(4))
    repair_ratio=head_target/statistics.median(hair_width(cels[i][0],measure[i],'fur_hammer') for i in repaired) if repaired else ratio
    for i,(rx,foot,top) in enumerate(measure):
        pose=cfg['poses'][i];p='raw/cels/'+direction+'/'+pose+'.png'
        cel_ratio=repair_ratio if i in repaired else ratio
        for name,scale in [(pose,cel_ratio)]+([] if pose.startswith('death_') else [('chaos_'+pose,cel_ratio*1.34)]):
            overrides.append({'frame':name+'_'+direction,'path':p,'sourceRoot':[rx,foot],'sourceBodyTop':top,'sourceScale':scale})
    records.append({'direction':direction,'originalSourceScale':ratio,'repairSourceScale':repair_ratio,'idlePhysicalHeights':[(f-t+1)*(repair_ratio if i in repaired else ratio) for i,(_,f,t) in enumerate(measure[:4])],'roots':measure,'repairedIndices':sorted(repaired)})
cfg['poseOverrides']=overrides
(src/'profile.json').write_text(json.dumps(cfg,indent=2)+'\n')
(src/'registration.json').write_text(json.dumps({'method':'source head/body-column + dark-foot sole annotations; one source scale per direction, no per-frame rescale','records':records},indent=2)+'\n')
print(json.dumps(records[0] if len(records)==1 else {'directions':len(records)}))
