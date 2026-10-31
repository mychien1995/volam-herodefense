from pathlib import Path
import json, hashlib, html
from PIL import Image

ROOT=Path(__file__).resolve().parents[4]
HERE=Path(__file__).resolve().parent
REL=HERE.relative_to(ROOT).as_posix()
if (HERE/'concept_approval_v01.json').exists():
 print('Approved Phase 1 concepts are preserved. Use the Thiên Sơn skill production workflow; approval metadata was not rewritten.')
 raise SystemExit(0)
def read(p): return json.loads(p.read_text(encoding="utf-8-sig"))
def write(p,obj): p.write_text(json.dumps(obj,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
def digest(p): return hashlib.sha256(p.read_bytes()).hexdigest()
brief=read(HERE/"visual_briefs_v01.json")
active=brief["activeSkills"]
extra=brief.get("iconOnly",brief.get("additionalIcons",brief.get("iconOnlyEntries",[])))
assert len(active)==10 and len(extra)==3, list(brief)
old=read(HERE/"generation_prompts_v01.json")["prompts"]
records={x["id"]:x for x in old}
for p in sorted(HERE.glob("generation_record-*.json")):
 r=read(p);records[r["id"]]=r
write(HERE/"generation_prompts_v01.json",{"schemaVersion":1,"createdOn":"2026-10-31","tool":"OpenAI built-in image_gen.imagegen","conceptOnly":True,"prompts":list(records.values())})
bounds={
"lien_hoa_phien":[1250,675,255,256],
"luc_duong_chuong":[1250,676,255,255],
"luu_phong_bo":[1250,675,255,255],
"chiet_mai_thu":[1250,676,255,255],
"bach_phien_phong_bao":[1250,674,256,261],
"phi_anh_tram":[1250,675,255,256],
"truy_hon_dao":[1250,675,255,251],
"phong_anh_hoan_vi":[1250,676,256,255],
"liet_phong_dao":[1250,675,255,256],
"bach_liet_thien_kich":[1250,675,256,256],
"thien_son_phien":[51,197,466,453],
"thien_son_dao":[548,197,441,453],
"bac_minh_than_cong":[1019,197,466,453]}
entries=[]
icons=[]
for s in active+extra:
 id=s["id"];is_active=s in active
 board=id+"-concept-v01.png" if is_active else "thien-son-basic-passive-icons-concept-v02.png"
 icon=id+"-icon-concept-v01.png"
 icons.append({"id":id,"source":REL+"/"+board,"rect":bounds[id],"output":REL+"/"+icon})
 entries.append({**s,"kind":"active" if is_active else s["kind"],
  "conceptPath":REL+"/"+board,"iconConceptPath":REL+"/"+icon,
  "conceptApproval":{"status":"pending_explicit_user_approval" if is_active else "not_applicable_icon_only","approvedFilename":None},
  "iconConceptApproval":{"status":"pending_explicit_user_approval","approvedFilename":None},
  "characterPlan":"new skill-specific poses proposed; no production authored" if is_active else ("reuse approved basic attack; no new animation" if s["kind"]=="normal" else "not applicable; icon only; no persistent aura"),
  "vfxPlan":"wind stages proposed on concept board; production not started" if is_active else "not applicable",
  "productionStatus":"not_started_approval_gate",
  "phaserVisualVerification":"not_run_concept_phase",
  "gameplayIntegration":"unchanged_and_not_verified_in_this_concept_phase",
  "finalArtApproval":"not_requested_concepts_only"})
write(HERE/"concept_layout_v01.json",{"phase":1,"conceptOnly":True,"icons":icons,"boards":[REL+"/"+s["id"]+"-concept-v01.png" for s in active],"method":"Aseprite crop plus nearest normalization to 256px concept squares; layout only, not production icons"})
references=[
("assets/concepts/heroes/thien-son/thien-son-concept-v01.png","primary approved identity"),
("assets/exports/characters/hero_thien_son.png","primary approved fan scale/palette/weapon placement"),
("assets/exports/characters/hero_thien_son_dao.png","primary approved dao scale/palette/weapon placement"),
("assets/references/vo_dang_character_reference.png","positive school style"),
("assets/references/cai_bang_character_reference.png","positive school proportions, contrast"),
("artwork/thieu-lam-thien-son.png","costume/style audit only; obsolete ice motifs rejected"),
("assets/references/current_game_2026_10_29_placeholder_anti_reference.png","rejected placeholder art"),
("assets/references/current_codex_dashboard_anti_reference.png","inspected requested alias; file actually contains Vo Dang art"),
("assets/references/in_game_world_reference.png","positive gameplay framing"),
("assets/references/wuxia_town_world_reference.png","actual exterior-dashboard anti-reference"),
("assets/references/thien_son_thieu_lam_character_reference.png","inspected alias; file actually contains town art"),
("assets/concepts/skills/cai-bang/cai_bang_skills_sheet_03_v1.png","existing skill-board audit"),
("assets/exports/skills/cai-bang/thien_ha_vo_cau/thien_ha_vo_cau_vfx.png","existing production VFX audit"),
("assets/exports/skills/cai-bang/thien_ha_vo_cau/icon.png","existing 64px icon audit")]
references += [("assets/references/"+n+"_reference.png","positive world/overlay benchmark") for n in ["central_arena_hub","arena_battle","forest_dungeon","desert_dungeon","sea_dungeon","hell_dungeon","dungeon_selection_menu","merchant_shop_menu","inventory_menu"]]
manifest={
"schemaVersion":1,"schoolId":"thien_son","element":"phong","version":"v01","createdOn":"2026-10-31","phase":1,
"status":"concepts_pending_individual_approval","assetType":"opaque key-pose and icon concept boards; NOT runtime animation or final icons",
"source":{"tool":"OpenAI built-in image_gen.imagegen","authorship":"original AI-assisted art from project references; no external sprite pack; no exclusive-rights claim","prompts":REL+"/generation_prompts_v01.json","layoutTool":"Aseprite 1.3.18.6-x64","layoutRecipe":REL+"/concept_layout_v01.json","layoutScript":REL+"/assemble_concepts_v01.lua"},
"approvedCharacterBaseline":{"lock":"assets/approved_thien_son.lock.json","concept":"assets/concepts/heroes/thien-son/thien-son-concept-v01.png","fanAtlas":"assets/exports/characters/hero_thien_son.png","daoAtlas":"assets/exports/characters/hero_thien_son_dao.png","canvas":[80,80],"feet":[40,64],"bodyHeightApprox":44,"facings":["down","left","right","up"],"status":"approved existing character unchanged; approval does not transfer to these skill concepts"},
"authoritativeDocuments":["AGENTS.md","DECISIONS.md","CONTENT_DATA.md","COMBAT_SYSTEM.md","ART_DIRECTION_REFERENCE.md","ART_PRODUCTION_STANDARD.md","ART_ASSET_GUIDE.md","TECHNICAL_ARCHITECTURE.md","docs/DEVELOPMENT_WORKFLOW.md",".agents/skills/pixel-art-pipeline/SKILL.md"],
"referencesInspected":[{"path":p,"role":role} for p,role in references],
"referenceCaveats":["Historical vo_dang_art_direction_reference.png alias is absent; actual vo_dang_character_reference.png inspected.","Historical ice Thiên Sơn motifs are overridden by approved Wind hero.","Generated stone-patch vignettes are concept illustrations, not in-game screenshots, scale measurements or hitboxes.","Board pose count and numbered stages are illustrative choreography, not a gameplay hit count or timing.","All facing production, exact hand continuity, foot pivots and gameplay-scale readability require later exported-frame/Phaser checks."],
"proposalsAndLimits":["All wind shapes, key-pose choreography, icons and buff/counter feedback are proposals pending per-entry approval.","Both fan and dao are melee; wind strokes remain local and attached to action, never detached projectiles.","Lưu Phong Bộ movement; Phi Ảnh Trảm offensive dash; Phong Ảnh Hoán Vị evasive step then conditional counter or expiry; echoes are temporal feedback only.","Truy Hồn Đao bonus against an already slowed target does not apply slow.","Liệt Phong Đao plate/guard is a penetration metaphor; no armor destruction or defense reduction.","Bách Liệt Thiên Kích is a close forward flurry, without added dash, ranged beam or hit-count claim.","Chiết Mai Thủ sustained wisps must remain sparse at wrist/heel; no shield or large aura.","Bắc Minh Thần Công is icon only; no persistent aura proposed.","No runtime bindings, abilities, movement rules, damage, status, cooldowns, loadouts or authoritative simulation changes."],
"existingProductionAudit":{"school":"cai_bang","characterCanvas":[80,80],"feet":[40,64],"vfxCanvases":[64,96,128,160],"iconFileSize":[64,64],"characterAndVfxSeparate":True,"productionFolderPlan":["assets/source/skills/thien-son/","assets/exports/skills/thien-son/","assets/reviews/skills/thien-son/"],"theseFoldersCreated":False},
"preservedEarlierVersion":{"path":REL+"/thien-son-basic-passive-icons-concept-v01.png","selected":False,"reason":"v02 removes invented jade blade inlay; v01 preserved"},
"review":{"fullReview":REL+"/review-v01.html","iconSizes":REL+"/icon-review-v01.html","skillOverview":REL+"/thien-son-skill-overview-v01.png","iconOverview":REL+"/thien-son-icon-overview-v01.png","validation":REL+"/validation_v01.json"},
"entries":entries}
artifacts=[]
for p in sorted(HERE.glob("*.png")):
 with Image.open(p) as im:
  artifacts.append({"path":p.relative_to(ROOT).as_posix(),"sha256":digest(p),"size":list(im.size),"mode":im.mode,"purpose":"concept review only"})
manifest["artifacts"]=artifacts
write(HERE/"concept_manifest_v01.json",manifest)
css="""*{box-sizing:border-box}body{margin:0;background:#14292e;color:#eeeade;font:16px/1.45 system-ui,sans-serif}main{max-width:1480px;padding:24px;margin:auto}h1,h2{color:#ddf0df}a{color:#a9ded0}img{image-rendering:pixelated}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}.card{background:#213e43;border:1px solid #6b988e;padding:14px;text-align:center}.card h2{font-size:18px;margin:4px 0}.id{font:12px monospace;color:#b6c9c4;display:block;margin-bottom:10px}.main-icon{width:160px;height:160px}.sizes{display:flex;gap:12px;justify-content:center;align-items:end;margin-top:12px}.sizes figure{margin:0}.sizes figcaption{font:12px monospace;color:#b6c9c4}.board{max-width:100%;height:auto}.entry{border-top:1px solid #6b988e;padding:20px 0}.pending{color:#e3c58f}.note{max-width:1120px}"""
cards=[]
for s in entries:
 icon=Path(s["iconConceptPath"]).name
 cards.append('<article class="card"><h2>'+html.escape(s["name"])+'</h2><code class="id">'+s["id"]+'</code><img class="main-icon" src="'+icon+'" alt="'+html.escape(s["name"])+' icon concept"><div class="sizes">'+''.join('<figure><img src="'+icon+'" width="'+str(n)+'" height="'+str(n)+'" alt=""><figcaption>'+str(n)+'px</figcaption></figure>' for n in [64,48,32])+'</div></article>')
icon_html='<!doctype html><html lang="vi"><meta charset="utf-8"><title>Thiên Sơn icon concepts v01</title><style>'+css+'</style><main><h1>Thiên Sơn — 13 icon concepts v01</h1><p class="pending">CONCEPT ONLY · All 13 icons await individual approval</p><p>Wind · Ivory / silver / jade on ink teal · Reductions shown at 64, 48 and 32 CSS pixels</p><div class="grid">'+''.join(cards)+'</div><p>Static concept review. No final icons, gameplay bindings or Phaser verification.</p></main></html>'
(HERE/"icon-review-v01.html").write_text(icon_html,encoding="utf-8")
parts=['<!doctype html><html lang="vi"><meta charset="utf-8"><title>Thiên Sơn skill concepts v01</title><style>'+css+'</style><main><h1>Thiên Sơn — skill and icon concepts v01</h1><p class="pending">Phase 1 only. Awaiting explicit concept approval per skill and per icon.</p><p class="note">Approved hero reused as visual reference. These key-pose boards are proposals, not runtime frames. Arcs stay local to melee actions. Afterimages show temporal positions, not clones or teleportation. Illustration vignettes are not gameplay screenshots. No production export or gameplay change.</p><p><a href="icon-review-v01.html">All 13 icons at 64 / 48 / 32 pixels</a> · <a href="concept_manifest_v01.json">Provenance and individual approval manifest</a></p>']
for s in entries:
 parts.append('<section class="entry" id="'+s["id"]+'"><h2>'+html.escape(s["name"])+' <code>'+s["id"]+'</code></h2><p>'+html.escape(s["definition"])+'</p><p class="pending">Icon: pending · '+('Action/VFX concept: pending' if s["kind"]=="active" else 'No new character animation or VFX')+'</p><p><a href="'+Path(s["conceptPath"]).name+'">Full concept board</a> · <a href="'+Path(s["iconConceptPath"]).name+'">Icon concept PNG</a></p><img class="board" loading="lazy" src="'+Path(s["conceptPath"]).name+'" alt="'+html.escape(s["name"])+' concept"></section>')
parts.append('</main></html>')
(HERE/"review-v01.html").write_text(''.join(parts),encoding="utf-8")
lines=["# Thiên Sơn skill concepts v01","","Phase 1 only. All 10 active-skill concepts and all 13 icons are pending individual explicit user approval. Production and final-art approval have not started.","","[Full saved-board review](review-v01.html) · [Icon-size review](icon-review-v01.html) · [Manifest](concept_manifest_v01.json) · [Exact prompts](generation_prompts_v01.json)","","| Stable ID | Vietnamese name | Concept board | Icon concept |","|---|---|---|---|"]
for s in entries: lines.append("| "+s["id"]+" | "+s["name"]+" | ["+Path(s["conceptPath"]).name+"]("+Path(s["conceptPath"]).name+") | ["+Path(s["iconConceptPath"]).name+"]("+Path(s["iconConceptPath"]).name+") |")
lines += ["","The approved character is unchanged. New character poses and wind shapes are illustrative proposals; not exported cels or atlases. All production facings, exact foot alignment, effect offsets/timing, cleanup and normal gameplay readability remain subject to production/Phaser verification after concept approval.","","Normal attacks will reuse the already approved fan/đao clips. Bắc Minh Thần Công requires only an icon; no persistent aura. No abilities, damage, hitboxes, status effects, movement rules, cooldowns, costs, loadouts or server simulation were edited.","","The earlier basic/passive v01 board is preserved. v02 removes the invented blade inlay. Icon crops are source-board panels normalized to square 256px with Aseprite nearest sampling for concept review, not final 64px authored icons.","","Validation commands and results are recorded in validation_v01.json after the final focused check. Phaser and gameplay verification are not part of this concept-only delivery. No video, GIF or recording was produced.","","STOP: explicit concept approval is required before producing final icons, skill animation frames or wind VFX atlases."]
(HERE/"README.md").write_text("\n".join(lines)+"\n",encoding="utf-8")
print(json.dumps({"entries":len(entries),"generatedBoards":len(records),"iconCrops":len(icons),"status":"pending individual approval"},ensure_ascii=False))

