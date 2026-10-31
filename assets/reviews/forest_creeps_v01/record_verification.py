"""Record completed isolated review evidence; never grants director approval."""
from pathlib import Path
import argparse,hashlib,json
R=Path(__file__).resolve().parents[3]
HERE=Path(__file__).resolve().parent
C=R/'assets/sprites/creeps/dungeons/forest'
def read(p):return json.loads(p.read_text('utf8'))
def write(p,v):p.write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n','utf8')
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
p=argparse.ArgumentParser();p.add_argument('--players',type=int,choices=[2,6],required=True);args=p.parse_args()
if (R/'assets/approved_forest_creeps.lock.json').exists():
    raise SystemExit('Approved Forest production metadata is locked. Record new runtime verification separately.')
profile='representative-2' if args.players==2 else 'final-6'
evidence=HERE/profile/'observations.json';v=read(evidence)
assert v['status']=='PASS' and v['browserClients']==args.players and not v['gameplayIntegration']
assert len(v['coverage'])==120 and sum(map(len,v['coverage'].values()))==384
assert len(v['effectCoverage'])==28 and sum(map(len,v['effectCoverage'].values()))==112
batch=read(C/'forest_manifest_v01.json')
record={'status':'PASS','scope':'Isolated controlled Phaser 4 review; no natural combat, rewards, networked enemy integration or director approval',
        'browserClients':args.players,'heroScaleStandIns':args.players,'evidence':evidence.relative_to(R).as_posix(),'evidenceSha256':sha(evidence)}
for a in batch['assets']:
    a.update(runtimeVerified=True,verificationScope='isolated_phaser_art_review_only',verification=record)
    write(C/a['typeId']/'manifest.json',a)
    write(C/a['typeId']/'verification.json',dict(record,frames=64,clips=20,produced=True,directorApproved=False))
batch.update(runtimeVerified=True,verificationScope='isolated_phaser_art_review_only',verification=record)
write(C/'forest_manifest_v01.json',batch)
fx=R/'assets/effects/dungeons/forest/manifest.json';m=read(fx)
m.update(produced=True,runtimeVerified=True,verificationScope='isolated_phaser_art_review_only',verification=record)
write(fx,m);write(fx.parent/'verification.json',dict(record,frames=112,sequences=28,directorApproved=False))
concept=R/'assets/concepts/dungeon-creeps/forest'
write(concept/'manifest.json',{'status':'candidate','produced':True,'directorApproved':False,'runtimeAtlas':False,
    'heroScaleReference':'assets/exports/characters/hero_cai_bang_idle.png','heroReferenceSha256':sha(R/'assets/exports/characters/hero_cai_bang_idle.png'),
    'files':[{'path':f.relative_to(R).as_posix(),'sha256':sha(f),'selected':f.name!='truc_lam_kiem_khach_concept_v01.png'} for f in sorted(concept.glob('*.png'))]})
jobs=read(C/'source/generation_prompts_v01.json')
write(HERE/'generation_timings.json',{'requestsRetained':len(jobs),'measuredRequestSeconds':sum(j.get('elapsedSeconds') or 0 for j in jobs),
    'unknownIndividualTiming':[j['id'] for j in jobs if j.get('elapsedSeconds') is None],
    'note':'Sum of measured generator durations, not total production wall time. Parallel/cancelled operations are not credited as completed work.',
    'requests':[{'id':j['id'],'startedAt':j.get('startedAt'),'completedAt':j.get('completedAt'),'elapsedSeconds':j.get('elapsedSeconds')} for j in jobs]})
print('Recorded',args.players,'browser isolated review; directorApproved remains false')
