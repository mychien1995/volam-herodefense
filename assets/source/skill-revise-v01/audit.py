"""Final asset provenance/PNG/native metadata audit; no combat acceptance claim."""
from pathlib import Path
from PIL import Image
import json,hashlib,re
ROOT=Path(__file__).resolve().parents[3]
SRC=Path(__file__).resolve().parent
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
approval=json.loads((ROOT/'assets/approvals/skill-revise/concepts-2026-11-22.json').read_text())
for f in approval['files']:assert sha(ROOT/f['path'])==f['sha256'],f['path']
plan=json.loads((SRC/'reuse-and-integration-plan.json').read_text(encoding='utf-8'))
for f in plan['retainedFiles']:assert (ROOT/f).is_file(),f
cp=ROOT/'assets/reviews/skill-revise-v01/catalogue.json';cat=json.loads(cp.read_text(encoding='utf-8'))
assert len(cat['packs'])==20
labels={'thien-su':'Côn Luân Thiền Sư · búa mới','cai-bang-fire-body':'Hỏa Long · body','thien-son-retreat-body':'Phong Quyển · giật lùi','thien-son-gust-body':'Phong Quyển · phất quạt','co-quan-air-body':'Cơ Quan · thư viện tư thế bay','co-quan-air-q':'Cơ Quan · Q trên không','co-quan-air-e':'Cơ Quan · E trên không','fire-dragon':'Hỏa Long · đầu rồng','fire-impact':'Hỏa Long · nổ cuối','fire-trail':'Hỏa Long · vệt lửa trang trí','wind-gust':'Phong Quyển · gió xuyên','wind-gather':'Phong Quyển · gom gió','sonic-wave':'Huyền Âm · sóng âm','ink-impact':'Huyền Âm · nổ mực','sword-rain-impact':'Thất Tinh · kiếm rơi và nổ','lightning-parry':'Ngũ Lôi · phản sét','lightning-star':'Thần Long · trận ngôi sao','ice-bomb':'Cơ Quan · bom băng và lông vũ','laser-ground':'Cơ Quan · laze và chạm đất','revised-icons':'Bốn icon đã duyệt'}
count=0;clip_count=0;pack_hashes=[]
for p in cat['packs']:
    p['label']=labels[p['id']]
    png=ROOT/p['sourcePng'];atlas=ROOT/p['sourceAtlas']
    with Image.open(png) as im:im.verify()
    with Image.open(png) as im:assert im.mode=='RGBA' and max(im.size)<=4096
    frames=json.loads(atlas.read_text())['frames'];names=[n for c in p['clips'] for n in c['frames']]
    assert len(set(names))==len(frames)==len(names),(p['id'],'missing/duplicate animation frame coverage')
    assert set(names)==set(frames)
    count+=len(frames);clip_count+=len(p['clips'])
    pack_hashes.append({'id':p['id'],'png_sha256':sha(png),'atlas_sha256':sha(atlas),'frames':len(frames)})
assert count==872
native=json.loads((SRC/'native-validation.json').read_text())
assert native['status']=='PASS' and native['frames']==376 and len(native['packs'])==19
thien=json.loads((ROOT/'assets/source/skill-revise-thien-su-v01/native-validation.json').read_text())
assert thien['directions']==8 and thien['nativeFrames']==496
assert thien['bodyPNG']==sha(ROOT/'assets/exports/skill-revise-thien-su-v01/body.png')
assert thien['nativeSha256']==sha(ROOT/'assets/source/skill-revise-thien-su-v01/body.aseprite')
warnings=json.loads((ROOT/'assets/exports/skill-revise-v01/validation.json').read_text())['warnings']
assert all(w['id']=='EXTRA_SOURCE_ROWS_RETAINED' for w in warnings),warnings
sources=[]
for folder in [SRC/'raw',ROOT/'assets/source/skill-revise-thien-su-v01/raw',ROOT/'assets/source/skill-revise-thien-su-v01/raw/repairs',ROOT/'assets/source/skill-revise-thien-su-v01/iterations']:
    for p in sorted(folder.glob('*.png')):
        with Image.open(p) as im:size=list(im.size)
        sources.append({'path':str(p.relative_to(ROOT)).replace('\\','/'),'sha256':sha(p),'dimensions':size})
(SRC/'source-hashes.json').write_text(json.dumps({'art_source':'host_image except explicitly noted icon crops','raw_and_iteration_sources':sources,'model':None,'cost':None},indent=2)+'\n')
cp.write_text(json.dumps(cat,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
links=0
for doc in [ROOT/'docs/SKILL_REVISE_ASSET_PRODUCTION.md',ROOT/'assets/reviews/skill-revise-v01/README.md']:
    for target in re.findall(r'\]\(([^)]+)\)',doc.read_text(encoding='utf-8')):
        if '://' in target or target.startswith('#'):continue
        assert (doc.parent/target.split('#')[0]).exists(),(doc,target)
        links+=1
report={'status':'PASS','scope':'PNG/atlas frame coverage, native provenance hashes, concept locks and documentation links; not gameplay','banks':20,'frames':count,'clips':clip_count,'nativeFrames':872,'conceptLocks':10,'links':links,'warnings':warnings,'packs':pack_hashes,'runtimeIntegrated':False,'newAnimationDirectorApproved':False}
(SRC/'audit.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({k:report[k] for k in ['status','banks','frames','clips','nativeFrames','warnings']}))
