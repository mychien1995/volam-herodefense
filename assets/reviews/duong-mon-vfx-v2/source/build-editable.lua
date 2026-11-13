local root = app.params.root or "."
local sheets = {"tuan-sa-walk", "da-hanh-walk", "tuan-sa-action", "da-hanh-action",
  "tuan-sa-vertical", "da-hanh-vertical", "vfx"}
local props = {"arena", "wall", "pillar", "tree", "rocks", "bush", "dummy"}
local only = app.params.sheet
if only then
  sheets = {only}
  props = {}
end
local count = 0

local function verifyCel(sprite, frameNumber, expected, key)
  local rendered = Image(sprite.width, sprite.height)
  rendered:drawSprite(sprite, frameNumber)
  assert(rendered:isEqual(expected), "Raster mismatch: " .. key)
end

for _, name in ipairs(sheets) do
  local source = assert(io.open(root .. "/art/" .. name .. ".json", "r"))
  local atlas = json.decode(source:read("*a"))
  source:close()
  local image = Image{fromFile=root .. "/art/" .. name .. ".png"}
  local entries = {}
  for key, data in pairs(atlas.frames) do
    entries[#entries + 1] = {key=key, data=data}
  end
  table.sort(entries, function(a, b)
    return a.data.frame.y * image.width + a.data.frame.x < b.data.frame.y * image.width + b.data.frame.x
  end)
  local sprite = Sprite(entries[1].data.frame.w, entries[1].data.frame.h, ColorMode.RGB)
  for i, entry in ipairs(entries) do
    local f = entry.data.frame
    local cel = Image(image, Rectangle(f.x, f.y, f.w, f.h))
    if i > 1 then sprite:newEmptyFrame(i) end
    sprite:newCel(sprite.layers[1], i, cel, Point(0, 0))
    sprite.frames[i].duration = entry.data.duration / 1000
    sprite:newTag(i, i).name = entry.key
  end
  local destination = root .. "/source/" .. name .. ".aseprite"
  sprite:saveAs(destination)
  sprite:close()
  local reopened = app.open(destination)
  for i, entry in ipairs(entries) do
    local f = entry.data.frame
    verifyCel(reopened, i, Image(image, Rectangle(f.x, f.y, f.w, f.h)), name .. "/" .. entry.key)
    assert(reopened.tags[i].name == entry.key, "Missing frame tag")
    count = count + 1
  end
  reopened:close()
end

for _, name in ipairs(props) do
  local image = Image{fromFile=root .. "/art/" .. name .. ".png"}
  local sprite = Sprite(image.width, image.height, ColorMode.RGB)
  sprite:newCel(sprite.layers[1], 1, image, Point(0, 0))
  local destination = root .. "/source/" .. name .. ".aseprite"
  sprite:saveAs(destination)
  sprite:close()
  local reopened = app.open(destination)
  verifyCel(reopened, 1, image, name)
  reopened:close()
end
print("PASS " .. count .. " atlas cels and " .. #props .. " scene assets match editable Aseprite sources.")
