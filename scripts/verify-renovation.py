"""Read-only raster/atlas validation for the complete Renovation v1 preview."""
import hashlib
import json
from collections import Counter
from pathlib import Path
from PIL import Image

root=Path(__file__).resolve().parents[1]
source=root/'assets/source/renovation-v1'
exports=root/'assets/exports/renovation-v1'
catalog=json.loads((source/'catalog.json').read_text(encoding='utf8'))
runtime=json.loads((exports/'catalog.json').read_text(encoding='utf8'))
assert {a['id'] for a in runtime['assets']}=={a['id'] for a in catalog['actors']}
assert len(runtime['assets'])==74 and len(runtime['scenes'])==9
report={'status':'candidate','actors':[],'scenes':[],'skillsUnchanged':False,'recording':False}
for actor in runtime['assets']:
    if actor.get('reuse'):
        sheet=root/actor['reuse']['sheet']; atlas=root/actor['reuse']['atlas']
    else:
        sheet=exports/(actor['id']+'.png'); atlas=exports/(actor['id']+'.json')
        assert (source/'editable'/(actor['id']+'.aseprite')).is_file()
    image=Image.open(sheet).convert('RGBA')
    metadata=json.loads(atlas.read_text(encoding='utf8'))
    frames=metadata['frames']
    boxes={}; hashes={}
    for direction in ['down','left','right','up']:
        walk=[]
        for state,count in [('idle',1),('walk',4)]:
            for index in range(count):
                name=f'{state}_{direction}_{index}'
                frame=frames[name]['frame']; x,y,w,h=[frame[k] for k in ['x','y','w','h']]
                assert x>=0 and y>=0 and x+w<=image.width and y+h<=image.height
                cel=image.crop((x,y,x+w,y+h)); alpha=cel.getchannel('A')
                box=alpha.point(lambda a:255 if a>=96 else 0).getbbox()
                assert box and box[0]>1 and box[1]>1 and box[2]<w-1 and box[3]<h-1,(actor['id'],name,box)
                assert alpha.getpixel((0,0))==0 and alpha.getpixel((w-1,h-1))==0
                assert sum(alpha.histogram()[1:255])>0,('Lost all edge alpha',actor['id'],name)
                boxes[name]=list(box)
                if state=='walk': walk.append(hashlib.sha256(cel.tobytes()).hexdigest())
        assert len(set(walk))==4,('Repeated walk cel',actor['id'],direction)
        hashes[direction]=walk
    report['actors'].append({'id':actor['id'],'group':actor['group'],'frames':20,'canvas':actor['canvas'],'pivot':actor['pivot'],'bounds':boxes,'walkHashes':hashes,'sha256':hashlib.sha256(sheet.read_bytes()).hexdigest()})
for scene in runtime['scenes']:
    ground=root/'assets/exports'/scene['ground'].removeprefix('/assets/')
    assert Image.open(ground).size==(1478,1064)
    assert len(scene['props'])==6
    for prop in scene['props']:
        path=root/'assets/exports'/prop['image'].removeprefix('/assets/')
        image=Image.open(path).convert('RGBA')
        assert image.size==(384,384)
        assert image.getchannel('A').getpixel((0,0))==0
        assert image.getchannel('A').getbbox()
    report['scenes'].append({'id':scene['id'],'props':6,'ground':[1478,1064]})
baseline=json.loads((source/'skill-baseline.json').read_text(encoding='utf8'))
entries=baseline if isinstance(baseline,list) else baseline.get('files',baseline)
if isinstance(entries,list): entries={entry['path']:entry['sha256'] for entry in entries}
for path,expected in entries.items():
    digest=expected if isinstance(expected,str) else expected['sha256']
    assert hashlib.sha256((root/path).read_bytes()).hexdigest()==digest,('Skill changed',path)
report['skillsUnchanged']=True
review=root/'assets/reviews/renovation-v1';review.mkdir(exist_ok=True,parents=True)
(review/'asset-verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print('PASS',len(report['actors']),'actor forms;',Counter(a['group'] for a in report['actors']),'; 8 new scenes + accepted hub; all original skills unchanged')
