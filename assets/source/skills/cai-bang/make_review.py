from pathlib import Path
import json,html
root=Path.cwd();out=root/'assets/reviews/skills/cai-bang';source=root/'assets/source/skills/cai-bang';exports=root/'assets/exports/skills/cai-bang'
m=json.loads((exports/'production_manifest_v1.json').read_text(encoding='utf-8-sig'));v=json.loads((exports/'validation_v1.json').read_text(encoding='utf-8-sig'));p=json.loads((out/'phaser_verification.json').read_text(encoding='utf-8-sig'))
assert v['status']==p['status']=='PASS'
for skill in {a['skillId'] for a in m['assets'] if a['kind']=='character'}:
 for mode in ['character','vfx','combined','arena']:
  assert (out/skill/(mode+'_1280x720.png')).is_file(), f'Missing PNG preview: {skill}/{mode}'
names={'hoa_van_chuong':'Hỏa Vân Chưởng','cuong_long_loan_vu':'Cuồng Long Loạn Vũ','phi_long_tai_thien':'Phi Long Tại Thiên','khang_long_huu_hoi':'Kháng Long Hữu Hối','hang_long_hoa_vu':'Hàng Long Hỏa Vũ','hoanh_tao_bong':'Hoành Tảo Bổng','pha_giap_bong':'Phá Giáp Bổng','cam_long_cong':'Cầm Long Công','truy_phong_bong':'Truy Phong Bổng','thien_ha_vo_cau':'Thiên Hạ Vô Cẩu'}
rows=[]
for skill,name in names.items():
 assets=[a for a in m['assets'] if a['skillId']==skill];assert len(assets)==2
 for a in assets:
  a['status']='validated_export_candidate_pending_director_art_review'
  a['validation']={'files':'assets/exports/skills/cai-bang/validation_v1.json','phaser':'assets/reviews/skills/cai-bang/phaser_verification.json','previews':'assets/reviews/skills/cai-bang/index.html','scope':'Technical checks and isolated Phaser only; not production match integration'}
  (root/a['sheet']).with_name(a['id']+'.animations.json').write_text(json.dumps(a,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 rows.append({'id':skill,'nameVi':name,'progress':{'Concept':'generated','Approved':'concept_approved_by_user_2026_10_30','Frames':'produced','SpriteSheet':'packed_png_and_json','Validated':'file_and_isolated_phaser_pass'},'components':[a['id'] for a in assets],'exportedFrames':sum(n['frameCount'] for a in assets for n in a['animations']),'productionArtApproved':False,'runtimeIntegrated':False})
m['status']='technical_validation_pass_director_art_review_pending';m['validation']='assets/exports/skills/cai-bang/validation_v1.json'
(exports/'production_manifest_v1.json').write_text(json.dumps(m,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
progress={'createdOn':'2026-10-30','conceptApproval':'User explicitly approved all Phase A concepts','status':'All ten exported animation candidates technically validated; director production-art approval pending','skills':rows,'totals':{'characterComponents':10,'skillVfxComponents':10,'sharedVfxComponents':1,'exportedFrames':v['totalFrames'],'animationTags':v['totalAnimationTags'],'screenshotPreviews':sum(a['kind']=='character' for a in m['assets'])*4},'runtimeIntegrated':False,'gameplayChanged':False,'approvedBaselineFilesUnchanged':8,'limitations':['Eight skills still lack executable gameplay definitions; preview timing/range is visual-only and provisional.','Six simultaneous visual casts are not a six-client multiplayer test or measured performance benchmark.','Generated source poses are corrected, aligned and checked; human art approval is still pending.'],'additionalAbilities':{'cai_bang_chuong':'Approved character frames reused; existing runtime fire unchanged','cai_bang_bong':'Approved character frames reused; existing runtime arc unchanged','tieu_dieu_cong':'No activated/idle aura required by existing passive definition; no extra effect generated'}}
(exports/'progress_manifest_v1.json').write_text(json.dumps(progress,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
escape=html.escape
style='''<style>html{color-scheme:dark}body{margin:0;background:#231f1b;color:#f2e8d8;font:16px/1.6 system-ui}main{max-width:1440px;margin:auto;padding:24px}h1,h2,h3{color:#ffd185;line-height:1.2}a{color:#ffd185}section{padding-top:24px;margin-bottom:36px}img{max-width:100%;height:auto;image-rendering:pixelated}nav{display:flex;gap:12px;flex-wrap:wrap}.previews{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}figure{margin:0}figcaption{font-size:14px;color:#d8c9b0}.note{padding:16px;border-left:4px solid #b67e37;background:#332a22}.scroll{overflow:auto}table{border-collapse:collapse;width:100%}td,th{padding:10px;border-bottom:1px solid #6f5840;text-align:left}.frames{display:flex;flex-wrap:wrap;gap:10px}.frames figure{padding:4px;background:repeating-conic-gradient(#57574d 0% 25%,#757164 0% 50%) 0/16px 16px}.frames img{display:block;max-width:none}.frames figcaption{max-width:190px;background:#211c17;font-size:11px}.overview{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px}@media(max-width:700px){.previews,.overview{grid-template-columns:1fr}}</style>'''
head='<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Cái Bang animation production review</title>'+style
parts=[head+'<main><h1>Cái Bang — Phase B animation review</h1><p class="note"><strong>10 skills · 21 animation components · 464 exported frames · 105 animation tags · 40 PNG previews with live Phaser frame verification.</strong><br>Concepts approved. Export files and isolated Phaser playback validated. Production artwork review pending. No production gameplay integration.</p><nav><a href="frames.html">Individual frame inspection</a><a href="../../../exports/skills/cai-bang/progress_manifest_v1.json">Progress manifest</a><a href="../../../exports/skills/cai-bang/validation_v1.json">File validation</a><a href="phaser_verification.json">Phaser evidence</a><a href="../../../source/skills/cai-bang/README.md">Production notes &amp; commands</a></nav><p>PNG previews below are actual Phaser captures at 640×360 logical / 1280×720 display size. Motion is checked live in the isolated Phaser viewer and reported in the frame-observation evidence. Serve the repository root to use that viewer; see production notes. Recordings are generated only on explicit user request; existing recordings are preserved.</p><h2>Game-scale overview</h2><div class="overview">']
for skill,name in names.items():parts.append('<figure><a href="#'+skill+'"><img loading="lazy" src="'+skill+'/arena_1280x720.png" alt="'+escape(name)+'"></a><figcaption>'+escape(name)+'</figcaption></figure>')
parts.append('</div>')
for skill,name in names.items():
 parts.append('<section id="'+skill+'"><h2>'+escape(name)+'</h2><p><code>'+skill+'</code> · four-direction character animation · separate VFX · transparent PNG frames + packed atlas/JSON.</p><div class="previews">')
 for mode,title in [('character','Character animation'),('vfx','VFX only'),('combined','Combined on plain terrain'),('arena','Gameplay scale on current arena ground')]:
  parts.append('<figure><a href="'+skill+'/'+mode+'_1280x720.png"><img loading="lazy" src="'+skill+'/'+mode+'_1280x720.png" alt="'+escape(name+' — '+title)+'"></a><figcaption>'+title+' · <a href="'+skill+'/'+mode+'_1280x720.png">PNG screenshot</a> · <a href="../../../source/skills/cai-bang/review.html?skill='+skill+'&amp;mode='+mode+'">Live Phaser viewer</a></figcaption></figure>')
 parts.append('</div><p><a href="'+skill+'/light_1280x720.png">Light terrain</a> · <a href="'+skill+'/dark_1280x720.png">Dark terrain</a> · <a href="'+skill+'/six_simultaneous_1280x720.png">Six simultaneous visual casts</a></p><p>')
 for a in [a for a in m['assets'] if a['skillId']==skill]:
  relative='../../../'+a['sheet'].removeprefix('assets/')
  parts.append('<a href="'+relative+'">'+a['kind']+' PNG</a> · <a href="'+relative.replace('.png','.json')+'">atlas JSON</a> · <a href="'+relative.replace('.png','.animations.json')+'">animation metadata</a> · ')
 parts.append('</p></section>')
parts.append('<section><h2>Review boundaries</h2><p>Existing approved Cái Bang files remain byte-identical. New heavy staff/channel poses and VFX are candidates for your art review. Palm casts, sweep/dash footwork and ultimate opening reuse approved distinct baseline frames. Right-side character variants mirror left; directional VFX use exact cardinal pixel transforms.</p><p>The eight unimplemented skills use catalogue behavior and provisional visual choreography. Damage, cooldowns, mana, range, targeting, CC and multiplayer code were unchanged. Six-caster pictures are an isolated visual stress check. No production scene integration or gameplay-scale director approval is implied.</p><p>Tiêu Diêu Công needs no added aura under its current definition. Existing basic attacks remain approved and unchanged.</p></section></main></html>')
(out/'index.html').write_text(''.join(parts),encoding='utf-8')
recipe=json.loads((source/'recipe.json').read_text(encoding='utf-8-sig'));frameparts=[head+'<main><h1>Individual animation frames</h1><p><a href="index.html">Back to animation review</a> · New assets only. All cels shown separately at 2× native pixel size. Checkerboard is review CSS, not baked into PNGs.</p>']
for a in m['assets']:
 r=next(r for r in recipe['assets'] if r['id']==a['id'])
 frameparts.append('<section><h2>'+a['id']+'</h2><p>'+str(a['frameDimensions'])+' px · pivot '+str(a['pivot'])+'</p>')
 for anim in a['animations']:
  frameparts.append('<h3>'+escape(anim['name'])+'</h3><div class="frames">')
  for name in anim['frames']:
   rel='../../../'+r['sourceFolder'].removeprefix('assets/')+'/frames/'+name+'.png'
   frameparts.append('<figure><a href="'+rel+'"><img loading="lazy" src="'+rel+'" width="'+str(a['frameDimensions'][0]*2)+'" height="'+str(a['frameDimensions'][1]*2)+'" alt="'+name+'"></a><figcaption>'+name+'</figcaption></figure>')
  frameparts.append('</div>')
 frameparts.append('</section>')
frameparts.append('</main></html>');(out/'frames.html').write_text(''.join(frameparts),encoding='utf-8')
print('Review index, individual-frame album and per-skill progress manifest written.')

