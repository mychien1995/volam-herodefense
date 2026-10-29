"""Verify the real prototype sheets and all animation frames; Pillow is authoring-only."""
from pathlib import Path
from PIL import Image
import json
root=Path(__file__).resolve().parent.parent
manifest=json.loads((root/'assets/manifest.json').read_text(encoding='utf-8'))
frames=0
for asset in manifest['assets']:
    assert (root/asset['source']).is_file()
    assert asset['status']=='prototype' and 'Original' in asset['license']
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
            assert (w,h)==(48,48) and x+w<=image.width and y+h<=image.height
            assert image.crop((x,y,x+w,y+h)).getchannel('A').getbbox(), (asset['id'],key)
            frames+=1
print(f"PASS: {len(manifest['assets'])} original prototype PNGs, {frames} nonempty character frames, atlas bounds/provenance valid")
