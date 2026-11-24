"""Listening candidates only; approved runtime clips and old MP3s are untouched."""
import hashlib, html, io, json, runpy, subprocess, wave
from pathlib import Path
import numpy as np

root=Path(__file__).resolve().parents[1]
out=root/'assets/reviews/audio-four-schools-v01'
out.mkdir(parents=True,exist_ok=True)
js='''import {m1Config as c} from './packages/game-data/dist/index.js';
const schools=['cai_bang','thieu_lam','thien_son','vo_dang'];
let rows=[]; for(const school of schools){const branches=Object.keys(c.progression.defaultBranches).filter(b=>c.progression.defaultBranches[b].schoolId===school);
const keys=new Set([...c.progression.schools[school].basicIds,...branches.flatMap(b=>c.progression.fixedBranches[b].skillIds),...(school==='thieu_lam'?['toan_phong_thoai','hoanh_tao_cuoc','vo_anh_cuoc']:[])]);
rows.push(...[...keys].map(id=>({school,basic:!!c.basics[id],...c.basics[id]??c.skillCatalogue[id]})));}console.log(JSON.stringify(rows));'''
rows=json.loads(subprocess.check_output(['node','--input-type=module','-e',js],cwd=root,text=True,encoding='utf8'))
assert len(rows)==51, len(rows)
design=runpy.run_path(str(root/'scripts/build-skill-sounds.py'))
synth=design['synth']
names={'cai_bang':'Cái Bang','thieu_lam':'Thiếu Lâm','thien_son':'Thiên Sơn','vo_dang':'Võ Đang'}
clips=[]
for index,a in enumerate(rows):
    effect=a['effect']; mode=effect['mode']
    for phase in ['cast','impact']:
        material=({'cai_bang':'fire','thieu_lam':'impact','thien_son':'blade','vo_dang':'ring'}[a['school']] if phase=='impact' else {'cai_bang':'dragon','thieu_lam':'swing','thien_son':'blade','vo_dang':'rise'}[a['school']])
        if mode in ['buff','fortune','shield','toggle_shield']: material='ring'
        duration=(.28 if a['basic'] else .5 if phase=='cast' else .7)
        pitch={'cai_bang':110,'thieu_lam':160,'thien_son':700,'vo_dang':430}[a['school']]*(1+(index%7)*.065)
        cue=a['id']+'-'+phase
        synth.__globals__['RECIPES']={cue:(duration,material,pitch,.65)}
        samples=synth(cue,0)
        wav=out/(cue+'.wav'); ogg=out/(cue+'.ogg')
        memory=io.BytesIO()
        with wave.open(memory,'wb') as w:
            w.setnchannels(1);w.setsampwidth(2);w.setframerate(48000);w.writeframes(np.round(samples*32767).astype('<i2').tobytes())
        wav.write_bytes(memory.getvalue())
        subprocess.run(['ffmpeg','-v','error','-nostdin','-y','-i',str(wav),'-c:a','libvorbis','-q:a','5',str(ogg)],check=True)
        decoded=np.frombuffer(subprocess.check_output(['ffmpeg','-v','error','-nostdin','-i',str(ogg),'-f','f32le','pipe:1']),dtype='<f4')
        assert np.isfinite(decoded).all() and np.max(np.abs(decoded))<1 and np.sqrt(np.mean(decoded**2))>.005
        clips.append({'school':a['school'],'id':a['id'],'nameVi':a['nameVi'],'phase':phase,'mode':mode,'basic':a['basic'],'file':ogg.name,'wavSha256':hashlib.sha256(wav.read_bytes()).hexdigest(),'oggSha256':hashlib.sha256(ogg.read_bytes()).hexdigest()})
manifest={'status':'listening-candidate-not-integrated','origin':'Original synthesis, no third-party samples','catalogueEntries':len(rows),'clips':clips}
(out/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
body=''
for school,name in names.items():
    body+=f'<h2>{name}</h2>'
    for a in [x for x in rows if x['school']==school]:
        body+=f'<section><h3>{html.escape(a["nameVi"])}'+(' · A' if a['basic'] else '')+'</h3>'
        for c in [c for c in clips if c['id']==a['id']]:
            body+=f'<label>{"Ra đòn / mở chiêu" if c["phase"]=="cast" else "Va chạm / hiệu ứng"}<audio controls preload="none" src="{c["file"]}"></audio></label>'
        body+='</section>'
(out/'index.html').write_text('<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Nghe thử âm thanh bốn phái</title><style>body{max-width:1050px;margin:32px auto;background:#171c23;color:#eef1f4;font:16px system-ui;padding:20px}section{background:#252e39;padding:16px;margin:12px 0;border-radius:10px}label{display:inline-block;margin:8px 25px 8px 0}audio{display:block;margin-top:8px}h2{color:#e7c47c}</style><h1>Âm thanh thử · Bốn phái</h1><p>51 đòn/chiêu, 102 clip tổng hợp mới. Đây là các lớp âm để nghe chất âm; chưa thay MP3 trong game, chưa ghép nhịp combo hoặc vòng đời chiêu. Các chiêu buff dùng lớp hiệu ứng thay cho tiếng va chạm.</p>'+body+'<script>document.addEventListener("play",e=>{if(e.target.tagName==="AUDIO")document.querySelectorAll("audio").forEach(a=>{if(a!==e.target)a.pause()})},true)</script></html>',encoding='utf8')
print(json.dumps({'entries':len(rows),'clips':len(clips),'folder':str(out)}))
