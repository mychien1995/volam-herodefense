local root=app.params.root;local src=root..'/assets/source/renovation-v4';local out=root..'/assets/exports/renovation-v4'
local function read(path)local f=assert(io.open(path,'r'));local r=json.decode(f:read('*a'));f:close();return r end
local function write(path,value)local f=assert(io.open(path,'w'));f:write(json.encode(value));f:close() end
local plan=read(src..'/export-plan.json');local pc=app.pixelColor
local function clean(im)
 for p in im:pixels() do if pc.rgbaA(p())<12 then p(0) end end
 return im
end
-- Left-facing cels are horizontal reflections, never a 180-degree upside-down fist.
-- Mirror the full logical canvas, preserving the directional pivot complement.
local cache={};local function old(id)
 if not cache[id] then cache[id]={image=Image{fromFile=root..'/assets/exports/renovation-v3/overrides/'..id..'.png'},meta=read(root..'/assets/exports/renovation-v3/overrides/'..id..'.json')} end
 return cache[id]
end
for _,a in ipairs(plan.sheets) do
 local original=old(a.id);local meta=original.meta;local items={};local area=0
 for name,f in pairs(meta.frames) do
  local pair=a.pairs[name];local source=pair and old(pair.id) or original;local r=pair and source.meta.frames[pair.name] or f
  local box=r.frame;local cut=Image(source.image,Rectangle(box.x*2,box.y*2,box.w*2,box.h*2))
  if pair then cut:flip();f.spriteSourceSize={x=r.sourceSize.w-r.spriteSourceSize.x-r.spriteSourceSize.w,y=r.spriteSourceSize.y,w=r.spriteSourceSize.w,h=r.spriteSourceSize.h} end
  items[#items+1]={name=name,image=cut,frame=f};area=area+(cut.width+4)*(cut.height+4)
 end
 table.sort(items,function(a,b)return a.name<b.name end)
 local width=math.min(4096,math.max(512,math.ceil(math.sqrt(area*1.3)/16)*16));local x,y,h=4,4,0
 for _,c in ipairs(items) do if x+c.image.width+4>width then x=4;y=y+h+4;h=0 end;c.x=x;c.y=y;x=x+c.image.width+4;h=math.max(h,c.image.height) end
 local sheet=Image(width,y+h+4)
 for _,c in ipairs(items) do sheet:drawImage(c.image,Point(c.x,c.y));c.frame.frame={x=c.x/2,y=c.y/2,w=c.image.width/2,h=c.image.height/2} end
 meta.meta.size={w=sheet.width/2,h=sheet.height/2};sheet:saveAs(out..'/overrides/'..a.id..'.png');write(out..'/overrides/'..a.id..'.json',meta)
end
for _,e in ipairs(plan.effects) do
 local input=Image{fromFile=src..'/raw/'..e.source..'.png'};local cw,ch=math.floor(input.width/2),math.floor(input.height/2)
 local sheet=Image(1024,256);local meta={frames={},meta={image=e.id..'.png',size={w=1024,h=256},scale='1'}};local sprite=Sprite(256,256,ColorMode.RGB)
 -- Fit every frame uniformly. A circular disc stays circular; no inherited legacy bbox stretch.
 local cuts={};local largest=0
 for i=0,3 do local cut=clean(Image(input,Rectangle((i%2)*cw,math.floor(i/2)*ch,cw,ch)));local b=cut:shrinkBounds();cut=Image(cut,b);cuts[i+1]=cut;largest=math.max(largest,cut.width,cut.height) end
 for i,cut in ipairs(cuts) do
  local scale=e.size/largest;cut:resize{width=math.max(1,math.floor(cut.width*scale+.5)),height=math.max(1,math.floor(cut.height*scale+.5)),method='bilinear'};clean(cut)
  local x=math.floor((256-cut.width)/2);local y=e.id=='earth_eruption' and 212-cut.height or math.floor((256-cut.height)/2)
  local canvas=Image(256,256);canvas:drawImage(cut,Point(x,y));sheet:drawImage(canvas,Point((i-1)*256,0))
  if i>1 then sprite:newEmptyFrame(i) end;sprite:newCel(sprite.layers[1],i,canvas,Point(0,0));sprite.frames[i].duration=.1
  meta.frames[tostring(i-1)]={frame={x=(i-1)*256,y=0,w=256,h=256},rotated=false,trimmed=false,spriteSourceSize={x=0,y=0,w=256,h=256},sourceSize={w=256,h=256},duration=100}
 end
 sprite:saveAs(src..'/editable/'..e.id..'.aseprite');sprite:close();sheet:saveAs(out..'/'..e.id..'.png');write(out..'/'..e.id..'.json',meta)
end
print('V4 EXPORT COMPLETE')
