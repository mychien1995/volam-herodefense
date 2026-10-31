from pathlib import Path
import json
root=Path(__file__).resolve().parents[4]
p=root/'package.json'
pkg=json.loads(p.read_text(encoding='utf-8'))
command='python scripts/verify-thieu-lam-skills.py'
if command not in pkg['scripts']['verify:assets']:pkg['scripts']['verify:assets']+=' && '+command
pkg['scripts']['assets:export:thieu-lam-skills']='python assets/source/skills/thieu-lam/prepare.py && node assets/source/skills/thieu-lam/build.mjs --assemble'
p.write_text(json.dumps(pkg,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
