local root = app.params.root or "."
local source = root .. "/assets/source/ngu-doc-feedback-v1/"
local output = root .. "/assets/exports/ngu-doc-feedback-v1/"
local icons = Image{fromFile=source .. "icon-source.png"}
assert(icons.width == 1254 and icons.height == 1254)
local edges = {0,313,627,941,1254}
local ids = {
  "ngu_doc_ta_hiep", "ngu_doc_chuong", "doc_sa_chuong", "am_ta_hap_hon_khi",
  "vo_hinh_doc", "am_phong_thuc_cot", "ngu_doc_co_su", "van_co_thuc_thien",
  "yeu_co", "tam_hinh_co", "vo_hinh_ma_co", "thi_quy_phong_tan",
  "ngu_doc_tam_kinh", "ngu_doc_school",
}
for i,id in ipairs(ids) do
  local col = (i-1)%4+1
  local row = math.floor((i-1)/4)+1
  local icon = Image(icons, Rectangle(edges[col]+2, edges[row]+2,
    edges[col+1]-edges[col]-4, edges[row+1]-edges[row]-4))
  icon:resize{width=96, height=96, method="bilinear"}
  icon:saveAs(output .. "icons/" .. id .. ".png")
end

local sourceFx = Image{fromFile=source .. "ultimate-source.png"}
assert(sourceFx.width == 1536 and sourceFx.height == 1024)
local sheet = Image(768,320)
local frames = {}
local names = {"hand_open","hand_fist","hand_grasp","smoke_rise","smoke_dense","smoke_drift"}
for i,name in ipairs(names) do
  local col = (i-1)%3
  local row = math.floor((i-1)/3)
  local hand = row == 0
  local art = Image(sourceFx, Rectangle(col*512, hand and 40 or 680, 512, hand and 520 or 240))
  art:resize{width=hand and 128 or 240, height=hand and 130 or 112, method="bilinear"}
  local x,y = col*256,row*160
  sheet:drawImage(art,Point(x + (hand and 64 or 8),y + (hand and 12 or 24)))
  frames[name] = {
    frame={x=x,y=y,w=256,h=160}, rotated=false, trimmed=false,
    spriteSourceSize={x=0,y=0,w=256,h=160}, sourceSize={w=256,h=160},
  }
end
sheet:saveAs(output .. "ultimate.png")
local file = assert(io.open(output .. "ultimate.json","w"))
file:write(json.encode{frames=frames,meta={image="ultimate.png",size={w=768,h=320}}})
file:write("\n")
file:close()
