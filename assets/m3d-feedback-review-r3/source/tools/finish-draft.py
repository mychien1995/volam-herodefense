"""Record provenance and protected input checks; never edit approved assets."""
from pathlib import Path
import json, hashlib

ROOT=Path(__file__).resolve().parents[4]
BASE=ROOT/'assets/m3d-feedback-review-r3'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def read(p):return json.loads(p.read_text(encoding='utf-8'))
def save(p,v):p.write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def rel(p):return p.relative_to(ROOT).as_posix()

before=read(BASE/'previews/protected-inputs-before.json')
results=[]
for old in before['locks']:
    p=ROOT/old['lock']; assert sha(p)==old['lockSha256']
    files=read(p)['files']
    for f,h in files.items():assert sha(ROOT/f)==h,f
    results.append(dict(lock=old['lock'],filesChecked=len(files),passUnchanged=True,lockSha256=sha(p)))
approval=ROOT/'assets/m3d-feedback-visual/director_approval_r2.json'
assert read(approval)['visualApproved']
assert read(approval)['lockSha256']==results[0]['lockSha256']
local_lock=BASE/'approved_ca_diep_batch01.lock.json'
if local_lock.exists():
    for f,h in read(local_lock)['files'].items():assert sha(ROOT/f)==h,f
    record=read(BASE/'director_approval_ca_diep_batch01.json')
    assert record['lockSha256']==sha(local_lock) and record['visualApproved']
    results.append(dict(lock=rel(local_lock),filesChecked=len(read(local_lock)['files']),passUnchanged=True,lockSha256=sha(local_lock)))
save(BASE/'previews/protected-inputs-after.json',dict(status='PASS',results=results))
records=read(BASE/'source/generation_records.json')['records']
stun=read(BASE/'source/stun_generation_record.json')
records=[r for r in records if r['id']!=stun['id']]+[stun]
save(BASE/'source/generation_records.json',dict(records=records))
for r in records:
    assert (ROOT/r['workspaceSource']).is_file()
manifest=read(BASE/'manifest.json')
save(BASE/'provenance.json',dict(status='keypose-draft-awaiting-concept-approval',
    origin='Original raster generated using built-in image_gen; exact prompts and timings in source/generation_records.json',
    license='Project-generated original candidates; retained Shaolin support inherits existing provenance. No third-party art/audio/code imported.',
    referenceRole='Approved Shaolin concept and r2 contact as identity/style; DOTA named only as director-provided idea',
    sourceRecords='source/generation_records.json',
    referenceHashes=before['references'],
    retainedSupport=dict(sheet='assets/m3d-feedback-visual/previews/support/hero_thieu_lam.png',
        atlas='assets/m3d-feedback-visual/previews/support/hero_thieu_lam.json',tags=['idle_'+d for d in ['right','down','left','up']]),
    processing='Retained connected-alpha measurement; alpha>=220 export; fixed source scale; approved Shaolin palette match; retained Aseprite raster assembler, no painted geometry.',
    editableSources=[c['sourceFile'] for c in manifest['components']],
    originalLayersRecovered=False,
    generationElapsedMs=sum(r['elapsedMs'] for r in records),
    directorApproved=False,productionIntegrated=False,phaserProductionVerified=False,
    superseded='Old Ca Diep sweeping-lunge choreography remains historical only. Not selected here.'))
files=[]
for p in sorted(BASE.rglob('*')):
    if p.is_file() and p!=BASE/'file_inventory.json':files.append(dict(path=rel(p),bytes=p.stat().st_size,sha256=sha(p)))
save(BASE/'file_inventory.json',dict(scope='All files in this independent package except inventory itself',files=files))
print(json.dumps(dict(status='PASS',protected=[r['filesChecked'] for r in results],packageFiles=len(files),generationRequests=len(records))))
