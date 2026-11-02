-- Art-only assembly: copy newly authored or retained raster pixels into isolated editable sources.
local root=assert(app.params.root);local batch=assert(app.params.batch)
local folder=root..'/assets/m3d-feedback-review-r3/source'
local function read(p)local f=assert(io.open(p,'r'));local v=json.decode(f:read('*a'));f:close();return v end
local plan=read(folder..'/assembly_plan.json');local pc=app.pixelColor;local images={}
local paletteCache={}
for _,component in ipairs(plan.components) do
 if not app.params.role or component.role==app.params.role then
 paletteCache={}
 local w,h=component.canvas[1],component.canvas[2];local sprite=Sprite(w,h,ColorMode.RGB)
 local layer=sprite.layers[1];layer.name=component.role..' - editable raster cels'
 local tags={};local last=nil
 for i,f in ipairs(component.frames) do
  if not images[f.source] then images[f.source]=Image{fromFile=root..'/'..f.source} end
  local src=images[f.source];local crop=Image(f.rect[3],f.rect[4],ColorMode.RGB)
  if f.runs then
   for _,run in ipairs(f.runs) do for x=run[2],run[3]-1 do local p=src:getPixel(x,run[1]);crop:drawPixel(x-f.rect[1],run[1]-f.rect[2],pc.rgba(pc.rgbaR(p),pc.rgbaG(p),pc.rgbaB(p),255)) end end
  else
   for y=0,crop.height-1 do for x=0,crop.width-1 do local p=src:getPixel(f.rect[1]+x,f.rect[2]+y);local a=pc.rgbaA(p)
    if a>0 and a>=f.threshold then crop:drawPixel(x,y,pc.rgba(pc.rgbaR(p),pc.rgbaG(p),pc.rgbaB(p),f.threshold>0 and 255 or a)) end
   end end
  end
  local sy=f.scaleY or 1
  if f.scale~=1 or sy~=1 then crop:resize(math.floor(crop.width*f.scale+0.5),math.floor(crop.height*f.scale*sy+0.5)) end
  if f.kind=='character' and (component.palette or plan.newCharacterPalette) and #(component.palette or plan.newCharacterPalette)>0 then
   for y=0,crop.height-1 do for x=0,crop.width-1 do local p=crop:getPixel(x,y);if pc.rgbaA(p)>0 then
    local r,g,b=pc.rgbaR(p),pc.rgbaG(p),pc.rgbaB(p);local key=r*65536+g*256+b;local mapped=paletteCache[key]
    if not mapped then local best=1e20;for _,c in ipairs(component.palette or plan.newCharacterPalette) do
     local dist=(r-c[1])^2+2*(g-c[2])^2+(b-c[3])^2;if dist<best then best=dist;mapped=pc.rgba(c[1],c[2],c[3],255) end
    end;paletteCache[key]=mapped end
    crop:drawPixel(x,y,mapped)
   end end end
  end
  local canvas=Image(w,h,ColorMode.RGB)
  local ox=f.pivot[1]-math.floor(f.anchor[1]*f.scale+0.5);local oy=f.pivot[2]-math.floor(f.anchor[2]*f.scale*sy+0.5)
  canvas:drawImage(crop,Point(ox,oy))
  if f.rotation and f.rotation~=0 then
   local rotated=Image(w,h,ColorMode.RGB);local rad=f.rotation*math.pi/180;local cs,sn=math.cos(rad),math.sin(rad)
   for y=0,h-1 do for x=0,w-1 do
    local dx,dy=x-f.pivot[1],y-f.pivot[2]
    -- Rotate ground directions in the unprojected plane, then restore the fixed camera ellipse.
    local xx=math.floor(f.pivot[1]+dx*cs+(dy/sy)*sn+0.5);local yy=math.floor(f.pivot[2]+(-dx*sn+(dy/sy)*cs)*sy+0.5)
    if xx>=0 and yy>=0 and xx<w and yy<h then local p=canvas:getPixel(xx,yy);if pc.rgbaA(p)>0 then rotated:drawPixel(x,y,p) end end
   end end
   canvas=rotated
  end
  if f.mirror then canvas:flip(FlipType.HORIZONTAL);local shifted=Image(w,h,ColorMode.RGB);shifted:drawImage(canvas,Point(1,0));canvas=shifted end
  if f.opacity then
   for y=0,h-1 do for x=0,w-1 do local p=canvas:getPixel(x,y);if pc.rgbaA(p)>0 then
    local r,g,b=pc.rgbaR(p),pc.rgbaG(p),pc.rgbaB(p)
    local lum=math.floor((r+g+b)/3);canvas:drawPixel(x,y,pc.rgba(math.floor(lum*.65),math.min(255,lum+25),math.min(255,lum+45),math.floor(pc.rgbaA(p)*f.opacity+.5)))
   end end end
  end
  if i>1 then sprite:newEmptyFrame(i) end
  sprite:newCel(layer,i,canvas,Point(0,0));sprite.frames[i].duration=f.durationMs/1000
  canvas:saveAs(root..'/'..component.individualDirectory..'/'..f.name..'.png')
  if f.tag~=last then tags[#tags+1]={name=f.tag,from=i,to=i};last=f.tag else tags[#tags].to=i end
 end
 for _,t in ipairs(tags) do local tag=sprite:newTag(t.from,t.to);tag.name=t.name;tag.aniDir=AniDir.FORWARD end
 local slice=sprite:newSlice(Rectangle(0,0,w,h));slice.name=component.role=='character' and 'feet' or 'effect_anchor';slice.pivot=Point(component.pivot[1],component.pivot[2])
 slice.data='Presentation only. Origin and offsets from metadata; never a hitbox or damage clock.'
 sprite:saveAs(root..'/'..component.sourceFile)
 print(component.id..': '..#component.frames..' cels '..#tags..' tags')
 sprite:close()
 end
end
