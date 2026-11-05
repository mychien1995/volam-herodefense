"""Verify runtime packing is pixel-identical to all director-approved preview cels."""
import json,sys
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[1]
plan=json.loads((root/'assets/source/renovation-v1/runtime-layout.json').read_text('utf8'))
catalog=json.loads((root/'assets/exports/renovation-v1/catalog.json').read_text('utf8'))
assert len(plan)==74 and {item['actor']['id'] for item in plan}=={a['id'] for a in catalog['assets']}
actors=[];old_area=new_area=0
for item in plan:
    actor=item['actor'];path=root/f"assets/exports/renovation-v1/runtime/{actor['id']}"
    atlas=json.loads(path.with_suffix('.json').read_text('utf8'))
    original=Image.open(root/item['source']).convert('RGBA');packed=Image.open(path.with_suffix('.png')).convert('RGBA')
    old_area+=original.width*original.height;new_area+=packed.width*packed.height
    assert len(item['frames'])==20 and len(atlas['frames'])==20
    for cel in item['frames']:
        s=cel['source'];r=atlas['frames'][cel['name']]['frame']
        f=atlas['frames'][cel['name']];t=cel['trim']
        assert f['sourceSize']=={'w':actor['canvas'][0],'h':actor['canvas'][1]}
        assert f['spriteSourceSize']=={'x':t[0],'y':t[1],'w':t[2]-t[0],'h':t[3]-t[1]}
        assert f['duration']==cel['duration'] and f['trimmed'] and not f['rotated']
        assert original.crop((s[0],s[1],s[0]+s[2],s[1]+s[3])).tobytes()==packed.crop((r['x'],r['y'],r['x']+r['w'],r['y']+r['h'])).tobytes()
    actors.append({k:actor[k] for k in ['id','name','group','biome','height','canvas','pivot','legacyRatio']})
manifest={'actors':actors,'scenes':catalog['scenes']}
manifest_path=root/'apps/game-client/src/renovation-art.generated.json'
manifest_text=json.dumps(manifest,ensure_ascii=False,indent=2)+'\n'
if '--write-manifest' in sys.argv:
    if not manifest_path.exists() or manifest_path.read_text(encoding='utf8')!=manifest_text: manifest_path.write_text(manifest_text,encoding='utf8')
else: assert manifest_path.read_text(encoding='utf8')==manifest_text, 'Runtime manifest is stale; run export-renovation-runtime.mjs'
report={'status':'PASS','actors':74,'pixelIdenticalCels':1480,'previewPixels':old_area,'runtimePixels':new_area,'runtimeGpuMiB':round(new_area*4/1024**2,2)}
out=root/'docs/evidence/renovation-runtime';out.mkdir(parents=True,exist_ok=True)
report_path=out/'packing.json';report_text=json.dumps(report,indent=2)+'\n'
if not report_path.exists() or report_path.read_text(encoding='utf8')!=report_text: report_path.write_text(report_text,encoding='utf8')
print(json.dumps(report))
