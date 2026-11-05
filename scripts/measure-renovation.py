"""Measure generated spritesheet cells and ground contact without modifying raster pixels."""
import json
from pathlib import Path
from PIL import Image
import numpy as np

def components(alpha):
    """Measure connected solid silhouettes; never cut artwork at guessed grid lines."""
    mask=np.asarray(alpha)>=224
    parents=[]; runs=[]; previous=[]
    def find(index):
        while parents[index]!=index:
            parents[index]=parents[parents[index]]; index=parents[index]
        return index
    for y,row in enumerate(mask):
        changes=np.flatnonzero(np.diff(np.concatenate(([False],row,[False]))))
        current=[]; cursor=0
        for x0,x1 in zip(changes[::2],changes[1::2]):
            x0,x1=int(x0),int(x1)
            index=len(parents);parents.append(index)
            while cursor<len(previous) and previous[cursor][1]<x0-1: cursor+=1
            neighbor=cursor
            while neighbor<len(previous) and previous[neighbor][0]<=x1:
                parents[find(previous[neighbor][2])]=find(index);neighbor+=1
            current.append((x0,x1,index));runs.append((x0,x1,y,index))
        previous=current
    output={}
    for x0,x1,y,index in runs:
        key=find(index)
        if key not in output: output[key]=[x0,y,x1,y+1,0]
        b=output[key]; b[0]=min(b[0],x0);b[1]=min(b[1],y);b[2]=max(b[2],x1);b[3]=max(b[3],y+1);b[4]+=x1-x0
    return sorted((box for box in output.values() if box[4]>=20),key=lambda box:box[4],reverse=True)

root=Path(__file__).resolve().parents[1]
source=root/"assets/source/renovation-v1"
catalog=json.loads((source/"catalog.json").read_text(encoding="utf8"))
layout={"actors":{},"props":{}}
for actor in catalog["actors"]:
    path=root/actor["raw"]
    if not path.exists(): continue
    image=Image.open(path).convert("RGBA")
    # Reject matte backgrounds instead of treating a white rectangle as a body.
    if image.getchannel("A").getextrema()[0] > 96:
        print("SKIP opaque source pending repair:",actor["id"])
        continue
    width,height=image.size
    pieces=components(image.getchannel('A'))
    cells={}
    for box in pieces[:20]:
        key=(min(3,int((box[1]+box[3])/2/height*4)),min(4,int((box[0]+box[2])/2/width*5)))
        assert key not in cells,('Joined or misplaced source cels',actor['id'],key)
        cells[key]=box[:4]
    assert len(cells)==20,('Incomplete body sheet',actor['id'],len(cells))
    for box in pieces[20:]:
        key=(min(3,int((box[1]+box[3])/2/height*4)),min(4,int((box[0]+box[2])/2/width*5)))
        main=cells[key]
        # Keep nearby disconnected blades, fingers and garment pieces, omit distant noise.
        distance=max(main[0]-box[2],box[0]-main[2],main[1]-box[3],box[1]-main[3],0)
        if distance<=15:
            cells[key]=[min(main[0],box[0]),min(main[1],box[1]),max(main[2],box[2]),max(main[3],box[3])]
    rows=[]
    for row,direction in enumerate(["down","left","right","up"]):
        cels=[]
        scale=None
        for column in range(5):
            measured=cells[(row,column)]
            x0,y0=max(0,measured[0]-4),max(0,measured[1]-4)
            x1,y1=min(width,measured[2]+4),min(height,measured[3]+4)
            alpha=image.getchannel("A").crop((x0,y0,x1,y1))
            solid=alpha.point(lambda value:255 if value>=224 else 0)
            box=solid.getbbox()
            assert box, f"Empty source cell {actor['id']} {direction} {column}"
            if column==0: scale=actor["height"]/(box[3]-box[1])
            band=solid.crop((0,max(box[1],box[3]-18),alpha.width,box[3])).getbbox()
            feet=[(band[0]+band[2])/2,box[3]]
            cels.append({"source":[x0,y0,x1-x0,y1-y0],
                         "bounds":[max(0,box[0]-4),max(0,box[1]-4),min(alpha.width,box[2]+4),min(alpha.height,box[3]+4)],
                         "feet":feet,
                         "edgeClearance":min(x0+box[0],y0+box[1],width-x0-box[2],height-y0-box[3])})
        rows.append({"direction":direction,"scale":scale,"cels":cels})
    layout["actors"][actor["id"]]={"rows":rows}
for scene in catalog["scenes"]:
    path=source/"raw"/(scene["id"]+"-props.png")
    if not path.exists(): continue
    image=Image.open(path).convert("RGBA")
    definitions=[]
    for index in range(6):
        column,row=index%3,index//3
        x0,y0=int(column*image.width/3),int(row*image.height/2)
        x1,y1=int((column+1)*image.width/3),int((row+1)*image.height/2)
        alpha=image.getchannel("A").crop((x0,y0,x1,y1))
        box=alpha.point(lambda value:255 if value>=224 else 0).getbbox()
        assert box, (scene["id"],index)
        definitions.append({"source":[x0,y0,x1-x0,y1-y0],"bounds":[max(0,box[0]-3),max(0,box[1]-3),min(alpha.width,box[2]+3),min(alpha.height,box[3]+3)],"height":[260,280,195,210,190,150][index]})
    layout["props"][scene["id"]]=definitions
(source/"layout.json").write_text(json.dumps(layout,indent=2)+"\n",encoding="utf8")
print("Measured",len(layout["actors"]),"generated body sheets")

