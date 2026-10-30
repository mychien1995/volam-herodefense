-- Raster assembly only: no resizing, background removal, replacement drawing or damage events.
local f=assert(io.open(app.params.recipe,'r'));local r=json.decode(f:read('*a'));f:close()
local sprite=Sprite(r.canvas[1],r.canvas[2],ColorMode.RGB)
sprite.layers[1].name='Imported original pixels'
for i,frame in ipairs(r.frames) do
  if i>1 then sprite:newEmptyFrame(i) end
  local source=Image{fromFile=app.params.root .. '/' .. frame.file}
  local b=frame.rect
  local image=Image(b[3],b[4],ColorMode.RGB)
  image:drawImage(source,Point(-b[1],-b[2]))
  sprite:newCel(sprite.layers[1],i,image,Point(frame.offset[1],frame.offset[2]))
  sprite.frames[i].duration=frame.durationMs/1000
end
for _,t in ipairs(r.tags) do local tag=sprite:newTag(t.from+1,t.to+1);tag.name=t.name end
local slice=sprite:newSlice(Rectangle(0,0,r.canvas[1],r.canvas[2]))
slice.name='feet';slice.pivot=Point(r.pivot[1],r.pivot[2])
sprite:saveAs(app.params.output .. '/source.aseprite')
