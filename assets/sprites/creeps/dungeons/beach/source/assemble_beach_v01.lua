local f=assert(io.open(app.params.recipe,'r'))
local items=json.decode(f:read('*a'));f:close()
local root=app.params.root
for _,r in ipairs(items) do
  local s=Sprite(r.canvas[1],r.canvas[2],ColorMode.RGB)
  s.layers[1].name='Original generated raster cels - extracted and anchored'
  for i,v in ipairs(r.frames) do
    if i>1 then s:newEmptyFrame(i) end
    local im=Image{fromFile=root..'/'..v.file}
    s:newCel(s.layers[1],i,im,Point(0,0))
    s.frames[i].duration=v.duration/1000
  end
  for _,v in ipairs(r.tags) do
    local t=s:newTag(v.from+1,v.to+1);t.name=v.name
  end
  local sl=s:newSlice(Rectangle(0,0,r.canvas[1],r.canvas[2]))
  sl.name='ground_anchor';sl.pivot=Point(r.pivot[1],r.pivot[2])
  s:saveAs(root..'/'..r.output)
  s:close()
end
print('Saved '..#items..' editable Beach raster sources')
