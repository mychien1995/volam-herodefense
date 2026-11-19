import argparse
from hero_unified_assets import export_profile
p=argparse.ArgumentParser();p.add_argument('--profile',required=True);p.add_argument('--direction');a=p.parse_args();export_profile(a.profile,a.direction)
