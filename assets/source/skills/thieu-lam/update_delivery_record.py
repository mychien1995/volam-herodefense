from pathlib import Path
import json
base=Path(__file__).resolve().parent;p=base/'delivery_report.py';s=p.read_text(encoding='utf-8')
needle="m['approvalWaiver']='assets/source/skills/thieu-lam/approval_waiver_v01.json'"
if "m['verification']['fullPipelinePlaywright']" not in s:
 s=s.replace(needle,"m['verification']['fullPipelinePlaywright']='assets/reviews/skills/thieu-lam/final_pipeline_playwright_v01.json'\nm['verification']['postRefinementScope']='All13 active skill animations/facings/stages/icons and normal-clip reuse rerun after ultimate presentation-only offset refinement; mechanics unchanged.'\n"+needle)
s=s.replace("'Final results:TypeScript","'After the full pipeline, final PNG inspection prompted a presentation-only Như Lai Thiên Diệp release/travel offset and preview-arrival refinement to keep the face clear. The complete13-skill Phaser test passed its focused rerun afterward; full-pipeline results are preserved in final_pipeline_playwright_v01.json and latest focused results in playwright_results_v01.json.',\n'Final results:TypeScript")
s=s.replace("'~~~',\n'',\n'After the full pipeline","'node tools/run-playwright.mjs test --config playwright.thieu-lam-skills.config.ts tests/e2e/thieu-lam-skills.spec.ts',\n'~~~',\n'',\n'After the full pipeline")
p.write_text(s,encoding='utf-8')
print('Delivery record now distinguishes the complete final pipeline from the later focused presentation rerun.')
