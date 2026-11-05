local root=app.params.root or '.'
local src=root..'/assets/source/renovation-v2'
local out=root..'/assets/exports/renovation-v2'
local f=assert(io.open(src..'/body-layout.json','r'));local plan=json.decode(f:read('*a'));f:close()
local pc=app.pixelColor
for name,definition in pairs(plan) do
  local raw=nil
  if name~='vo_dang_attack' then raw=Image{fromFile=src..'/raw/'..name..'.png'} end
  local sheet=Image(320*4,256*4);local sprite=Sprite(320,256,ColorMode.RGB)
  local meta={frames={},meta={image=name..'.png',size={w=1280,h=1024},scale='1'}}
  for i,c in ipairs(definition.cels) do
    local b,s=c.bounds,c.cell
    if c.raw then raw=Image{fromFile=root..'/'..c.raw} end
    local crop=Image(raw,Rectangle(s[1]+b[1]-2,s[2]+b[2]-2,b[3]-b[1]+4,b[4]-b[2]+4))
    for p in crop:pixels() do if pc.rgbaA(p())<12 then p(0) end end
    crop:resize{width=math.floor(crop.width*definition.scale+0.5),height=math.floor(crop.height*definition.scale+0.5),method='bilinear'}
    local foot=(c.feet[1]-b[1]+2)*definition.scale
    if c.mirror then crop:flip();foot=crop.width-foot end
    local x=math.floor(160-foot+0.5)
    local y=math.floor(224-(c.feet[2]-b[2]+2)*definition.scale+0.5)
    local cel=Image(320,256);cel:drawImage(crop,Point(x,y))
    if i>1 then sprite:newEmptyFrame(i) end
    sprite:newCel(sprite.layers[1],i,cel,Point(0,0));sprite.frames[i].duration=0.11
    local tag=sprite:newTag(i,i);tag.name=c.direction..'_'..string.format('%d',c.index)
    local sx,sy=c.index*320,math.floor((i-1)/4)*256
    sheet:drawImage(cel,Point(sx,sy))
    meta.frames[tag.name]={frame={x=sx,y=sy,w=320,h=256},rotated=false,trimmed=false,spriteSourceSize={x=0,y=0,w=320,h=256},sourceSize={w=320,h=256},duration=110}
    if i==1 then cel:saveAs(out..'/'..name..'-native.png') end
  end
  sheet:saveAs(out..'/'..name..'.png');sprite:saveAs(src..'/'..name..'.aseprite');sprite:close()
  local f=assert(io.open(out..'/'..name..'.json','w'));f:write(json.encode(meta));f:close()
end
print('V2 bodies exported')
