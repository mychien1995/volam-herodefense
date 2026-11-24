"""Package authored skill rasters, preserve raw/approved bytes. No procedural art."""
from pathlib import Path
import sys,json,hashlib,statistics
import numpy as np
from PIL import Image,ImageDraw
from scipy.ndimage import gaussian_filter1d
from scipy.signal import find_peaks
ROOT=Path(__file__).resolve().parents[3]
sys.path.insert(0,str(ROOT/'tools'))
from hero_unified_assets import figures,locked
SRC=Path(__file__).resolve().parent
OUT=ROOT/'assets/exports/skill-revise-v01'
OUT.mkdir(parents=True,exist_ok=True)
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
approval=json.loads((ROOT/'assets/approvals/skill-revise/concepts-2026-11-22.json').read_text())
def guards():
    locked()
    for item in approval['files']:assert sha(ROOT/item['path'])==item['sha256'],item['path']
guards()
jobs=json.loads((SRC/'jobs.json').read_text())
if (SRC/'jobs-extra.json').exists():jobs+=json.loads((SRC/'jobs-extra.json').read_text())
catalogue=[];reports=[]
body_mirrors={'cai-bang-fire-body':{'up_left':'up_right'},'co-quan-air-body':{'up_left':'up_right'},'thien-son-gust-body':{'up_left':'up_right'}}
def pack(job,tiles,canvas,pivot,clips,notes,warnings):
    # Trim pack retains a common logical canvas and pivot for every cel.
    atlas=Image.new('RGBA',(4096,4096));frames={};x=y=rowh=maxx=maxy=0;frameproof=[]
    for name,tile in tiles:
        assert tile.mode=='RGBA' and tile.size==tuple(canvas)
        box=tile.getbbox();assert box,name
        assert box[0]>1 and box[1]>1 and box[2]<canvas[0]-1 and box[3]<canvas[1]-1,(name,'logical clipping',box)
        box=(box[0]-1,box[1]-1,box[2]+1,box[3]+1);crop=tile.crop(box)
        if x+crop.width+4>4096:x=0;y+=rowh+4;rowh=0
        assert y+crop.height+4<4096
        atlas.alpha_composite(crop,(x+2,y+2))
        frames[name]={'frame':{'x':x+2,'y':y+2,'w':crop.width,'h':crop.height},'trimmed':True,'rotated':False,'spriteSourceSize':{'x':box[0],'y':box[1],'w':crop.width,'h':crop.height},'sourceSize':{'w':canvas[0],'h':canvas[1]}}
        frameproof.append({'name':name,'sha256':hashlib.sha256(tile.tobytes()).hexdigest()})
        x+=crop.width+4;rowh=max(rowh,crop.height);maxx=max(maxx,x);maxy=max(maxy,y+crop.height+4)
    folder=OUT/job['id'];folder.mkdir(parents=True,exist_ok=True)
    atlas=atlas.crop((0,0,maxx,maxy));atlas.save(folder/'body.png')
    (folder/'body.json').write_text(json.dumps({'frames':frames,'meta':{'image':'body.png','size':{'w':maxx,'h':maxy},'scale':'1'}},indent=2)+'\n')
    # Native sources use the same ordering/frames, not a recreated animation.
    profile={'id':job['id'],'canvas':canvas,'foot':[canvas[0]*pivot[0],canvas[1]*pivot[1]],'clips':clips,'frames':frameproof,'status':'CANDIDATE_ANIMATION_PENDING_DIRECTOR_REVIEW','source':{'path':str((SRC/'raw'/job['filename']).relative_to(ROOT)).replace('\\','/'),'sha256':sha(SRC/'raw'/job['filename'])},'notes':notes,'warnings':warnings,'model':None,'art_source':'host_image'}
    (folder/'manifest.json').write_text(json.dumps(profile,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    reference_hashes=[{'path':p,'sha256':sha(p)} for p in job['refs']]
    (folder/'provenance.json').write_text(json.dumps({'references':reference_hashes,'prompt':str((SRC/'prompts'/str(job['id']+'.txt')).relative_to(ROOT)).replace('\\','/'),'source_sha256':profile['source']['sha256'],'tool':'image_gen','art_source':'host_image'},indent=2)+'\n')
    contact=Image.new('RGB',(4*256,((len(tiles)+3)//4)*224),(39,46,51));draw=ImageDraw.Draw(contact)
    for i,(name,tile) in enumerate(tiles):
        small=tile.resize((canvas[0]//2,canvas[1]//2),Image.Resampling.LANCZOS);cx=i%4*256+(256-small.width)//2;cy=i//4*224
        contact.paste(small,(cx,cy),small);draw.text((i%4*256+4,cy+208),name,fill='white')
    contact.save(folder/'contact.png')
    source_folder=str(folder.relative_to(ROOT)).replace('\\','/')
    catalogue.append({'id':job['id'],'label':job['id'],'png':'/packs/'+job['id']+'.png','atlas':'/packs/'+job['id']+'.json','sourcePng':source_folder+'/body.png','sourceAtlas':source_folder+'/body.json','pivot':pivot,'scale':.5,'clips':clips,'note':'Candidate · '+('; '.join(notes))})
    reports.append({'id':job['id'],'frames':len(tiles),'clips':len(clips),'warnings':warnings,'atlasSize':[maxx,maxy]})

for job in jobs:
    path=SRC/'raw'/job['filename'];im=Image.open(path).convert('RGBA');pixels=np.array(im)
    assert (pixels[:,:,3]==0).sum()>im.width*im.height*.05,(job['id'],'no genuine transparency')
    tiles=[];clips=[];notes=[];warnings=[]
    if job['kind']=='body':
        cels=figures(path,job['rows'],job['cols']);assert len(cels)==32
        canvas=[512,448];foot=[256,320]
        dirs=job['dirs'];mirrors=body_mirrors.get(job['id'],{'up_left':'up_right'} if job['id'].startswith('co-quan-air') else {})
        for row,d in enumerate(dirs):
            source_row=dirs.index(mirrors[d]) if d in mirrors else row
            group=cels[source_row*4:source_row*4+4]
            landmarks=[]
            for cel,box in group:
                a=np.array(cel)[:,:,3]>=96
                # Feet: lower dense contour; source art carries no ground shadow.
                ys,xs=np.nonzero(a);rows=a.sum(axis=1);top=int(np.flatnonzero(rows>=max(5,rows.max()*.22))[0]);bottom=int(ys.max())
                bx=np.nonzero(a[max(top,bottom-8):bottom+1])[1]
                rx=float((bx.min()+bx.max())/2)
                landmarks.append([rx,bottom,top])
            ratio=89/(landmarks[0][1]-landmarks[0][2]+1)
            names=[]
            for k,((cel,box),(rx,ry,top)) in enumerate(zip(group,landmarks)):
                if job['id'].startswith('co-quan-air'):
                    # Keep airborne lift/lean within common source-grid registration.
                    rx=(source_row*0+(k+.5)*im.width/4)-box[0]
                    ry=((source_row+1)*im.height/8-12)-box[1]
                if d in mirrors:cel=cel.transpose(Image.Transpose.FLIP_LEFT_RIGHT);rx=cel.width-1-rx
                small=cel.resize((round(cel.width*ratio),round(cel.height*ratio)),Image.Resampling.LANCZOS)
                x=round(foot[0]-rx*ratio);y=round(foot[1]-ry*ratio)
                assert x>=3 and y>=3 and x+small.width<canvas[0]-3 and y+small.height<canvas[1]-3,(job['id'],d,k,'canvas')
                tile=Image.new('RGBA',tuple(canvas));tile.alpha_composite(small,(x,y));name=job['phases'][k]+'_'+d;tiles.append((name,tile));names.append(name)
            if job['id']=='co-quan-air-body':
                clips += [{'name':job['phases'][k]+'_'+d,'frames':[name],'fps':1,'loop':False} for k,name in enumerate(names)]
            else:clips.append({'name':d,'frames':names,'fps':10,'loop':False})
        if mirrors:notes.append('Explicit horizontal source reflection for '+','.join(mirrors)+' from matching opposite rear view; other raw rows retained unused; not counted as newly authored facing.')
        if job['id']=='co-quan-air-body':notes.append('Four airborne state poses, NOT four sequential frames of one full action; use hold/state clips at integration. Includes wings; disable retained wing overlay when replacing body.')
        notes.append('Body only; proposal timing; combat displacement/skill clocks require later server integration.')
        pack(job,tiles,canvas,[foot[0]/canvas[0],foot[1]/canvas[1]],clips,notes,warnings)
    else:
        alpha=pixels[:,:,3];hist=gaussian_filter1d((alpha>=160).sum(axis=1).astype(float),5)
        peaks,_=find_peaks(hist,distance=max(20,int(im.height/job['rows']*.6)),prominence=max(1,hist.max()*.07))
        assert len(peaks)>=job['rows'],(job['id'],'missing source rows',peaks.tolist())
        if len(peaks)>job['rows']:warnings.append({'id':'EXTRA_SOURCE_ROWS_RETAINED','value':len(peaks),'expected':job['rows'],'unusedRows':list(range(job['rows'],len(peaks)))})
        ycuts=[0]
        for a,b in zip(peaks,peaks[1:]):
            lo=int(a+(b-a)*.18);hi=int(b-(b-a)*.18);scores=(alpha[lo:hi]>=128).sum(axis=1);best=np.flatnonzero(scores==scores.min());ycuts.append(lo+int(best[np.argmin(abs((lo+best)-(a+b)/2))]))
        ycuts.append(im.height)
        source=[]
        for row in range(job['rows']):
            top,bottom=ycuts[row],ycuts[row+1];xcuts=[0]
            for k in range(1,job['cols']):
                center=k*im.width/job['cols'];lo=round(center-im.width/job['cols']*.30);hi=round(center+im.width/job['cols']*.30);score=(alpha[top:bottom,lo:hi]>=128).sum(axis=0);best=np.flatnonzero(score==score.min());xcuts.append(lo+int(best[np.argmin(abs((lo+best)-center))]))
            xcuts.append(im.width)
            # Cell ownership follows the empty alpha valleys, not invented equal cuts.
            cells=[im.crop((xcuts[k],top,xcuts[k+1],bottom)) for k in range(job['cols'])]
            allbox=[c.getbbox() for c in cells];assert all(allbox)
            for k,c in enumerate(cells):
                a=np.array(c)[:,:,3];edge=int(max(a[0].max(),a[-1].max(),a[:,0].max(),a[:,-1].max()))
                if edge>=224:warnings.append({'id':'SOURCE_CELL_EDGE_ALPHA','row':row,'column':k,'value':edge,'threshold':224})
                source.append((row,k,c))
        # Same source scale for entire effect bank, preserve hand-authored expansion.
        ratio=min(220/max(c.width for _,_,c in source),220/max(c.height for _,_,c in source),1)
        canvas=[256,256]
        for row,k,cel in source:
            small=cel.resize((round(cel.width*ratio),round(cel.height*ratio)),Image.Resampling.LANCZOS)
            tile=Image.new('RGBA',(256,256));tile.alpha_composite(small,((256-small.width)//2,(256-small.height)//2))
            name=(job['phases'][k]+'_'+job['dirs'][row]) if 'dirs' in job else job['phases'][row*job['cols']+k]
            tiles.append((name,tile))
        if 'dirs' in job:
            for d in job['dirs']:clips.append({'name':d,'frames':[p+'_'+d for p in job['phases']],'fps':10,'loop':True})
        else:
            names=[name for name,_ in tiles]
            if job['id']=='sword-rain-impact':groups=[('fall',names[:4],True),('impact',names[4:12],False),('embedded',names[12:],False)]
            elif job['id']=='ice-bomb':groups=[('bomb',names[:4],True),('ice-blast',names[4:12],False),('feather',names[12:],True)]
            elif job['id']=='laser-ground':groups=[('beam',names[:4],True),('ground-contact',names[4:],True)]
            elif job['id']=='lightning-parry':groups=[('parry',names[:4],False),('return-bolt',names[4:],False)]
            else:groups=[(job['id'],names,job['id']=='fire-trail')]
            clips=[{'name':n,'frames':f,'fps':10,'loop':loop} for n,f,loop in groups]
        notes.append('Raster components only; source alpha retained, no fabricated hits or homing.')
        if job['id']=='lightning-star':notes.append('Five crossing chords, no outer pentagon; ground-plane projection required at composition.')
        pack(job,tiles,canvas,[.5,.5],clips,notes,warnings)

# Four icons are deterministic crops of the approved board; never overwrite it.
board=Image.open(ROOT/'assets/concepts/skill-revise/v01/10-icon-rework.png').convert('RGBA')
icon_tiles=[]
for name,box in [('hoa-long',(246,26,737,491)),('phong-quyen',(799,26,1292,491)),('that-tinh',(246,526,737,993)),('ngu-loi',(799,526,1292,993))]:
    crop=board.crop(box).resize((192,192),Image.Resampling.LANCZOS);tile=Image.new('RGBA',(256,256));tile.alpha_composite(crop,(32,32));icon_tiles.append((name,tile))
icon_job={'id':'revised-icons','filename':'../dummy','refs':[]}
# Icons have a distinct provenance and need no fictitious generated raw file.
icon_raw=SRC/'raw/revised-icons.png';sheet=Image.new('RGBA',(1024,256))
for i,(_,t) in enumerate(icon_tiles):sheet.alpha_composite(t,(i*256,0))
sheet.save(icon_raw);icon_job['filename']='revised-icons.png'
pack(icon_job,icon_tiles,[256,256],[.5,.5],[{'name':n,'frames':[n],'fps':1,'loop':False} for n,_ in icon_tiles],['Existing approved icon-board crops; no new image generation.'],[])

cfg=json.loads((ROOT/'assets/source/skill-revise-thien-su-v01/profile.json').read_text());existing=json.loads((ROOT/'assets/exports/skill-revise-thien-su-v01/manifest.json').read_text())
clips=[{'name':g['name']+'_'+d,'frames':[p+'_'+d for p in g['poses']],'fps':1000/g['durationMs'],'loop':g['name'] in ['idle','walk','chaos_idle','chaos_walk']} for d in existing['directions'] for g in cfg['groups']]
catalogue.insert(0,{'id':'thien-su','label':'Thiền Sư · búa mới','png':'/packs/thien-su.png','atlas':'/packs/thien-su.json','sourcePng':'assets/exports/'+cfg['folder']+'/body.png','sourceAtlas':'assets/exports/'+cfg['folder']+'/body.json','pivot':[cfg['foot'][0]/cfg['canvas'][0],cfg['foot'][1]/cfg['canvas'][1]],'scale':.5,'clips':clips,'note':'Thiền Sư · authored body + explicitly derived Chaos · candidate timing, chưa gameplay'})
(ROOT/'assets/reviews/skill-revise-v01/catalogue.json').write_text(json.dumps({'packs':catalogue},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
(OUT/'validation.json').write_text(json.dumps({'status':'REVIEW_CANDIDATE','packs':reports,'warnings':[{'pack':p['id'],**w} for p in reports for w in p['warnings']],'concept_hashes_unchanged':True,'runtime_integrated':False},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
guards()
print(json.dumps({'packs':len(catalogue),'newComponentFrames':sum(p['frames'] for p in reports),'warnings':sum(len(p['warnings']) for p in reports)}))
