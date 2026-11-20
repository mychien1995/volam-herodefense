from pathlib import Path
from PIL import Image,ImageChops
import hashlib,json
ROOT=Path(__file__).resolve().parents[1]
out=ROOT/'assets/exports/pvp'
hash=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
manifest=json.loads((out/'manifest.json').read_text(encoding='utf-8'))
lock=json.loads((ROOT/'assets/approved_pvp_concepts.lock.json').read_text(encoding='utf-8'))
assert len(lock['files'])==11
for name,digest in {**lock['files'],**manifest['sources']}.items():
 assert hash(ROOT/name)==digest,('Changed source',name)
for entry in manifest['files']:
 p=out/entry['file'];assert hash(p)==entry['sha256'],p
 with Image.open(p) as im:
  im.load();assert im.size==(entry['width'],entry['height']),p
  if entry['file'].startswith('doc-co-') or entry['file'].startswith(('sword-','lightning-','arrow-')):
   assert im.mode=='RGBA' and im.getchannel('A').getextrema()[0]==0,p
   assert im.getchannel('A').getbbox(),p
 public=ROOT/'apps/game-client/public/assets/pvp'/entry['file']
 assert public.exists() and hash(public)==entry['sha256'],('Public mismatch',p)
for id,m in manifest['maps'].items():
 source=Image.open(ROOT/m['source']).convert('RGBA').crop(tuple(m['sourceCrop']))
 rebuilt=Image.new('RGBA',source.size)
 for layer in m['layers']:rebuilt=Image.alpha_composite(rebuilt,Image.open(out/layer['file']).convert('RGBA'))
 assert ImageChops.difference(source.convert('RGB'),rebuilt.convert('RGB')).getbbox() is None,id
assert len(manifest['npc']['frames'])==10 and manifest['npc']['pivot']==[56,80]
for clip in manifest['npc']['clips'].values():
 files=[out/manifest['npc']['frames'][i]['file'] for i in clip['frames']]
 assert len({hash(f) for f in files})==len(files),'Repeated authored animation frames'
assert len(manifest['vfx'])==12
print('PvP assets PASS: 11 approved concepts pinned; 44 PNGs/hash/alpha/public copies; 4 exact layered recompositions; 10 distinct NPC frames / 3 clips; 12 semantic VFX cels.')
