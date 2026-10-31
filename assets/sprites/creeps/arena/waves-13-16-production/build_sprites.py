"""Phase1H only. Analyze original generated pixels; Aseprite assembles and exports cels."""
from pathlib import Path
from statistics import median
from PIL import Image
import hashlib, importlib.util, json, subprocess, sys

ROOT = Path(__file__).resolve().parents[5]
HERE = Path(__file__).resolve().parent
ARENA = HERE.parent
ASEPRITE = Path('C:/Program Files/Aseprite/Aseprite.exe')
sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location('prior_pixel_analysis', ROOT/'sprites/creeps/arena/build_sprites.py')
analysis = importlib.util.module_from_spec(spec)
spec.loader.exec_module(analysis)
DIRECTIONS = ['down', 'left', 'right', 'up']
INDICES = {'idle':[0,1], 'walk':[4,5,6,7], 'basic_attack':[8,9,10,11], 'hurt':[2,3], 'death':[12,13,14,15]}

def read(p): return json.loads(p.read_text(encoding='utf-8'))
def write(p,d): p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def check_inputs():
    records=read(HERE/'approved_inputs_lock.json')['records']
    for name,h in records.items(): assert sha(ROOT/name)==h, 'Approved input changed: '+name
    return len(records)

def measure(source):
    items=analysis.components(ROOT/source['file'],source['expected'])
    with Image.open(ROOT/source['file']) as im: height=im.height
    rows=[[] for _ in range(source['rows'])]
    for item in items:
        b=item['rect']; row=min(source['rows']-1,int((b[1]+b[3]/2)/height*source['rows']))
        rows[row].append(item)
    assert all(len(r)==source['cols'] for r in rows),(source['file'],[len(r) for r in rows])
    return [item for row in rows for item in sorted(row,key=lambda v:v['rect'][0]+v['rect'][2]/2)]

def body_height(item, image, key, source_key):
    if key!='cultist': return item['rect'][3]
    # A body-only horizontal reference excludes the upright staff. Hue alone is unreliable
    # because the same purple hood uses different warm highlight/shadow clusters by facing.
    hood=[]
    x0,y0,w,h=item['rect']
    lo,hi=(.1,.65) if source_key=='up' else (.5,.9)
    for y,x1,x2 in item['maskSpans']:
        if y>item['rect'][1]+item['rect'][3]*.6: continue
        for x in range(x1,x2+1):
            if x0+w*lo<=x<=x0+w*hi: hood.append(y)
    assert hood,'Missing purple hood reference'
    return item['foot'][1]-min(hood)

def hoof_anchor(item,image):
    # Steel below the feet in a downward strike must not become the character's ground anchor.
    points=[]
    for y,x1,x2 in item['maskSpans']:
        if y<item['rect'][1]+item['rect'][3]*.65: continue
        for x in range(x1,x2+1):
            r,g,b,a=image.getpixel((x,y))
            if g>24 and b<130 and r>g*1.12 and g>b*1.12: points.append((x,y))
    assert points,'Missing hoof anchor'
    bottom=max(y for x,y in points)+1
    xs=[x for x,y in points if y>=bottom-5]
    return [round((min(xs)+max(xs))/2),bottom]

def run(args):
    r=subprocess.run([str(ASEPRITE),*map(str,args)],capture_output=True,text=True)
    if r.returncode: raise RuntimeError(r.stdout+r.stderr)
    if r.stdout.strip(): print(r.stdout.strip(),flush=True)

def main():
    locked=check_inputs();cfg=read(HERE/'production_config_v1.json');outputs=[]
    for asset in cfg['assets']:
        folder=ARENA/asset['slug'];rel=folder.relative_to(ROOT).as_posix()
        if (folder/'manifest.json').exists():
            assert read(folder/'manifest.json').get('status')!='approved','Approved sprites cannot be rebuilt'
        measured={};scales={};images={}
        for key,source in asset['sources'].items():
            measured[key]=measure(source);images[key]=Image.open(ROOT/source['file']).convert('RGBA')
            ref=median(body_height(measured[key][i],images[key],asset['key'],key) for i in source['referenceIndices'])
            scales[key]=asset['height']/ref
            print(asset['slug'],key,'reference',ref,'fixed scale',round(scales[key],4),flush=True)
        concept_sha=sha(ROOT/asset['concept']);frames=[];tags=[]
        for direction in DIRECTIONS:
            for state,default in INDICES.items():
                tag=state+'_'+direction;override=asset['overrides'].get(tag)
                key=override['source'] if override else direction
                indices=override['indices'] if override else default
                first=len(frames)
                for index,source_index in enumerate(indices):
                    item=dict(measured[key][source_index])
                    if asset['key']=='brute' and state!='death': item['foot']=hoof_anchor(item,images[key])
                    if asset['key']=='cultist' and state=='death':
                        item['foot']=[round(item['rect'][0]+item['rect'][2]/2),item['foot'][1]]
                    item.update(name=tag+'_'+str(index),file=asset['sources'][key]['file'],scale=scales[key],
                        durationMs=asset['timings'][state]/len(indices),sourceConcept=asset['concept'],
                        sourceConceptSha256=concept_sha,selectedComponent=source_index,sourceKey=key)
                    frames.append(item)
                tags.append({'name':tag,'from':first,'to':len(frames)-1})
        recipe={'id':asset['id'],'folder':rel,'canvas':asset['canvas'],'pivot':asset['pivot'],'frames':frames,'tags':tags,
            'scalePolicy':'Fixed scale per original directional source; body-only hood reference excludes staff; brute hoof anchors exclude low axe blade; fallen cultist centered on whole attached body/staff.'}
        recipe_path=folder/'source/extraction_v1.json';write(recipe_path,recipe)
        run(['-b','--script-param','root='+ROOT.as_posix(),'--script-param','recipe='+recipe_path.as_posix(),
            '--script',ROOT/'sprites/creeps/arena/assemble.lua'])
        run(['-b',folder/'source'/(asset['id']+'.aseprite'),'--list-tags','--list-slices','--sheet-type','rows',
            '--sheet-columns','10','--filename-format','{tag}_{tagframe}','--format','json-hash',
            '--sheet',folder/'spritesheet.png','--data',folder/'atlas.json'])
        atlas=read(folder/'atlas.json');atlas['meta']['image']='spritesheet.png';write(folder/'atlas.json',atlas)
        assert len(atlas['frames'])==64 and len(tags)==20
        audits=[]
        for f in frames:
            p=folder/'frames'/(f['name']+'.png')
            with Image.open(p) as im:
                alpha=im.getchannel('A');b=alpha.getbbox();w,h=im.size
                assert list(im.size)==asset['canvas'] and b and 0<b[0]<b[2]<w and 0<b[1]<b[3]<h,(p,b)
                assert set(alpha.tobytes())<={0,255} and alpha.getextrema()==(0,255),p
            audits.append({'name':f['name'],'file':p.relative_to(ROOT).as_posix(),'sha256':sha(p),'bounds':list(b),
                'sourceConcept':asset['concept'],'sourceConceptSha256':concept_sha,'sourceImage':f['file'],
                'selectedComponent':f['selectedComponent'],'sourceFoot':f['foot']})
        animations=[];animation_audit=[]
        for tag in tags:
            selected=frames[tag['from']:tag['to']+1];state,direction=tag['name'].rsplit('_',1)
            names=[f['name'] for f in selected]
            unique=len({f['sha256'] for f in audits if f['name'] in names});assert unique==len(names),(tag,unique)
            animations.append({'state':state,'direction':direction,'frames':names,'frameRate':len(names)*1000/asset['timings'][state],
                'repeat':-1 if state in ['idle','walk'] else 0})
            animation_audit.append({'tag':tag['name'],'frames':len(names),'distinctDrawings':unique})
        w,h=asset['canvas'];px,py=asset['pivot']
        manifest={'id':asset['id'],'wave':asset['wave'],'nameVi':asset['nameVi'],'phase':'1H','status':'prototype',
            'reviewStatus':'PRODUCED_PENDING_RUNTIME_REVIEW','sourceConcept':asset['concept'],'sourceConceptSha256':concept_sha,
            'masterConcept':cfg['masterConcept'],'conceptApproval':cfg['conceptApproval'],'source':rel+'/source/'+asset['id']+'.aseprite',
            'sheet':'spritesheet.png','atlas':'atlas.json','frameWidth':w,'frameHeight':h,'bodyHeight':asset['height'],
            'footPivot':[px/w,py/h],'directions':DIRECTIONS,'authoredStates':list(INDICES),'animations':animations,'frames':audits,
            'animationAudit':animation_audit,'sourceScales':scales,'generatedSources':asset['sources'],'runtimeIntegration':False,
            'rejectedSourceFrames':{'right_v1.png':[10,14]} if asset['key']=='cultist' else {},
            'provenance':'Original AI-assisted raster poses using approved concept images directly. Aseprite extracts masked generated pixels, removes alpha below220, preserves retained RGB, uses fixed nearest source scales and aligns feet. No concept-board crops used as frames; no commercial sprite pack or exclusive copyright claim.',
            'notes':['Right cultist attack/death use the corrected single-staff source.'] if asset['key']=='cultist' else []}
        write(folder/'manifest.json',manifest)
        outputs.append({'id':asset['id'],'wave':asset['wave'],'slug':asset['slug'],'manifest':rel+'/manifest.json','frames':64})
    count=check_inputs();assert count==locked
    write(HERE/'production_manifest_v1.json',{'phase':'1H','status':'PRODUCED_PENDING_RUNTIME_REVIEW','assets':outputs,
        'totalFrames':256,'totalAnimationTags':80,'approvedFilesUnchanged':locked})
    print('PASS:256 distinct PNG frames,80 animation tags,alpha/bounds and approved input hashes.',flush=True)

if __name__=='__main__': main()
