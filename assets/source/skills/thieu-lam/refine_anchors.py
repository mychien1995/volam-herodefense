from pathlib import Path
p=Path(__file__).resolve().parent/'prepare.py';s=p.read_text(encoding='utf-8')
s=s.replace("anchor=[(b[0]+b[2])/2,(b[1]+b[3])/2];frames.append(align(im,scale,anchor,canvas,a['pivot']))","anchor=[(b[0]+b[2])/2,b[1]+(b[3]-b[1])*(.82 if placement in ['ground','caster_feet','target_feet'] else .5)];frames.append(align(im,scale,anchor,canvas,a['pivot']))")
p.write_text(s,encoding='utf-8')
p=Path(__file__).resolve().parent/'prepare_review.py';s=p.read_text(encoding='utf-8').replace("len(selected)*150","len(selected)*260").replace("row*150","row*260").replace("row*260-64","row*260+20")
p.write_text(s,encoding='utf-8')
p=Path(__file__).resolve().parent/'serve.mjs';s=p.read_text(encoding='utf-8').replace('Võ Đang art review','Thiếu Lâm art review');p.write_text(s,encoding='utf-8')
print('Ground effects anchor at the drawn ellipse base instead of vertical glow center.')
