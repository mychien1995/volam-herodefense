"""Record the explicit final approval from this chat; no artwork generation/export."""
from pathlib import Path
import json,hashlib

ROOT=Path(__file__).resolve().parents[4]
BASE=Path(__file__).resolve().parent
OUT=ROOT/'assets/reviews/skills/vo-dang'
EXPORT=ROOT/'assets/exports/skills/vo-dang'
LOCK=ROOT/'assets/approved_vo_dang_skills.lock.json'
read=lambda p:json.loads(p.read_text(encoding='utf-8'))
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
def write(p,obj):p.write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
if LOCK.exists():
 for name,h in read(LOCK)['files'].items():assert sha(ROOT/name)==h,name
 print('Final approval already recorded; all approved hashes match.')
 raise SystemExit(0)

evidence={'source':'User message in this chat after final production/Phaser delivery',
 'text':'all approved','approvedOn':'2026-10-31','stage':'final_production_art_approval',
 'scope':'All10 active skill character/VFX sets, all13 production icons and disclosed approved-character/shared-qi reuse presented in the final review. No gameplay mechanics or integration approved by this art decision.'}
manifest=read(EXPORT/'production_manifest_v01.json')
register=read(OUT/'final_approval_register_v01.json')
assert len(register['entries'])==13 and len(manifest['assets'])==20 and len(manifest['icons'])==13
for entry in register['entries']:
 assert sha(ROOT/entry['icon']['path'])==entry['icon']['sha256']
 for component in entry['animationComponents']:
  for key in ['source','sheet','atlas']:assert sha(ROOT/component[key])==component[key+'Sha256'],component[key]
reviewed=register['reviewHashManifest'];assert sha(ROOT/reviewed['path'])==reviewed['sha256']
snapshot=OUT/'runtime_preview_before_final_approval_v01.json'
assert not snapshot.exists()
snapshot.write_bytes((ROOT/reviewed['path']).read_bytes())
register['reviewedSnapshot']={'path':snapshot.relative_to(ROOT).as_posix(),'sha256':reviewed['sha256']}

media={p:sha(p) for folder in [BASE,EXPORT,OUT] for p in folder.rglob('*') if p.suffix.lower() in ['.png','.aseprite']}
character_lock=ROOT/'assets/approved_vo_dang.lock.json'
character_lock_hash=sha(character_lock)
for name,h in read(character_lock)['files'].items():assert sha(ROOT/name)==h,name

for component in manifest['assets']:
 component.update(status='approved',productionArtApproved=True,finalArtApproval='approved',approvedOn='2026-10-31',approvalEvidence=evidence,approvalLock='assets/approved_vo_dang_skills.lock.json')
 metadata=ROOT/Path(component['sheet']).with_suffix('.animations.json')
 write(metadata,component)
for icon in manifest['icons']:
 icon.update(status='approved',productionArtApproved=True,approvedOn='2026-10-31',approvalEvidence=evidence,approvalLock='assets/approved_vo_dang_skills.lock.json')
for entry in manifest['entries']:
 entry.update(finalArtApproval='approved',iconProductionApproval='approved',exportStatus='approved',approvedOn='2026-10-31')
manifest.update(status='approved',productionArtApproved=True,finalArtApproval='approved',approvedOn='2026-10-31',finalApprovalEvidence=evidence,approvalLock='assets/approved_vo_dang_skills.lock.json')
manifest['scope']='Approved skill character/VFX/icon artwork and isolated Phaser visual preview only; gameplay integration pending.'
manifest['previewVerification']['finalArtApproval']='approved'
write(EXPORT/'production_manifest_v01.json',manifest)

for name in ['icons_v01.json','recipe.json']:
 path=BASE/name;data=read(path);icons=data if isinstance(data,list) else data['icons']
 for icon in icons:icon.update(status='approved',productionArtApproved=True,approvedOn='2026-10-31',approvalLock='assets/approved_vo_dang_skills.lock.json')
 write(path,data)
preview=read(OUT/'runtime_preview_v01.json')
preview.update(status='preview_verified_and_director_approved',finalArtApproval='approved',approvalEvidence=evidence)
write(OUT/'runtime_preview_v01.json',preview)
register.update(status='approved',approvalEvidence=evidence)
register['reviewHashManifest']['sha256']=sha(OUT/'runtime_preview_v01.json')
for entry in register['entries']:
 entry.update(productionArtApproval='approved',iconProductionApproval='approved',evidence=evidence,approvedOn='2026-10-31')
write(OUT/'final_approval_register_v01.json',register)
write(BASE/'final_approval_v01.json',{'approvalEvidence':evidence,'approvalRegister':'assets/reviews/skills/vo-dang/final_approval_register_v01.json','approvalLock':'assets/approved_vo_dang_skills.lock.json'})

targets=set()
for component in manifest['assets']:
 for key in ['source','sheet','atlas']:targets.add(component[key])
 targets.add(str(Path(component['sheet']).with_suffix('.animations.json')).replace('\\','/'))
 for folder in [(ROOT/component['source']).parent/'frames',(ROOT/component['sheet']).parent/component['kind']/'frames']:
  targets.update(p.relative_to(ROOT).as_posix() for p in folder.glob('*.png'))
for icon in manifest['icons']:
 targets.update([icon['source'],icon['editableSource'],icon['path']])
concepts=read(BASE/'concept_approval_v01.json')
for entry in concepts['entries']:
 for key in ['skillConcept','iconConcept']:
  item=entry[key]
  if item['status']=='approved':targets.add(item['path'])
targets.update(['assets/source/skills/vo-dang/recipe.json','assets/source/skills/vo-dang/frame_placements_v01.json','assets/source/skills/vo-dang/icons_v01.json'])
lock={'schemaVersion':1,'approvedOn':'2026-10-31','authority':'Explicit final user art approval following saved Phaser verification and production delivery','approvalEvidence':evidence,
 'scope':['10 active skill character/VFX sets','13 production icons','selected approved concepts','editable sources, transparent frame PNGs, atlases and animation metadata'],
 'excludedScope':['gameplay mechanics and integration','superseded/generated source candidates not used in final exports','any new passive in-world effect'],
 'reviewedSnapshot':register['reviewedSnapshot'],'files':{name:sha(ROOT/name) for name in sorted(targets)}}
write(LOCK,lock)

for p in [OUT/'README.md',BASE/'README.md']:
 text=p.read_text(encoding='utf-8')
 text=text.replace('**New production artwork is a prototype awaiting final director approval.**','**All produced character/VFX artwork and all13 production icons are explicitly APPROVED: user “all approved”,2026-10-31, after final Phaser delivery.**')
 text=text.replace('Concepts approved; production prototypes and visual preview verified; final director approval pending.','Concepts and final production artwork/icons approved; visual preview verified; gameplay implementation pending.')
 text=text.replace('| Pending | Pending |','| Pending | Approved |')
 text=text.replace('These are prototypes for director review, not self-approved final artwork.','Final director approval is now recorded; these observations remain part of the review history.')
 text=text.replace('Director approval requested for the produced character clips, VFX and icons in this review. Concept approval is already recorded; production approval remains pending for every entry.','Final director approval recorded for all produced character clips, VFX and icons. Gameplay implementation remains pending.')
 text+='\nFinal approval recorded2026-10-31 after production review: all20 components and13 icons approved. [Approved-file lock](../../../approved_vo_dang_skills.lock.json) preserves exact current art bytes and visual metadata. Earlier screenshots/reports retain their pre-approval captions as historical evidence. Gameplay remains pending.\n'
 p.write_text(text,encoding='utf-8')
p=OUT/'index.html';text=p.read_text(encoding='utf-8')
text=text.replace('Production assets remain prototypes awaiting final director approval.','All20 character/VFX components and all13 production icons are APPROVED,2026-10-31. Gameplay implementation remains pending.')
text=text.replace('Final art approval pending','Final art approved')
p.write_text(text,encoding='utf-8')
p=ROOT/'assets/concepts/skills/vo-dang/README.md';text=p.read_text(encoding='utf-8').replace('final production approval is pending','final production approval is recorded').replace('final runtime art approval remains separate','final runtime art approval was separately granted after Phaser delivery');p.write_text(text,encoding='utf-8')
for path,section in [
 (ROOT/'DECISIONS.md','\n\n## Võ Đang skill artwork final approval — 2026-10-31\n\nThe user explicitly approved all produced Võ Đang skill artwork and all13 production icons after the final Phaser review (user: “all approved”). Approval covers20 character/VFX components,636 exported cels/163 tags,33 editable Aseprite sources, the two unchanged approved normal-attack reuses and the disclosed optional shared straight-qi preview. Exact files are protected separately by `assets/approved_vo_dang_skills.lock.json`; the original89-file character lock is unchanged. Thái Cực Tâm Pháp remains icon-only. This is final artwork approval, not approval or implementation of Võ Đang mechanics, numerical tuning or gameplay integration. See `assets/reviews/skills/vo-dang/README.md`.\n'),
 (ROOT/'assets/ASSET_MANIFEST.md','\n\n## Võ Đang skill artwork — approved 2026-10-31\n\n**FINAL DIRECTOR ART APPROVAL RECORDED.** All10 active character/VFX sets and13 production icons approved after the Phaser review.20 components /636 exported cels /163 tags /33 editable Aseprite sources; explicit approved-character reuse and cardinal transforms are documented. [Production manifest](exports/skills/vo-dang/production_manifest_v01.json), [13-entry delivery and verification](reviews/skills/vo-dang/README.md), [final approval register](reviews/skills/vo-dang/final_approval_register_v01.json), [exact approved-file lock](approved_vo_dang_skills.lock.json). Original89-file Võ Đang character baseline unchanged. Visual assets verified in preview; gameplay implementation pending. No mechanics or passive world effect added.\n')]:
 with path.open('a',encoding='utf-8') as f:f.write(section)

assert all(sha(p)==h for p,h in media.items()),'Approval altered art media'
assert sha(character_lock)==character_lock_hash
for name,h in lock['files'].items():assert sha(ROOT/name)==h,name
write(OUT/'approval_verification_v01.json',{'status':'PASS','approvedOn':'2026-10-31','approvalEvidence':evidence,'approvedComponents':20,'approvedIcons':13,'approvedEntries':13,'lockedFiles':len(targets),'artMediaFilesUnchanged':len(media),'originalCharacterFilesUnchanged':89,'originalCharacterLockUnchanged':True,'gameplayIntegration':'pending','scope':'Approval metadata and exact-file lock only; no regeneration or gameplay change.'})
print(f'APPROVED:20 components,13 icons,13 entries; locked{len(targets)} files; all art media and89-file character baseline unchanged.')
