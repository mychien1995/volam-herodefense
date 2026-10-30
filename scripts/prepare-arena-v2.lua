-- Production preparation from separate original raster components, not a HUD screenshot.
local root=app.params.root or '.'
local source=root..'/assets/source/'
local export=root..'/assets/exports/'
local pc=app.pixelColor
local function layer(sprite,name,image,point)
  local l=sprite:newLayer();l.name=name;sprite:newCel(l,1,image,point or Point(0,0));return l
end
for _,id in ipairs({'forest','desert','sea','hell'}) do
  local original=Image{fromFile=source..'dungeon_cards/generated_'..id..'.png'}
  -- Exactly half the source resolution; all cards share one logical pixel density.
  original:resize(512,768)
  local sprite=Sprite(512,768,ColorMode.RGB)
  sprite.layers[1].name='Distant atmosphere and upper landscape'
  for i,region in ipairs({{0,224,'Distant atmosphere and upper landscape'},{224,544,'Architecture, water and middle landscape'},{544,768,'Foreground path, banks and framing'}}) do
    local image=Image(512,768,ColorMode.RGB)
    image:drawImage(Image(original,Rectangle(0,region[1],512,region[2]-region[1])),Point(0,region[1]))
    if i==1 then sprite:newCel(sprite.layers[1],1,image) else layer(sprite,region[3],image) end
  end
  local tag=sprite:newTag(1,1);tag.name=id
  sprite:saveAs(source..'dungeon_cards/'..id..'.aseprite');sprite:close()
end
local generated=Image{fromFile=source..'arena_v2/generated_ground.png'}
-- Uniform native preparation of NEW artwork; the existing arena/characters/camera
-- are never scaled. This puts the generated ~800px court at a measured ~600px.
generated:resize(1108,798)
local ground=Sprite(1600,1152,ColorMode.RGB)
ground.layers[1].name='Reconstructed meadow outside the production plate'
local meadow=Image(1600,1152,ColorMode.RGB)
local samples={Image(generated,Rectangle(16,16,128,128)),Image(generated,Rectangle(950,16,128,128)),Image(generated,Rectangle(16,650,128,128)),Image(generated,Rectangle(950,650,128,128))}
for y=0,1151,128 do for x=0,1599,128 do meadow:drawImage(samples[(math.floor(x/128)+math.floor(y/128)*3)%4+1],Point(x,y)) end end
ground:newCel(ground.layers[1],1,meadow)
local plate=Image(1600,1152,ColorMode.RGB)
for y=0,797 do for x=0,1107 do
  local edge=math.min(x,y,1107-x,797-y)
  if edge>=32 or ((x*37+y*61)%101)/100<edge/32 then plate:drawPixel(x+246,y+247,generated:getPixel(x,y)) end
end end
layer(ground,'Original detailed meadow plate with reconstructed edge transition',plate)
local masonry=Image{fromFile=source..'arena_v2/generated_masonry.png'}
local tiles={}
local tileSource=Sprite(32,32,ColorMode.RGB);tileSource.layers[1].name='Four authored sandstone slab variations'
for i=1,4 do
  local tile=Image(masonry,Rectangle(96+(i-1)*54,453,54,54));tile:resize(32,32);tiles[i]=tile
  if i>1 then tileSource:newEmptyFrame(i) end
  tileSource:newCel(tileSource.layers[1],i,tile)
  local tag=tileSource:newTag(i,i);tag.name='paving_'..i
end
for i,t in ipairs(tileSource.tags) do t.fromFrame=tileSource.frames[i];t.toFrame=tileSource.frames[i] end
tileSource:saveAs(source..'arena_v2/paving.aseprite');tileSource:close()
local roads=Image(1600,1152,ColorMode.RGB)
for y=536,695,32 do for x=0,1599,32 do roads:drawImage(tiles[(math.floor(x/32)+math.floor(y/32)*3)%4+1],Point(x,y)) end end
for x=720,879,32 do for y=0,1151,32 do roads:drawImage(tiles[(math.floor(x/32)+math.floor(y/32)*3)%4+1],Point(x,y)) end end
layer(ground,'160px approaches assembled from native 32px authored slab tiles',roads)
local court=Image(1600,1152,ColorMode.RGB)
for y=340,892 do for x=496,1104 do
  if ((x-800)/300)^2+((y-616)/270)^2<=1.025 then
    court:drawPixel(x,y,generated:getPixel(x-246,y-247))
  end
end end
layer(ground,'600x540 curved paving, carved details and natural verge',court)
ground:saveAs(source..'arena_v2/ground.aseprite');ground:close()
print('Prepared layered arena ground, reusable paving and four separate layered card sources')
