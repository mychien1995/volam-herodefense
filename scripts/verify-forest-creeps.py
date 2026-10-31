"""Read-only validation of real forest PNG/atlas/source exports and protected inputs."""
from pathlib import Path
from PIL import Image
import argparse, hashlib, json, struct
R=Path(__file__).resolve().parents[1]
C=R/'assets/sprites/creeps/dungeons/forest'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def verify_actor(m):
    assert m['status']=='candidate' and not m['directorApproved'] and not m['runtimeIntegrated']
    assert (R/m['sourceConcept']).is_file()
    atlas=json.loads((R/m['atlas']).read_text('utf8'))
    sheet=Image.open(R/m['sheet']).convert('RGBA');sheet.load()
    assert len(atlas['frames'])==len(m['frames'])==64
    assert len(m['animations'])==20
    names=set()
    hashes=set()
    for a in m['animations']:
        assert a['direction'] in ['down','left','right','up'] and a['frameRate']>0
        count={'idle':2,'walk':4,'basic_attack':4,'hurt':2,'death':4}[a['state']]
        assert len(a['frames'])==count
        assert a['repeat']==(-1 if a['state'] in ['idle','walk'] else 0)
        for name in a['frames']:
            assert name not in names;names.add(name)
            f=atlas['frames'][name];b=f['frame'];x,y,w,h=[b[k] for k in ['x','y','w','h']]
            assert 0<=x<x+w<=sheet.width and 0<=y<y+h<=sheet.height
            assert (w,h)==(m['frameWidth'],m['frameHeight'])
            frame=next(v for v in m['frames'] if v['name']==name)
            p=R/frame['file'];assert sha(p)==frame['sha256']
            im=Image.open(p).convert('RGBA');im.load()
            assert im.tobytes()==sheet.crop((x,y,x+w,y+h)).tobytes()
            alpha=im.getchannel('A');assert set(alpha.getdata())<={0,255}
            box=alpha.getbbox();assert box and box[0]>0 and box[1]>0 and box[2]<w and box[3]<h,(m['id'],name,box)
            assert abs(f['duration']-1000/a['frameRate'])<.01
            hashes.add(hashlib.sha256(im.tobytes()).hexdigest())
    assert len(hashes)>=56, 'Too many duplicate cels: '+m['id']
    header=(R/m['source']).read_bytes()[:128]
    assert struct.unpack_from('<H',header,4)[0]==0xA5E0
    assert struct.unpack_from('<H',header,6)[0]==64
    assert m['footPivot']==[.5,106/128] and m['displayScale']==1
    for source in m['generatedSources']:assert sha(R/source['path'])==source['sha256']
    return {'id':m['id'],'frames':len(names),'distinctCels':len(hashes),'tags':len(m['animations']),'source':m['source'],'scale':m['sourceScales']}
def main():
    p=argparse.ArgumentParser();p.add_argument('--enemy');args=p.parse_args()
    batch=json.loads((C/'forest_manifest_v01.json').read_text('utf8'))
    assets=[a for a in batch['assets'] if not args.enemy or a['typeId']==args.enemy]
    assert assets
    if not args.enemy:assert len(assets)==6,'Full forest validation requires all six creatures'
    results=[verify_actor(a) for a in assets]
    protected={}
    for name in ['approved_bamboo_forest.lock.json','approved_cai_bang.lock.json']:
        lock=json.loads((R/'assets'/name).read_text('utf8'))
        for file,h in lock['files'].items():assert sha(R/file)==h,file
        protected[name]=len(lock['files'])
    effect_count=0
    fx=R/'assets/effects/dungeons/forest/manifest.json'
    if not args.enemy:assert fx.exists(),'Full forest validation requires the VFX manifest'
    if fx.exists():
        m=json.loads(fx.read_text('utf8'));atlas=json.loads((R/m['atlas']).read_text('utf8'))
        assert len(m['sequences'])==28 and len(m['frames'])==112 and len(atlas['frames'])==112
        assert not m['directorApproved'] and not m['runtimeIntegrated']
        header=(R/m['source']).read_bytes()[:128]
        assert struct.unpack_from('<H',header,4)[0]==0xA5E0 and struct.unpack_from('<H',header,6)[0]==112
        for source in m['generatedSources']:assert sha(R/source['path'])==source['sha256']
        sheet=Image.open(R/m['sheet']).convert('RGBA')
        for seq in m['sequences']:
            assert len(seq['frames'])==4 and seq['durationMs']>0
            assert seq['origin']==[.5,.5] and len(seq['offset'])==2
            for name in seq['frames']:
                f=atlas['frames'][name]['frame'];x,y,w,h=[f[k] for k in ['x','y','w','h']]
                assert 0<=x<x+w<=sheet.width and 0<=y<y+h<=sheet.height
                im=sheet.crop((x,y,x+w,y+h));alpha=im.getchannel('A');box=alpha.getbbox()
                assert box and box[0]>0 and box[1]>0 and box[2]<w and box[3]<h
                assert set(alpha.getdata())<={0,255}
                frame=next(a for a in m['frames'] if a['name']==name)
                assert sha(R/frame['file'])==frame['sha256']
                assert im.tobytes()==Image.open(R/frame['file']).convert('RGBA').tobytes()
                effect_count+=1
    jobs=json.loads((C/'source/generation_prompts_v01.json').read_text('utf8'))
    for job in jobs:
        assert sha(R/job['projectPath'])==job['sha256']
        for path,h in job['referenceHashes'].items():assert sha(R/path)==h,path
    public=R/'apps/game-client/public/assets/forest_creep_review'
    for a in assets:
        for source,name in [(a['sheet'],'spritesheet.png'),(a['atlas'],'atlas.json')]:
            dest=public/a['typeId']/name
            if dest.exists():assert sha(dest)==sha(R/source),str(dest)
    if fx.exists():
        for key,name in [('sheet','spritesheet.png'),('atlas','atlas.json')]:
            dest=public/'effects'/name
            if dest.exists():assert sha(dest)==sha(R/m[key]),str(dest)
    runtime_path=public/'runtime-manifest.json'
    runtime_summary=None
    if runtime_path.exists():
        runtime=json.loads(runtime_path.read_text('utf8'))
        assert runtime['status']=='candidate' and not runtime['directorApproved'] and not runtime['normalForestRosterIntegrated']
        assert len(runtime['assets'])==6 and len(runtime['effects'])==28
        for path,h in runtime['files'].items():assert sha(R/path)==h,path
        for a in runtime['assets']:
            assert a['id']=='forest_'+a['archetypeId'] and a['displayScale']==1
            source_atlas=json.loads((R/a['atlas']).read_text('utf8'))
            for anim in a['animations']:
                assert anim['durations']==[source_atlas['frames'][f]['duration'] for f in anim['frames']]
        original_fx=json.loads(fx.read_text('utf8'))
        for a in runtime['effects']:
            original=next(s for s in original_fx['sequences'] if 'forest_fx:'+s['name']==a['id'])
            for key in ['frames','origin','offset','placement','repeat','stage','ownerTypeId']:assert a[key]==original[key]
            assert a['durations']==[original['durationMs']]*4
        runtime_summary={'actors':6,'effects':28,'normalForestRosterIntegrated':False,'directorApproved':False}
    report={'status':'PASS','scope':'Static files only; candidate art, no gameplay or director approval',
            'actors':results,'characterFrames':sum(a['frames'] for a in results),'effectFrames':effect_count,'protectedInputs':protected}
    if runtime_summary:report['runtimeAdapter']=runtime_summary
    out=R/('docs/evidence/forest-creep-runtime-2026-10-31/static-validation.json' if runtime_summary else 'assets/reviews/forest_creeps_v01/static_validation.json')
    out.parent.mkdir(parents=True,exist_ok=True);out.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n','utf8')
    print(json.dumps(report,ensure_ascii=False),flush=True)
if __name__=='__main__':main()
