local root = app.params.root or "."
local id = app.params.id or "cai_bang_palm_v1"
local source = root .. "/assets/source/effects/" .. id
local layoutFile = app.params.layout or "cai-bang-palm-layout.json"
local file = assert(io.open(root .. "/apps/game-client/src/" .. layoutFile, "r"))
local layout = json.decode(file:read("*a"))
file:close()

-- The visible beak, bolt tip and contact flash register to the same pivot.
-- Points are relative to each 512px source cell. The tail and wings are free to move.
local registration = layout.registration or {
  bolt_flight = {divisor=9, x={451,452,453,451,452,453}, y=249},
  phoenix_flight = {divisor=7, x={476,476,476,476,476,476}, y=230},
  bolt_hit = {divisor=9, x={394,362,362,362,362,362}, y=255},
  phoenix_hit = {divisor=6, x={430,359,359,359,359,359}, y=244},
}

local sprite = Sprite(layout.width, layout.height, ColorMode.RGB)
sprite.layers[1].name = "Fire"
local accentLayer
local pc = app.pixelColor
local index = 1
for _, clip in ipairs(layout.clips) do
  local spec = registration[clip.name]
  local inputPath = spec.input and (root .. "/" .. spec.input) or (source .. "/raw/" .. clip.name .. ".png")
  local input = Image{fromFile=inputPath}
  local width, height = input.width // 3, input.height // 2
  assert(width == 512 and height == 512, "Unexpected source layout: " .. clip.name)
  local keyRedMin = spec.keyRedMin or 56
  local edgeAlphaMin = spec.edgeAlphaMin or 88
  for cel, duration in ipairs(clip.durations) do
    local sourceCel = spec.cells and spec.cells[cel] or cel
    local cell = Image(input, Rectangle(((sourceCel-1)%3)*width, ((sourceCel-1)//3)*height, width, height))
    -- Remove the black backing before reduction so dark pixels cannot fringe the fire.
    for px in cell:pixels() do
      if pc.rgbaR(px()) < keyRedMin then px(0) end
    end
    local bounds = cell:shrinkBounds()
    local art = Image(cell, bounds)
    local divisor = spec.divisors and spec.divisors[cel] or spec.divisor
    local scale = 1 / divisor
    art:resize{
      width=math.max(1, math.floor(bounds.width*scale+0.5)),
      height=math.max(1, math.floor(bounds.height*scale+0.5)),
      method="bilinear",
    }
    for px in art:pixels() do
      if pc.rgbaA(px()) < edgeAlphaMin then px(0) end
    end
    local x = math.floor(layout.pivot[1] - (spec.x[cel]-bounds.x)*scale + 0.5)
    local anchorY = type(spec.y) == "number" and spec.y or spec.y[cel]
    local y = math.floor(layout.pivot[2] - (anchorY-bounds.y)*scale + 0.5)
    assert(x > 0 and y > 0 and x+art.width < layout.width and y+art.height < layout.height,
      "Clipped cel: " .. clip.name .. " " .. cel)
    if index > 1 then sprite:newEmptyFrame(index) end
    sprite:newCel(sprite.layers[1], index, art, Point(x,y))
    if spec.accent then
      if not accentLayer then
        accentLayer = sprite:newLayer()
        accentLayer.name = "Torso flame"
      end
      local crop = spec.accent.crop
      local position = spec.accent.position
      local celImage = Image(layout.width, layout.height)
      celImage:drawImage(art, Point(x,y))
      local accent = Image(celImage, Rectangle(crop[1], crop[2], crop[3], crop[4]))
      sprite:newCel(accentLayer, index, accent, Point(position[1], position[2]))
    end
    sprite.frames[index].duration = duration / 1000
    index = index + 1
  end
end
local first = 1
for _, clip in ipairs(layout.clips) do
  local last = first + #clip.durations - 1
  sprite:newTag(first, last).name = clip.name
  first = last + 1
end
sprite:saveAs(source .. "/" .. id .. ".aseprite")
