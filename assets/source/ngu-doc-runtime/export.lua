local root = app.params.root or "."
local source = root .. "/assets/exports/ngu-doc-preview-v01/"
local into = root .. "/assets/exports/ngu-doc-runtime/"
local function atlas(name)
  local f = assert(io.open(source .. name .. ".json"))
  local meta = json.decode(f:read("*a"))
  f:close()
  return Image{fromFile=source .. name .. ".png"}, meta.frames
end
local function save(image, path, max)
  local box = image:shrinkBounds()
  image = Image(image, box)
  local scale = math.min(max/image.width, max/image.height)
  image:resize{width=math.max(1, math.floor(image.width*scale+.5)),height=math.max(1, math.floor(image.height*scale+.5)),method="bilinear"}
  local output = Image(64,64)
  output:drawImage(image, Point(math.floor((64-image.width)/2),math.floor((64-image.height)/2)))
  output:saveAs(into .. path .. ".png")
end
local effects, effectFrames = atlas("effects")
local minions, minionFrames = atlas("minions")
local function cel(sheet, frames, name)
  local rect = assert(frames[name]).frame
  return Image(sheet, Rectangle(rect.x,rect.y,rect.w,rect.h))
end
local icons = {
  ngu_doc_ta_hiep="palm", ngu_doc_co_su="staff_bolt", ngu_doc_tam_kinh="soul",
  ngu_doc_chuong="toxic_palm", doc_sa_chuong="pool_dense", am_ta_hap_hon_khi="ring_one",
  vo_hinh_doc="armor", am_phong_thuc_cot="hand_grasp", van_co_thuc_thien="grub",
  yeu_co="charm_seal", tam_hinh_co="blood_grub", vo_hinh_ma_co="zombie_haze",
}
for id, frame in pairs(icons) do save(cel(effects,effectFrames,frame), "icons/" .. id, 57) end
save(cel(minions,minionFrames,"reaper_idle"), "icons/thi_quy_phong_tan", 59)
for _, id in ipairs({"bich-co","am-linh"}) do
  local sheet, frames = atlas(id)
  local frame = frames.idle_down_0.frame
  save(Image(sheet,Rectangle(frame.x+60,frame.y+27,56,53)), "portraits/" .. id, 64)
  if id == "bich-co" then
    save(cel(sheet, frames, "cast_down_0"), "portraits/bich-co-school", 57)
  end
end
