from pathlib import Path
import json
base=Path(__file__).resolve().parent;root=base.parents[3];p=base/'delivery_report.py';s=p.read_text(encoding='utf-8')
needle="m['approvalWaiver']='assets/source/skills/thieu-lam/approval_waiver_v01.json'"
s=s.replace(needle,"m['verification']['approvedBasicTiming']='assets/reviews/skills/thieu-lam/approved_basic_timing_v01.json'\n"+needle)
s=s.replace("'~~~',\n'',\n'After the full pipeline","'node assets/source/skills/thieu-lam/verify_basics.mjs',\n'~~~',\n'',\n'After the full pipeline")
s=s.replace("'Presentation-only scope:","'Approved normal-clip playback reads exact per-frame durations directly from the approved atlases. A final focused Phaser check verified every timing boundary, all4facings, both weapon sets, idle recovery and zero new normal-attack VFX. Evidence:approved_basic_timing_v01.json. No approved sprite bytes changed.',\n'',\n'Presentation-only scope:")
p.write_text(s,encoding='utf-8')
full=json.loads((root/'assets/reviews/skills/thieu-lam/final_pipeline_playwright_v01.json').read_text(encoding='utf-8'))
focused=json.loads((root/'assets/reviews/skills/thieu-lam/playwright_results_v01.json').read_text(encoding='utf-8'))
timing=json.loads((root/'assets/reviews/skills/thieu-lam/approved_basic_timing_v01.json').read_text(encoding='utf-8'))
assert full['stats']['expected']==3 and full['stats']['unexpected']==0
assert focused['stats']['expected']==1 and focused['stats']['unexpected']==0
assert timing['status']=='PASS' and len(timing['observations'])==8
print('Verified preserved full3-test result, final focused1-test result and8 exact approved-clip timing observations.')
