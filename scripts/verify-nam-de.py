from pathlib import Path
import json,hashlib
root=Path(__file__).resolve().parents[1]
lock=json.loads((root/'assets/approved_nam_de_feedback03.lock.json').read_text(encoding='utf8'))
for path,expected in lock['files'].items():
 assert hashlib.sha256((root/path).read_bytes()).hexdigest()==expected,path
art=json.loads((root/'apps/game-client/src/nam-de-art.generated.json').read_text(encoding='utf8'))
assert len(art['bundles']['boss']['frames'])==208
assert len(art['bundles']['boss']['clips'])==52
assert art['bundles']['boss']['origin']==[.5,88/112]
for package in art['bundles'].values():
 for ext in ['png','json']:
  assert (root/package['base'].lstrip('/')).with_suffix('.'+ext).read_bytes()==(root/'apps/game-client/public/assets/nam_de'/f"{package['key']}.{ext}").read_bytes()
print('Nam De: pinned feedback03 source bytes, 208 cels, pivot, runtime copies PASS')

from PIL import Image
image=Image.open(root/'apps/game-client/public/assets/nam_de/feedback01.png')
assert [image.crop((i*192,0,(i+1)*192,128)).getbbox() for i in range(4)]==[(58,45,134,82),(11,39,181,89),(6,33,186,95),(11,29,180,98)]
print('Nam De: measured ring alpha bounds match runtime placement')
