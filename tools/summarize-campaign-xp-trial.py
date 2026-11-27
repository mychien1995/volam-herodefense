"""Audit XP-only hypotheses and export the proposal. No production configuration writes."""
from pathlib import Path
import collections
import csv
import hashlib
import json
import statistics

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'docs/evidence/sessions/campaign-xp-trial-2026-11-27'
OUT.mkdir(parents=True,exist_ok=True)
KERNEL=hashlib.sha256((ROOT/'tools/campaign-xp-trial.ts').read_bytes()).hexdigest()
FORMAT=json.loads((OUT/'format-validation.json').read_text())
assert FORMAT['emittedJsEquivalent'] and FORMAT['afterHash']==KERNEL
ACCEPTED_KERNELS={FORMAT['beforeHash'],FORMAT['afterHash']}
for h in ACCEPTED_KERNELS:
 assert hashlib.sha256((OUT/'kernel-snapshots'/f'{h}.ts').read_bytes()).hexdigest()==h
PROFILE_SOURCE=(ROOT/'tools/campaign-xp-profiles.ts').read_bytes()
PROFILE_HASH=hashlib.sha256(PROFILE_SOURCE).hexdigest()
(OUT/'profile-snapshots'/f'{PROFILE_HASH}.ts').write_bytes(PROFILE_SOURCE)
BOSSES=['dong_ta','boss_ly_mac_sau','tay_doc_boss','hong_liet_boss','boss_nam_de','chu_ba_thong','bac_cai','kim_luan_phap_vuong','vuong_trung_duong']
NAMES=['Đông Tà','Lý Mạc Sầu','Tây Độc','Hoàn Nhan Hồng Liệt','Nam Đế','Chu Bá Thông','Bắc Cái','Kim Luân Pháp Vương','Vương Trùng Dương']
WAVE=[BOSSES[i] for i in [0,2,4,6,8]]
GOALS=dict(zip(WAVE,[6,12,18,24,26]))
POOLS={'baseline':[100,300,450,650,650],'wave_only':[100,400,650,850,850],'wave_shift':[100,400,650,850,850],'boss_shift':[100,300,450,650,650],'wave_frontload':[100,450,750,750,750],'wave_target':[110,450,750,750,750]}
OVERRIDES={'wave_shift':{'bac_cai':1000,'kim_luan_phap_vuong':1200},'boss_shift':{'dong_ta':600,'boss_ly_mac_sau':450,'tay_doc_boss':700,'hong_liet_boss':900,'boss_nam_de':1000,'chu_ba_thong':900,'bac_cai':1000,'kim_luan_phap_vuong':1200}}
BOSS_GOLD=[0,180,320,570,770,1120,1420,1870,2270]
ALLOWED=[set(),set(),{'boots'},{'boots'},{'boots','armor'},{'boots','armor'},{'boots','armor','hat'},{'boots','armor','hat'},{'boots','armor','hat','weapon'}]
runs=[]
for path in (ROOT/'artifacts/campaign-xp-trial').glob('*.json'):
 r=json.loads(path.read_text(encoding='utf-8'))
 if r.get('sourceHash') in ACCEPTED_KERNELS and r.get('version')==3:
  r['file']=path.relative_to(ROOT).as_posix();runs.append(r)
forecasts=[r for r in runs if r['mode']=='forecast']
natural=[r for r in runs if r['mode']=='natural']
assert len(forecasts)==108,(len(forecasts),'forecast matrix incomplete')
assert len(natural)==6,(len(natural),'natural matrix incomplete')
assert len({r['economyHash'] for r in runs})==1
assert len({r['nonXpCampaignHash'] for r in runs})==1
assert len({json.dumps(r['coreHashes'],sort_keys=True) for r in runs})==1
for name,value in runs[0]['coreHashes'].items():
 assert hashlib.sha256((ROOT/f'packages/game-core/src/{name}.ts').read_bytes()).hexdigest()==value
control=next(r for r in runs if r['xpProfile']=='baseline')
old_control=json.loads((ROOT/'artifacts/campaign-readiness/forecast-candidate-p1-cai_bang_chuong-42-boss90-end20-tail30.json').read_text())
assert control['checkpoints']==old_control['checkpoints'],'experimental control does not reproduce old runner'
for r in runs:
 assert (OUT/'profile-snapshots'/f"{r['profileSourceHash']}.ts").exists()
 assert r['config']['invasionXp']==POOLS[r['xpProfile']]
 expected={**control['config']['bossXp'],**OVERRIDES.get(r['xpProfile'],{})}
 assert r['config']['bossXp']==expected
 assert r['config']['dungeonXp']==control['config']['dungeonXp']
 assert r['config']['dungeonGold']==control['config']['dungeonGold']
 assert r['config']['xpThresholds']==control['config']['xpThresholds']
for r in forecasts:
 assert r['outcome']=='conditional_economy_complete'
 assert [c['boss'] for c in r['checkpoints']]==BOSSES
 for i,c in enumerate(r['checkpoints']):
  for p in c['players']:
   assert p['xp']==p['farmXp']+p['invasionXp']+p['bossXp']
   assert p['goldEarned']==p['farmGold']+p['invasionGold']+p['bossGold']
   assert p['goldEarned']==p['goldHeld']+p['gearSpent']+p['potionSpent']
   assert p['goldHeld']>=0
   assert p['bossGold']==BOSS_GOLD[i]
   assert p['bossXp']==sum(r['config']['bossXp'][b] for b in BOSSES[:i])
   assert set(p['crafted']).issubset(ALLOWED[i])
   assert all(0<=v<=5 for v in p['levels'].values())
 for p in r['checkpoints'][-1]['players']:
  assert p['invasionGold']==2300 and p['bossGold']==2270
  assert len(p['crafted'])==4 and p['gearSpent']==4185

def standard(r): return r['mode']=='forecast' and r['bossSecondsAssumed']==90 and r['defenseTailSeconds']==30
selected=[r for r in forecasts if r['xpProfile']=='wave_target']
main=[r for r in selected if standard(r)]
stress=[r for r in selected if not standard(r)]
assert len(main)==27 and len(stress)==10
assert sum(r['players']==1 for r in main)==24 and sum(r['players']==6 for r in main)==3
assert len({r['roster'][0] for r in main if r['players']==1})==8
checked=0
for r in selected:
 for c in r['checkpoints']:
  if c['boss'] not in GOALS: continue
  for p in c['players']:
   assert GOALS[c['boss']]<=p['level']<=GOALS[c['boss']]+2,(r['file'],c['boss'],p['level'])
   checked+=1
assert checked==385

old=[]
for path in (ROOT/'artifacts/campaign-readiness').glob('forecast-candidate-*-tail30.json'):
 r=json.loads(path.read_text())
 if r.get('version')==2 and r['bossSecondsAssumed']==90:old.append(r)
assert len(old)==27

def key(r):return r['players'],tuple(r['roster']),r['seed']
old_map={key(r):r for r in old}
paired=[]
for r in main:
 prior=old_map[key(r)]
 for before,after in zip(prior['checkpoints'],r['checkpoints']):
  for p,q in zip(before['players'],after['players']):
   paired.append({'boss':after['boss'],'goldDelta':q['goldEarned']-p['goldEarned'],'xpDelta':q['xp']-p['xp']})

def stats(rr,boss):
 ps=[p for r in rr for c in r['checkpoints'] if c['boss']==boss for p in c['players']]
 return {'observations':len(ps),'level':[min(p['level'] for p in ps),max(p['level'] for p in ps)],'xp':[min(p['xp'] for p in ps),max(p['xp'] for p in ps)],'gold':[min(p['goldEarned'] for p in ps),max(p['goldEarned'] for p in ps)],'crafted':[min(len(p['crafted']) for p in ps),max(len(p['crafted']) for p in ps)]}

def span(v):return str(v[0]) if v[0]==v[1] else f'{v[0]}–{v[1]}'

def gold(v):return span(v).replace('–',' / ')

summary={'status':'proposal_not_applied','recommendedProfile':'wave_target','invasionXp':POOLS['wave_target'],'bossXpOverrides':{},'runs':len(runs),'forecasts':len(forecasts),'natural':len(natural),'mainRuns':len(main),'stressRuns':len(stress),'levelChecksPassed':checked,'sourceHash':KERNEL,'recordedSourceHashes':sorted({r['sourceHash'] for r in runs}),'formatValidation':FORMAT,'profileSourceHashes':sorted({r['profileSourceHash'] for r in runs}),'economyHash':runs[0]['economyHash'],'nonXpCampaignHash':runs[0]['nonXpCampaignHash'],'coreHashes':runs[0]['coreHashes'],'audits':{'controlMatchesFrozenRunner':True,'goldAndPricesUnchanged':True,'accountingIssues':0,'fullGearCost':4185},'results':{str(n):{b:stats([r for r in main if r['players']==n],b) for b in BOSSES} for n in [1,6]},'baseline':{str(n):{b:stats([r for r in old if r['players']==n],b) for b in WAVE} for n in [1,6]},'finalGoldDelta':{'min':min(p['goldDelta'] for p in paired if p['boss']==BOSSES[-1]),'max':max(p['goldDelta'] for p in paired if p['boss']==BOSSES[-1]),'mean':round(statistics.mean(p['goldDelta'] for p in paired if p['boss']==BOSSES[-1]),2)},'stress':[{'file':r['file'],'players':r['players'],'basic':r['roster'][0],'tail':r['defenseTailSeconds'],'bossSeconds':r['bossSecondsAssumed'],'levels':{c['boss']:[p['level'] for p in c['players']] for c in r['checkpoints'] if c['boss'] in GOALS}} for r in stress],'naturalOutcomes':[{'players':r['players'],'seed':r['seed'],'outcome':r['outcome'],'seconds':r['seconds']} for r in natural],'profileCounts':dict(collections.Counter(r['xpProfile'] for r in forecasts)),'reports':[r['file'] for r in sorted(runs,key=lambda r:r['file'])]}
(OUT/'summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
proposal={'status':'proposal_not_applied','invasionXp':POOLS['wave_target'],'bossXpOverrides':{},'dungeonXpChanged':False,'goldChanged':False,'pricesChanged':False,'xpCurveChanged':False,'waveTimingChanged':False,'maxLevel':30,'farmOverflowRatio':0.25}
(OUT/'recommended-xp.json').write_text(json.dumps(proposal,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
csv_path=ROOT/'artifacts/campaign-xp-trial/checkpoints.csv'
with csv_path.open('w',newline='',encoding='utf-8-sig') as fp:
 writer=csv.writer(fp);writer.writerow(['profile','players','seed','tail','bossSeconds','basic','boss','level','xp','goldEarned','gearSpent','potionSpent','crafted'])
 for r in sorted(forecasts,key=lambda r:r['file']):
  for c in r['checkpoints']:
   for p in c['players']:writer.writerow([r['xpProfile'],r['players'],r['seed'],r['defenseTailSeconds'],r['bossSecondsAssumed'],p['basic'],c['boss'],p['level'],p['xp'],p['goldEarned'],p['gearSpent'],p['potionSpent'],'/'.join(p['crafted'])])

lines=['# Thử bù EXP theo chặng M4D — 2026-11-27','','**Đề xuất, chưa áp dụng production:** pool EXP mỗi wave solo là **110 / 450 / 750 / 750**, tương ứng wave 1–5 / 6–10 / 11–15 / 16–20. Giữ nguyên EXP boss và phó bản, đường EXP lên cấp, vàng, giá đồ, lịch wave và cơ chế chia pool/first-clear. Trong schema năm phần tử: `invasionXp: [110, 450, 750, 750, 750]`; phần tử thứ năm không tạo thêm wave sau wave 20.','','## Bộ thông số','','| Chặng | Pool cũ/wave/solo | Đề xuất | Chênh lệch |','| --- | ---: | ---: | ---: |','| Wave 1–5 | 100 | 110 | +10% |','| Wave 6–10 | 300 | 450 | +50% |','| Wave 11–15 | 450 | 750 | +66,7% |','| Wave 16–20 | 650 | 750 | +15,4% |','','Ngân sách EXP invasion 20 wave tăng 7.500→10.300. Cộng tám first-clear trước VTD: 12.850→15.650 (+21,8%), chưa kể farm phó bản. Đây là pool solo; phòng đông vẫn dùng scaling và chia theo người đủ điều kiện hiện có. Không nhân nguyên pool cho mỗi người hoặc mỗi creep.','','Bù nhiều hơn ở chặng 2–3 vì đây là nơi thiếu mốc mở ultimate 12/18. Wave cuối giữ 750 để hạn chế cấp cuối lên quá 28. Đệm 10 EXP ở năm wave đầu xử lý ca solo farm chậm chỉ có 664 EXP trước Đông Tà khi cần dọn thêm 60s. Không thay cơ chế over-level ×0,25 ở target+2 hoặc cap 30.','','## Phương pháp và giới hạn','','Cùng kernel bot của [lượt trước](CAMPAIGN_READINESS_2026_11_27.md), cùng roster, seed 42/1337/9001, cùng cách học/mua đồ/đi về. Generator v2 được giữ nguyên; runner thử v3 chỉ áp dụng profile XP lên bản sao campaign rồi validate schema. Đối chứng baseline mới tái lập chính xác cả chín checkpoint của v2.','','Đã chạy 108 forecast của năm giả thuyết và đối chứng, cùng sáu lượt bot tự nhiên. Bộ đề xuất được kiểm tra đủ tám nhánh của bốn phái gốc × ba seed (24 solo), ba seed party sáu người, và 10 stress scenario. Party gồm Cái Bang Chưởng/Bổng, Thiên Sơn Phiến/Đao, Võ Đang Kiếm, Thiếu Lâm Quyền; không suy rộng sang các nhánh chưa đo.','','**Forecast giả định clear invasion đầy đủ, mọi người đủ điều kiện nhận pool, và hạ boss thành công.** Combat/collision/farm/đi về/chi tiêu phó bản chạy core thật, hero bất tử trong forecast. Boss mặc định 90s + chuẩn bị wave boss 10s; dungeon boss pause invasion clock. Không tính combat boss, HP-potion hoặc thất bại boss. Thời lượng này là giả định, không phải số đo clear boss.','','## Solo','','Dải tám nhánh × ba seed, budget mặc định stream 60s + dọn 30s, về trước wave 30s. Vàng là tổng kiếm được, gồm phần đã chi. Mốc level chỉ dùng cho năm wave boss.','','| Trước boss | Cấp cũ | Cấp đề xuất | Mục tiêu |','| --- | ---: | ---: | ---: |']
for b in WAVE:
 i=BOSSES.index(b);a=summary['baseline']['1'][b];z=summary['results']['1'][b]
 lines.append(f"| {NAMES[i]} | {span(a['level'])} | {span(z['level'])} | {'26–28' if b==BOSSES[-1] else GOALS[b]} |")
lines+=['','## Sáu người','','Dải từng người, 18 quan sát nhân vật mỗi boss qua ba seed.','','| Trước boss | Cấp cũ | Cấp đề xuất | Mục tiêu |','| --- | ---: | ---: | ---: |']
for b in WAVE:
 i=BOSSES.index(b);a=summary['baseline']['6'][b];z=summary['results']['6'][b]
 lines.append(f"| {NAMES[i]} | {span(a['level'])} | {span(z['level'])} | {'26–28' if b==BOSSES[-1] else GOALS[b]} |")
lines+=['','Cả 210/210 kiểm tra mốc của 24 nhân vật solo + 18 quan sát nhân vật party đạt tối thiểu mục tiêu; VTD không vượt 28. Mô hình có đệm 0–2 cấp, không ép mọi nhánh vào đúng một level.','','## Vàng và trang bị trước đủ chín boss','','| Trước boss | Solo: cấp / vàng | Sáu người: cấp / vàng | Món ghép/người |','| --- | ---: | ---: | ---: |']
for i,b in enumerate(BOSSES):
 a=summary['results']['1'][b];z=summary['results']['6'][b]
 lines.append(f"| {NAMES[i]} | {span(a['level'])} / {span(a['gold'])} | {span(z['level'])} / {span(z['gold'])} | {span(a['crafted'])} |")
lines+=['',f"Thưởng vàng và giá không đổi: hash toàn bộ economy và toàn bộ campaign ngoài trường XP giống nhau trong mọi run. Cả bốn món ghép vẫn tốn 4.185 vàng. Tổng vàng thực kiếm trước VTD thay đổi {summary['finalGoldDelta']['min']} đến {summary['finalGoldDelta']['max']} vàng/người (trung bình {summary['finalGoldDelta']['mean']}) do level/skill cao hơn làm thay đổi tốc độ farm; không phải tăng hệ số vàng. Một số nhánh vẫn dưới mục tiêu tổng vàng lịch sử: lượt này chỉ xử lý EXP theo yêu cầu.",'','## Stress thời gian dọn và boss','','Seed 42, solo Thiếu Lâm Đao là nhánh farm chậm đã đo và cùng party sáu người. Kiểm tra dọn thêm 0/60s, boss 45/180s, cùng trường hợp dọn 60s và boss 180s. Cả 175/175 mốc nhân vật trong 10 stress scenario đạt; cộng bộ chuẩn là **385/385 mốc**. Dải toàn bộ stress:']
for b in WAVE:
 z=stats(stress,b);lines.append(f"- {NAMES[BOSSES.index(b)]}: cấp {span(z['level'])}.")
lines+=['','## Các giả thuyết đã so sánh','','| Profile | Pool wave theo chặng | EXP boss | Số forecast | Nhận xét |','| --- | --- | --- | ---: | --- |',f"| baseline | 100/300/450/650 | Giữ | {summary['profileCounts']['baseline']} | Đối chứng trùng v2 |",f"| wave_only | 100/400/650/850 | Giữ | {summary['profileCounts']['wave_only']} | Đủ ở bộ chuẩn; solo dọn thêm 60s vẫn có cấp 11/17 trước Tây/Nam |",f"| wave_shift | 100/400/650/850 | Bắc 1000, Kim 1200 | {summary['profileCounts']['wave_shift']} | Đủ ở bộ chuẩn, cần đổi hai thưởng boss |",f"| boss_shift | Giữ | Dịch EXP về sáu boss sớm | {summary['profileCounts']['boss_shift']} | Chỉ pilot 3 scenario, không chọn làm kết luận chung |",f"| wave_frontload | 100/450/750/750 | Giữ | {summary['profileCounts']['wave_frontload']} | Pilot dọn chậm thiếu 6 EXP trước Đông Tà |",f"| wave_target | 110/450/750/750 | Giữ | {summary['profileCounts']['wave_target']} | Bộ được đề xuất; đủ cả chuẩn và stress đã đo |",'','Không chọn việc giảm thưởng Bắc Cái/Kim Luân vì bộ wave_target đã đạt khoảng cuối 26–28 với thưởng boss hiện hành. Profile boss_shift chỉ được screening ở một seed; không coi đó là xác nhận đầy đủ tám nhánh.','','## Bot tự nhiên và giới hạn xác nhận','','Sáu lượt natural mới dùng profile wave_target, không bất tử hay cấp trước tiền/đồ. Bot vẫn mất tượng ở wave 1; chưa có natural campaign clear hoặc checkpoint boss tự nhiên. Chỉ tăng EXP theo chặng không chứng minh xử lý được điểm nghẽn thủ đầu trận của bot. Không suy ra tỷ lệ thắng của người chơi từ policy nearest-target/round-robin này. Đề xuất là tuning để playtest, không phải cân bằng đã được nghiệm thu.','','## Kiểm chứng và tái lập','','- `pnpm qa:preflight --mode quick`: PASS 5 checks.','- `pnpm exec tsc -p tsconfig.tools.json --noEmit`: PASS.','- `pnpm exec vitest run tests/campaign-xp-trials.test.ts tests/campaign.test.ts tests/dungeons.test.ts tests/wave-pacing.test.ts tests/invasions.test.ts tests/economy.test.ts`: **109/109 PASS**.','- Audit mọi forecast: chín checkpoint đúng thứ tự; XP = các nguồn; vàng = các nguồn = còn giữ + chi đồ + chi bình; boss first-clear một lần, không âm vàng, đúng material trước craft; **0 sai lệch**.','- Tất cả run cùng kernel/core hashes, cùng economy hash và campaign-non-XP hash; các phiên bản file profile được lưu theo SHA-256 trong evidence. Không sửa production campaign. Không ghi video/ảnh động.','','```powershell','pnpm --filter @volam/game-server exec tsx ../../tools/campaign-xp-trial.ts --xp-profile wave_target --players 1 --basic thieu_lam_dao --seed 42 --max-seconds 6000','pnpm --filter @volam/game-server exec tsx ../../tools/campaign-xp-trial.ts --xp-profile wave_target --players 6 --seed 42 --max-seconds 6000','python -X utf8 tools/summarize-campaign-xp-trial.py','```','','[Thông số đề xuất JSON](evidence/sessions/campaign-xp-trial-2026-11-27/recommended-xp.json), [summary/audit/raw report index](evidence/sessions/campaign-xp-trial-2026-11-27/summary.json), [các profile nghiên cứu](../tools/campaign-xp-profiles.ts), [runner](../tools/campaign-xp-trial.ts). CSV/JSON đầy đủ nằm trong `artifacts/campaign-xp-trial/` (ignored).']
(ROOT/'docs/CAMPAIGN_XP_TRIAL_2026_11_27.md').write_text('\n'.join(lines)+'\n',encoding='utf-8')
print(json.dumps({'runs':len(runs),'forecasts':len(forecasts),'natural':len(natural),'levelChecksPassed':checked,'priceHashes':1,'accountingIssues':0,'finalGoldDelta':summary['finalGoldDelta'],'report':'docs/CAMPAIGN_XP_TRIAL_2026_11_27.md'},ensure_ascii=False))
