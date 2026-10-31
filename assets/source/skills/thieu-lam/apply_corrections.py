from pathlib import Path
p=Path(__file__).resolve().parent/'prepare.py'
s=p.read_text(encoding='utf-8-sig')
s=s.replace("reference=rows[row][0][0];scale=44/(foot(reference)[1]-scalp(reference));frames=[]","""selected=rows[row]; selected_raw=raw
        if d=='left':
            index=next(i for i,k in enumerate(skills) if k['id']==sid)
            if index<8:
                correction=BASE/'generated'/f'quyen_left_corrections_{1+index//4:02d}_v01.png'
                if correction.exists():
                    selected=cells(correction)[index%4];selected_raw=correction
                    a['correctionSources']=[rel(correction)];a['reuseNotes'].append('Left facing uses four newly drawn direction-correction cels. Incorrect original row excluded; no character mirror transforms.')
        reference=selected[3 if sid=='nhu_lai_niet_ban' else 0][0];scale=44/(foot(reference)[1]-scalp(reference));frames=[]""")
s=s.replace("enumerate(rows[row]):","enumerate(selected):").replace("constantRowScale=scale,mirrorX=False","constantRowScale=scale,rawSource=rel(selected_raw),mirrorX=False")
p.write_text(s,encoding='utf-8')
