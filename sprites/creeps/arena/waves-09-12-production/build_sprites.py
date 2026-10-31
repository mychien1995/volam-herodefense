"""Build only Phase 1F candidates. Pillow inspects pixels; Aseprite edits/exports."""
from pathlib import Path
from statistics import median
from PIL import Image
import hashlib,json,subprocess,sys,importlib.util
ROOT=Path(__file__).resolve().parents[4]
HERE=Path(__file__).resolve().parent
ARENA=HERE.parent
DIRECTIONS=['down','left','right','up']
BINARY=Path('C:/Program Files/Aseprite/Aseprite.exe')
sys.dont_write_bytecode=True
spec=importlib.util.spec_from_file_location('approved_pixel_analysis',ARENA/'build_sprites.py')
analysis=importlib.util.module_from_spec(spec);spec.loader.exec_module(analysis)
def read(p):return json.loads(p.read_text(encoding='utf-8'))
def write(p,data):p.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def baseline():
    lock=read(HERE/'approved_inputs_lock.json')
    for name,sha in lock['records'].items():
        assert digest(ROOT/name)==sha,'Approved input changed: '+name
    return len(lock['records'])
def measure(source):
    items=analysis.components(ROOT/source['file'],source['expected'])
    height=Image.open(ROOT/source['file']).height
    rows=[[] for _ in range(source['rows'])]
    for item in items:
        bounds=item['rect']
        row=min(source['rows']-1,int((bounds[1]+bounds[3]/2)/height*source['rows']))
        rows[row].append(item)
    assert all(len(row)==source['cols'] for row in rows),(source['file'],[len(row) for row in rows])
    items=[item for row in rows for item in sorted(row,key=lambda f:f['rect'][0]+f['rect'][2]/2)]
    return items
def run(args):
    result=subprocess.run([str(BINARY),*args],capture_output=True,text=True)
    if result.returncode:raise RuntimeError(result.stdout+result.stderr)
    if result.stdout.strip():print(result.stdout.strip(),flush=True)
def main():
    count=baseline();cfg=read(HERE/'production_config_v1.json');assets=[]
    for asset in cfg['assets']:
        folder=ARENA/asset['slug'];rel=folder.relative_to(ROOT).as_posix()
        if (folder/'manifest.json').exists():
            old=read(folder/'manifest.json')
            assert old.get('status')!='approved' and old.get('reviewStatus')!='APPROVED','Approved production is locked'
        (folder/'frames').mkdir(exist_ok=True)
        concept_hash=digest(ROOT/asset['concept']);measured={};scales={}
        for key,source in asset['sources'].items():
            if not source['used']:continue
            items=measure(source);measured[key]=items
            indices=source.get('heightReferenceIndices',list(range(source['expected'])))
            reference_height=source.get('bodyHeightPx') or median([items[i]['rect'][3] for i in indices])
            scales[key]=asset['targetHeight']/reference_height*source.get('scaleFactor',1)
        frames=[];tags=[]
        for row,direction in enumerate(DIRECTIONS):
            selected=asset['directionSources'][direction];main_key=selected['key'];offset=selected['row']*asset['sources'][main_key]['cols']
            for state,default in [('idle',[0,1]),('walk',[2,3,4,5]),('basic_attack',[6,7,8,9]),('hurt',[0,1]),('death',[2,3,4,5])]:
                tag_name=state+'_'+direction
                if state in ('hurt','death'):
                    key='reaction';indices=[row*6+i for i in default]
                else:
                    key=main_key
                    indices=[offset+i for i in asset['selections'].get(tag_name,default)]
                override=asset['overrides'].get(tag_name)
                if override:key=override['key'];indices=override['indices']
                total_ms={'idle':700,'walk':480,'basic_attack':300,'hurt':280,'death':560}[state]
                start=len(frames)
                for number,source_index in enumerate(indices):
                    item=dict(measured[key][source_index])
                    item.update(name=tag_name+'_'+str(number),file=asset['sources'][key]['file'],
                        scale=scales[key],durationMs=total_ms/len(indices),sourceConcept=asset['concept'],
                        sourceConceptSha256=concept_hash,selectedComponent=source_index,sourceKey=key)
                    if asset.get('hoverGap') and state!='death':
                        item['foot']=list(item['foot'])
                        item['foot'][1]+=asset['hoverGap']/item['scale']
                    frames.append(item)
                tags.append({'name':tag_name,'from':start,'to':len(frames)-1})
        recipe=dict(id=asset['id'],folder=rel,canvas=asset['canvas'],pivot=asset['pivot'],frames=frames,tags=tags,
            scalePolicy='Fixed source scale, feet aligned; source pixel masks exclude adjacent sprites')
        recipe_path=folder/'source/extraction_v1.json'
        recipe_path.write_text(json.dumps(recipe,separators=(',',':'))+'\n')
        run(['-b','--script-param',f'root={ROOT.as_posix()}','--script-param',f'recipe={recipe_path.as_posix()}','--script',str(ARENA/'assemble.lua')])
        run(['-b',str(folder/'source'/f'{asset["id"]}.aseprite'),'--list-tags','--list-slices','--sheet-type','rows',
             '--sheet-columns','10','--filename-format','{tag}_{tagframe}','--format','json-hash',
             '--sheet',str(folder/'spritesheet.png'),'--data',str(folder/'atlas.json')])
        atlas=read(folder/'atlas.json');atlas['meta']['image']='spritesheet.png';write(folder/'atlas.json',atlas)
        names=list(atlas['frames']);assert len(names)==len(frames) and len(tags)==20
        audits=[]
        for frame in frames:
            path=folder/'frames'/(frame['name']+'.png')
            with Image.open(path) as im:
                alpha=im.getchannel('A');bounds=alpha.getbbox();cw,ch=asset['canvas']
                assert im.size==tuple(asset['canvas']) and bounds and alpha.getextrema()==(0,255),path
                assert 0<bounds[0]<bounds[2]<cw and 0<bounds[1]<bounds[3]<ch,(path,bounds)
                assert set(alpha.tobytes())<={0,255},path
            audits.append(dict(name=frame['name'],file=path.relative_to(ROOT).as_posix(),bounds=list(bounds),sha256=digest(path),
                sourceConcept=asset['concept'],sourceConceptSha256=concept_hash,sourceImage=frame['file'],selectedComponent=frame['selectedComponent']))
        animations=[];sequence_audit=[]
        for tag in tags:
            state,direction=tag['name'].rsplit('_',1);selected=names[tag['from']:tag['to']+1]
            unique=len({a['sha256'] for a in audits if a['name'] in selected})
            assert unique>=2,(asset['id'],tag['name'],'No authored motion')
            animations.append(dict(state=state,direction=direction,frames=selected,frameRate=1000/atlas['frames'][selected[0]]['duration'],repeat=-1 if state in ['idle','walk'] else 0))
            sequence_audit.append(dict(tag=tag['name'],frames=len(selected),distinctDrawings=unique))
        cw,ch=asset['canvas'];px,py=asset['pivot']
        manifest=dict(id=asset['id'],nameVi=asset['nameVi'],phase='1F',category='enemy',status='prototype',reviewStatus='STAGED_NOT_INTEGRATED',
            conceptApproval=cfg['conceptApproval'],sourceConcept=asset['concept'],sourceConceptSha256=concept_hash,
            masterConcept=cfg['masterConcept'],source=f'{rel}/source/{asset["id"]}.aseprite',sheet='spritesheet.png',atlas='atlas.json',
            frameWidth=cw,frameHeight=ch,footPivot=[px/cw,py/ch],authoredStates=['idle','walk','basic_attack','hurt','death'],
            directions=DIRECTIONS,animations=animations,frames=audits,animationAudit=sequence_audit,
            generatedSources=asset['sources'],sourceScales=scales,notes=asset['notes'],runtimeIntegration=False,
            provenance='Original AI-assisted generated raster poses, approved concept images provided directly. Aseprite extracts masked generated pixels, removes alpha below220, preserves source RGB, normalizes retained alpha, applies fixed nearest-neighbour source scale and aligns feet. No concept pixels used as animation frames; no commercial sprite pack, separate third-party license or exclusive copyright claimed.',
            verification='Awaiting isolated Phaser review; production owner approval pending')
        write(folder/'manifest.json',manifest)
        assets.append(dict(id=asset['id'],slug=asset['slug'],nameVi=asset['nameVi'],frames=len(frames),
            canvas=asset['canvas'],sourceConcept=asset['concept'],manifest=f'{rel}/manifest.json'))
    baseline()
    write(HERE/'production_manifest_v1.json',dict(phase='1F',status='STAGED_NOT_INTEGRATED',assets=assets,
        totalFrames=sum(a['frames'] for a in assets),totalAnimationTags=80,approvedFilesUnchanged=count))
    print('PASS: five states/four facings, PNG bounds/alpha, atlas tags, authored motion and '+str(count)+' approved-file hashes.',flush=True)
if __name__=='__main__':main()

