-- Assemble separately drawn registered raster cels into an editable Aseprite timeline.
local folder = assert(app.params.folder)
local file = assert(io.open(folder .. "/layout.json", "r"))
local spec = json.decode(file:read("*a"))
file:close()

local sprite = Sprite(spec.size[1], spec.size[2], ColorMode.RGB)
local layer = sprite.layers[1]
layer.name = "ImageGen raster cels"
local frame = 0
local ranges = {}

for _, clip in ipairs(spec.clips) do
  local first = frame + 1
  for i, filename in ipairs(clip.files) do
    frame = frame + 1
    if frame > 1 then sprite:newEmptyFrame(frame) end
    local image = Image{fromFile=folder .. "/" .. filename}
    sprite:newCel(layer, frame, image, Point(0, 0))
    sprite.frames[frame].duration = clip.durations[i] / 1000
  end
  ranges[#ranges + 1] = { first = first, last = frame, name = clip.tag }
end

for _, range in ipairs(ranges) do
  local tag = sprite:newTag(range.first, range.last)
  tag.name = range.name
  tag.aniDir = AniDir.FORWARD
end

local slice = sprite:newSlice(Rectangle(0, 0, sprite.width, sprite.height))
slice.name = "origin"
slice.pivot = Point(spec.pivot[1], spec.pivot[2])
sprite:saveAs(assert(app.params.output))
