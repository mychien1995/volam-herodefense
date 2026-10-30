"""Read-only validation of the produced visual slice and protected character bytes."""
from pathlib import Path
from PIL import Image
import hashlib, json, struct

ROOT=Path(__file__).resolve().parent.parent
def verify():
    sources=[]
    for folder in ['arena_v2','dungeon_cards']:
        for file in (ROOT/'assets/source'/folder).glob('*.aseprite'):
            header=file.read_bytes()[:128]
            assert struct.unpack_from('<H',header,4)[0]==0xA5E0,file
            frames,width,height=struct.unpack_from('<HHH',header,6)
            assert frames>0 and width>0 and height>0
            sources.append(str(file.relative_to(ROOT)))
    assert len(sources)==6
    ground=Image.open(ROOT/'assets/exports/arena_v2/ground.png')
    assert ground.size==(1600,1152) and ground.mode=='RGBA'
    assert ground.getchannel('A').getextrema()==(255,255)
    for id in ['forest','desert','sea','hell']:
        image=Image.open(ROOT/f'assets/exports/dungeon_cards/{id}.png')
        assert image.size==(512,768) and image.mode=='RGBA'
        assert image.getchannel('A').getextrema()==(255,255)
        meta=json.loads((ROOT/f'assets/exports/dungeon_cards/{id}.json').read_text())
        assert list(meta['frames'])==[id]
        f=meta['frames'][id]['frame']
        assert f==dict(x=2,y=2,w=512,h=768)
        atlas=Image.open(ROOT/f'assets/exports/dungeon_cards/{id}_atlas.png')
        assert atlas.size==(516,772)
        assert atlas.crop((2,2,514,770)).tobytes()==image.tobytes()
        assert len(meta['meta']['layers'])==3
    paving=Image.open(ROOT/'assets/exports/arena_v2/paving.png')
    assert paving.size==(128,32)
    paving_meta=json.loads((ROOT/'assets/exports/arena_v2/paving.json').read_text())
    assert list(paving_meta['frames'])==[f'paving_{i}' for i in range(1,5)]
    for i,frame in enumerate(paving_meta['frames'].values()):
        assert frame['frame']==dict(x=i*32,y=0,w=32,h=32)
        assert frame['duration']>0
    lock=json.loads((ROOT/'assets/approved_cai_bang.lock.json').read_text())
    for name,digest in lock['files'].items():
        assert hashlib.sha256((ROOT/name).read_bytes()).hexdigest()==digest,name
    print('PASS: 6 editable Aseprite sources, 1600x1152 opaque ground, 4 separate 512x768 cards/atlases, 32px paving, protected character hashes')
if __name__=='__main__':verify()
