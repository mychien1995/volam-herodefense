local root=app.params.root or '.'
local src=root..'/assets/source/renovation-v3';local out=root..'/assets/exports/renovation-v3/overrides'
app.fs.makeDirectory(out);app.fs.makeDirectory(src..'/editable')
local f=assert(io.open(src..'/fx-plan.json','r'));local plan=json.decode(f:read('*a'));f:close()
local pc=app.pixelColor;local images={};local transformed={};local count=0
local function load(path)if not images[path] then images[path]=Image{fromFile=root..'/'..path} end;return images[path] end
local function clean(image,feather)
 for p in image:pixels() do local color=p();local a=pc.rgbaA(color)
  if feather then local edge=math.min(p.x,p.y,image.width-1-p.x,image.height-1-p.y);a=math.floor(a*math.min(1,edge/6)+.5) end
  if a<12 then p(0) elseif feather then p(pc.rgba(pc.rgbaR(color),pc.rgbaG(color),pc.rgbaB(color),a)) end
 end;return image
end
local function source(c)
 local key=c.source[1]..json.encode(c.source[2])..tostring(c.rotation)
 if not transformed[key] then
  local r=c.source[2];local image=clean(Image(load(c.source[1]),Rectangle(r[1],r[2],r[3],r[4])),true)
  local b=image:shrinkBounds();if b.isEmpty then b=Rectangle(0,0,2,2) end;image=Image(image,b)
  if c.rotation~=0 then
   local sprite=Sprite(image.width,image.height,ColorMode.RGB);sprite:newCel(sprite.layers[1],1,image,Point(0,0))
   app.command.Rotate{ui=false,target='default',angle=c.rotation}
   image=Image(sprite);sprite:close()
  end
  transformed[key]=image
 end
 return Image(transformed[key])
end
for _,a in ipairs(plan) do
 if not app.params.only or string.find(','..app.params.only..',',','..a.id..',',1,true) then
 local unique,keys,frames={},{},{}
 for _,c in ipairs(a.frames) do
  local signature=json.encode(c.size)..(c.source and (c.source[1]..json.encode(c.source[2])..tostring(c.rotation)..json.encode(c.box)) or json.encode(c.copy))
  local entry=keys[signature]
  if not entry then
   local canvas=Image(c.size[1]*2,c.size[2]*2)
   if c.source then local cut=source(c);local b=c.box;cut:resize{width=math.max(1,math.floor(b[3]+.5)),height=math.max(1,math.floor(b[4]+.5)),method='bilinear'};canvas:drawImage(clean(cut,false),Point(math.floor(b[1]+.5),math.floor(b[2]+.5)))
   else local cp=c.copy;local r=cp.rect;local cut=Image(load(cp.path),Rectangle(r[1],r[2],r[3],r[4]));if cp.density~=2 then cut:resize{width=math.floor(cut.width*2/cp.density+.5),height=math.floor(cut.height*2/cp.density+.5),method='bilinear'} end;canvas:drawImage(cut,Point(cp.target[1],cp.target[2])) end
   local b=canvas:shrinkBounds();if b.isEmpty then b=Rectangle(0,0,2,2) end
   entry={image=Image(canvas,b),trim={x=b.x/2,y=b.y/2,w=b.width/2,h=b.height/2},size={w=c.size[1],h=c.size[2]}};keys[signature]=entry;unique[#unique+1]=entry
  end
  frames[c.name]={entry=entry,duration=c.duration}
 end
 local area,widest=0,0;for _,c in ipairs(unique) do area=area+(c.image.width+4)*(c.image.height+4);widest=math.max(widest,c.image.width+8) end
 local width=math.max(widest,math.min(2048,math.ceil(math.sqrt(area*1.2)/16)*16));assert(width<=4096,'V3 FX cell too wide '..a.id)
 local x,y,rh,usedWidth=4,4,0,0
 for _,c in ipairs(unique) do if x+c.image.width+4>width then x=4;y=y+rh+4;rh=0 end;c.x=x;c.y=y;x=x+c.image.width+4;usedWidth=math.max(usedWidth,x);rh=math.max(rh,c.image.height) end
 local sheet=Image(usedWidth,y+rh+4);assert(sheet.height<=16384,'V3 FX texture limit '..a.id..' '..sheet.height)
 local meta={frames={},meta={image=a.id..'.png',size={w=sheet.width/2,h=sheet.height/2},scale='1'}}
 for name,f in pairs(frames) do local c=f.entry;meta.frames[name]={frame={x=c.x/2,y=c.y/2,w=c.image.width/2,h=c.image.height/2},rotated=false,trimmed=true,spriteSourceSize=c.trim,sourceSize=c.size};if f.duration then meta.frames[name].duration=f.duration end end
 for _,c in ipairs(unique) do sheet:drawImage(c.image,Point(c.x,c.y)) end
 sheet:saveAs(out..'/'..a.id..'.png');local f=assert(io.open(out..'/'..a.id..'.json','w'));f:write(json.encode(meta));f:close();count=count+1;print(a.id..' '..#unique..' raster cels')
 end
end
if not app.params.only or app.params.editables then
 local jobs={};for _,file in ipairs({'generation-jobs.json','extra-jobs.json'}) do local f=assert(io.open(src..'/'..file,'r'));for _,j in ipairs(json.decode(f:read('*a')).jobs) do if j.kind~='body' then jobs[#jobs+1]=j end end;f:close() end
 jobs[#jobs+1]={id='chiet_mai_clean',grid={2,2},path='assets/source/renovation-v3/chiet_mai_clean.png'}
 for _,j in ipairs(jobs) do local im=load(j.path or ('assets/source/renovation-v3/raw/'..j.id..'.png'));local gx,gy=j.grid[1],j.grid[2];local cw,ch=math.floor(im.width/gx),math.floor(im.height/gy);local sprite=Sprite(cw,ch,ColorMode.RGB)
  for row=0,gy-1 do for col=0,gx-1 do local n=row*gx+col+1;if n>1 then sprite:newEmptyFrame(n) end;local cel=clean(Image(im,Rectangle(col*cw,row*ch,cw,ch)),true);sprite:newCel(sprite.layers[1],n,cel,Point(0,0));sprite.frames[n].duration=.11 end end
  for row=0,gy-1 do if gx==4 then local tag=sprite:newTag(row*gx+1,row*gx+gx);tag.name='effect_'..row else local tag=sprite:newTag(1,gx*gy);tag.name='effect';break end end
  sprite:saveAs(src..'/editable/'..j.id..'.aseprite');sprite:close()
 end
end
print('V3 exported FX '..count)
