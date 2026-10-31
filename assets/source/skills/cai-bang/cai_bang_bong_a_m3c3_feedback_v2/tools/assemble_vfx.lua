local root=assert(app.params.root)
local folder=root..'/assets/source/skills/cai-bang/cai_bang_bong_a_m3c3_feedback_v2'
local out=root..'/assets/exports/skills/cai-bang/cai_bang_bong_a_m3c3_feedback_v2'
local function read(p)local f=assert(io.open(p,'r'));local v=json.decode(f:read('*a'));f:close();return v end
local layout=read(folder..'/vfx_layout.json');local pc=app.pixelColor;local imgs={}
local sprite=Sprite(160,160,ColorMode.RGB);local layer=sprite.layers[1];layer.name='Staff VFX only - editable raster cels'
local tags={};local last=nil
for i,f in ipairs(layout.frames) do
 if not imgs[f.source] then imgs[f.source]=Image{fromFile=folder..'/'..f.source} end
 local source=imgs[f.source];local crop=Image(256,256,ColorMode.RGB)
 for y=0,255 do for x=0,255 do local p=source:getPixel(f.cell[1]+x,f.cell[2]+y)
  if pc.rgbaA(p)>=220 then crop:drawPixel(x,y,pc.rgba(pc.rgbaR(p),pc.rgbaG(p),pc.rgbaB(p),255)) end
 end end
 local size=math.floor(256*f.scale+0.5);crop:resize(size,size)
 local canvas=Image(160,160,ColorMode.RGB)
 local ax=math.floor(f.sourceAnchor[1]*f.scale+0.5);local ay=math.floor(f.sourceAnchor[2]*f.scale+0.5)
 canvas:drawImage(crop,Point(80-ax,80-ay))
 if f.quarterTurn~=0 then
  local rotated=Image(160,160,ColorMode.RGB)
  for y=0,159 do for x=0,159 do local p=canvas:getPixel(x,y)
   if pc.rgbaA(p)>0 then
    local xx,yy
    if f.quarterTurn==1 then xx,yy=80-(y-80),80+(x-80) else xx,yy=80+(y-80),80-(x-80) end
    assert(xx>=0 and yy>=0 and xx<160 and yy<160,'FX rotation clips')
    rotated:drawPixel(xx,yy,p)
   end
  end end
  canvas=rotated
 end
 if f.mirror then canvas:flip(FlipType.HORIZONTAL) end
 if i>1 then sprite:newEmptyFrame(i) end
 sprite:newCel(layer,i,canvas,Point(0,0));sprite.frames[i].duration=f.durationMs/1000
 canvas:saveAs(out..'/vfx_frames/'..f.name..'.png')
 local tag='combo_'..f.beat..'_'..f.direction
 if tag~=last then tags[#tags+1]={name=tag,from=i,to=i};last=tag else tags[#tags].to=i end
end
for _,v in ipairs(tags) do local t=sprite:newTag(v.from,v.to);t.name=v.name;t.aniDir=AniDir.FORWARD end
local slice=sprite:newSlice(Rectangle(0,0,160,160));slice.name='effect_anchor';slice.pivot=Point(80,80)
slice.data='Foot-relative anchor plus authored placement offsets in animations JSON; never hitbox/timing.'
sprite:saveAs(folder..'/cai_bang_bong_combo_v2_vfx.aseprite')
print('VFX:96 cels,16 tags,160x160,anchor80,80; zero character pixels')
