"""Batch02 provenance, frame inventory and approved-input guard; metadata only."""
from pathlib import Path
import json,hashlib
ROOT=Path(__file__).resolve().parents[5]
BASE=ROOT/'assets/m3d-feedback-review-r3/batch02-pha-giap-bong'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def read(p):return json.loads(p.read_text(encoding='utf-8'))
def save(p,v):p.write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def rel(p):return p.relative_to(ROOT).as_posix()
before=read(BASE/'previews/protected-before.json');checks=[]
for check in before['locks']:
    p=ROOT/check['lock'];assert sha(p)==check['sha256']
    for f,h in read(p)['files'].items():assert sha(ROOT/f)==h,f
    checks.append(check)
assert sha(BASE/'previews/support/hero_cai_bang_idle.png')==sha(ROOT/'assets/exports/characters/hero_cai_bang_idle.png')
save(BASE/'previews/protected-after.json',dict(status='PASS',locks=checks,retainedBaselineExactCopy=True))
m=read(BASE/'manifest.json');records=read(BASE/'source/generation_records.json')['records']
approval_file=BASE/'director_approval_pha_giap_review3.json'
approved=False
if approval_file.exists():
    register=read(approval_file);lock=ROOT/register['lock']
    assert sha(lock)==register['lockSha256']
    for f,h in read(lock)['files'].items():assert sha(ROOT/f)==h,f
    approved=register['visualApproved']
for name in ['spin_generation_record.json','long_ground_generation_record.json']:
    record=BASE/'source'/name
    if not record.exists():continue
    item=read(record)
    if name=='spin_generation_record.json':item['status']='historical-superseded-by-user-no-spin'
    records=[r for r in records if r['id']!=item['id']]+[item]
    save(BASE/'source/generation_records.json',dict(records=records))
save(BASE/'provenance.json',dict(status='visual-approved-production-pending' if approved else 'keypose-draft-awaiting-director',
    origin='Original image_gen raster candidates; exact prompts/references/timings in source/generation_records.json',
    sourceRecords='source/generation_records.json',sources=[dict(path=r['source'],sha256=sha(ROOT/r['source']),status=r['status']) for r in records],
    references=before['references'],generationElapsedMs=sum(r['elapsedMs'] for r in records),
    retainedSupport='Exact protected Cai Bang idle raster for scale only; no new approval claimed',
    processing='Retained connected-alpha measurement, fixed body scale, manual source-shoe anchors, reviewed palette, retained Aseprite raster assembler. No recovered original layers asserted.',
    editableSources=[c['sourceFile'] for c in m['components']],directorApproved=approved,productionIntegrated=False,phaserProductionVerified=False))
handoff=dict(skillId='pha_giap_bong',revision=m['revision'],status='visual-approved-production-pending' if approved else m['status'],directorApproved=approved,productionIntegrated=False,
    phaserProductionVerified=False,selectedTags=m['selectedTags'],
    facingAxes=dict(right=[1,0],down=[0,1],left=[-1,0],up=[0,-1]),
    phaseOrder=['raise','strike','recovery'],spinRemoved=True,
    removedPhases=['body spin','VFX spin ring','charge','separate elongate hold'],
    body=dict(component=m['components'][0]['id'],feetPivot=[128,148],canvas=[256,192],placement='caster feet; no locomotion'),
    effects=dict(component=m['components'][1]['id'],effectAnchor=[256,256],canvas=[512,512],
        placement='Per-clip placementOffsetFromFeet: impact/outro near-end ground seam relative to feet',
        groundRegistration='Measured near-end bright seam; do not use bbox height percentage as ground anchor. Horizontal seam lies6px below feet in this review fixture.',
        lifecycle='intro/loop/impact/outro are cosmetic phases; bind actual action/cancel state after approval'),
    previewOnlyReachMultiplier=1.5,gameplayRangeChanged=False,
    timing=dict(raiseMs=280,strikeMs=220,recoveryMs=240,authority='cosmetic review fixture only'),
    excludes=['r2 foot_explosion for this rework','projectile travel','animation-derived damage/range/cooldown'],
    cleanup=['cancel','death','travel','facing-change','new cast','complete'])
save(BASE/'handoff.json',handoff)
rows=['component,tag,facing,phase,frame,index,duration_ms,pivot_x,pivot_y']
for c in m['components']:
    for a in c['animations']:
        for i,(f,ms) in enumerate(zip(a['frames'],a['frameDurationsMs'])):
            rows.append(','.join(map(str,[c['id'],a['name'],a['facing'],a['phase'],f,i,ms,*c['pivot']])))
(BASE/'frame_inventory.csv').write_text('\n'.join(rows)+'\n',encoding='utf-8')
files=[dict(path=rel(p),bytes=p.stat().st_size,sha256=sha(p)) for p in sorted(BASE.rglob('*')) if p.is_file() and p.name!='file_inventory.json']
save(BASE/'file_inventory.json',dict(scope='Every batch02 file except inventory itself',files=files))
print(json.dumps(dict(status='PASS',protectedCounts=[c['filesChecked'] for c in checks],celReferences=len(rows)-1,packageFiles=len(files))))
