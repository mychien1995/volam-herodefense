local root=app.params.root or '.'
local src=root..'/assets/source/renovation-v3';local out=root..'/assets/exports/renovation-v3/actors'
app.fs.makeDirectory(out);app.fs.makeDirectory(src..'/editable')
local f=assert(io.open(src..'/body-layout.json','r'));local plan=json.decode(f:read('*a'));f:close()
local pc=app.pixelColor;local count=0
for id,d in pairs(plan) do
 if not app.params.only or string.find(','..app.params.only..',',','..id..',',1,true) then
 local raw=Image{fromFile=src..'/raw/'..id..'.png'};local sprite=Sprite(400,400,ColorMode.RGB);local cuts={}
 for i,c in ipairs(d.cels) do
  local b,s=c.bounds,c.cell;local bounds=Rectangle(math.max(s[1],s[1]+b[1]-3),math.max(s[2],s[2]+b[2]-3),b[3]-b[1]+6,b[4]-b[2]+6)
  bounds.width=math.min(bounds.width,s[1]+s[3]-bounds.x);bounds.height=math.min(bounds.height,s[2]+s[4]-bounds.y)
  local cut=Image(raw,bounds)
  for p in cut:pixels() do if pc.rgbaA(p())<8 then p(0) end end
  cut:resize{width=math.floor(cut.width*d.scale+.5),height=math.floor(cut.height*d.scale+.5),method='bilinear'}
  local cel=Image(400,400);cel:drawImage(cut,Point(math.floor(200-(c.feet[1]+s[1]-bounds.x)*d.scale+.5),math.floor(320-(c.feet[2]+s[2]-bounds.y)*d.scale+.5)))
  if i>1 then sprite:newEmptyFrame(i) end
  sprite:newCel(sprite.layers[1],i,cel,Point(0,0));sprite.frames[i].duration=.11
  local tag=sprite:newTag(i,i);tag.name=c.direction..'_'..string.format('%d',c.index)
  local r=cel:shrinkBounds();assert(r.x>0 and r.y>0 and r.x+r.width<400 and r.y+r.height<400,'V3 body clipped '..id..' '..tag.name)
  cuts[#cuts+1]={name=tag.name,image=Image(cel,r),trim={x=r.x,y=r.y,w=r.width,h=r.height}}
 end
 local x,y,rh=4,4,0
 for _,c in ipairs(cuts) do if x+c.image.width+4>768 then x=4;y=y+rh+4;rh=0 end;c.x=x;c.y=y;x=x+c.image.width+4;rh=math.max(rh,c.image.height) end
 local sheet=Image(768,y+rh+4);local meta={frames={},meta={image=id..'.png',size={w=sheet.width,h=sheet.height},scale='1'}}
 for _,c in ipairs(cuts) do sheet:drawImage(c.image,Point(c.x,c.y));meta.frames[c.name]={frame={x=c.x,y=c.y,w=c.image.width,h=c.image.height},rotated=false,trimmed=true,spriteSourceSize=c.trim,sourceSize={w=400,h=400},duration=110} end
 sheet:saveAs(out..'/'..id..'.png');sprite:saveAs(src..'/editable/'..id..'.aseprite');sprite:close()
 local f=assert(io.open(out..'/'..id..'.json','w'));f:write(json.encode(meta));f:close();count=count+1
 end
end
print('V3 exported bodies '..count)
