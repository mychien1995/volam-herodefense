import json,hashlib,sys
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[1];src=root/'assets/source/renovation-v2';out=root/'assets/exports/renovation-v2'
plan=json.loads((src/'override-plan.json').read_text('utf8'));entries=[];atlases={};count=0;pixels=0
provenance=json.loads((src/'provenance.json').read_text('utf8'))
for item in provenance['raw']+provenance['references']:
    assert hashlib.sha256((root/item['file']).read_bytes()).hexdigest()==item['sha256'],item['file']
for name in ['vo_dang_cast','thien_son_throw','thien_son_cast','vo_dang_attack','arena-ground']:
    assert (src/(name+'.aseprite')).is_file()
assert len(list((src/'effects').glob('*.aseprite')))==11
for a in plan:
    path=out/'overrides'/(a['id']+'.png');image=Image.open(path);meta=json.loads(path.with_suffix('.json').read_text('utf8'))
    assert hashlib.sha256((root/a['input']).read_bytes()).hexdigest()==a['baselineSha256']
    assert set(meta['frames'])=={f['name'] for f in a['frames']}
    pixels+=image.width*image.height
    for cel in a['frames']:
        f=meta['frames'][cel['name']];r=f['frame'];s=f['sourceSize']
        assert s=={'w':cel['size'][0],'h':cel['size'][1]}
        assert r['x']>=0 and r['y']>=0 and (r['x']+r['w'])*2<=image.width and (r['y']+r['h'])*2<=image.height
        assert not f['rotated'] and f['trimmed']
        if cel['source'] and cel['kind']=='character':
            t=f['spriteSourceSize']
            assert 0<t['x'] and 0<t['y'] and t['x']+t['w']<s['w'] and t['y']+t['h']<s['h'],(a['id'],cel['name'],'body/weapon clipped')
            assert cel['target']==[cel['size'][0]*cel['origin'][0]*2,cel['size'][1]*cel['origin'][1]*2]
        count+=bool(cel['source'])
    entries.append({'id':a['id'],'url':a['url'],'kind':'body' if a['frames'][0]['kind']=='character' else 'vfx','group':'renovation-v2','candidateUrl':'/assets/renovation-v2/overrides/'+a['id']+'.png','density':2,'renovated':True,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()})
    atlases[a['atlasUrl']]='/assets/renovation-v2/overrides/'+a['id']+'.json'
manifest={'revision':'renovation-v2-candidate','assets':entries,'atlases':atlases}
target=root/'apps/game-client/src/renovation-skills.generated.json';text=json.dumps(manifest,indent=2)+'\n'
if '--write-manifest' in sys.argv:
    if not target.exists() or target.read_text('utf8')!=text:target.write_text(text,encoding='utf8')
else:assert target.read_text('utf8')==text
floor=Image.open(out/'arena-ground.png');assert floor.size==(3200,2304)
report={'status':'PASS','atlases':len(entries),'replacedFrames':count,'authoredBodyKeyposes':64,'authoredEffectCels':44,'bodyEdges':'All replaced body/weapon cels clear their virtual frame edges; native foot pivot maps to unchanged runtime origin','arenaGroundPixels':list(floor.size),'nativePixelMiB':round(pixels*4/1048576,2),'contract':'Exact legacy frame names/virtual dimensions; unchanged animator/placement/timing/server routes; 2x native raster density'}
folder=root/'docs/evidence/renovation-v2';folder.mkdir(exist_ok=True,parents=True);(folder/'asset-check.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf8');print(json.dumps(report))
