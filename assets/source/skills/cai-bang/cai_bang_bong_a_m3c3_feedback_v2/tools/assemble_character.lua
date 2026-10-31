-- Assemble newly drawn original v2 poses only; never reads concept pixels.
-- Editable character cels and weapon art share one raster layer; VFX is a separate source/atlas.
local root=assert(app.params.root,'root required')
local folder=root..'/assets/source/skills/cai-bang/cai_bang_bong_a_m3c3_feedback_v2'
local out=root..'/assets/exports/skills/cai-bang/cai_bang_bong_a_m3c3_feedback_v2'
local function read(p) local f=assert(io.open(p,'r'));local j=json.decode(f:read('*a'));f:close();return j end
local sources=read(folder..'/source_components.json')
local layout=read(folder..'/frame_layout.json')
local palette=read(folder..'/palette_mapping.json').mapping
local images={};for key,value in pairs(sources) do images[key]=Image{fromFile=folder..'/'..value.source} end
local sprite=Sprite(112,100,ColorMode.RGB)
local layer=sprite.layers[1];layer.name='Character + wooden staff - editable raster cels'
local pc=app.pixelColor;local tags={};local lastTag=nil
for i,f in ipairs(layout.frames) do
 local e=sources[f.source].frames[f.component+1];local b=e.bounds
 local crop=Image(b[3]-b[1],b[4]-b[2],ColorMode.RGB)
 for _,run in ipairs(e.runs) do for x=run[2],run[3]-1 do
  local p=images[f.source]:getPixel(x,run[1])
  local r,g,bb=pc.rgbaR(p),pc.rgbaG(p),pc.rgbaB(p)
  local mapped=palette[tostring(r+g*256+bb*65536)]
  if mapped then r,g,bb=mapped[1],mapped[2],mapped[3] end
  crop:drawPixel(x-b[1],run[1]-b[2],pc.rgba(r,g,bb,255))
 end end
 local w=math.floor(crop.width*f.scale+0.5);local h=math.floor(crop.height*f.scale+0.5)
 crop:resize(w,h)
 local fx=math.floor((f.sourceFoot[1]-b[1])*f.scale+0.5)
 local fy=math.floor((f.sourceFoot[2]-b[2])*f.scale+0.5)
 local ox,oy=56-fx,80-fy
 assert(ox>=1 and oy>=1 and ox+w<=111 and oy+h<=99,'Clipped '..f.name..' '..ox..','..oy..' '..w..','..h)
 local canvas=Image(112,100,ColorMode.RGB);canvas:drawImage(crop,Point(ox,oy))
 if f.mirror then canvas:flip(FlipType.HORIZONTAL) end
 if i>1 then sprite:newEmptyFrame(i) end
 sprite:newCel(layer,i,canvas,Point(0,0));sprite.frames[i].duration=f.durationMs/1000
 canvas:saveAs(out..'/character_frames/'..f.name..'.png')
 local tag='combo_'..f.beat..'_'..f.direction
 if tag~=lastTag then tags[#tags+1]={name=tag,from=i,to=i};lastTag=tag else tags[#tags].to=i end
end
for _,t in ipairs(tags) do local tag=sprite:newTag(t.from,t.to);tag.name=t.name;tag.aniDir=AniDir.FORWARD end
local slice=sprite:newSlice(Rectangle(0,0,112,100));slice.name='feet';slice.pivot=Point(56,80)
slice.data='origin(0.5,0.8), displayScale1; larger padding only; timing is visual, never damage.'
sprite:saveAs(folder..'/cai_bang_bong_combo_v2_character.aseprite')
print('CHARACTER:96 cels,16 tags,112x100,feet56,80')
