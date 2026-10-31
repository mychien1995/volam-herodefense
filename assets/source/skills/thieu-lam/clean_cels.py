from pathlib import Path
p=Path(__file__).resolve().parent/'prepare.py';s=p.read_text(encoding='utf-8-sig')
needle="def foot(im):"
helper="""def clean_character(im):
    # Remove only tiny disconnected alpha debris introduced around generated cels.
    # All retained color pixels come from the original source; no artwork is painted.
    im=im.copy();alpha=im.getchannel('A');w,h=im.size
    todo={i for i,a in enumerate(alpha.getdata()) if a};removed=[]
    while todo:
        first=todo.pop();stack=[first];component=[first]
        while stack:
            i=stack.pop();x=i%w
            for n in ([i-w] if i>=w else [])+([i+w] if i+w<w*h else [])+([i-1] if x else [])+([i+1] if x<w-1 else []):
                if n in todo:todo.remove(n);stack.append(n);component.append(n)
        if len(component)<64:removed.extend(component)
    for i in removed:im.putpixel((i%w,i//w),(0,0,0,0))
    return im
""" + needle
if 'def clean_character' not in s:s=s.replace(needle,helper)
s=s.replace("reference=selected[3 if sid=='nhu_lai_niet_ban' else 0][0]","selected=[(clean_character(im),rect) for im,rect in selected]\n        reference=selected[3 if sid=='nhu_lai_niet_ban' else 0][0]")
s=s.replace("anchor=foot(im);frames.append(align(im,scale,anchor,a['canvas'],a['pivot']))","anchor=foot(im);frame=align(im,scale,anchor,a['canvas'],a['pivot'])\n            lift=-2 if sid=='vo_anh_cuoc' and col==1 else -1 if sid=='vo_anh_cuoc' and col==2 else 0\n            if lift:\n                shifted=Image.new('RGBA',a['canvas']);shifted.paste(frame,(0,lift));frame=shifted\n            frames.append(frame)")
s=s.replace("bodyReferenceHeightPx=44))","bodyReferenceHeightPx=44,intentionalAirborneArtOffsetPx=[0,lift]))")
s=s.replace("binary-alpha cleanup, measured","binary-alpha cleanup, removal of tiny disconnected alpha debris, measured")
p.write_text(s,encoding='utf-8')
print('Enabled tiny disconnected character-alpha debris cleanup and documented rapid-kick art lift.')
