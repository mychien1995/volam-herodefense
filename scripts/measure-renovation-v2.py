"""Read and measure source alpha only; Aseprite performs all raster editing."""
import json
from pathlib import Path
from PIL import Image
import numpy as np
root=Path(__file__).resolve().parents[1];src=root/'assets/source/renovation-v2'
result={}
for name in ['vo_dang_cast','thien_son_throw','thien_son_cast']:
    path=src/'raw'/(name+'.png')
    if not path.exists():continue
    image=Image.open(path).convert('RGBA');w,h=image.size;cels=[]
    for row,direction in enumerate(['down','left','right','up']):
        for col in range(4):
            x,y,x1,y1=round(w*col/4),round(h*row/4),round(w*(col+1)/4),round(h*(row+1)/4)
            a=np.asarray(image.getchannel('A').crop((x,y,x1,y1)));mask=a>=160;yy,xx=np.nonzero(mask)
            assert len(xx)>100 and not mask[0].any() and not mask[-1].any(),(name,row,col,'clipped')
            box=[int(xx.min()),int(yy.min()),int(xx.max())+1,int(yy.max())+1]
            fy=box[3];feet=np.nonzero(mask[max(0,fy-14):fy])[1]
            cels.append({'direction':direction,'index':col,'cell':[x,y,x1-x,y1-y],'bounds':box,'feet':[(int(feet.min())+int(feet.max())+1)/2,fy]})
    # One scale across this coherent sheet; guard sword tips may rise above the head.
    heights=sorted(c['bounds'][3]-c['bounds'][1] for c in cels)
    result[name]={'scale':88/heights[len(heights)//2],'cels':cels}
cels=[]
for row,direction in enumerate(['down','left','right','up']):
    path=f'assets/source/visual-upgrade-2/raw/{direction}.png';image=Image.open(root/path).convert('RGBA');w,h=image.size
    for col,selected in enumerate([4,5,6,7]):
        x,y=round((selected%4)*w/4),round((selected//4)*h/2);cw,ch=round(w/4),round(h/2)
        a=np.asarray(image.getchannel('A').crop((x,y,x+cw,y+ch)));mask=a>=160;yy,xx=np.nonzero(mask);b=[int(xx.min()),int(yy.min()),int(xx.max())+1,int(yy.max())+1];fy=b[3];feet=np.nonzero(mask[fy-14:fy])[1]
        cels.append({'raw':path,'mirror':direction=='up','direction':direction,'index':col,'cell':[x,y,cw,ch],'bounds':b,'feet':[(int(feet.min())+int(feet.max())+1)/2,fy]})
heights=sorted(c['bounds'][3]-c['bounds'][1] for c in cels)
result['vo_dang_attack']={'scale':88/heights[len(heights)//2],'cels':cels}
(src/'body-layout.json').write_text(json.dumps(result,indent=2)+'\n',encoding='utf8')
print('Measured',','.join(result))
