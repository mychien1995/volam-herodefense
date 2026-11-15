local root = app.params.root or "."
local source = root .. "/assets/source/ngu-doc-preview-v01"
local output = root .. "/assets/exports/ngu-doc-preview-v01"
local function read(path)
  local file = assert(io.open(path))
  local value = json.decode(file:read("*a"))
  file:close()
  return value
end
local count = 0
for _, atlas in ipairs(read(source .. "/layout.json")) do
  local sprite = app.open(source .. "/" .. atlas.id .. ".aseprite")
  local png = Image{fromFile=output .. "/" .. atlas.id .. ".png"}
  local metadata = read(output .. "/" .. atlas.id .. ".json")
  assert(sprite.width == atlas.width and sprite.height == atlas.height)
  assert(png.width == metadata.meta.size.w and png.height == metadata.meta.size.h)
  assert(#sprite.tags == #sprite.frames)
  for _, tag in ipairs(sprite.tags) do
    local frame = assert(metadata.frames[tag.name])
    local cel = assert(sprite.layers[1]:cel(tag.fromFrame))
    local canvas = Image(sprite.width, sprite.height)
    canvas:drawImage(cel.image, cel.position)
    local bounds = canvas:shrinkBounds()
    assert(bounds.x >= 2 and bounds.y >= 2 and bounds.width > 0 and bounds.height > 0
      and bounds.x + bounds.width <= atlas.width - 2 and bounds.y + bounds.height <= atlas.height - 2, tag.name)
    assert(math.abs(tag.fromFrame.duration * 1000 - frame.duration) < 1, tag.name .. " duration")
    for p in canvas:pixels() do
      assert(p() == png:getPixel(frame.frame.x + p.x, frame.frame.y + p.y), tag.name .. " pixel mismatch")
    end
    count = count + 1
  end
  print(atlas.id .. ": " .. #sprite.tags .. " cels verified")
  sprite:close()
end
assert(count == 95, "Unexpected frame count " .. count)
print("95 editable cels match the four PNG/JSON atlases")
