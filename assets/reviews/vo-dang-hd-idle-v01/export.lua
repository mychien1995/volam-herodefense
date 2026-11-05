local dir = app.params.dir
local pixel = app.pixelColor

local function prepare(filename, cutoff, opaque)
  local image = Image{fromFile = dir .. "/" .. filename}
  local left, top, right, bottom = image.width, image.height, -1, -1
  for entry in image:pixels() do
    local color = entry()
    local alpha = pixel.rgbaA(color)
    if alpha < cutoff then
      entry(0)
    else
      if opaque then
        entry(pixel.rgba(pixel.rgbaR(color), pixel.rgbaG(color), pixel.rgbaB(color), 255))
      end
      left, top = math.min(left, entry.x), math.min(top, entry.y)
      right, bottom = math.max(right, entry.x), math.max(bottom, entry.y)
    end
  end
  return Image(image, Rectangle(left, top, right - left + 1, bottom - top + 1))
end

local function save(name, image, width, height, x, y, pivot)
  local sprite = Sprite(width, height, ColorMode.RGB)
  local layer = sprite.layers[1]
  layer.name = name
  sprite:newCel(layer, 1, image, Point(x, y))
  local tag = sprite:newTag(1, 1)
  tag.name = name
  local slice = sprite:newSlice(Rectangle(0, 0, width, height))
  slice.name = "origin"
  slice.pivot = pivot
  sprite:saveAs(dir .. "/" .. name .. ".aseprite")
  Image(sprite):saveAs(dir .. "/" .. name .. ".png")
  sprite:close()
end

local hero = prepare("imagegen-vo-dang.png", 128, true)
hero:resize(72, 88)
save("vo-dang-kiem-idle-down", hero, 192, 160, 54, 40, Point(96, 128))

local effect = prepare("imagegen-kiem-khi.png", 24, false)
effect:resize(144, math.floor(effect.height * 144 / effect.width + 0.5))
save("kiem-khi-right", effect, 160, 48, 8, math.floor((48 - effect.height) / 2), Point(8, 24))

