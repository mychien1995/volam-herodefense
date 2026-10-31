from pathlib import Path
p=Path(__file__).resolve().parent/'prepare.py'
s=p.read_text(encoding='utf-8')
s=s.replace("if not raw.exists():continue\n    rows=cells(raw);a=component(s,'character'","if (BASE/'generated'/f'{sid}_character_v02.png').exists():raw=BASE/'generated'/f'{sid}_character_v02.png'\n    if not raw.exists():continue\n    rows=cells(raw);a=component(s,'character'",1)
needle="        reference=selected[3 if sid=='nhu_lai_niet_ban' else 0][0]"
extra="""        if d=='left' and sid in ['tru_ta','tam_gioi_quy_thien','nhu_lai_thien_diep']:
            correction=BASE/'generated'/'dao_left_corrections_v01.png'
            if correction.exists():
                selected=cells(correction)[['tru_ta','tam_gioi_quy_thien','nhu_lai_thien_diep'].index(sid)];selected_raw=correction
                a['correctionSources']=[rel(correction)];a['reuseNotes'].append('Left attack uses four newly drawn right-hand-dao correction cels; original inconsistent left row excluded.')
        if d=='left' and sid=='bat_dong_minh_vuong':
            correction=BASE/'generated'/'kim_quang_ho_tran_character_v02.png'
            selected=cells(correction)[1];selected_raw=correction
            a['correctionSources']=[rel(correction)];a['reuseNotes'].append('Four left-facing support-channel cels explicitly shared from new Kim Quang Ho Tran support cast to correct facing; this skill retains separate healing VFX and other12 own cels. No approved basic clips altered.')
""" + needle
if 'dao_left_corrections_v01.png' not in s:s=s.replace(needle,extra)
p.write_text(s,encoding='utf-8')
b=Path(__file__).resolve().parent/'build.mjs'
s=b.read_text(encoding='utf-8').replace("rawSource:a.rawSource,frameDimensions","rawSource:a.rawSource,correctionSources:a.correctionSources??[],frameDimensions")
b.write_text(s,encoding='utf-8')
# Approved normal clips are loaded unchanged and can be inspected independently.
p=Path(__file__).resolve().parent/'review.mjs'
s=p.read_text(encoding='utf-8')
s=s.replace("hero.setTexture(baseKey, 'idle_' + d + '_' + (Math.floor(t / 350) % 2));","hero.setTexture(baseKey, 'idle_' + d + '_' + (Math.floor(t / 350) % 2)).setOrigin(0.5,0.8);\n  if(mode==='basic'){if(t<320)hero.setFrame('basic_attack_'+d+'_'+Math.floor(t/80));return;}")
s=s.replace("if(!vfx)continue;","if(!vfx || mode==='basic')continue;")
p.write_text(s,encoding='utf-8')
p=Path(__file__).resolve().parent/'review.html'
s=p.read_text(encoding='utf-8').replace('<option value="combined">Combined</option>','<option value="combined">Combined</option><option value="basic">Approved normal attack</option>')
p.write_text(s,encoding='utf-8')
print('Selected corrected actions and explicit four-cel support reuse; retained approved basic preview.')
