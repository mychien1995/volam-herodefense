local dir = "assets/exports/loi-dai-v2/"
local input = assert(io.open(dir .. "manifest.json", "r"))
local manifest = json.decode(input:read("*a"))
input:close()
local layers = {}
for _, asset in ipairs(manifest.layers) do layers[#layers + 1] = asset end
table.sort(layers, function(a,b) return a.depth < b.depth end)
local sprite = Sprite(manifest.width * manifest.density, manifest.height * manifest.density, ColorMode.RGB)
local count = 0
for _, asset in ipairs(layers) do
  if not asset.id:match("%-overscan$") then
    local layer = count == 0 and sprite.layers[1] or sprite:newLayer()
    layer.name = asset.id
    local image = Image{fromFile=dir .. asset.id .. ".png"}
    assert(image.width == asset.width and image.height == asset.height, asset.id)
    sprite:newCel(layer, 1, image, Point(asset.x * manifest.density, asset.y * manifest.density))
    count = count + 1
  end
end
sprite:saveAs("assets/source/loi-dai-v2/hong-moc.aseprite")
sprite:close()
print("Loi Dai native court: " .. count .. " editable layers")
