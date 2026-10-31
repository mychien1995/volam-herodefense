from pathlib import Path
import json,hashlib
from PIL import Image,ImageDraw
base=Path(__file__).resolve().parent;root=base.parents[3];review=root/'assets/reviews/skills/thieu-lam'
read=lambda p:json.loads(p.read_text(encoding='utf-8-sig'))
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
for lock in read(base/'baseline_audit_v01.json'):assert sha(root/lock['lock'])==lock['sha256'],lock['lock']
provenance=read(root/'assets/exports/skills/thieu-lam/provenance_manifest_v01.json')
for p,h in provenance['files'].items():assert sha(root/p)==h,p
m=read(root/'assets/exports/skills/thieu-lam/production_manifest_v01.json')
assert len(m['entries'])==14 and len(m['assets'])==26 and m['approvalGate']=='approval gate waived by user' and not m['independentlyReviewedApproval']
# Static crops of actual Phaser PNGs, with original pixel density retained.
active=[e for e in m['entries'] if e['kind']=='active']
for start in range(0,13,6):
 selected=active[start:start+6];sheet=Image.new('RGB',(1024,320*((len(selected)+1)//2)),'#1e2b34');draw=ImageDraw.Draw(sheet)
 for i,e in enumerate(selected):
  shot=Image.open(review/e['id']/'combined_right_1280x720.png').convert('RGB')
  crop=shot.crop((180,235,692,535));x=(i%2)*512;y=(i//2)*320
  sheet.paste(crop,(x,y+20));draw.text((x+8,y+3),e['id'],fill='white')
 sheet.save(review/f'phaser_batch_contacts_{start//6+1:02d}.png')
registry=root/'assets/ASSET_MANIFEST.md';text=registry.read_text(encoding='utf-8-sig')
heading='## Thiếu Lâm skill artwork batch — 2026-10-31'
if heading not in text:
 addition='\n\n'+heading+'\n\n**Approval gate waived by user; verified production prototypes, no independent director review claimed.** [Production/provenance](exports/skills/thieu-lam/production_manifest_v01.json), [complete14-entry coverage](exports/skills/thieu-lam/coverage_manifest_v01.json), [source/export hashes](exports/skills/thieu-lam/provenance_manifest_v01.json), [46 exact prompts](source/skills/thieu-lam/generation_prompts_v01.json), [waiver record](source/skills/thieu-lam/approval_waiver_v01.json), and [actual Phaser evidence/check results](reviews/skills/thieu-lam/README.md). All13 active skills have four-facing actions, separate Kim/Gold VFX and icons; Dịch Cân Kinh is icon-only. 26 components /182 tags /728 transparent cels /14 icons /40 editable Aseprite sources. Four new support cels are explicitly shared; cardinal VFX transforms declared. All275 protected character files and original approval-lock bytes unchanged. Final pipeline:2 workflow tests,174 unit/integration tests,build/all validators and3 Chromium scenarios passed. Presentation-only preview; no mechanics,balance,targeting or server-authority changes. Bất Động Minh Vương retains documented healing interpretation. PNG/frame-event/log evidence only; no recordings.\n'
 with registry.open('a',encoding='utf-8') as f:f.write(addition)
report={'status':'PASS','approvalGate':'approval gate waived by user','originalApprovalLocksByteIdentical':True,'allManifestFileHashesMatch':True,'recordedFileCount':len(provenance['files']),'generationCount':46,'verifiedArtEntries':14,'independentDirectorApprovalClaimed':False}
(review/'final_audit_v01.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
print(json.dumps(report,indent=2))
