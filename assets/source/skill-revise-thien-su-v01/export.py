"""Reuse repo assembler; all final roots come from explicit registered source overrides."""
from pathlib import Path
import json,sys
import numpy as np
ROOT=Path(__file__).resolve().parents[3]
sys.path.insert(0,str(ROOT/'tools'))
import hero_unified_assets as assembly
src=Path(__file__).resolve().parent
cfg=json.loads((src/'profile.json').read_text())
assert len(cfg['poseOverrides'])==len(cfg['poses'])*8,'Need complete explicit source roots before full export'
original=assembly.body_root
fallback=[]
def prepass(image,prone=False,mode='brown',bodyColumnTop=False):
    try:return original(image,prone,mode,bodyColumnTop)
    except AssertionError:
        # Original classifier assumes brown soles; this guarded prepass is never
        # the final anchor because this task's profile overrides EVERY cel.
        a=np.array(image)[:,:,3]>=24;y,x=np.nonzero(a)
        assert len(x)
        fallback.append({'imageSize':list(image.size),'reason':'old foot classifier; final exact sourceRoot override used'})
        return float(np.median(x)),float(y.max()),float(y.min())
assembly.body_root=prepass
assembly.export_profile(src/'profile.json')
(src/'export-prepass.json').write_text(json.dumps({'finalRoots':'all496 explicit registered overrides','fallbacks':fallback},indent=2)+'\n')
