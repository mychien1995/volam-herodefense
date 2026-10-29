"""Original hand-authored pixel primitives for the M1 prototype. No external art.
Optional authoring dependency: Pillow 11.3.0. Runtime exports are committed.
"""
from pathlib import Path
import json, random
from PIL import Image, ImageDraw
ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "assets/exports"
DIRECTIONS = ["down", "left", "right", "up"]
STATES = ["idle", "walk", "basic_attack", "cast", "hurt", "death"]

def save_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":"))+"\n", encoding="utf-8")

def actor(direction, state, frame, enemy=False):
    im=Image.new("RGBA",(48,48)); d=ImageDraw.Draw(im)
    ink="#243339"; skin="#e4b581"; hair="#343036"
    cloth="#b85144" if enemy else "#458c78"
    light="#e58155" if enemy else "#81b48c"
    dark="#773b3a" if enemy else "#28574f"
    bob=1 if frame in (1,2) and state in ("idle","walk") else 0
    x=24; y=42-bob
    if state=="death":
        if frame>=2:
            d.ellipse((9,40,39,46), fill=(20,35,35,85))
            d.rectangle((15,36,34,43),fill=ink);d.rectangle((17,37,33,42),fill=dark)
            d.rectangle((8,33,18,41),fill=ink);d.rectangle((10,34,17,39),fill=skin)
            d.rectangle((32,40,40,43),fill=hair)
            return im
        y+=frame*3
    leg=2 if state=="walk" and frame%2 else 0
    d.rectangle((18,y-7-leg,22,y+2-leg),fill=ink)
    d.rectangle((26,y-7+leg,30,y+2+leg),fill=ink)
    d.rectangle((18,y-13,30,y-4),fill=ink)
    d.polygon([(17,y-22),(30,y-22),(33,y-6),(15,y-6)],fill=ink)
    d.polygon([(19,y-21),(28,y-21),(31,y-8),(17,y-8)],fill=cloth)
    d.rectangle((19,y-20,21,y-9),fill=light)
    d.rectangle((17,y-12,31,y-10),fill="#d9b56a")
    if direction in ("left","right"):
        d.rectangle((23,y-21,29,y-13),fill=dark)
    # Head crown is visible above the face: elevated orthographic view.
    hx=24 + (2 if direction=="right" else -2 if direction=="left" else 0)
    d.rectangle((hx-7,y-35,hx+6,y-23),fill=ink)
    d.rectangle((hx-6,y-34,hx+5,y-25),fill=skin)
    d.rectangle((hx-7,y-36,hx+6,y-30),fill=hair)
    d.rectangle((hx-5,y-37,hx+4,y-34),fill=hair)
    d.rectangle((hx-6,y-31,hx+5,y-30),fill="#d99c5a" if not enemy else "#d97650")
    if direction=="up":
        d.rectangle((hx-6,y-30,hx+5,y-23),fill=hair)
        d.rectangle((hx-2,y-24,hx+1,y-21),fill=hair)
    else:
        eye=hx+3 if direction=="right" else hx-4 if direction=="left" else hx-3
        d.point((eye,y-28),fill=ink)
        if direction=="down": d.point((hx+3,y-28),fill=ink)
        d.rectangle((hx-1,y-24,hx+1,y-24),fill="#ad765d")
    arm=3 if state in ("basic_attack","cast") else (1 if state=="walk" and frame%2 else 0)
    d.rectangle((13,y-21-arm,17,y-13-arm),fill=dark)
    d.rectangle((29,y-21+arm,33,y-13+arm),fill=light)
    d.rectangle((13,y-13-arm,17,y-10-arm),fill=skin)
    d.rectangle((29,y-13+arm,33,y-10+arm),fill=skin)
    # A staff or small wooden club; orientation and swing are hand-authored.
    if state=="basic_attack":
        reach=10+frame*3
        if direction=="up": points=[(32,y-15),(29,y-32-reach//2)]
        elif direction=="down": points=[(31,y-18),(24,y+reach//3)]
        elif direction=="left": points=[(17,y-16),(max(1,24-reach),y-12-frame)]
        else: points=[(30,y-16),(min(47,26+reach),y-12-frame)]
        d.line(points,fill=ink,width=4); d.line(points,fill="#d6ad6b",width=2)
    elif not enemy:
        d.rectangle((35,y-29,37,y+2),fill=ink);d.line((36,y-28,36,y+1),fill="#c5a16a",width=1)
    if state=="cast":
        d.rectangle((10,y-31,14,y-23),fill=skin)
        d.ellipse((7-frame%2,y-40,17+frame%2,y-30),fill="#f0a948")
        d.rectangle((10,y-37,14,y-33),fill="#ffe1a0")
    if state=="hurt" and frame%2==0:
        alpha=im.getchannel("A"); flash=Image.new("RGBA",im.size,"#f3d7a6");flash.putalpha(alpha);im=flash
    return im

manifest=[]
for key,enemy in [("hero_cai_bang",False),("creep_outlaw",True)]:
    sheet=Image.new("RGBA",(192,1152));frames={}; animations=[]
    for si,state in enumerate(STATES):
        for di,direction in enumerate(DIRECTIONS):
            names=[]
            for f in range(4):
                name=f"{state}_{direction}_{f}"; x=f*48;y=(si*4+di)*48
                sheet.paste(actor(direction,state,f,enemy),(x,y))
                frames[name]={"frame":{"x":x,"y":y,"w":48,"h":48},"rotated":False,"trimmed":False,"spriteSourceSize":{"x":0,"y":0,"w":48,"h":48},"sourceSize":{"w":48,"h":48}}
                names.append(name)
            animations.append({"state":state,"direction":direction,"frames":names,"frameRate":10 if state=="walk" else 8,"repeat":-1 if state in ("idle","walk") else 0})
    folder="characters" if not enemy else "enemies"
    target=OUT/folder;target.mkdir(parents=True,exist_ok=True);sheet.save(target/f"{key}.png")
    save_json(target/f"{key}.json",{"frames":frames,"meta":{"image":f"{key}.png","size":{"w":192,"h":1152},"scale":"1"}})
    manifest.append({"id":key,"category":"enemy" if enemy else "character","status":"prototype","source":"assets/source/m1_art.py","sheet":f"{folder}/{key}.png","atlas":f"{folder}/{key}.json","frameWidth":48,"frameHeight":48,"footPivot":[0.5,1],"directions":DIRECTIONS,"animations":animations,"license":"Original project artwork; no third-party content","attribution":"Hand-authored pixel primitives for Võ Lâm Hero Defense"})
# Four square terrain tiles, deterministic tiny clusters, no smoothing.
rng=random.Random(19);tiles=Image.new("RGBA",(128,32))
for tile,base in enumerate(["#66835a","#739362","#b4a083","#718f66"]):
    d=ImageDraw.Draw(tiles);x=tile*32;d.rectangle((x,0,x+31,31),fill=base)
    if tile==2:
        d.rectangle((x,0,x+31,1),fill="#8c846d");d.rectangle((x,0,x+1,31),fill="#8c846d")
        d.line([(x+8,4),(x+9,10),(x+14,13)],fill="#9c927b",width=1)
        d.line([(x+23,25),(x+19,22)],fill="#d1bca0",width=1)
    else:
        for i in range(18):
            px=x+rng.randrange(2,29);py=rng.randrange(2,29)
            d.rectangle((px,py,px+1,py+1),fill=rng.choice(["#55754f","#829e65","#8aab71"]))
        if tile==3:
            for px,py in [(8,8),(24,20)]:
                d.rectangle((x+px,py,x+px+2,py+2),fill="#e7c67f");d.point((x+px+1,py+1),fill="#f8e6bc")
(OUT/"tilesets").mkdir(parents=True,exist_ok=True);tiles.save(OUT/"tilesets/terrain.png")
# Tree has a narrow collision footprint; canopy is a depth-sorted foreground.
tree=Image.new("RGBA",(96,112));d=ImageDraw.Draw(tree)
d.ellipse((18,96,80,109),fill=(28,48,42,80))
d.rectangle((42,65,57,104),fill="#35483a");d.rectangle((46,68,54,105),fill="#8a7050");d.rectangle((47,71,49,99),fill="#b18a60")
d.polygon([(45,81),(28,67),(32,61),(50,75),(65,53),(69,59),(55,84)],fill="#5c5841")
for box in [(7,32,83,73),(19,8,75,63),(0,39,53,83),(42,30,95,82)]:
    d.ellipse(box,fill="#304e43")
for box in [(8,28,56,67),(22,9,73,53),(43,33,87,74),(4,47,42,75)]:
    d.ellipse(box,fill="#496b4d")
for box in [(20,21,49,42),(35,12,65,37),(48,40,75,57),(9,46,33,61)]:
    d.ellipse(box,fill="#71915d")
for px,py in [(20,36),(43,22),(56,31),(70,56),(27,59),(49,49)]:
    d.rectangle((px,py,px+4,py+2),fill="#94aa6c")
(OUT/"scenery").mkdir(parents=True,exist_ok=True);tree.save(OUT/"scenery/tree.png")
fx=Image.new("RGBA",(128,32));d=ImageDraw.Draw(fx)
for i in range(4):
    x=i*32;r=5+i
    d.ellipse((x+16-r,16-r,x+16+r,16+r),fill="#b75134")
    d.rectangle((x+12,10,x+20,21),fill="#f2a447");d.rectangle((x+14,12,x+18,18),fill="#ffe4a2")
    d.rectangle((x+4,14,x+9,17),fill="#db7939")
(OUT/"effects").mkdir(parents=True,exist_ok=True);fx.save(OUT/"effects/fire.png")
for key,category,path,w,h in [("terrain","tileset","tilesets/terrain.png",32,32),("tree","scenery","scenery/tree.png",96,112),("fire","effect","effects/fire.png",32,32)]:
    manifest.append({"id":key,"category":category,"status":"prototype","source":"assets/source/m1_art.py","sheet":path,"frameWidth":w,"frameHeight":h,"footPivot":[0.5,1],"license":"Original project artwork; no third-party content","attribution":"Hand-authored pixel primitives for Võ Lâm Hero Defense"})
save_json(ROOT/"assets/manifest.json",{"schemaVersion":1,"artDirection":"v1.2 orthographic elevated top-down","assets":manifest})
# Orthogonal Tiled source; server collision uses the very same exported objects.
width=50;height=36;ground=[]
for y in range(height):
    for x in range(width):
        ground.append(3 if (21<=x<=30 and 15<=y<=24) or x in (24,25) or y in (20,21) else 4 if (x*17+y*13)%41==0 else 2 if (x+y)%4==0 else 1)
objects=lambda name,values:{"type":"objectgroup","name":name,"objects":values,"visible":True,"opacity":1,"x":0,"y":0}
def obj(i,name,x,y,w=0,h=0,kind="marker"):return {"id":i,"name":name,"type":kind,"x":x,"y":y,"width":w,"height":h,"rotation":0,"visible":True}
map_data={"type":"map","version":"1.10","tiledversion":"1.11.2","orientation":"orthogonal","renderorder":"right-down","infinite":False,"width":width,"height":height,"tilewidth":32,"tileheight":32,"nextlayerid":8,"nextobjectid":30,
"tilesets":[{"firstgid":1,"name":"terrain","image":"../assets/exports/tilesets/terrain.png","imagewidth":128,"imageheight":32,"tilewidth":32,"tileheight":32,"columns":4,"tilecount":4,"margin":0,"spacing":0}],
"layers":[{"id":1,"type":"tilelayer","name":"ground","data":ground,"width":width,"height":height,"x":0,"y":0,"opacity":1,"visible":True},
objects("scenery",[obj(2,"tree_west",680,650,kind="tree"),obj(3,"tree_east",1120,740,kind="tree"),obj(4,"tree_north",840,420,kind="tree")]),
objects("collision",[obj(5,"trunk_west",668,632,24,18,"solid"),obj(6,"trunk_east",1108,722,24,18,"solid"),obj(7,"trunk_north",828,402,24,18,"solid"),obj(8,"north_wall",480,280,640,24,"solid")]),
objects("spawns",[obj(9,"hero_spawn",800,680),obj(10,"creep_0",920,660),obj(11,"creep_1",960,680),obj(12,"creep_2",920,720),obj(13,"spawn_west",64,672),obj(14,"spawn_east",1536,672)]),
objects("statue",[obj(15,"statue_future",800,576)]),objects("npc",[]),objects("portal",[])]}
for layer_id, layer in enumerate(map_data["layers"], 1): layer["id"]=layer_id
save_json(ROOT/"maps/arena.tmj",map_data)
print("Exported original M1 prototype: 192 character frames, terrain, tree, effect, manifest and orthogonal map.")
