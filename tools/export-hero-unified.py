import argparse,json
from pathlib import Path
from hero_unified_assets import export_profile
p=argparse.ArgumentParser();p.add_argument('--profile',required=True);p.add_argument('--direction');a=p.parse_args();export_profile(a.profile,a.direction)
if json.loads(Path(a.profile).read_text()).get('handSockets'):
 from hero_unified_hands import export_hands
 assert not export_hands(a.profile),'Missing living hand attachment annotations'
