local root=app.params.root or '.'
local src=root..'/assets/source/renovation-v2';local dest=root..'/assets/exports/renovation-v2'
app.fs.makeDirectory(dest..'/overrides');app.fs.makeDirectory(src..'/effects')
local file=assert(io.open(src..'/override-plan.json','r'));local plan=json.decode(file:read('*a'));file:close()
local pc=app.pixelColor;local cache={}
local function load(path) if not cache[path] then cache[path]=Image{fromFile=root..'/'..path} end return cache[path] end
local function clean(image,cutoff)
  for p in image:pixels() do if pc.rgbaA(p())<cutoff then p(0) end end;return image
end
local function rotate(image,angle)
  if angle==0 then return image end
  local radians=angle*math.pi/180;local c,s=math.cos(radians),math.sin(radians)
  local size=math.ceil(math.sqrt(image.width^2+image.height^2))+4;local result=Image(size,size)
  for y=0,size-1 do for x=0,size-1 do
    local dx,dy=x-size/2,y-size/2
    local sx,sy=math.floor(c*dx+s*dy+image.width/2+.5),math.floor(-s*dx+c*dy+image.height/2+.5)
    if sx>=0 and sy>=0 and sx<image.width and sy<image.height then result:drawPixel(x,y,image:getPixel(sx,sy)) end
  end end
  return result
end
for _,asset in ipairs(plan) do
  if not app.params.only or string.find(','..app.params.only..',',','..asset.id..',',1,true) then
  local old=load(asset.input);local unique={};local keys={};local frames={}
  for _,cel in ipairs(asset.frames) do
    local key=cel.source and (cel.source[1]..json.encode(cel.source[2])..tostring(cel.rotation)..(cel.box and json.encode(cel.box) or '')..(cel.target and json.encode(cel.target) or '')) or json.encode(cel.old)
    local entry=keys[key]
    if not entry then
      local canvas=Image(cel.size[1]*2,cel.size[2]*2)
      if cel.source then
        local r=cel.source[2];local cut=clean(Image(load(cel.source[1]),Rectangle(r[1],r[2],r[3],r[4])),12)
        if cel.kind=='character' then
          canvas:drawImage(cut,Point(cel.target[1]-cel.pivot[1],cel.target[2]-cel.pivot[2]))
        else
          local bound=cut:shrinkBounds();cut=Image(cut,bound);cut=rotate(cut,cel.rotation)
          bound=cut:shrinkBounds();cut=Image(cut,bound)
          local b=cel.box
          cut:resize{width=math.max(1,math.floor(b[3]+.5)),height=math.max(1,math.floor(b[4]+.5)),method='bilinear'}
          canvas:drawImage(clean(cut,4),Point(math.floor(b[1]+.5),math.floor(b[2]+.5)))
        end
      else
        local r=cel.old;local cut=Image(old,Rectangle(r[1],r[2],r[3],r[4]))
        cut:resize{width=cut.width*2,height=cut.height*2,method='bilinear'}
        canvas:drawImage(cut,Point(0,0))
      end
      local b=canvas:shrinkBounds()
      if b.isEmpty then b=Rectangle(0,0,2,2) end
      local cut=Image(canvas,b)
      entry={image=cut,trim={x=b.x/2,y=b.y/2,w=b.width/2,h=b.height/2},size={w=cel.size[1],h=cel.size[2]}}
      unique[#unique+1]=entry;keys[key]=entry
    end
    frames[cel.name]=entry
  end
  local x,y,rowHeight=4,4,0
  for _,entry in ipairs(unique) do
    if x+entry.image.width+4>2048 then x=4;y=y+rowHeight+4;rowHeight=0 end
    entry.x=x;entry.y=y;x=x+entry.image.width+4;rowHeight=math.max(rowHeight,entry.image.height)
  end
  local sheet=Image(2048,y+rowHeight+4);assert(sheet.height<=16384,'Atlas too tall '..asset.id)
  local metadata={frames={},meta={image=asset.id..'.png',size={w=sheet.width/2,h=sheet.height/2},scale='1'}}
  for name,entry in pairs(frames) do
    metadata.frames[name]={frame={x=entry.x/2,y=entry.y/2,w=entry.image.width/2,h=entry.image.height/2},rotated=false,trimmed=true,spriteSourceSize=entry.trim,sourceSize=entry.size}
  end
  for _,entry in ipairs(unique) do sheet:drawImage(entry.image,Point(entry.x,entry.y)) end
  sheet:saveAs(dest..'/overrides/'..asset.id..'.png')
  local f=assert(io.open(dest..'/overrides/'..asset.id..'.json','w'));f:write(json.encode(metadata));f:close()
  print(asset.id..' '..#unique..' native cels')
  end
end
if not app.params.only then
for _,id in ipairs({'that_tinh_kiem','nhan_kiem_hop_nhat','bat_quai_kiem_tran','toa_sat_bac_do','van_kiem_quy_tong','lien_hoa_phien','luc_duong_chuong','luu_phong_bo','chiet_mai_thu','bach_phien_phong_bao','fan_projectile'}) do
  local image=load('assets/source/renovation-v2/raw/'..id..'.png');local cw,ch=math.floor(image.width/2),math.floor(image.height/2)
  local sprite=Sprite(cw,ch,ColorMode.RGB)
  for i=0,3 do if i>0 then sprite:newEmptyFrame(i+1) end
    sprite:newCel(sprite.layers[1],i+1,Image(image,Rectangle((i%2)*cw,math.floor(i/2)*ch,cw,ch)),Point(0,0));sprite.frames[i+1].duration=.11
    local tag=sprite:newTag(i+1,i+1);tag.name='phase_'..i
  end
  sprite:saveAs(src..'/effects/'..id..'.aseprite');sprite:close()
end
end
print('V2 overrides exported')
