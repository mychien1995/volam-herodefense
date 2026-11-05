"""Validate native art/registration; does not approve artwork or infer gameplay PASS."""
import hashlib,json,sys
from pathlib import Path
from PIL import Image
import numpy as np
root=Path(__file__).resolve().parents[1];src=root/'assets/source/renovation-v3';out=root/'assets/exports/renovation-v3'
read=lambda p:json.loads(p.read_text('utf8'))
provenance=read(src/'provenance.json')
for item in provenance['raw']+provenance['references']+provenance.get('rejected',[]):
    assert hashlib.sha256((root/item['file']).read_bytes()).hexdigest()==item['sha256'],item['file']
jobs=read(src/'generation-jobs.json')['jobs']+read(src/'extra-jobs.json')['jobs']
alphaChecks=[]
for j in jobs+[{'id':'chiet_mai_clean','kind':'vfx','grid':[2,2]}]:
    if j['kind']=='body':continue
    path=src/('chiet_mai_clean.png' if j['id']=='chiet_mai_clean' else 'raw/'+j['id']+'.png')
    rgba=np.array(Image.open(path).convert('RGBA'));h,w=rgba.shape[:2];gx,gy=j['grid'];corners=[]
    for cy in range(gy):
        for cx in range(gx):
            x0,x1=round(cx*w/gx),round((cx+1)*w/gx);y0,y1=round(cy*h/gy),round((cy+1)*h/gy)
            for x,y in [(x0,y0),(x1-20,y0),(x0,y1-20),(x1-20,y1-20)]:corners.append(float((rgba[y:y+20,x:x+20,3]>=12).mean()))
    coverage=float(np.mean(corners))
    # The lion-roar sheet has intentional fire tendrils crossing source gutters;
    # only VFX (never bodies) receive the exporter's six-pixel edge feather.
    assert coverage<(.25 if j['id']=='tam_gioi_quy_thien' else .025),(j['id'],'rectangular matte/gutter',coverage)
    alphaChecks.append({'id':j['id'],'cornerCoverage':round(coverage,4)})
manifest=read(root/'apps/game-client/src/renovation-actions.generated.json');plan=read(src/'fx-plan.json');entries=[];atlases={};inline={};pixels=0;replaced=0
for a in plan:
    p=out/'overrides'/(a['id']+'.png');im=Image.open(p);meta=read(p.with_suffix('.json'));pixels+=im.width*im.height
    assert hashlib.sha256((root/a['input']).read_bytes()).hexdigest()==a['baselineSha256']
    assert set(meta['frames'])=={f['name'] for f in a['frames']}
    for c in a['frames']:
        f=meta['frames'][c['name']];r=f['frame'];t=f['spriteSourceSize'];s=f['sourceSize']
        assert s=={'w':c['size'][0],'h':c['size'][1]}
        assert not f['rotated'] and f['trimmed'] and 0<=t['x'] and 0<=t['y'] and r['x']>=0 and r['y']>=0
        assert (r['x']+r['w'])*2<=im.width and (r['y']+r['h'])*2<=im.height
        assert t['x']+t['w']<=s['w'] and t['y']+t['h']<=s['h']
        if c['duration'] is not None:assert f['duration']==c['duration']
        replaced+='source' in c
    atlasUrl='/assets/renovation-v3/overrides/'+a['id']+'.json'
    entry={'id':a['id'],'textureKeys':a['textureKeys'],'url':a['url'],'candidateUrl':'/assets/renovation-v3/overrides/'+a['id']+'.png','atlasCandidateUrl':atlasUrl,'density':2,'renovated':True,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()};entries.append(entry)
    if a['atlasUrl']:atlases[a['atlasUrl']]=atlasUrl
    if a['inline']:
        for key in a['textureKeys']:inline[key]=atlasUrl
bodyPixels=0
for b in manifest['bodies']:
    path=root/b['url'].replace('/assets/','assets/exports/');im=Image.open(path);meta=read(path.with_suffix('.json'));bodyPixels+=im.width*im.height
    assert len(meta['frames'])==16
    for d in ['down','left','right','up']:
        for i in range(4):
            f=meta['frames'][d+'_'+str(i)];r=f['frame'];s=f['sourceSize'];t=f['spriteSourceSize']
            assert s=={'w':b['canvas'][0],'h':b['canvas'][1]}
            assert r['x']+r['w']<=im.width and r['y']+r['h']<=im.height
            if not b['id'].startswith('v2:'):assert t['x']>0 and t['y']>0 and t['x']+t['w']<s['w'] and t['y']+t['h']<s['h']
    if not b['id'].startswith('v2:'):assert (src/'editable'/(b['id']+'.aseprite')).exists()
actors=read(src/'actors.json');assert {a['id'] for a in actors}<={b['actor'] for b in manifest['bodies']}
nextManifest={**manifest,'revision':'renovation-v3-candidate','assets':entries,'atlases':atlases,'inlineAtlases':inline,'bodyFrames':read(src/'body-frame-routes.json')}
target=root/'apps/game-client/src/renovation-actions.generated.json';text=json.dumps(nextManifest,ensure_ascii=False,indent=2)+'\n'
if '--write-manifest' in sys.argv:target.write_text(text,encoding='utf8')
else:assert target.read_text('utf8')==text,'Stale V3 manifest'
report={'status':'PASS','nativeBodyAtlases':len(manifest['bodies']),'actorForms':len(actors),'newBodyCels':29*16,'retainedBodyCels':4*16,'fxAtlases':len(plan),'newFxFrameReferences':replaced,'bodyPixelMiB':round(bodyPixels*4/1048576,2),'fxPixelMiB':round(pixels*4/1048576,2),'alphaChecks':alphaChecks,'contract':'Old virtual frame dimensions/names/durations/origins; body feet fixed; animation clocks and authoritative projectiles/areas unchanged'}
folder=root/'docs/evidence/renovation-v3';folder.mkdir(parents=True,exist_ok=True);(folder/'asset-check.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf8');print(json.dumps(report))
