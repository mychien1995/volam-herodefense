"""Assemble lightweight PNG/HTML/Markdown evidence from actual retained outputs."""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import json,hashlib,os,html
ROOT=Path(__file__).resolve().parents[4]
BASE=Path(__file__).resolve().parent
OUT=ROOT/'assets/reviews/skills/vo-dang'
EXPORT=ROOT/'assets/exports/skills/vo-dang'
if (ROOT/'assets/approved_vo_dang_skills.lock.json').exists():
 raise RuntimeError('Approved Võ Đang skill review is locked; use a separately reviewed revision.')
read=lambda p:json.loads(p.read_text(encoding='utf-8'))
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
write=lambda p,x:p.write_text(json.dumps(x,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
m=read(EXPORT/'production_manifest_v01.json');v=read(EXPORT/'validation_v01.json');p=read(OUT/'phaser_verification_v01.json')
assert v['status']==p['status']=='PASS'
def link(path):return os.path.relpath(ROOT/path,OUT).replace('\\','/')
def font(size):return ImageFont.truetype('C:/Windows/Fonts/arial.ttf',size)
active=[e for e in m['entries'] if e['kind']=='active']
sheet=Image.new('RGB',(1280,2180),'#182735');d=ImageDraw.Draw(sheet)
d.text((18,10),'VÕ ĐANG — ACTUAL PHASER SKILL-ART PREVIEW',font=font(25),fill='#f1eadc')
d.text((18,45),'Normal gameplay scale • isolated presentation only • final director approval pending',font=font(18),fill='#c6d0d8')
for i,e in enumerate(active):
 im=Image.open(OUT/e['id']/'combined_right_1280x720.png').convert('RGB')
 # Keep gameplay screenshot pixels at their actual display scale (no resampling).
 crop=im.crop((160,260,800,650))
 x=(i%2)*640;y=85+(i//2)*415
 d.text((x+12,y),e['nameVi'],font=font(20),fill='#f1eadc');sheet.paste(crop,(x,y+25))
sheet.save(OUT/'phaser_skill_overview_v01.png')

rows=[];mdrows=[]
for e in m['entries']:
 e['phaserVerification']='PASS: visual assets verified in isolated Phaser preview; gameplay implementation pending.'
 e['finalArtApproval']='pending'
 if e['kind']=='active':
  a=next(a for a in m['assets'] if a['id']==e['characterAsset'])
  anim='New skill clips'+('; declared approved-frame reuse' if a['reuseNotes'] else '')
  charpath=link(a['sheet'])
 else:
  anim='Reuse approved normal attack, unchanged' if e['kind']=='basic' else 'Not applicable — passive icon only'
  charpath=link('assets/exports/characters/'+e['characterAsset']+'.png') if e['characterAsset'] else None
 fx=next((a for a in m['assets'] if a['id']==e['vfxAsset']),None)
 fxlabel='Shared straight qi; optional preview only' if e['id']=='vo_dang_kiem' else 'Activation/state/stages atlas' if fx else 'Not applicable; no extra effect'
 board=f'<a href="{link(e["approvedConcept"])}">Approved concept</a>' if e['approvedConcept'] else 'Icon-only concept'
 char=f'<a href="{charpath}">{anim}</a>' if charpath else anim
 effect=f'<a href="{link(fx["sheet"])}">{fxlabel}</a>' if fx else fxlabel
 preview=f'<a href="../../../source/skills/vo-dang/review.html?skill={e["id"]}">Live Phaser</a>'
 icon=f'<a href="{link(e["icon"])}"><img width="44" height="44" src="{link(e["icon"])}" alt="{html.escape(e["nameVi"])}"></a>'
 rows.append(f'<tr><td><code>{e["id"]}</code><br>{html.escape(e["nameVi"])}</td><td>{board}</td><td>{char}</td><td>{effect}</td><td>{icon}</td><td>Exported / {preview}<br>Verification PASS</td><td>Gameplay pending<br>Final art approval pending</td></tr>')
 boardmd=f'[approved concept]({link(e["approvedConcept"])})' if e['approvedConcept'] else 'Icon only'
 fxmd=f'[{fxlabel}]({link(fx["sheet"])})' if fx else fxlabel
 charmd=f'[{anim}]({charpath})' if charpath else anim
 mdrows.append(f'| `{e["id"]}` — {e["nameVi"]} | {boardmd} | {charmd} | {fxmd} | [PNG]({link(e["icon"])}) | Exported; Phaser PASS | Pending | Pending |')
for a in m['assets']:a['previewVerified']=True
m['previewVerification']={'report':'assets/reviews/skills/vo-dang/phaser_verification_v01.json','allAnimationTagsObserved':163,'allFramesObserved':True,'gameplayIntegrated':False,'finalArtApproval':'pending'}
m['provenance']['rawSourceFiles']=[{'path':r.relative_to(ROOT).as_posix(),'sha256':sha(r)} for r in sorted((BASE/'generated').glob('*.png'))]
write(EXPORT/'production_manifest_v01.json',m)
write(OUT/'runtime_preview_v01.json',{'schemaVersion':1,'status':'preview_verified_pending_final_approval','scope':'Visual preview only, no production match integration',
 'components':[{'id':a['id'],'source':a['source'],'sourceSha256':sha(ROOT/a['source']),'sheet':a['sheet'],'sheetSha256':sha(ROOT/a['sheet']),'atlas':a['atlas'],'atlasSha256':sha(ROOT/a['atlas'])} for a in m['assets']],
 'iconHashes':[{ 'id':i['id'],'path':i['path'],'sha256':sha(ROOT/i['path'])} for i in m['icons']],
 'verificationReport':'assets/reviews/skills/vo-dang/phaser_verification_v01.json','baselineUnchanged':True,'finalArtApproval':'pending'})
write(OUT/'final_approval_register_v01.json',{'schemaVersion':1,'status':'pending','policy':'Final production approval is separate from the all-approved concept decision.',
 'entries':[{'id':e['id'],'nameVi':e['nameVi'],'conceptApproval':'approved','iconConceptApproval':'approved','productionArtApproval':'pending','iconProductionApproval':'pending','evidence':None} for e in m['entries']]})

page='''<!doctype html><meta charset="utf-8"><title>Võ Đang skill art — final review</title><style>body{background:#182735;color:#eee8dc;font:15px Arial;margin:22px}a{color:#b5d8ff}table{border-collapse:collapse;width:100%}td,th{padding:10px;border:1px solid #556879;vertical-align:top}img{image-rendering:pixelated}code{font-size:12px}figure{margin:20px 0}figure img{max-width:100%;height:auto}h1{font-size:25px}</style><h1>Võ Đang skill art — final review</h1><p>All10 active concepts and13 icon concepts approved. Production assets remain prototypes awaiting final director approval.</p><p><a href="../../../source/skills/vo-dang/review.html">Open interactive Phaser art preview</a> · <a href="README.md">Complete report</a> · <a href="phaser_verification_v01.json">Frame observations</a> · <a href="final_validation_v01.json">Final checks</a></p><p>Presentation-only triggers. No server connection, damage, cost, cooldown, targeting or loadout implementation. Visual assets verified in preview; gameplay implementation pending.</p><table><tr><th>Canonical ID / name</th><th>Approved direction</th><th>Character animation</th><th>VFX</th><th>Icon</th><th>Export / Phaser</th><th>Gameplay / final approval</th></tr>'''+''.join(rows)+'''</table><figure><figcaption>Actual normal-scale Phaser crops; no video or recordings.</figcaption><a href="phaser_skill_overview_v01.png"><img src="phaser_skill_overview_v01.png"></a></figure><figure><figcaption>Actual64/44/32px icons in the viewport.</figcaption><a href="icons_hud_1280x720.png"><img src="icons_hud_1280x720.png"></a></figure>'''
(OUT/'index.html').write_text(page,encoding='utf-8')
md='''# Võ Đang skill assets — final production review

All10 selected active-skill concepts and13 selected icon concepts were explicitly approved by the user: “all approved”,2026-10-31. Those approvals are recorded separately against exact image hashes. **New production artwork is a prototype awaiting final director approval.**

[Interactive Phaser preview](../../../source/skills/vo-dang/review.html) requires a local HTTP server. From the repository root run `node assets/source/skills/vo-dang/serve.mjs`, then open `http://127.0.0.1:8766/assets/reviews/skills/vo-dang/index.html`. The index includes all actual PNGs and per-skill live links. This viewer has no room/server connection. A/QWER/replay, hit/counter and basic-qi switches are presentation-only controls.

Delivered20 character/VFX components,636 exported cels in163 animation tags,13 icons at64×64,33 editable Aseprite sources and separate transparent frame PNGs plus PNG/hash-JSON atlases and .animations.json metadata.636 is exported cels, **not636 new drawings**:157 distinct character rasters include approved reuse;460 distinct VFX rasters include exact cardinal transforms. Source alpha cleanup, fixed-scale nearest sampling, anchors and all transforms are recorded. No concept/reference sheet was cut into animation frames.

| Stable ID / Vietnamese name | Approved concept path | New / reused character | VFX | Icon path | Export / Phaser | Gameplay | Final art approval |
| --- | --- | --- | --- | --- | --- | --- | --- |
'''+ '\n'.join(mdrows)+'''

## Production and reuse

- New original raster poses for all10 active skills. Both normal attacks reuse approved animation files unchanged. Skill characters retain Quyền80×80/pivot(40,64) and Kiếm96×80/pivot(48,64), approximately44px logical body height and origin(0.5,0.8). All89 approved character files and the lock remain unchanged.
- Corrections are explicit: Lưỡng Nghi source rows were remapped to actual facings; Dương Khí left uses an exact mirror of new unarmed artwork; Nhân Kiếm left uses all4 approved Kiếm basic frames; Vạn Kiếm left release/contact uses approved frames1/2; counter left contact uses approved frame2; shield left recovery uses approved idle. Sword artwork was not mirrored. The counter has a held readiness tag and a separate moving response sequence. It never implies guaranteed blocking or invulnerability.
- Character and VFX are separate. Glyphs and stage offsets are described in .animations.json. Melee cuts, straight qi, short Yin wave, personal shield, circular field, octagonal sword formation, counter and frontal multi-wave sequences remain distinct. Ground interiors are open. Basic Kiếm's optional qi demo reuses Nhân Kiếm travel at half display size; it does not implement RNG, guarantee a proc or add a new basic mechanic. Passive has an icon only, no world effect.
- Icons are produced from the separately approved icon artwork, sampled to54px internal art with a shared5px raster frame from the approved Lưỡng Nghi icon, then exported from editable64px Aseprite sources. Names/hotkeys are live labels, not baked into icons. Actual64/44/32px PNGs were inspected in the viewport.
- Live screenshot inspection found the initial Bát Quái boundary too faint on pale stone. `bat_quai_kiem_tran_vfx_v02.png` strengthens only that contour; v01 and initial evidence remain retained. Only this component was rebuilt. It passed the subsequent source/Phaser checks.

## Phaser evidence and limits

`node assets/source/skills/vo-dang/verify_phaser.mjs` passed all163 tags/all636 frame references, all active four-facing transitions, stable sprite origins/foot anchors, staged effects and cleanup. It captured character/VFX galleries, combined down/left/right/up, light/dark and six-simultaneous-cast PNGs per active skill. Conditional hit-only mana return, triggered counter and absorption were asserted separately. Projectiles retained straight headings; wide frontal waves travelled along separate fixed headings. Every icon pair loaded correctly; the passive produced no in-world effect.

This is a real isolated Phaser4.2.1 renderer at640×360 logical/1280×720 display, camera zoom1 and normal integer display scale2. Six-cast composition is an art-readability check, not six connected clients or a performance benchmark. Numeric preview timings, illustrative target distance, field footprint, pulse interval and three-wave demo are choreography only, not approved gameplay numbers. Shield toggle/timed lifetime and future authoritative trigger policies remain unresolved.

**Visual assets verified in preview; gameplay implementation pending.** No Võ Đang mechanics, damage, mana costs/refunds, cooldowns, targeting, statuses, passive stats, loadouts, RNG, server simulation or existing authoritative events were changed. No corresponding Võ Đang gameplay implementations were found to bind. Future integration must drive effect stages and lifetimes from authoritative events; animation never schedules damage.

Actual PNGs were compared to the approved hero direction/atlases and the rejected placeholder screenshot. The retained detailed charcoal/ivory hero, distinct moving pose cels and crisp original effects replace neither the map nor other school artwork. Remaining art-review considerations: final pixel cleanup at32px, thin-detail loss, effect density during six overlaps and individual generated-pose consistency. These are prototypes for director review, not self-approved final artwork.

## Provenance and rebuild

Original AI-assisted raster sources generated with built-in OpenAI image_gen.imagegen, approved Võ Đang atlases and approved skill directions. All prompts, source filenames, reference paths and output hashes are retained. No third-party sprite pack, human hand-pixelled authorship or exclusive copyright claim. Director references are direction-only; their third-party licenses were not independently established. Existing arena and bandit PNGs are reused solely as project preview context. No video/GIF/animated evidence was generated; historical recordings were preserved.

Files: [production manifest](../../../exports/skills/vo-dang/production_manifest_v01.json), [export validation](../../../exports/skills/vo-dang/validation_v01.json), [exact current preview hashes](runtime_preview_v01.json), [live observations](phaser_verification_v01.json), [independent final approval register](final_approval_register_v01.json), [concept approvals](../../../source/skills/vo-dang/concept_approval_v01.json), [source placements](../../../source/skills/vo-dang/frame_placements_v01.json), [initial prompts](../../../source/skills/vo-dang/generation_prompts_v01.json), [remaining prompts](../../../source/skills/vo-dang/generation_prompts_v02.json), [boundary correction](../../../source/skills/vo-dang/generation_prompts_v03.json).

Default `node assets/source/skills/vo-dang/build.mjs` exports retained artist-edited Aseprite sources. `--assemble` intentionally rebuilds editable files from prepared PNGs; `python -X utf8 assets/source/skills/vo-dang/prepare.py` intentionally rebuilds prepared cels from retained generated sources. For a focused revision set `VOLAM_ART_COMPONENT=<id>_vfx` during prepare, then `node assets/source/skills/vo-dang/build.mjs --assemble --asset=<id>_vfx`. Do not run assembly after artist edits unless intentionally replacing them. The exporter and preparer refuse approved final production; approved baseline files are read-only.

Actually run: `node assets/source/skills/vo-dang/build.mjs --assemble`; focused Bát Quái rebuild; `python -X utf8 assets/source/skills/vo-dang/validate.py`; two actual Phaser verification passes (initial and boundary revision); scoped Prettier and JavaScript syntax checks. Full repository validation commands/results are recorded in [final_validation_v01.json](final_validation_v01.json). No duplicate successful full suite was run for documentation metadata.

Official APIs consulted before implementation: [Phaser animations](https://docs.phaser.io/phaser/concepts/animations), [Phaser loader](https://docs.phaser.io/phaser/concepts/loader), [Aseprite CLI](https://www.aseprite.org/docs/cli/). Installed Aseprite1.3.18.6-x64 was actually used for source creation and export.

Director approval requested for the produced character clips, VFX and icons in this review. Concept approval is already recorded; production approval remains pending for every entry.
'''
(OUT/'README.md').write_text(md,encoding='utf-8')
(BASE/'README.md').write_text('# Võ Đang skill production\n\n[Complete production and review report](../../../reviews/skills/vo-dang/README.md)\n\nConcepts approved; production prototypes and visual preview verified; final director approval pending. See recipe.json, frame_placements_v01.json, generation_prompts_v01/v02/v03.json and concept_approval_v01.json. Default build preserves retained editable Aseprite files; --assemble intentionally reconstructs them. Approved character assets are read-only. No gameplay implementation.\n',encoding='utf-8')
print('Published13-entry coverage table, exact preview hashes, PNG overview and final approval register (all pending).')
