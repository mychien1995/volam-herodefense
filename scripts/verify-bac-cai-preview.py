"""Static source/PNG/atlas checks for the final-brief art prototype only."""
from pathlib import Path
import json, hashlib
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
approval=json.loads((ROOT/'assets/reviews/bosses/bac_cai_v03/director_approval.json').read_text(encoding='utf-8'))
lock=json.loads((ROOT/'assets/approved_bac_cai.lock.json').read_text(encoding='utf-8'))
assert approval['status']=='approved_visual_preview_v03_for_phaser_integration'
assert approval['finalGameRuntimeArtApproved'] is False
for path,expected in lock['files'].items():
    assert hashlib.sha256((ROOT/path).read_bytes()).hexdigest()==expected,'Approved visual changed: '+path
BASE=ROOT/'assets/sprites/bosses/main/bac-cai/rework-v02'
manifest=json.loads((BASE/'manifest.json').read_text(encoding='utf-8'))
def sha(path): return hashlib.sha256(path.read_bytes()).hexdigest()
for item in manifest['sourceHashes']+manifest['protectedExistingAssets']:
    assert sha(ROOT/item['path'])==item['sha256'], 'Changed source/protected old asset: '+item['path']
count=0
for folder,aid,size,pivot in [('character','bac_cai_rework_character',(160,112),(80,88)),('dog','bac_cai_black_dog',(96,80),(48,64)),('vfx','bac_cai_rework_vfx',(192,192),(96,96))]:
    path=BASE/folder
    atlas=json.loads((path/(aid+'.json')).read_text())
    meta=json.loads((path/(aid+'.animations.json')).read_text())
    sheet=Image.open(path/(aid+'.png')).convert('RGBA')
    assert tuple(meta['frameSize'])==size and tuple(meta['pivot'])==pivot
    used=[]
    for clip in meta['animations']:
        assert len(clip['frames'])==4 and clip['durationMs']>0
        assert clip['animationTimingOnly'] and not clip['authoritativeHitEvents']
        used+=clip['frames']
    assert len(used)==len(set(used))==len(atlas['frames'])
    hashes=[]
    for name,record in atlas['frames'].items():
        frame=Image.open(path/'frames'/(name+'.png')).convert('RGBA')
        assert frame.size==size
        bounds=frame.getbbox();assert bounds and bounds[0]>0 and bounds[1]>0 and bounds[2]<size[0] and bounds[3]<size[1], (name,bounds)
        assert set(frame.getchannel('A').getdata())<={0,255},name
        q=record['frame'];cut=sheet.crop((q['x'],q['y'],q['x']+q['w'],q['y']+q['h']))
        assert cut.tobytes()==frame.tobytes(),name
        hashes.append(sha(path/'frames'/(name+'.png')))
        count+=1
    assert len(hashes)==len(set(hashes)), 'Duplicated new cels'
assert count==52 and len(manifest['protectedExistingAssets'])==425
V03=BASE.parent/'rework-v03'
beam=json.loads((V03/'manifest.json').read_text(encoding='utf-8'))
assert sha(ROOT/beam['source'])==beam['sourceSha256']
for item in beam['assets']:
    assert sha(ROOT/item['path'])==item['sha256'],item['path']
atlas=json.loads((V03/'bac_cai_beam_v03.json').read_text())
sheet=Image.open(V03/'bac_cai_beam_v03.png').convert('RGBA')
assert beam['frameCount']==4 and beam['frameSize']==[768,128] and beam['runtimeScale']==1
for name,entry in atlas['frames'].items():
    frame=Image.open(V03/'frames'/(name+'.png')).convert('RGBA');b=frame.getbbox()
    assert b and b[2]-b[0]>=690 and b[2]-b[0]<=701 and b[1]>0 and b[3]<128
    assert set(frame.getchannel('A').getdata())<={0,255}
    f=entry['frame'];assert sheet.crop((f['x'],f['y'],f['x']+f['w'],f['y']+f['h'])).tobytes()==frame.tobytes()
print(f'Bắc Cái preview PASS: {count+4} supplementary frames / 14 clips; native-width beam; 425 old files unchanged; source hashes, alpha, pivots and atlas pixels verified.')
