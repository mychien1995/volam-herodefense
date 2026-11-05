local root = app.params.root or "."
local src = root .. "/assets/source/visual-upgrade-2"
local out = root .. "/assets/exports/visual-upgrade-2"
local pc = app.pixelColor
local function read(path)
  local file = assert(io.open(path, "r"))
  local value = json.decode(file:read("*a"))
  file:close()
  return value
end
local function write(path, value)
  local file = assert(io.open(path, "w"))
  file:write(json.encode(value))
  file:close()
end
local function clean(image, cutoff)
  for entry in image:pixels() do
    if pc.rgbaA(entry()) < cutoff then entry(0) end
  end
  return image
end
local function scale(image, factor)
  image:resize{width=math.max(1, math.floor(image.width*factor+0.5)),
    height=math.max(1, math.floor(image.height*factor+0.5)), method="bilinear"}
  return clean(image, 4)
end
local function saveAtlas(id, width, height, frames)
  local sprite = Sprite(width, height, ColorMode.RGB)
  local sheet = Image(width * #frames, height)
  local metadata = {frames={}, meta={image=id..".png",size={w=width*#frames,h=height},scale="1"}}
  for index, frame in ipairs(frames) do
    if index > 1 then sprite:newEmptyFrame(index) end
    sprite:newCel(sprite.layers[1], index, frame.image, Point(0, 0))
    sprite.frames[index].duration = frame.duration / 1000
    local tag = sprite:newTag(index, index); tag.name = frame.name
    sheet:drawImage(frame.image, Point((index-1)*width, 0))
    metadata.frames[frame.name] = {
      frame={x=(index-1)*width,y=0,w=width,h=height}, rotated=false,trimmed=false,
      spriteSourceSize={x=0,y=0,w=width,h=height},sourceSize={w=width,h=height},
      duration=frame.duration}
  end
  sprite:saveAs(src.."/"..id..".aseprite")
  sheet:saveAs(out.."/"..id..".png")
  write(out.."/"..id..".json", metadata)
  sprite:close()
end
local layout = read(src .. "/layout.json")
local heroes = {}
for _, direction in ipairs({"down","up","left","right"}) do
  local original = Image{fromFile=src.."/raw/"..direction..".png"}
  local spec = layout.directions[direction]
  for frameIndex, selected in ipairs(spec.selected) do
    local frame = spec.frames[selected+1]
    local box, cell = frame.bounds, frame.cell
    local crop = clean(Image(original, Rectangle(cell[1]+box[1],cell[2]+box[2],
      box[3]-box[1],box[4]-box[2])), 12)
    crop = scale(crop, spec.scale)
    local footX = (frame.feet[1]-box[1])*spec.scale
    if direction == "up" then
      crop:flip()
      footX = crop.width-footX
    end
    local x = math.floor(96-footX+0.5)
    local y = math.floor(128-(frame.feet[2]-box[2])*spec.scale+0.5)
    assert(x>=2 and y>=2 and x+crop.width<190 and y+crop.height<158, "Hero clipped")
    local canvas = Image(192,160)
    canvas:drawImage(crop,Point(x,y))
    local name = frameIndex==1 and "idle" or frameIndex==6 and "cast" or "walk"
    local suffix = frameIndex==1 and 0 or frameIndex==6 and 0 or frameIndex-2
    heroes[#heroes+1] = {name=name.."_"..direction.."_"..suffix,image=canvas,
      duration=name=="walk" and 110 or 160}
    if frameIndex==1 then canvas:saveAs(out.."/hero-idle-"..direction..".png") end
  end
end
saveAtlas("hero",192,160,heroes)

local original = Image{fromFile=src.."/raw/props.png"}
local props = {"statue","tree-jade","tree-blossom","banner","bamboo","merchant","portal","lantern"}
local heights = {240,320,320,230,250,220,230,220}
for index, name in ipairs(props) do
  local x = math.floor(((index-1)%4)*original.width/4)
  local y = math.floor(math.floor((index-1)/4)*original.height/2)
  local width = math.floor(((index-1)%4+1)*original.width/4)-x
  local height = math.floor((math.floor((index-1)/4)+1)*original.height/2)-y
  local image = clean(Image(original,Rectangle(x,y,width,height)),24)
  local bounds = image:shrinkBounds()
  image = Image(image,bounds)
  image = scale(image, heights[index]/image.height)
  local canvas = Image(384,384)
  assert(image.width<=380 and image.height<=380,"Prop too large")
  canvas:drawImage(image,Point(math.floor((384-image.width)/2),368-image.height))
  local sprite=Sprite(384,384)
  sprite:newCel(sprite.layers[1],1,canvas,Point(0,0))
  sprite:saveAs(src.."/"..name..".aseprite")
  canvas:saveAs(out.."/"..name..".png")
  sprite:close()
end
for _, id in ipairs({"that_tinh_kiem","nhan_kiem_hop_nhat","bat_quai_kiem_tran","toa_sat_bac_do","van_kiem_quy_tong"}) do
  local image = Image{fromFile=src.."/raw/"..id..".png"}
  local columns = id=="that_tinh_kiem" and 4 or 2
  local frames = {}
  for index=0,columns*2-1 do
    local x,y=math.floor(index%columns*image.width/columns),math.floor(math.floor(index/columns)*image.height/2)
    local width=math.floor((index%columns+1)*image.width/columns)-x
    local height=math.floor((math.floor(index/columns)+1)*image.height/2)-y
    local cel=clean(Image(image,Rectangle(x,y,width,height)),16)
    cel=scale(cel,math.min(304/width,224/height))
    local canvas=Image(320,240)
    canvas:drawImage(cel,Point(math.floor((320-cel.width)/2),math.floor((240-cel.height)/2)))
    frames[#frames+1]={name="phase_"..index,image=canvas,duration=100}
  end
  saveAtlas(id,320,240,frames)
end
local ground = Image{fromFile=src.."/raw/ground.png"}
ground:saveAs(out.."/ground.png")
local groundSource=Sprite(ground.width,ground.height)
groundSource:newCel(groundSource.layers[1],1,ground,Point(0,0))
groundSource:saveAs(src.."/ground.aseprite")
groundSource:close()
print("Exported 24 hero cels, 24 effect cels and 9 authored environment components")

