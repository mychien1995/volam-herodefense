"""Measure fixed-grid generated strips, then assemble raster cels through Aseprite."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import json, statistics, subprocess, time, sys, hashlib
import numpy as np
from collections import deque

def largest_component(mask):
    remaining=mask.copy();best=[]
    for y,x in zip(*np.where(mask)):
        if not remaining[y,x]:continue
        queue=deque([(int(y),int(x))]);remaining[y,x]=False;points=[]
        while queue:
            yy,xx=queue.popleft();points.append((yy,xx))
            for dy,dx in [(0,1),(0,-1),(1,0),(-1,0)]:
                ny,nx=yy+dy,xx+dx
                if 0<=ny<mask.shape[0] and 0<=nx<mask.shape[1] and remaining[ny,nx]:
                    remaining[ny,nx]=False;queue.append((ny,nx))
        if len(points)>len(best):best=points
    result=np.zeros_like(mask)
    for y,x in best:result[y,x]=True
    return result

ROOT=Path(__file__).resolve().parents[4]
FOLDER=Path(__file__).resolve().parent
EXPORTS=ROOT/'assets/exports/characters/visual_improvement_v02'
REVIEW=ROOT/'assets/reviews/visual_improvement_v02'
PALETTE=json.loads((FOLDER.parent/'visual_improvement_poc_v01/assembly-measurements.json').read_text())[0]['palette']
MONK=['160f11','1d171a','875141','bd7755','e39b6e','f4b886','ffd2a3','fff0ce',
      '663213','8d4616','b96513','e38a12','ffb51c','ffcf46','ffe18a','2b1c19',
      '493029','694735','8d6248','a3a6b0','d2c8b8','f5ede1','fff8ea','392217',
      '563a28','80553b','aa7a4a','41434e','747986','b9c1cb','f1ede5']

def relative(p): return p.relative_to(ROOT).as_posix()

def measure(filename, cols, rows):
    raw=FOLDER/'raw'/filename
    pixels=np.asarray(Image.open(raw).convert('RGBA'));h,w=pixels.shape[:2]
    entries=[]
    for i in range(cols*rows):
        x0,x1=round(i%cols*w/cols),round((i%cols+1)*w/cols)
        y0,y1=round(i//cols*h/rows),round((i//cols+1)*h/rows)
        a=pixels[y0:y1,x0:x1];mask=a[:,:,3]>=220
        # This raw strip contains an isolated generated badge in its gutter.
        # Crop the connected character only; retain raw provenance unchanged.
        if filename=='hero_thieu_lam_dao_right.png':mask=largest_component(mask)
        ys,xs=np.where(mask);assert len(xs)>100,(filename,i)
        b=[int(xs.min()),int(ys.min()),int(xs.max()+1),int(ys.max()+1)]
        dark=mask&(a[:,:,:3].max(axis=2)<150)
        dark[:int(b[1]+(b[3]-b[1])*.84)]=False
        dy,dx=np.where(dark);assert len(dx)>10,(filename,i,'feet')
        foot=[float((dx.min()+dx.max()+1)/2)+x0,int(dy.max()+1)+y0]
        body_top=b[1]
        if '_dao_' in filename or '_kiem_' in filename:
            # Raised steel is outside the body. Calibrate from scalp/hair, not blade tip.
            if 'thieu_lam' in filename:
                rgb=a[:,:,:3].astype(float)
                head=mask&(rgb[:,:,0]>150)&(rgb[:,:,1]>90)&(rgb[:,:,2]>65)&(rgb[:,:,0]>rgb[:,:,1]*1.08)&(rgb[:,:,1]>rgb[:,:,2]*1.08)
            else:
                head=mask&(a[:,:,:3].max(axis=2)<145)
            counts=head.sum(axis=1);indexes=np.where(counts>=max(3,float(counts.max())*.22))[0]
            if len(indexes):body_top=int(indexes[0])
        entries.append({'raw':relative(raw),'bounds':[b[0]+x0,b[1]+y0,b[2]+x0,b[3]+y0],
                        'foot':foot,'bodyHeight':foot[1]-(body_top+y0),'cell':[x0,y0,x1,y1]})
    # Standing/walking samples calibrate the unit; attack reach never rescales a body.
    sample=entries[:6] if len(entries)==10 else entries
    scale=44/statistics.median(e['bodyHeight'] for e in sample)
    for e in entries:e['scale']=scale
    return entries

def assemble(recipe):
    EXPORTS.mkdir(parents=True,exist_ok=True);REVIEW.mkdir(parents=True,exist_ok=True)
    (FOLDER/'recipes').mkdir(exist_ok=True)
    recipe['source']=relative(FOLDER/(recipe['id']+'.aseprite'))
    recipe['sheet']=relative(EXPORTS/(recipe['id']+'.png'))
    recipe['atlas']=relative(EXPORTS/(recipe['id']+'.json'))
    path=FOLDER/'recipes'/(recipe['id']+'.json')
    path.write_text(json.dumps(recipe,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    start=time.perf_counter()
    p=subprocess.run(['C:/Program Files/Aseprite/Aseprite.exe','-b','--script-param','root='+ROOT.as_posix(),
                      '--script-param','recipe='+relative(path),'--script',str(FOLDER/'assemble.lua')],
                     capture_output=True,text=True,encoding='utf-8',timeout=60)
    assert p.returncode==0,p.stderr+p.stdout
    assert all((ROOT/recipe[k]).exists() for k in ['source','sheet','atlas'])
    print(p.stdout.strip(),f'({time.perf_counter()-start:.2f}s)')
    return recipe

def board(recipe):
    sheet=Image.open(ROOT/recipe['sheet']).convert('RGBA')
    atlas=json.loads((ROOT/recipe['atlas']).read_text(encoding='utf-8'))
    count=min(10,len(recipe['frames']));columns=min(5,count);tile=max(170,recipe['canvas'][0]*2+10)
    b=Image.new('RGB',(columns*tile,((count+columns-1)//columns)*220),'#263039')
    draw=ImageDraw.Draw(b);font=ImageFont.truetype('C:/Windows/Fonts/consola.ttf',13)
    for i,e in enumerate(recipe['frames'][:10]):
        r=atlas['frames'][e['name']]['frame'];im=sheet.crop((r['x'],r['y'],r['x']+r['w'],r['y']+r['h']))
        im=im.resize((im.width*2,im.height*2),Image.Resampling.NEAREST)
        x=(i%columns)*tile;y=(i//columns)*220
        b.paste(im,(x,y+35),im);draw.text((x+5,y+5),e['name'],font=font,fill='white')
    b.save(REVIEW/(recipe['id']+'-native-2x.png'))

if __name__=='__main__':
    if sys.argv[1]=='finalize':
        baseline=json.loads((FOLDER/'baseline-manifest.json').read_text())['assets']
        manifest={'status':'candidate_pending_final_director_review',
                  'provenance':'Original imagegen raster poses, reference-driven; native common-scale Aseprite assembly, limited palettes. No AI upscaling.',
                  'phaseAApproval':'assets/reviews/visual_improvement_poc_v01/approval.json','assets':[]}
        for old in baseline:
            id=old['id'];recipes=[json.loads((FOLDER/'recipes'/(id+'_'+d+'.json')).read_text()) for d in ['down','left','right','up']]
            frames=[e for r in recipes for e in r['frames']]
            recipe=assemble(dict(recipes[0],id=id,columns=10,frames=frames))
            board(recipe)
            subprocess.run(['C:/Program Files/Aseprite/Aseprite.exe','-b',str(ROOT/recipe['source']),
                            '--frame-range','0,0','--save-as',str(EXPORTS/(id+'_idle.png'))],check=True,capture_output=True,timeout=60)
            paths=[recipe['source'],recipe['sheet'],recipe['atlas'],relative(EXPORTS/(id+'_idle.png'))]
            manifest['assets'].append({'id':id,'source':paths[0],'sheet':paths[1],'atlas':paths[2],'portrait':paths[3],
                'canvas':recipe['canvas'],'footPivot':[.5,.8],'frames':40,'animations':old['animations'],
                'authoredStates':['idle','walk','basic_attack'],'reusedStates':{'cast':'basic_attack','hurt':'idle','death':'idle'},
                'files':{p:hashlib.sha256((ROOT/p).read_bytes()).hexdigest() for p in paths}})
        (EXPORTS/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    if sys.argv[1]=='strip':
        for label in sys.argv[2:]:
            request=json.loads((FOLDER/'requests'/(label+'.json')).read_text(encoding='utf-8'))
            id,direction=request['id'],request['direction'];measured=measure(label+'.png',5,2)
            states=[('idle',0),('idle',1)]+[('walk',i) for i in range(4)]+[('basic_attack',i) for i in range(4)]
            frames=[]
            for e,(state,index) in zip(measured,states):
                ms=350 if state=='idle' else 120 if state=='walk' else 75
                entry=dict(e,name=f'{state}_{direction}_{index}',state=state,direction=direction,durationMs=ms)
                if direction=='down' and state=='idle' and index==0 and id in ['hero_thien_son','hero_vo_dang']:
                    entry={'native':f'assets/exports/characters/visual_improvement_poc_v01/{id}_idle_down_0.png',
                           'name':entry['name'],'state':state,'direction':direction,'durationMs':ms}
                if direction=='down' and state=='idle' and index==0 and id=='hero_thieu_lam':
                    entry={'native':'assets/exports/characters/visual_improvement_v02/master_thieu_lam.png',
                           'name':entry['name'],'state':state,'direction':direction,'durationMs':ms}
                frames.append(entry)
            width=112 if id=='hero_thieu_lam_dao' else 96 if id=='hero_vo_dang_kiem' else 80
            recipe=assemble({'id':label,'canvas':[width,80],'pivot':[width//2,64],
                             'palette':MONK if 'thieu_lam' in id else PALETTE,'columns':5,'frames':frames})
            board(recipe)
            print(label,'common source scale',round(measured[0]['scale'],6),'body measurements',[int(e['bodyHeight']) for e in measured])
    if sys.argv[1]=='pilot':
        measured=measure('pilot_ts_walk_right.png',2,2)
        frames=[{'native':'assets/exports/characters/visual_improvement_poc_v01/hero_thien_son_idle_down_0.png',
                 'name':'idle_down_0','state':'idle','direction':'down','durationMs':350}]
        frames += [dict(e,name=f'walk_right_{i}',state='walk',direction='right',durationMs=120) for i,e in enumerate(measured)]
        recipe=assemble({'id':'pilot_ts_walk_right','canvas':[80,80],'pivot':[40,64],
                         'palette':PALETTE,'columns':5,'frames':frames})
        board(recipe)
        measured=measure('master_thieu_lam.png',1,1)
        frames=[dict(measured[0],name='idle_down_0',state='idle',direction='down',durationMs=350)]
        recipe=assemble({'id':'master_thieu_lam','canvas':[80,80],'pivot':[40,64],
                         'palette':MONK,'columns':1,'frames':frames})
        board(recipe)
