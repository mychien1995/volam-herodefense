local root=app.params.root or "."
local dir=root.."/assets/source/renovation-v1"
app.fs.makeDirectory(dir.."/references")
local file=assert(io.open(dir.."/catalog.json","r"))
local catalog=json.decode(file:read("*a"));file:close()
local board=Image(8*160,math.ceil(#catalog.actors/8)*160)
for index,actor in ipairs(catalog.actors) do
  local source=Image{fromFile=root.."/"..actor.reference.sheet}
  local b=actor.reference.rectangle
  local crop=Image(source,Rectangle(b.x,b.y,b.w,b.h))
  local bounds=crop:shrinkBounds()
  crop=Image(crop,bounds)
  local reference=Image(crop)
  reference:resize{width=crop.width*4,height=crop.height*4}
  reference:saveAs(root.."/"..actor.identity)
  local scale=math.min(144/crop.width,144/crop.height)
  crop:resize{width=math.max(1,math.floor(crop.width*scale)),height=math.max(1,math.floor(crop.height*scale))}
  board:drawImage(crop,Point(((index-1)%8)*160+math.floor((160-crop.width)/2),math.floor((index-1)/8)*160+math.floor((160-crop.height)/2)))
end
board:saveAs(dir.."/identity-contact.png")
print("Prepared "..#catalog.actors.." actual runtime identity crops")

