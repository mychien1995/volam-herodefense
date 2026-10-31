"""Validate separate skill artwork; never alter approved monk character assets."""
from pathlib import Path
import runpy
runpy.run_path(str(Path(__file__).resolve().parents[1]/'assets/source/skills/thieu-lam/validate.py'),run_name='__main__')
