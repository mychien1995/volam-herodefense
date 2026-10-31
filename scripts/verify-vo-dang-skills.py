from pathlib import Path
import runpy
root=Path(__file__).resolve().parents[1]
runpy.run_path(str(root / 'assets/source/skills/vo-dang/validate.py'), run_name='__main__')
