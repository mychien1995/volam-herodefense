"""Inspect PNG pixels and assemble candidates with Aseprite. Pillow is read-only."""
from pathlib import Path
from PIL import Image
from collections import deque
from statistics import median
import hashlib,json,subprocess
ROOT=Path(__file__).resolve().parents[3]
HERE=Path(__file__).resolve().parent
DIRECTIONS=['down','left','right','up']
BINARY=Path('C:/Program Files/Aseprite/Aseprite.exe')
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def components(path,expected):
    with Image.open(path) as im:
        rgba=im.convert('RGBA');w,h=rgba.size
        raw=rgba.getchannel('A').tobytes()
    data=bytearray(a>=220 for a in raw);groups=[]
    for i in range(w*h):
        if not data[i]:continue
        q=deque([i]);data[i]=0;pixels=[]
        while q:
            j=q.popleft();pixels.append(j);x=j%w;y=j//w
            for dy in (-1,0,1):
                for dx in (-1,0,1):
                    xx=x+dx;yy=y+dy;k=yy*w+xx
                    if 0<=xx<w and 0<=yy<h and data[k]:
                        data[k]=0;q.append(k)
        groups.append(pixels)
    groups.sort(key=len,reverse=True);large=groups[:expected]
    assert len(large)==expected and len(large[-1])>500,(path,'missing silhouettes')
    bounds=[]
    for g in large:
        xs=[j%w for j in g];ys=[j//w for j in g]
        bounds.append([min(xs),min(ys),max(xs)+1,max(ys)+1])
    for extra in groups[expected:]:
        cx=sum(j%w for j in extra)/len(extra);cy=sum(j//w for j in extra)/len(extra)
        scores=[max(b[0]-cx,0,cx-b[2])**2+max(b[1]-cy,0,cy-b[3])**2 for b in bounds]
        best=min(range(expected),key=lambda k:scores[k])
        if scores[best]<=256:large[best].extend(extra)
    result=[]
    for pixels in large:
        xs=[j%w for j in pixels];ys=[j//w for j in pixels]
        x,y,xx,yy=min(xs),min(ys),max(xs)+1,max(ys)+1
        assert 0<x<xx<w and 0<y<yy<h,(path,'source edge clipping')
        feet=[j%w for j in pixels if j//w>=yy-max(5,round((yy-y)*.1))]
        spans=[];by_y={}
        for j in pixels:by_y.setdefault(j//w,[]).append(j%w)
        for sy,values in sorted(by_y.items()):
            values=sorted(set(values));start=last=values[0]
            for sx in values[1:]:
                if sx>last+1:spans.append([sy,start,last]);start=sx
                last=sx
            spans.append([sy,start,last])
        result.append(dict(rect=[x,y,xx-x,yy-y],foot=[round((min(feet)+max(feet))/2),yy],maskSpans=spans))
    if expected in (24,40):
        columns=10 if expected==40 else 6
        rows=[[] for _ in range(4)]
        for item in result:
            b=item['rect'];rows[min(3,int((b[1]+b[3]/2)/h*4))].append(item)
        assert all(len(row)==columns for row in rows),[len(row) for row in rows]
        return [item for row in rows for item in sorted(row,key=lambda i:i['rect'][0]+i['rect'][2]/2)]
    result.sort(key=lambda i:i['rect'][1]+i['rect'][3]/2)
    return sorted(result[:2],key=lambda i:i['rect'][0])+sorted(result[2:],key=lambda i:i['rect'][0])
def run(args):
    result=subprocess.run([str(BINARY),*args],capture_output=True,text=True)
    if result.returncode:raise RuntimeError(result.stdout+result.stderr)
    if result.stdout.strip():print(result.stdout.strip())
def main():
    cfg=json.loads((HERE/'production_config_v1.json').read_text(encoding='utf-8'))
    concept_hash=digest(ROOT/cfg['concept'])
    lock=json.loads((ROOT/'assets/approved_cai_bang.lock.json').read_text())
    for file,sha in lock['files'].items():assert digest(ROOT/file)==sha,file
    manifests=[]
    for asset in cfg['assets']:
        folder=HERE/asset['slug'];rel=folder.relative_to(ROOT).as_posix()
        old_manifest=folder/'manifest.json'
        if old_manifest.exists():
            old=json.loads(old_manifest.read_text(encoding='utf-8'))
            if old.get('status')=='approved' or old.get('reviewStatus')=='APPROVED':
                raise ValueError('Approved sprite asset is locked; use a new revision: '+asset['slug'])
        frames_dir=folder/'frames';frames_dir.mkdir(exist_ok=True)
        canvas,pivot=([112,96],[56,76]) if asset['slug']=='bandit-swordsman' else ([80,80],[40,64])
        measured=components(folder/'source/animation_v1.png',40)
        scale=asset['targetHeight']/median([measured[row*10+col]['rect'][3] for row in range(4) for col in (0,1)])
        corrected=components(folder/'source/front_attack_v1.png',4) if asset.get('front') else None
        frames=[];tags=[]
        for row,direction in enumerate(DIRECTIONS):
            for state,start,count,duration in [('idle',0,2,350),('walk',2,4,120),('basic_attack',6,4,75)]:
                first=len(frames)
                for local in range(count):
                    source_index=row*10+start+local
                    if asset['slug']=='bandit-swordsman' and source_index==38:continue
                    item=dict(measured[source_index]);file=f'{rel}/source/animation_v1.png';item_scale=scale
                    if row==0 and state=='basic_attack' and corrected:
                        if asset['slug']=='bandit-swordsman' and local==3:item=dict(measured[0])
                        else:item=dict(corrected[local]);file=f'{rel}/source/front_attack_v1.png';item_scale=asset['frontScale']
                    name=f'{state}_{direction}_{len(frames)-first}'
                    item.update(name=name,file=file,scale=item_scale,durationMs=100 if asset['slug']=='bandit-swordsman' and state=='basic_attack' and direction=='up' else duration,sourceConcept=cfg['concept'],sourceConceptSha256=concept_hash)
                    frames.append(item)
                tags.append({'name':f'{state}_{direction}','from':first,'to':len(frames)-1})
        reactions=components(folder/'source/hurt_death_v1.png',24)
        reaction_scale=asset['targetHeight']/median([reactions[row*6+1]['rect'][3] for row in range(4)])
        for row,direction in enumerate(DIRECTIONS):
            for state,start,count,duration in [('hurt',0,2,140),('death',2,4,140)]:
                first=len(frames)
                for local in range(count):
                    item=dict(reactions[row*6+start+local])
                    item.update(name=f'{state}_{direction}_{local}',file=f'{rel}/source/hurt_death_v1.png',scale=reaction_scale,durationMs=duration,sourceConcept=cfg['concept'],sourceConceptSha256=concept_hash)
                    frames.append(item)
                tags.append({'name':f'{state}_{direction}','from':first,'to':len(frames)-1})
        recipe=dict(id=asset['id'],folder=rel,canvas=canvas,pivot=pivot,scalePolicy='One fixed scale per generated source; never per-frame fit-to-box',frames=frames,tags=tags)
        recipe_path=folder/'source/extraction_v1.json'
        recipe_path.write_text(json.dumps(recipe,separators=(',',':'))+'\n')
        run(['-b','--script-param',f'root={ROOT.as_posix()}','--script-param',f'recipe={recipe_path.as_posix()}','--script',str(HERE/'assemble.lua')])
        run(['-b',str(folder/'source'/f'{asset["id"]}.aseprite'),'--list-tags','--list-slices','--sheet-type','rows','--sheet-columns','10','--filename-format','{tag}_{tagframe}','--format','json-hash','--sheet',str(folder/'spritesheet.png'),'--data',str(folder/'atlas.json')])
        atlas=json.loads((folder/'atlas.json').read_text());atlas['meta']['image']='spritesheet.png'
        (folder/'atlas.json').write_text(json.dumps(atlas,indent=2)+'\n')
        names=list(atlas['frames']);animations=[]
        for tag in tags:
            state,direction=tag['name'].rsplit('_',1);selected=names[tag['from']:tag['to']+1]
            durations=[atlas['frames'][n]['duration'] for n in selected]
            animations.append(dict(state=state,direction=direction,frames=selected,frameRate=1000/durations[0],repeat=-1 if state in ['idle','walk'] else 0))
        assert len(names)==len(frames) and len(tags)==20
        audits=[]
        for f in frames:
            p=frames_dir/(f['name']+'.png')
            with Image.open(p) as im:
                a=im.getchannel('A');b=a.getbbox()
                assert im.size==tuple(canvas) and b and a.getextrema()==(0,255),p
                assert b[0]>0 and b[1]>0 and b[2]<canvas[0] and b[3]<canvas[1],(p,b)
                assert set(a.tobytes())<={0,255},p
                audits.append(dict(name=f['name'],file=p.relative_to(ROOT).as_posix(),bounds=list(b),sha256=digest(p),sourceConcept=cfg['concept'],sourceConceptSha256=concept_hash))
        state_audits=[]
        for anim in animations:
            hashes=[next(a['sha256'] for a in audits if a['name']==n) for n in anim['frames']]
            unique=len(set(hashes));assert unique>=2,(asset['id'],anim,'No authored motion')
            state_audits.append(dict(state=anim['state'],direction=anim['direction'],frames=len(hashes),distinctFrames=unique))
        manifest=dict(id=asset['id'],nameVi=asset['nameVi'],category='enemy',status='prototype',reviewStatus='STAGED_NOT_INTEGRATED',conceptApproval='User identifies Phase 1A artwork as approved source of truth in current request',sourceConcept=cfg['concept'],sourceConceptSha256=concept_hash,source=f'{rel}/source/{asset["id"]}.aseprite',sheet='spritesheet.png',atlas='atlas.json',frameWidth=canvas[0],frameHeight=canvas[1],footPivot=[pivot[0]/canvas[0],pivot[1]/canvas[1]],directions=DIRECTIONS,authoredStates=['idle','walk','basic_attack','hurt','death'],unproducedStates=[],animations=animations,frames=audits,animationAudit=state_audits,provenance='Original AI-assisted raster poses generated by OpenAI built-in image_gen using approved concept directly. Aseprite extracts masked generated pixels, removes alpha below 220, normalizes retained alpha to 255, applies fixed nearest-neighbour source scale and aligns feet. No concept pixels used as frames; no commercial sprite pack or separate third-party license claimed.',notes=asset['notes'],rejectedMainFrameIndices=asset.get('rejectedMainFrames',[]),normalGameplayReview='Pending isolated Phaser comparison; no match integration or runtime director approval')
        (folder/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
        manifests.append(dict(id=asset['id'],slug=asset['slug'],nameVi=asset['nameVi'],frames=len(frames),sourceConcept=cfg['concept']))
    for file,sha in lock['files'].items():assert digest(ROOT/file)==sha,file
    (HERE/'production_manifest_v1.json').write_text(json.dumps(dict(status='STAGED_NOT_INTEGRATED',concept=cfg['concept'],conceptSha256=concept_hash,assets=manifests),ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print('PASS: PNG/JSON bounds, true alpha, named/distinct frames, four facings, approved baseline hashes.')
if __name__=='__main__':main()

