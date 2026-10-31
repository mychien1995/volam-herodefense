-- Retained prepared PNG cels -> real editable sources. No approved character writes.
local root=app.params.root
local f=assert(io.open(app.params.recipe,'r'));local recipe=json.decode(f:read('*a'));f:close()
for _,a in ipairs(recipe.assets) do
  local sprite=Sprite(a.canvas[1],a.canvas[2],ColorMode.RGB)
  sprite.layers[1].name='Original raster cels - declared alignment and reuse'
  local count=0
  for _,anim in ipairs(a.animations) do
    local first=count+1
    for _,path in ipairs(anim.frames) do
      count=count+1
      if count>1 then sprite:newEmptyFrame(count) end
      sprite:newCel(sprite.layers[1],count,Image{fromFile=root..'/'..path},Point(0,0))
      sprite.frames[count].duration=anim.durationMs/1000
    end
    local tag=sprite:newTag(first,count);tag.name=anim.name
  end
  local slice=sprite:newSlice(Rectangle(0,0,a.canvas[1],a.canvas[2]))
  slice.name=a.kind=='character' and 'feet' or 'effect_origin'
  slice.pivot=Point(a.pivot[1],a.pivot[2]);slice.data='Presentation only; no damage, range or server timing.'
  sprite:saveAs(root..'/'..a.sourceFolder..'/'..a.id..'.aseprite')
  print(a.id..': '..count..' editable cels')
end
for _,icon in ipairs(recipe.icons) do
  local sprite=app.open(root..'/'..icon.source)
  sprite.layers[1].name='Original concept icon raster - approval gate waived'
  sprite:saveAs(root..'/'..icon.editableSource)
end

