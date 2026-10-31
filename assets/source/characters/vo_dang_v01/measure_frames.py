"""Measure generated source poses for Aseprite assembly; never draws character art."""
from pathlib import Path
import json
import numpy as np
from PIL import Image

folder = Path(__file__).resolve().parent
sources = json.loads((folder / 'source_components_v01.json').read_text())
models = {}
for key, source in sources.items():
    pixels = np.asarray(Image.open(folder / source['source']).convert('RGBA'))
    feet = []
    for entry in source['frames']:
        x0, y0, x1, y1 = entry['bounds']
        # Broad dark shoe/trouser runs, excluding a thin silver sword/outline.
        low = []
        for y, a, b in entry['runs']:
            if y < y1 - (y1-y0)*0.16:
                continue
            row = (pixels[y,a:b,:3].max(axis=1) < 145)
            changes = np.flatnonzero(np.diff(np.r_[False,row,False].astype(np.int8)))
            for c,d in zip(changes[::2],changes[1::2]):
                if d-c >= 14:
                    low.append((y,a+int(c),a+int(d)))
        assert low, key
        bottom = max(v[0] for v in low)+1
        # Includes both feet over the final 16% of the pose, not only the leading toe.
        cx = round((min(v[1] for v in low)+max(v[2] for v in low))/2)
        feet.append([cx,bottom])
    if key.startswith('walk_'):
        height = float(np.median([p[1]-f['bounds'][1] for p,f in zip(feet,source['frames'])]))
    else:
        height = float(np.mean([feet[i][1]-source['frames'][i]['bounds'][1] for i in [0,1]]))
    models[key] = {'scale':round(44/height,8),'bodyHeightReferencePx':height,'feet':feet,'mirror':False}

frames = []
for style in ['quyen','kiem']:
    for direction in ['down','left','right','up']:
        base = direction+'_'+style
        for state, indexes, ms in [('idle',[0,1],350),('walk',[0,1,2,3],120),('basic_attack',[6,7,8,9],75)]:
            for frame,index in enumerate(indexes):
                key=base
                if state=='walk':
                    key='walk_'+direction
                    index += 4 if style=='kiem' else 0
                    if direction=='up' and frame==2:
                        key='walk_up_reverse';index=1 if style=='kiem' else 0
                if base=='right_kiem' and state=='basic_attack':
                    if frame in [1,2]: key='right_kiem_attack_clearance';index=frame-1
                    elif frame==3: index=8 # Nine components: middle contact/follow-through touched and are rejected.
                source=sources[key];entry=source['frames'][index];model=models[key]
                frames.append({'style':style,'direction':direction,'state':state,'frame':frame,'name':f'{state}_{direction}_{frame}','source':key,'component':index,'scale':model['scale'],'sourceFoot':model['feet'][index],'durationMs':ms})

layout={'canvasByStyle':{'quyen':[80,80],'kiem':[96,80]},'pivotByStyle':{'quyen':[40,64],'kiem':[48,64]},'alphaThreshold':220,'sourceMeasurements':models,'frames':frames,
 'method':'Fixed scale per generated source strip; broad dark shoe-run foot measurement, with explicit visual-review overrides retained below. No per-frame fitting, mirroring or illustration drawing.'}
(folder/'frame_sources_v01.json').write_text(json.dumps(layout,indent=2)+'\n')
for key,model in models.items():print(key,model)
print('Measured',len(frames),'selected frames')
