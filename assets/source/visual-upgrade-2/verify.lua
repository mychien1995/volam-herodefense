local root = app.params.root or "."
local function read(path)
  local file = assert(io.open(path,"r"))
  local data = json.decode(file:read("*a"))
  file:close()
  return data
end
local count=0
for _,id in ipairs({"hero","that_tinh_kiem","nhan_kiem_hop_nhat","bat_quai_kiem_tran","toa_sat_bac_do","van_kiem_quy_tong"}) do
  local sprite=app.open(root.."/assets/source/visual-upgrade-2/"..id..".aseprite")
  local sheet=Image{fromFile=root.."/assets/exports/visual-upgrade-2/"..id..".png"}
  local metadata=read(root.."/assets/exports/visual-upgrade-2/"..id..".json")
  for _,tag in ipairs(sprite.tags) do
    local cel=Image(sprite.width,sprite.height)
    cel:drawSprite(sprite,tag.fromFrame.frameNumber)
    local bounds=metadata.frames[tag.name].frame
    local exported=Image(sheet,Rectangle(bounds.x,bounds.y,bounds.w,bounds.h))
    assert(cel:isEqual(exported),"Source/export mismatch "..id..":"..tag.name)
    count=count+1
  end
  sprite:close()
end
print("PASS "..count.." frame rasters match their editable Aseprite cels")

