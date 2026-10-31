from pathlib import Path
import json, hashlib
from PIL import Image

ROOT=Path(__file__).resolve().parents[4]
HERE=Path(__file__).resolve().parent
def read(p):return json.loads(p.read_text(encoding="utf-8-sig"))
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
before=read(HERE/"inventory_before_v01.json")
report={"phase":1,"status":"PASS","scope":"concept PNGs, manifests, static icon-size review and preservation only; no production or gameplay verification","commandsObtained":[
{"command":"python -X utf8 assets/concepts/skills/thien-son/prepare_concept_review_v01.py","result":"PASS: 13 entries, 12 generated boards including preserved extra-icon v01 and corrected v02, 13 crop recipes"},
{"command":'"C:/Program Files/Aseprite/Aseprite.exe" -b --script-param root=D:/Projects/volam-hero-defense --script-param recipe=D:/Projects/volam-hero-defense/assets/concepts/skills/thien-son/concept_layout_v01.json --script assets/concepts/skills/thien-son/assemble_concepts_v01.lua',"result":"Exit 0; all 13 concept-icon PNGs and key-pose overview exist"},
{"command":"node assets/concepts/skills/thien-son/capture_icon_review_v01.mjs","result":"PASS: 13 cards, 52 images decoded, 39 reductions exactly 64/48/32 CSS px, no page errors, one PNG screenshot, video/trace disabled"},
{"command":"python -X utf8 assets/concepts/skills/thien-son/validate_concepts_v01.py","result":"PASS if this report was written"}]}
for field in ["approvedLockFiles","preExistingSkillFiles"]:
 files=before[field]
 bad=[name for name,expected in files.items() if not (ROOT/name).is_file() or sha(ROOT/name)!=expected]
 assert not bad,(field,bad)
 report[field]={"checked":len(files),"changed":0,"result":"PASS"}
for folder,existed in before["thienSonSkillFoldersBefore"].items():
 assert not existed and not (ROOT/folder).exists(),folder+" must remain absent in concept phase"
report["productionFolders"]={"created":False,"result":"PASS"}
m=read(HERE/"concept_manifest_v01.json")
assert len(m["entries"])==13
assert len({s["id"] for s in m["entries"]})==13
assert sum(s["kind"]=="active" for s in m["entries"])==10
assert sum(s["kind"]=="normal" for s in m["entries"])==2
assert sum(s["kind"]=="passive" for s in m["entries"])==1
all_pngs=list(HERE.glob("*.png"))
png_info=[]
for p in all_pngs:
 with Image.open(p) as im:im.verify()
 with Image.open(p) as im:
  assert im.format=="PNG"
  alpha=im.convert("RGBA").getchannel("A").getextrema()
  assert alpha==(255,255),(p,alpha)
  png_info.append({"file":p.name,"size":list(im.size),"alpha":list(alpha),"sha256":sha(p)})
icons=[]
for s in m["entries"]:
 p=ROOT/s["conceptPath"];assert p.exists()
 p=ROOT/s["iconConceptPath"]
 with Image.open(p) as im:assert im.size==(256,256)
 assert s["iconConceptApproval"]["status"]=="pending_explicit_user_approval"
 assert s["iconConceptApproval"]["approvedFilename"] is None
 assert s["conceptApproval"]["approvedFilename"] is None
 assert s["productionStatus"]=="not_started_approval_gate"
 icons.append(sha(p))
assert len(set(icons))==13,"Duplicate icon bytes"
artifact_paths={x["path"] for x in m["artifacts"]}
assert all(p.relative_to(ROOT).as_posix() in artifact_paths for p in all_pngs)
for a in m["artifacts"]:assert sha(ROOT/a["path"])==a["sha256"],a["path"]
prompts=read(HERE/"generation_prompts_v01.json")["prompts"]
assert len(prompts)==12
for rec in prompts:
 assert (HERE/rec["file"]).exists()
 assert rec["prompt"] and rec["originalGeneratedFilename"]
 for ref in rec["referencedImagePaths"]:assert (ROOT/ref).exists(),ref
obs=read(HERE/"icon_review_observations_v01.json")
assert obs["cards"]==13 and obs["images"]==52 and obs["allImagesLoaded"] and not obs["errors"]
assert obs["video"] is False and obs["trace"] is False
assert obs["sizes"]==[64,48,32]*13
report.update({"pngsDecoded":len(png_info),"pngs":png_info,"uniqueIconConcepts":13,"activeConcepts":10,"prompts":12,"individualApprovals":"all pending; none inherited from approved character","visualObservations":[
"All ten saved key-pose boards visually inspected: approved ivory/jade male topknot identity, readable fan/curved dao, wind-only arcs and temporal trails.",
"Movement dash, offensive dash/slash and evasive-step/counter use different action structures; counter and expiry are separate branches.",
"Close spin uses a low ring; fan ultimate uses an open larger helix; two-hit, heavy single strike and close flurry are separate dao studies.",
"All 13 icon crops and their screenshot observed at 64/48/32 CSS px. Main silhouettes remain recognizable; embroidery/small accents diminish at 32px.",
"Basic/passive v01 preserved; selected v02 removes invented blade inlay. Passive has icon only, no persistent aura.",
"These are opaque concept PNGs. Transparency, cels, direction consistency, pivots, VFX cleanup/timing, exact HUD fit and normal gameplay zoom remain production checks."],
"unverified":["No production PNG frames, atlases, final icons or editable animation sources created.","No Phaser skill preview or combat behavior tested in Phase1.","No typecheck/unit/build/game browser suite run: runtime and gameplay code were not changed."],
"recordingsGenerated":False})
(HERE/"validation_v01.json").write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
print(json.dumps({k:v for k,v in report.items() if k in ["status","approvedLockFiles","preExistingSkillFiles","productionFolders","pngsDecoded","uniqueIconConcepts","activeConcepts","prompts"]},ensure_ascii=False))

