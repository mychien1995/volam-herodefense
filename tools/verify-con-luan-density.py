"""Guard physical source density across Kunlun idle and combat; never normalize to hair/weapon spread."""
from pathlib import Path
import argparse,json,statistics
from hero_unified_assets import figures,body_root
p=argparse.ArgumentParser();p.add_argument('--version',default='v2');p.add_argument('--out');args=p.parse_args();result={'status':'PASS','branches':{}}
for basic,poses in [('con-luan-thien-su',['windup','thrust','sweep','rising','overhead','recover']),('con-luan-kiem-ton',['windup','sword_point','release','recover'])]:
 root=Path('assets/source')/(basic+'-unified-'+args.version);cfg=json.loads((root/'profile.json').read_text());m=json.loads((root/'manifest.json').read_text());checks=[]
 records=m['groupsAuthored']
 for source in records:
  di=source['direction'];raw=figures(root/'raw'/(di+'.png'),cfg['sourceRows'],cfg['sourceColumns']);roots=[body_root(im,False,cfg['rootMode']) for im,_ in raw[:4]];expected=cfg['bodyHeight']/statistics.median(r[1]-r[2]+1 for r in roots)
  for pose in poses:
   frame=next(f for f in source['frames'] if f['frame']==pose+'_'+di);ratio=frame['groupRatio']/expected;checks.append({'frame':frame['frame'],'densityRatio':ratio})
   if abs(ratio-1)>.01:result['status']='FAIL'
 result['branches'][basic]=checks
if args.out:Path(args.out).write_text(json.dumps(result,indent=2)+'\n')
print(result['status'],[(k,round(min(r['densityRatio'] for r in v),3),round(max(r['densityRatio'] for r in v),3)) for k,v in result['branches'].items()]);raise SystemExit(0 if result['status']=='PASS' else 1)
