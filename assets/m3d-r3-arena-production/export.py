"""Lossless atlas metadata only: source raster bytes are never rewritten."""
import json, hashlib
from pathlib import Path
from PIL import Image
root = Path(__file__).parent
source = root/'source/scenery-r1.png'
im = Image.open(source)
names = ['hl_command','hl_yurt','hl_gate','hl_tower','hl_drum','cm_male','cm_female','cm_altar','cm_lantern','cm_gate','kl_gate','kl_tower','kl_wall_h','kl_wall_v','kl_banner','kl_barracks']
boxes = [(14,14,326,307),(340,62,599,291),(619,51,947,295),(1006,8,1216,306),(57,368,275,620),(333,316,585,624),(649,329,889,623),(946,335,1234,618),(92,644,227,921),(319,673,618,918),(638,672,929,916),(979,636,1213,920),(11,998,308,1227),(380,946,560,1238),(715,946,849,1237),(942,996,1237,1229)]
frames = {}
for name,(l,t,r,b) in zip(names,boxes):
    # Bounding boxes inspected against connected alpha islands; 2px padding.
    x,y=max(0,l-2),max(0,t-2)
    w,h=min(im.width,r+2)-x,min(im.height,b+2)-y
    frames[name]={'frame':{'x':x,'y':y,'w':w,'h':h},'rotated':False,'trimmed':False,'spriteSourceSize':{'x':0,'y':0,'w':w,'h':h},'sourceSize':{'w':w,'h':h}}
(root/'scenery.json').write_text(json.dumps({'frames':frames,'meta':{'image':'scenery.png','size':{'w':im.width,'h':im.height},'scale':'1'}},indent=2)+'\n')
(root/'provenance.json').write_text(json.dumps({'id':'m3d-r3-arena-production-r1','status':'runtime director review pending','source':'source/scenery-r1.png','sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'generator':'built-in image_gen, 2026-11-02, 85.2s','originalArt':True,'thirdPartyGameArt':False,'references':['../m3d-feedback-review-r3/batch03-remaining/source/generated/arena_'+n+'.png' for n in ['hong_liet','ly_mac_sau','kim_luan']],'prompt':'prompt.txt','processing':'Lossless rectangle atlas metadata only; original RGBA raster unchanged. No resize, recolor, animation or procedural drawing.','frames':list(frames),'runtime':'Retained authored tile layers and authoritative scaled collision/spawn layout; individually replace matching landmark sprites, feet/Y depth, no flattened concept background.'},indent=2)+'\n')
print(f'{len(frames)} original isolated scenery frames, source raster unchanged')
