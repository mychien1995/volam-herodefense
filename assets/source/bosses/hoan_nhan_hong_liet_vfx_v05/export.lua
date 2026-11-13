local root = app.params.root or "."
local input = root .. "/assets/source/bosses/hoan_nhan_hong_liet_vfx_v05/"
local output = root .. "/assets/exports/bosses/hoan_nhan_hong_liet_vfx_v05/"
local source = Image{fromFile=input .. "generated-components.png"}
assert(source.width == 1254 and source.height == 1254, "Unexpected source layout")

-- These source rectangles keep the neighboring bloom out of the eruption and flames.
local components = {
  {"cracks", 27, 30, 368, 342, 212, 207},
  {"crust", 447, 33, 351, 335, 621, 198},
  {"meteor", 835, 10, 392, 372, 1153, 322},
  {"burst", 22, 505, 381, 275, 207, 751},
  {"eruption", 440, 375, 369, 424, 618, 786},
  {"crescent", 899, 407, 341, 447, 945, 624},
  {"ember", 159, 987, 111, 115, 213, 1041},
  {"flame", 909, 924, 256, 235, 1030, 1131},
}
local size, columns = 288, 4
local sheet = Image(size * columns, size * 2)
local document = Sprite(size, size, ColorMode.RGB)
local metadata = {frames={}, meta={image="fire-effects.png", size={w=sheet.width,h=sheet.height}, scale="1"}}
local pixel = app.pixelColor

for index, item in ipairs(components) do
  local name, x, y, width, height, pivotX, pivotY = table.unpack(item)
  local image = Image(source, Rectangle(x, y, width, height))
  local scale = math.min(1, (size - 24) / math.max(width, height))
  image:resize{width=math.floor(width*scale+.5), height=math.floor(height*scale+.5), method="bilinear"}
  for entry in image:pixels() do
    if pixel.rgbaA(entry()) < 7 then entry(0) end
  end
  local left, top = math.floor((size-image.width)/2), math.floor((size-image.height)/2)
  local cel = Image(size, size)
  cel:drawImage(image, Point(left, top))
  if index > 1 then document:newEmptyFrame(index) end
  document:newCel(document.layers[1], index, cel, Point(0, 0))
  document:newTag(index, index).name = name
  local frameX, frameY = (index-1)%columns*size, math.floor((index-1)/columns)*size
  sheet:drawImage(cel, Point(frameX, frameY))
  metadata.frames[name] = {
    frame={x=frameX,y=frameY,w=size,h=size},
    rotated=false, trimmed=false,
    spriteSourceSize={x=0,y=0,w=size,h=size}, sourceSize={w=size,h=size},
    pivot={x=(left+(pivotX-x)*image.width/width)/size, y=(top+(pivotY-y)*image.height/height)/size},
  }
end

document:saveAs(input .. "fire-effects.aseprite")
sheet:saveAs(output .. "fire-effects.png")
local file = assert(io.open(output .. "fire-effects.json", "w"))
file:write(json.encode(metadata), "\n")
file:close()
