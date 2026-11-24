"""Canonical check for the integrated three-stage Thiền Sư raster revision."""
from pathlib import Path
import runpy,hashlib
ROOT=Path(__file__).resolve().parent.parent
runpy.run_path(str(ROOT/'assets/source/skill-revise-thien-su-v06/verify.py'),run_name='__main__')
runpy.run_path(str(ROOT/'assets/source/skill-revise-thien-su-v07/verify.py'),run_name='__main__')
runpy.run_path(str(ROOT/'assets/source/skill-revise-thien-su-v08/verify.py'),run_name='__main__')
for name in ['body.png','body.json']:
 source=ROOT/'assets/exports/skill-revise-thien-su-v06/hammer-combo-v6'/name
 public=ROOT/'apps/game-client/public/assets/skill-revise-thien-su-v06/hammer-combo-v6'/name
 assert public.exists() and hashlib.sha256(source.read_bytes()).digest()==hashlib.sha256(public.read_bytes()).digest(),public
print('Thiền Sư v06 source/native/public exports verified.')
for name in ['body.png','body.json']:
 source=ROOT/'assets/exports/skill-revise-thien-su-v07/hammer-combo-v7'/name
 public=ROOT/'apps/game-client/public/assets/skill-revise-thien-su-v07/hammer-combo-v7'/name
 assert public.exists() and hashlib.sha256(source.read_bytes()).digest()==hashlib.sha256(public.read_bytes()).digest(),public
print('Thiền Sư v07 source/native/public exports verified.')
for name in ['body.png','body.json']:
 source=ROOT/'assets/exports/skill-revise-thien-su-v08/hammer-sweep-v8'/name
 public=ROOT/'apps/game-client/public/assets/skill-revise-thien-su-v08/hammer-sweep-v8'/name
 assert public.exists() and hashlib.sha256(source.read_bytes()).digest()==hashlib.sha256(public.read_bytes()).digest(),public
print('Thiền Sư v08 source/native/public exports verified.')
