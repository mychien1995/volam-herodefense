local root = app.params.root or "."
local bundle = app.params.bundle or "ngu-doc-preview-v01"
local source = root .. "/assets/source/" .. bundle
local output = root .. "/assets/exports/" .. bundle
local pixel = app.pixelColor

local function readJson(path)
  local file = assert(io.open(path, "r"))
  local data = json.decode(file:read("*a"))
  file:close()
  return data
end

local function writeJson(path, data)
  local file = assert(io.open(path, "w"))
  file:write(json.encode(data), "\n")
  file:close()
end

local function clean(image, threshold)
  for p in image:pixels() do
    if pixel.rgbaA(p()) < threshold then p(0) end
  end
end

local function readCell(image, grid, index)
  local column = (index - 1) % grid.columns
  local row = math.floor((index - 1) / grid.columns)
  local x0 = math.floor(column * image.width / grid.columns)
  local x1 = math.floor((column + 1) * image.width / grid.columns)
  local y0 = math.floor(row * image.height / grid.rows)
  local y1 = math.floor((row + 1) * image.height / grid.rows)
  if grid.boxes then
    local box = grid.boxes[index]
    x0, y0, x1, y1 = box[1], box[2], box[3], box[4]
  end
  local cell = Image(image, Rectangle(x0, y0, x1 - x0, y1 - y0))
  clean(cell, grid.threshold or 12)
  if grid.trim then
    local box = grid.trim[index]
    if box then cell = Image(cell, Rectangle(box[1], box[2], box[3], box[4])) end
  end
  local bounds = cell:shrinkBounds()
  assert(bounds.width > 0 and bounds.height > 0, grid.file .. " empty cell " .. index)
  return Image(cell, bounds)
end

local function place(image, cel, groupScale, atlas)
  local scale = cel.scale or groupScale or math.min(cel.width / image.width, cel.height / image.height)
  local width = math.max(1, math.floor(image.width * scale + .5))
  local height = math.max(1, math.floor(image.height * scale + .5))
  image:resize{width=width, height=height, method="bilinear"}
  clean(image, 4)
  local x = math.floor(atlas.origin[1] - width * (cel.anchorX or .5) + (cel.x or 0) + .5)
  local y = math.floor(atlas.origin[2] - height * (cel.anchorY or atlas.anchorY) + (cel.y or 0) + .5)
  assert(x >= 2 and y >= 2 and x + width <= atlas.width - 2 and y + height <= atlas.height - 2, cel.name .. " clipped")
  local frame = Image(atlas.width, atlas.height)
  frame:drawImage(image, Point(x, y))
  return frame
end

local function exportAtlas(atlas)
  local frames = {}
  for _, group in ipairs(atlas.groups) do
    local image = Image{fromFile=source .. "/raw/" .. group.file .. ".png"}
    local scale = group.scale
    if group.reference then
      local measurement = readCell(image, group, group.reference)
      scale = group.height / measurement.height
    end
    for _, cel in ipairs(group.cels) do
      local frame = place(readCell(image, group, cel.cell), cel, scale, atlas)
      frames[#frames + 1] = {name=cel.name, duration=cel.duration, image=frame}
    end
  end
  local columns = math.min(8, #frames)
  local sheet = Image(atlas.width * columns, atlas.height * math.ceil(#frames / columns))
  local sprite = Sprite(atlas.width, atlas.height, ColorMode.RGB)
  local meta = {frames={}, meta={image=atlas.id .. ".png", size={w=sheet.width,h=sheet.height},
    scale="1", origin={x=atlas.origin[1],y=atlas.origin[2]}}}
  for index, frame in ipairs(frames) do
    if index > 1 then sprite:newEmptyFrame(index) end
    sprite:newCel(sprite.layers[1], index, frame.image, Point(0, 0))
    sprite.frames[index].duration = frame.duration / 1000
    local tag = sprite:newTag(index, index)
    tag.name = frame.name
    local x, y = ((index - 1) % columns) * atlas.width, math.floor((index - 1) / columns) * atlas.height
    sheet:drawImage(frame.image, Point(x, y))
    assert(not meta.frames[frame.name], "Duplicate cel " .. frame.name)
    meta.frames[frame.name] = {frame={x=x,y=y,w=atlas.width,h=atlas.height}, duration=frame.duration,
      rotated=false, trimmed=false, sourceSize={w=atlas.width,h=atlas.height},
      spriteSourceSize={x=0,y=0,w=atlas.width,h=atlas.height}}
  end
  sprite:saveAs(source .. "/" .. atlas.id .. ".aseprite")
  sheet:saveAs(output .. "/" .. atlas.id .. ".png")
  writeJson(output .. "/" .. atlas.id .. ".json", meta)
  sprite:close()
  print(atlas.id .. ": " .. #frames .. " frames")
end

local layout = readJson(source .. "/layout.json")
for _, atlas in ipairs(layout) do exportAtlas(atlas) end
