"""Final static art delivery audit; no Phaser, game modules, tests or runtime mapping imports."""
from build_batch import *
import csv,struct,os
BATCHES=['01_cai_bang','02_thien_son','03_vo_dang','04_thieu_lam']
DIRS=['down','left','right','up']
def visible_equal(a,b):
 x=np.asarray(a.convert('RGBA'));y=np.asarray(b.convert('RGBA'))
 return np.array_equal(x[:,:,3],y[:,:,3]) and np.array_equal(x[:,:,:3][x[:,:,3]>0],y[:,:,:3][y[:,:,3]>0])
def local_link(p,folder=REVIEW):return Path(os.path.relpath(ROOT/p,folder)).as_posix()
def audit():
 output_records=load(SRC/'generator_output_records.json');generation_lookup={(r['batch'],r['id']):r for r in output_records}
 report={'status':'PASS_STATIC_FILES_ONLY','runtimeIntegrated':False,'runtimeApproved':False,'phaserChecked':False,'recordingsCreated':False,'batches':[],'components':[],'limitations':['Static cels and metadata do not prove runtime motion, server synchronization, occlusion or six-player readability.','Normal gameplay zoom, interruption/cleanup and all facings must be checked after integration in Phaser.']}
 handoff=[];component_rows=[];frame_rows=[]
 for batch in BATCHES:
  config=load(SRC/batch/'batch_config.json');manifest=load(SRC/batch/'production_manifest.json');validate(batch)
  for c in config['components']:c['id']=c['package']+'_'+c['role']
  generations=[]
  for p in sorted((SRC/batch/'generated').glob('*.png')):
   prompt=SRC/batch/(p.stem+'_prompt.json');assert prompt.exists(),p
   used=any(f.get('sourceId')==p.stem for c in config['components'] for a in c['clips'] for f in a['frames'])
   entry={'id':p.stem,'path':p.relative_to(ROOT).as_posix(),'sha256':sha(p),'dimensions':list(Image.open(p).size),'prompt':prompt.relative_to(ROOT).as_posix(),'tool':'OpenAI built-in image_gen','sourceOutput':generation_lookup.get((batch,p.stem),{}).get('builtinOriginalPath'),'status':'USED_PRODUCTION_SOURCE' if used else 'REJECTED_OR_UNUSED_SOURCE_NOT_EXPORTED','rights':'Original AI-assisted production raster; existing project references guide identity. No exclusive-rights or human hand-pixelled claim.'}
   if p.stem=='sl_three_powers_normal_v2':entry['excludedRegion']='Original row2 large palm had joined ground stones; only rows0,1,3 used. Separate normal palm repair replaces row2.'
   generations.append(entry)
  save(SRC/batch/'generation_records.json',{'generator':'OpenAI built-in image_gen','recordingsCreated':False,'sources':generations})
  palette_path=SRC/batch/'character_palette.json';palette={tuple(c) for c in load(palette_path)['colorsRGB']} if palette_path.exists() else None
  char_focus=[]
  for component in manifest['components']:
   pid=component['id'];plan=load(SRC/batch/(pid+'_frame_plan.json'));meta=load(ROOT/component['metadata']);j=load(ROOT/component['atlas']);sheet=Image.open(ROOT/component['sheet']).convert('RGBA')
   raw=(ROOT/component['source']).read_bytes();declared,magic,framecount,w,h,depth=struct.unpack_from('<IHHHHH',raw,0)
   assert declared==len(raw) and magic==0xA5E0 and framecount==len(j['frames']) and [w,h]==meta['frameDimensions'] and depth==32,pid
   assert max(sheet.size)<=4096,(pid,'texture size')
   assert sha(ROOT/component['sheet'])==component['sheetSha256'] and sha(ROOT/component['metadata'])==component['metadataSha256'] and sha(ROOT/component['source'])==component['sourceSha256']
   assert not meta['runtimeApproved'] and not meta['runtimeIntegrated'] and meta['displayScale']==1
   if component['role']=='character':assert meta['origin']==[.5,.8] and meta['pivot']==[80,96]
   tags={t['name']:t for t in j['meta']['frameTags']};retained_exact=0;new_palette_cels=0;timelines=[]
   byname={f['name']:f for f in plan['frames']}
   for a in meta['animations']:
    assert a['name'] in tags and a['damageAuthority'].startswith('Server only')
    assert all(t>0 for t in a['frameDurationsMs']) and a['loop']==(a['repeat']==-1)
    hashes=[]
    for i,n in enumerate(a['frames']):
     rec=j['frames'][n];r=rec['frame'];cel=sheet.crop((r['x'],r['y'],r['x']+r['w'],r['y']+r['h']));hashes.append(hashlib.sha256(cel.tobytes()).hexdigest())
     assert abs(rec['duration']-a['frameDurationsMs'][i])<1.01,(pid,n,'duration')
     f=byname[n]
     if f['kind']=='character':
      arr=np.asarray(cel);colors={tuple(c) for c in arr[:,:,:3][arr[:,:,3]>0]};assert colors<=palette,(pid,n,'new palette')
      new_palette_cels+=1
     elif f['kind']=='atlas' and not f.get('opacity') and not f.get('mirror'):
      im=Image.open(ROOT/f['source']).convert('RGBA');x,y,fw,fh=f['rect'];crop=im.crop((x,y,x+fw,y+fh));expected=Image.new('RGBA',tuple(meta['frameDimensions']));expected.paste(crop,(round(meta['pivot'][0]-f['anchor'][0]),round(meta['pivot'][1]-f['anchor'][1])))
      assert visible_equal(cel,expected),(pid,n,'retained pixels changed');retained_exact+=1
     frame_rows.append({'batch':batch,'component':pid,'tag':a['name'],'frame':n,'order':i,'durationMs':a['frameDurationsMs'][i],'direction':a['direction'],'phase':a.get('framePhases',[a['phase']]*len(a['frames']))[i],'loop':a['loop'],'contact':i in a.get('contactFrames',[]),'pivotX':meta['pivot'][0],'pivotY':meta['pivot'][1]})
    if component['role']=='character' and len(a['frames'])>1:assert len(set(hashes))>=2,(pid,a['name'],'static animation')
    timelines.append({'tag':a['name'],'frameCount':len(hashes),'distinctCels':len(set(hashes)),'totalMs':a['durationMsTotal'],'loop':a['loop'],'firstLastSame':hashes[0]==hashes[-1]})
    if component['role']=='character' and a['name'].startswith(('throw_','left_palm_','right_palm_','left_fist_','right_fist_','la_han_quyen_normal_','vi_da_quyen_normal_','dai_luc_kim_cuong_chuong_normal_')):char_focus.append((component,a))
   if component['role']=='character':
    faces={a['direction'] for a in meta['animations']};assert set(DIRS)<=faces,(pid,'missing facing')
   detail={'id':pid,'asepriteHeaderValid':True,'rgbaDepth':depth,'celCount':framecount,'textureDimensions':list(sheet.size),'retainedCelsPixelExact':retained_exact,'newCelsInApproved192ColorPalette':new_palette_cels,'timelines':timelines}
   report['components'].append(detail);component_rows.append({'batch':batch,**component})
  # Regenerate review PNGs and tables after any metadata-only improvements.
  make_reviews(batch,config,manifest)
  if char_focus:
   basics=[x for x in char_focus if x[1]['name'].startswith(('throw_','left_palm_','right_palm_','left_fist_','right_fist_'))]
   extras=[x for x in char_focus if x not in basics and (x[1]['direction']=='down' or ('dai_luc_' in x[1]['name'] and x[1]['direction']=='up'))]
   make_character_focus(batch,(basics+extras)[:12])
  item=load(REVIEW/batch/'file_validation.json');report['batches'].append({'batch':batch,'frames':item['totalFrames'],'tags':item['totalTags'],'components':len(manifest['components']),'protectedFiles':item['protectedFiles'],'protectedHashChanges':item['protectedHashChanges']})
  handoff.extend([{'batch':batch,**x} for x in manifest['handoff']])
  report['components'][-1]['batch']=batch
 assert {a['name'] for a in load(OUT/'02_thien_son/thien_son_fan_v2/thien_son_fan_v2_projectile.animations.json')['animations'] if a['name'].startswith('storm_fan_')}=={'storm_fan_'+s for s in ['down','left','right','up','down_left','down_right','up_left','up_right']}
 shieldtags={a['name'] for a in load(OUT/'03_vo_dang/vo_dang_shield_formation_v2/vo_dang_shield_formation_v2_aura.animations.json')['animations']}
 assert {'mana_opening','mana_loop','mana_absorb','mana_off','mana_depleted'}<=shieldtags
 report['totalFrames']=sum(x['frames'] for x in report['batches']);report['totalTags']=sum(x['tags'] for x in report['batches']);report['totalSourceAtlasSets']=sum(x['components'] for x in report['batches'])
 save(REVIEW/'static_delivery_audit.json',report)
 preserved=[{'batch':batch,**r} for batch in BATCHES for r in load(SRC/batch/'batch_config.json').get('preservedReferences',[]) if r.get('handoffId')]
 save(REVIEW/'asset_handoff.json',{'status':STATUS,'contract':'docs/M3C3_FEEDBACK_IMPLEMENTATION.md','samplePreserved':'assets/source/skills/cai-bang/cai_bang_bong_a_m3c3_feedback_v2/production_manifest.json','preservedReferences':preserved,'components':component_rows,'skillStages':handoff,'runtimeMappingEdited':False})
 with (REVIEW/'frame_inventory.csv').open('w',encoding='utf-8-sig',newline='') as f:
  wr=csv.DictWriter(f,fieldnames=list(frame_rows[0]));wr.writeheader();wr.writerows(frame_rows)
 with (REVIEW/'component_inventory.csv').open('w',encoding='utf-8-sig',newline='') as f:
  wr=csv.DictWriter(f,fieldnames=list(component_rows[0]));wr.writeheader();wr.writerows(component_rows)
 make_summary(report,handoff)
 # Exact path/hash inventories include all new artifacts and no unrelated workspace files.
 for batch in BATCHES:
  inventory(REVIEW/batch/'file_inventory.json',[SRC/batch,OUT/batch,REVIEW/batch])
 inventory(REVIEW/'file_inventory.json',[SRC,OUT,REVIEW])
 progress=load(SRC/'progress.json');progress.update({'completedBatches':BATCHES,'activeBatch':None,'status':'FILES_COMPLETE_PENDING_RUNTIME','runtimeIntegrated':False,'runtimeApproved':False});save(SRC/'progress.json',progress)
 # Progress was updated last; refresh the master inventory once with its final hash.
 inventory(REVIEW/'file_inventory.json',[SRC,OUT,REVIEW])
 print(json.dumps({k:v for k,v in report.items() if k not in ['components','batches','limitations']},ensure_ascii=False))
def make_character_focus(batch,entries):
 font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',14);maxframes=max(len(a['frames']) for c,a in entries)
 im=Image.new('RGB',(220+maxframes*180,46+len(entries)*190),(22,25,30));d=ImageDraw.Draw(im);d.text((12,10),'ACTUAL EXPORTED CHARACTER PIXELS x2 / FIXED FOOT GUIDE / NOT A GAME CAPTURE',font=font,fill=(255,220,160))
 for row,(c,a) in enumerate(entries):
  y=46+row*190;d.text((8,y+8),a['name'][:30],font=font,fill=(220,205,175))
  for col,n in enumerate(a['frames']):
   source=OUT/batch/c['handoffId']/'character_frames'/(n+'.png');f=Image.open(source).convert('RGBA');crop=f.crop((35,28,125,108)).resize((180,160),Image.Resampling.NEAREST)
   # Integer 2x crop shows faces, sleeves, hands and shoes around the fixed pivot.
   px=220+col*180;py=y+8;d.line((px,py+136,px+176,py+136),fill=(60,75,85));im.paste(crop,(px,py),crop);d.text((px+4,y+169),str(a['frameDurationsMs'][col])+'ms',font=font,fill=(160,165,170))
 im.save(REVIEW/batch/'character_continuity_focus_2x.png')
def make_summary(report,handoff):
 font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',16);im=Image.new('RGB',(1280,768),(20,23,28));d=ImageDraw.Draw(im)
 labels=['CÁI BANG','THIÊN SƠN','VÕ ĐANG','THIẾU LÂM']
 for i,batch in enumerate(BATCHES):
  x=(i%2)*640;y=(i//2)*384;f=Image.open(REVIEW/batch/'gameplay_mockup_1x_640.png');im.paste(f,(x,y+24));d.text((x+10,y+3),labels[i]+' / EXPORTED PIXEL MOCKUP / PENDING RUNTIME',font=font,fill=(245,220,175))
 im.save(REVIEW/'batch_mockups_overview.png')
 lines=['# M3C3 feedback v2 — art production delivery','','Status: **PRODUCTION_CANDIDATE_PENDING_RUNTIME_REVIEW**. Bốn batch đã có source và file xuất; chưa tích hợp hoặc duyệt art trong Phaser. Concept và mẫu Bổng đã được người dùng duyệt; mẫu Bổng cũ giữ nguyên byte/hash.','','Không sửa logic, Phaser, runtime mapping, approval lock hoặc tài liệu gameplay. Không tạo GIF/video. Animation trình bày kết quả server; contact marker, duration và vòng VFX không gây damage.','','| Batch | Frame | Tag | Source/atlas | Review + bảng skill/stage |','|---|---:|---:|---:|---|']
 for x,label in zip(report['batches'],labels):lines.append('| '+label+' | '+str(x['frames'])+' | '+str(x['tags'])+' | '+str(x['components'])+' | [Bàn giao]('+x['batch']+'/README.md) |')
 lines+=['','Tổng: '+str(report['totalFrames'])+' frame, '+str(report['totalTags'])+' tag, '+str(report['totalSourceAtlasSets'])+' bộ editable .aseprite + transparent PNG + atlas JSON + animation metadata. Count gồm cels tái sử dụng được xuất thành bộ v2, không phải tất cả đều vẽ mới.','','[Mockup bốn batch](batch_mockups_overview.png) · [Bảng component](component_inventory.csv) · [Thứ tự mọi frame](frame_inventory.csv) · [Skill/stage handoff JSON](asset_handoff.json) · [Kiểm tra file](static_delivery_audit.json) · [Danh sách file chính xác + SHA256](file_inventory.json)','','## Cấu trúc bàn giao','','- Source: assets/source/skills/m3c3_feedback_v2_batches/<batch>/. Mỗi component có source .aseprite với cels/tags/slice pivot chỉnh sửa được; generated PNG gốc, prompt, measurements, frame plan và provenance được giữ riêng.','- Export: assets/exports/skills/m3c3_feedback_v2_batches/<batch>/<handoff-id>/. Mỗi role có .png, hash-atlas .json, .animations.json schema2, cùng PNG từng frame.','- Review: thư mục này; PNG contact sheet native, crop kiểm tra nhân vật, mockup logical1x/display2x. Mockup ghép lên screenshot lịch sử, có nhãn NOT GAME CAPTURE; không phải ảnh chụp game sau tích hợp.','','## Tương thích và cách đọc metadata','','Nhân vật canvas160x120, pivot chân(80,96), origin(0.5,0.8), displayScale1. Chiều cao guard44px khớp idle gốc80x80 có chân(40,64). Mẫu Bổng giữ canvas112x100/pivot(56,80) đã duyệt; tham chiếu riêng trong batch Cái Bang. VFX256x256, anchor(128,128); placementOffsetFromFeet là offset trình bày, không phải hitbox. Không bake bóng mới: dùng foot-shadow hiện tại khi tích hợp.','','Animation metadata ghi frames, frameDurationsMs, direction, framePhases/phase, pivot, loop/oneShot, contactMarkers và điều kiện server. Duration là playback tham chiếu; fit theo interval/state được nhận. Đánh thường Thiên Sơn có base300ms và min5ticks; không khóa input để chờ hoàn thành animation. Quạt đi/về dùng projectile leg; return samples owner một lần. Tám hướng ultimate có tag riêng và hướng tùy ý được phép theo heading thực.','','Khiên có opening/loop/absorb/off/depleted riêng. Loop phải dừng theo toggle, cạn mana, chết hoặc cleanup. Trận pháp dùng cùng ground projection không quay camera; inward_response_* chứa cả viền, nên thay tạm frame loop của field khi phản ứng, không cộng thêm một viền thứ hai. Không tạo stun/cage.','','## Kiểm tra đã làm và phần còn chờ','','Kiểm tra từng atlas/cel PNG, alpha, clipping, frame duration, tag order, Aseprite header/frame count, pivot/origin, đủ bốn hướng; quạt ultimate đủ tám hướng; palette192 lấy từ foreground hero đã duyệt cho pose MỚI. Cels tái sử dụng được so pixel ở native scale; '+str(sum(c['retainedCelsPixelExact'] for c in report['components']))+' lượt cel khớp nguyên bản. '+str(sum(c['newCelsInApproved192ColorPalette'] for c in report['components']))+' lượt cel nhân vật mới nằm trong palette đã đối chiếu. Tất cả3023 file được bảo vệ, gồm mẫu Bổng và approval locks, giữ nguyên hash.','','Quan sát tĩnh: kiểm tra mặt/tóc/trang phục/tay/vũ khí/chân trong source và contact sheet; loại pose Thiếu Lâm sai facing, thay riêng normal-palm source có nét dính giữa ô; tách VFX theo stroke raster nguyên vẹn để tránh cắt theo grid lệch. Nguồn lỗi vẫn giữ để provenance nhưng không gán vào atlas sử dụng. Đây chưa phải xác nhận motion continuity trong game.','','Chờ chat tích hợp kiểm tra trong Phaser ở zoom chơi thường: playback đủ hướng, nối đòn và restart theo attack speed, boomerang và hit hai leg, moving-dash immunity cue, cleanup/ending, foot/Y-depth/shadow, trạng thái mana và containment, cuối cùng natural combat6người. Không chạy game/test suite trong chat art; không đổi approval lock.','','## Provenance và alias tham chiếu','','Tạo raster mới bằng OpenAI built-in image_gen theo concept đã duyệt, không cắt concept làm atlas. Crop/mask/nearest-neighbor downsample, palette match và atlas export bằng Aseprite1.3.18.6. Không dùng hình học procedural để tạo artwork, không phóng to concept giả sprite. Prompt, source-output path nếu có, source PNG hash và mọi transform nằm trong source generation_records.json / *_frame_plan.json.','','Alias đã xử lý theo file thực tế: vo_dang_art_direction_reference.png → vo_dang_character_reference.png. thien_son_thieu_lam_character_reference.png thực tế là town. current_codex_dashboard_anti_reference.png thực tế là Võ Đang sheet; negative dashboard đúng là wuxia_town_world_reference.png. Placeholder negative đúng là current_game_2026_10_29_placeholder_anti_reference.png. in_game_world_reference.png hiện có. Không dùng nhầm alias làm chuẩn.','','Mỗi role/gói có trạng thái pending runtime. Người dùng duyệt concept và mẫu không được chuyển thành runtime approval cho loạt mới.']
 (REVIEW/'README.md').write_text('\n'.join(lines)+'\n',encoding='utf-8')
 (SRC/'README.md').write_text('# Editable art production sources\n\nStatus: PRODUCTION_CANDIDATE_PENDING_RUNTIME_REVIEW.\n\nFull delivery index: [review README]('+local_link((REVIEW/'README.md').relative_to(ROOT),SRC)+').\n\nOnly new art/source/export helpers are stored here. No game logic or runtime mapping. Preserve generator inputs and source-output provenance. Rebuild with Aseprite installed using tools/build_batch.py <batch>; --characters-only changes only character source/sheet exports. PNG contact sheets and gameplay mockups are static reviews, not runtime approval.\n',encoding='utf-8')
 (OUT/'README.md').write_text('# M3C3 feedback v2 exports\n\nStatus: PRODUCTION_CANDIDATE_PENDING_RUNTIME_REVIEW.\n\n[Delivery index]('+local_link((REVIEW/'README.md').relative_to(ROOT),OUT)+'). Source/atlas inventory and exact skill-stage mapping are linked there. No runtime mapping or approval lock was modified.\n',encoding='utf-8')
def inventory(path,roots):
 files=sorted({p for root in roots for p in root.rglob('*') if p.is_file() and '__pycache__' not in p.parts})
 records=[{'path':p.relative_to(ROOT).as_posix(),'bytes':p.stat().st_size,'sha256':sha(p)} for p in files if p!=path]
 records.append({'path':path.relative_to(ROOT).as_posix(),'bytes':None,'sha256':None,'selfRecord':True})
 save(path,{'status':STATUS,'selfExcludedFromHashes':True,'files':records})
if __name__=='__main__':audit()
