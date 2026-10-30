"""Verify the real prototype sheets and all animation frames; Pillow is authoring-only."""
from pathlib import Path
from PIL import Image
import json
root=Path(__file__).resolve().parent.parent
manifest=json.loads((root/'assets/manifest.json').read_text(encoding='utf-8'))
frames=0
for asset in manifest['assets']:
    assert (root/asset['source']).is_file()
    assert asset['status'] in ['prototype','approved'] and 'Original' in asset['license']
    image=Image.open(root/'assets/exports'/asset['sheet']);image.load()
    assert image.mode=='RGBA' and image.getchannel('A').getbbox(), asset['id']
    if asset.get('columns'):
        w,h=asset['frameWidth'],asset['frameHeight']
        assert image.size==(w*asset['columns'],h),asset['id']
        assert len(asset['frames'])==asset['columns'],asset['id']
        for i,key in enumerate(asset['frames']):
            assert image.crop((i*w,0,(i+1)*w,h)).getchannel('A').getbbox(),(asset['id'],key)
    if 'atlas' not in asset: continue
    atlas=json.loads((root/'assets/exports'/asset['atlas']).read_text())
    assert image.size==(atlas['meta']['size']['w'],atlas['meta']['size']['h'])
    assert len(asset['animations'])==24
    for anim in asset['animations']:
        for key in anim['frames']:
            frame=atlas['frames'][key]['frame']; x,y,w,h=(frame[k] for k in ('x','y','w','h'))
            assert (w,h)==(asset['frameWidth'],asset['frameHeight']) and x>=0 and y>=0 and x+w<=image.width and y+h<=image.height
            assert image.crop((x,y,x+w,y+h)).getchannel('A').getbbox(), (asset['id'],key)
            frames+=1
    if asset['id'].startswith('hero_cai_bang'):
        total=44 if asset['id']=='hero_cai_bang' else 40
        assert len(atlas['frames'])==total and len(atlas['meta']['frameTags'])==12
        assert set(image.getchannel('A').getdata())=={0,255}, 'Generated haze remains'
        assert atlas['meta']['slices'][0]['keys'][0]['pivot']=={'x':40,'y':64}
        for direction in asset['directions']:
            for state,standard_count in [('idle',2),('walk',4),('basic_attack',4)]:
                count=6 if asset['id']=='hero_cai_bang' and state=='basic_attack' and direction in ['left','right'] else standard_count
                tag=next(t for t in atlas['meta']['frameTags'] if t['name']==f'{state}_{direction}')
                assert tag['to']-tag['from']+1==count
                names=[f'{state}_{direction}_{i}' for i in range(count)]
                assert list(atlas['frames'])[tag['from']:tag['to']+1]==names
                hashes=set()
                for key in names:
                    b=atlas['frames'][key]['frame'];crop=image.crop((b['x'],b['y'],b['x']+b['w'],b['y']+b['h']))
                    assert crop.getchannel('A').getbbox(),key
                    hashes.add(crop.tobytes())
                assert len(hashes)==count, f'Duplicate poses in {state}_{direction}'
print(f"PASS: {len(manifest['assets'])} runtime PNG entries, {frames} frame references, bounds/provenance valid; approved Bong 44 / Chuong 40 source poses, tags, binary alpha and pivots verified")
