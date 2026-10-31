"""Validate actual Võ Đang source/export frames and locked concept; no artwork mutation."""
from pathlib import Path
import hashlib,json
from PIL import Image
root=Path(__file__).resolve().parents[1]
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
concept=root/'assets/concepts/heroes/vo-dang'
approval=json.loads((concept/'concept_manifest_v01.json').read_text(encoding='utf-8'))
assert approval['approvedConceptFilename']=='vo-dang-concept-v01.png'
assert digest(concept/approval['approvedConceptFilename'])==approval['outputs'][0]['sha256']
lock_path=root/'assets/approved_vo_dang.lock.json'
lock=json.loads(lock_path.read_text(encoding='utf-8')) if lock_path.exists() else None
if lock:
    for name,expected in lock['files'].items():
        assert digest(root/name)==expected, 'Approved Vo Dang baseline changed: '+name
runtime=json.loads((root/'assets/manifest.json').read_text(encoding='utf-8'))
report={'approvedFilesVerified':len(lock['files']) if lock else 0,'conceptApproved':True,'conceptSha256':digest(concept/approval['approvedConceptFilename']),'assets':[]}
for asset_id,style in [('hero_vo_dang','quyen'),('hero_vo_dang_kiem','kiem')]:
    entry=next(a for a in runtime['assets'] if a['id']==asset_id)
    assert entry['status'] in ['prototype','approved'] and entry['footPivot']==[0.5,0.8]
    if entry['status']=='approved':
        assert lock and entry['approvalLock']=='assets/approved_vo_dang.lock.json'
        assert entry['approvalScope']==['idle','walk','basic_attack']
    assert (root/entry['source']).is_file()
    image_path=root/'assets/exports'/entry['sheet']
    atlas_path=root/'assets/exports'/entry['atlas']
    with Image.open(image_path) as im:im.verify()
    image=Image.open(image_path);image.load()
    assert image.mode=='RGBA' and image.size==((960 if style=='kiem' else 800),320)
    assert set(image.getchannel('A').getdata())=={0,255}
    atlas=json.loads(atlas_path.read_text())
    assert len(atlas['frames'])==40 and len(atlas['meta']['frameTags'])==12
    assert atlas['meta']['slices'][0]['keys'][0]['pivot']=={'x':48 if style=='kiem' else 40,'y':64}
    bounds=[];hashes=[]
    for direction in ['down','left','right','up']:
        for state,count,ms in [('idle',2,350),('walk',4,120),('basic_attack',4,75)]:
            tag=next(t for t in atlas['meta']['frameTags'] if t['name']==f'{state}_{direction}')
            names=[f'{state}_{direction}_{i}' for i in range(count)]
            assert list(atlas['frames'])[tag['from']:tag['to']+1]==names
            tag_hashes=[]
            for name in names:
                data=atlas['frames'][name];f=data['frame'];x,y,w,h=(f[k] for k in ['x','y','w','h'])
                assert (w,h)==(96 if style=='kiem' else 80,80) and data['duration']==ms
                assert 0<=x and x+w<=image.width and 0<=y and y+h<=320
                frame=image.crop((x,y,x+w,y+h));b=frame.getchannel('A').getbbox()
                assert b and b[0]>0 and b[1]>0 and b[2]<w and 63<=b[3]<=65,(name,b)
                single=root/f'assets/exports/characters/vo_dang_v01/{style}/frames/{name}.png'
                with Image.open(single) as png:assert png.size==(w,h) and png.convert('RGBA').tobytes()==frame.tobytes()
                fingerprint=hashlib.sha256(frame.tobytes()).hexdigest();tag_hashes.append(fingerprint);hashes.append(fingerprint)
                bounds.append({'name':name,'alphaBounds':list(b),'durationMs':ms,'sha256':fingerprint})
            assert len(set(tag_hashes))==count,'Duplicate animation frames: '+tag['name']
    assert len(set(hashes))==40,'Duplicate source cels'
    assert len(entry['animations'])==24
    report['assets'].append({'id':asset_id,'frames':40,'tags':12,'canvas':[entry['frameWidth'],80],'footPivotPx':[entry['frameWidth']//2,64],'alpha':[0,255],'atlasSha256':digest(atlas_path),'pngSha256':digest(image_path),'sourceSha256':digest(root/entry['source']),'frameDetails':bounds})
out=root/'assets/source/characters/vo_dang_v01/export_validation_v01.json'
out.write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
print('PASS: approved character lock and concept hash; 80 distinct authored PNG cels, 24 tags, binary alpha, bounds/no clipping, foot baseline64 with <=1px raster edge tolerance, durations, individual PNG/atlas equality and source paths.')
