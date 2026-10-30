-- Assembly of generated production pixels only; never samples approved concept pixels.
local f=assert(io.open(app.params.recipe,'r'));local r=json.decode(f:read('*a'));f:close()
local root=app.params.root
local cw,ch=r.canvas[1],r.canvas[2]
local px,py=r.pivot[1],r.pivot[2]
local sprite=Sprite(cw,ch,ColorMode.RGB)
sprite.layers[1].name='Original generated poses - masked and foot aligned'
local sources={}
local pc=app.pixelColor
for i,frame in ipairs(r.frames) do
  if not sources[frame.file] then sources[frame.file]=Image{fromFile=root..'/'..frame.file} end
  local source=sources[frame.file]
  local b=frame.rect
  local cut=Image(b[3],b[4],ColorMode.RGB)
  for _,span in ipairs(frame.maskSpans) do
    for x=span[2],span[3] do
      local c=source:getPixel(x,span[1])
      cut:drawPixel(x-b[1],span[1]-b[2],pc.rgba(pc.rgbaR(c),pc.rgbaG(c),pc.rgbaB(c),255))
    end
  end
  local w=math.floor(b[3]*frame.scale+0.5)
  local h=math.floor(b[4]*frame.scale+0.5)
  cut:resize(w,h)
  local fx=math.floor((frame.foot[1]-b[1])*frame.scale+0.5)
  local fy=math.floor((frame.foot[2]-b[2])*frame.scale+0.5)
  local ox,oy=px-fx,py-fy
  assert(ox>=0 and oy>=0 and ox+w<=cw and oy+h<=ch,'Clipped pose: '..frame.name)
  local canvas=Image(cw,ch,ColorMode.RGB)
  canvas:drawImage(cut,Point(ox,oy))
  if i>1 then sprite:newEmptyFrame(i) end
  sprite:newCel(sprite.layers[1],i,canvas,Point(0,0))
  sprite.frames[i].duration=frame.durationMs/1000
  canvas:saveAs(root..'/'..r.folder..'/frames/'..frame.name..'.png')
end
for _,t in ipairs(r.tags) do
  local tag=sprite:newTag(t.from+1,t.to+1);tag.name=t.name;tag.aniDir=AniDir.FORWARD
end
local slice=sprite:newSlice(Rectangle(0,0,cw,ch));slice.name='feet';slice.pivot=Point(px,py)
sprite:saveAs(root..'/'..r.folder..'/source/'..r.id..'.aseprite')
print(r.id..': '..#r.frames..' exported production candidate poses')
