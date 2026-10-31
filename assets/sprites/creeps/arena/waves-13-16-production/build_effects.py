"""Analyze the original transparent VFX source; Aseprite extracts/exports the selected pixels."""
from pathlib import Path
from collections import deque
from bisect import bisect_right
from PIL import Image
import hashlib,json,subprocess

ROOT=Path(__file__).resolve().parents[5]
HERE=Path(__file__).resolve().parent
FOLDER=HERE/'effects'
REL=FOLDER.relative_to(ROOT).as_posix()
ASE='C:/Program Files/Aseprite/Aseprite.exe'
IDS=['demon_hound_contact','fire_imp_contact','fire_cultist_contact','horned_brute_contact',
     'fire_imp_projectile','fire_cultist_projectile','demon_hound_embers']
SIZES=[24,24,28,38,22,28,10]

def write(p,d):p.write_text(json.dumps(d,indent=2)+'\n',encoding='utf-8')
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def run(args):subprocess.run([ASE,*map(str,args)],check=True,capture_output=True)
def separators(counts,n):
    size=len(counts)/n;result=[0]
    for i in range(1,n):
        lo=round((i-.3)*size);hi=round((i+.3)*size)
        # Prefer a real low-alpha valley near the nominal regular-grid boundary.
        v=min(range(lo,hi),key=lambda p:(counts[p],abs(p-i*size)))
        result.append(v)
    return result+[len(counts)]

def main():
    source=FOLDER/'source/generated_v1.png'
    with Image.open(source) as im:rgba=im.convert('RGBA');w,h=im.size;raw=rgba.getchannel('A').tobytes()
    data=bytearray(a>=220 for a in raw);groups=[]
    for i in range(w*h):
        if not data[i]:continue
        queue=deque([i]);data[i]=0;pixels=[]
        while queue:
            j=queue.popleft();pixels.append(j);x=j%w;y=j//w
            for dy in (-1,0,1):
                for dx in (-1,0,1):
                    xx=x+dx;yy=y+dy;k=yy*w+xx
                    if 0<=xx<w and 0<=yy<h and data[k]:data[k]=0;queue.append(k)
        if len(pixels)>=24:groups.append(pixels)
    rows=[0]*h;cols=[0]*w
    for group in groups:
        for j in group:rows[j//w]+=1;cols[j%w]+=1
    rb=separators(rows,7);cb=separators(cols,4);cells=[[] for _ in range(28)]
    for group in groups:
        x=sum(j%w for j in group)/len(group);y=sum(j//w for j in group)/len(group)
        r=min(6,bisect_right(rb,y)-1);c=min(3,bisect_right(cb,x)-1)
        cells[r*4+c].extend(group)
    measured=[]
    for i,pixels in enumerate(cells):
        assert pixels,('Empty effect',i)
        xs=[j%w for j in pixels];ys=[j//w for j in pixels]
        x,y,xx,yy=min(xs),min(ys),max(xs)+1,max(ys)+1
        assert 0<x<xx<w and 0<y<yy<h,('Source edge',i)
        spans=[];by_y={}
        for j in pixels:by_y.setdefault(j//w,[]).append(j%w)
        for sy,values in sorted(by_y.items()):
            values=sorted(set(values));start=last=values[0]
            for sx in values[1:]:
                if sx>last+1:spans.append([sy,start,last]);start=sx
                last=sx
            spans.append([sy,start,last])
        measured.append({'rect':[x,y,xx-x,yy-y],'maskSpans':spans,'foot':[(x+xx)/2,(y+yy)/2]})
    frames=[];tags=[]
    for r,id in enumerate(IDS):
        scale=SIZES[r]/max(max(v['rect'][2:]) for v in measured[r*4:r*4+4])
        for c in range(4):
            f=dict(measured[r*4+c]);f.update(name=id+'_'+str(c),file=REL+'/source/generated_v1.png',
                scale=scale,durationMs=90,selectedCell=[r,c]);frames.append(f)
        tags.append({'name':id,'from':r*4,'to':r*4+3})
    recipe={'id':'arena_creep_demon_fx','folder':REL,'canvas':[64,64],'pivot':[32,32],'frames':frames,'tags':tags,
        'sourceCleanup':'Alpha>=220; disconnected source components smaller than24 pixels excluded as fringe noise; no new pixels painted.',
        'rowBoundaries':rb,'columnBoundaries':cb}
    path=FOLDER/'source/extraction_v1.json';write(path,recipe)
    run(['-b','--script-param','root='+ROOT.as_posix(),'--script-param','recipe='+path.as_posix(),
        '--script',ROOT/'sprites/creeps/arena/assemble.lua'])
    run(['-b',FOLDER/'source/arena_creep_demon_fx.aseprite','--list-tags','--list-slices','--sheet-type','rows',
        '--sheet-columns','4','--filename-format','{tag}_{tagframe}','--format','json-hash',
        '--sheet',FOLDER/'spritesheet.png','--data',FOLDER/'atlas.json'])
    atlas=json.loads((FOLDER/'atlas.json').read_text());atlas['meta']['image']='spritesheet.png';write(FOLDER/'atlas.json',atlas)
    assert len(atlas['frames'])==28
    animations=[]
    for r,id in enumerate(IDS):
        names=[id+'_'+str(c) for c in range(4)]
        assert len({sha(FOLDER/'frames'/(n+'.png')) for n in names})==4,(id,'Repeated drawings')
        for name in names:
            with Image.open(FOLDER/'frames'/(name+'.png')) as im:
                a=im.getchannel('A');b=a.getbbox();assert im.size==(64,64) and b and 0<b[0]<b[2]<64 and 0<b[1]<b[3]<64
                assert set(a.tobytes())<={0,255}
        animations.append({'id':id,'frames':names,'frameRate':1000/90,'repeat':-1 if r>=4 else 0,
            'texture':'arena_creep_demon_fx','offsetY':-3 if r==3 else -16,
            'kind':'contact' if r<4 else 'projectile' if r<6 else 'ambient'})
    manifest={'id':'arena_creep_demon_fx','phase':'1H','status':'prototype','source':REL+'/source/arena_creep_demon_fx.aseprite',
        'generatedSource':REL+'/source/generated_v1.png','sourceSha256':sha(source),'generationPrompt':REL+'/source/generation_prompt_v1.json',
        'canvas':[64,64],'animations':animations,'provenance':'Original AI-assisted concept-referenced VFX. Selected generated pixels assembled/exported with Aseprite. Contact/ambient are presentation only; projectile graphics do not add ranged AI or damage.'}
    write(FOLDER/'manifest.json',manifest)
    print('PASS:28 distinct transparent effect frames,seven tags,editable Aseprite and PNG/JSON exports.')

if __name__=='__main__':main()
