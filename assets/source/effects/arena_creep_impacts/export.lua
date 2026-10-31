local root=app.params.root
local source=Image{fromFile=root..'/assets/source/effects/arena_creep_impacts/generated_v1.png'}
local out=root..'/assets/exports/effects/arena_creep_impacts/'
local sprite=Sprite(64,64,ColorMode.RGB)
sprite.layers[1].name='Original generated contact effects'
local names={'undead_contact','spectral_contact','metal_contact','stone_contact'}
local pc=app.pixelColor
for row=0,3 do
 for col=0,3 do
  local x=math.floor(col*source.width/4+.5);local y=math.floor(row*source.height/4+.5)
  local w=math.floor((col+1)*source.width/4+.5)-x
  local h=math.floor((row+1)*source.height/4+.5)-y
  local cut=Image(w,h,ColorMode.RGB)
  for yy=0,h-1 do for xx=0,w-1 do
   local c=source:getPixel(x+xx,y+yy)
   if pc.rgbaA(c)>=220 then cut:drawPixel(xx,yy,pc.rgba(pc.rgbaR(c),pc.rgbaG(c),pc.rgbaB(c),255)) end
  end end
  local factor=32/math.max(w,h);local rw=math.floor(w*factor+.5);local rh=math.floor(h*factor+.5)
  cut:resize(rw,rh)
  local canvas=Image(64,64,ColorMode.RGB)
  canvas:drawImage(cut,Point(math.floor((64-rw)/2),math.floor((64-rh)/2)))
  local index=row*4+col+1
  if index>1 then sprite:newEmptyFrame(index) end
  sprite:newCel(sprite.layers[1],index,canvas,Point(0,0))
  sprite.frames[index].duration=.075
  canvas:saveAs(out..'frames/'..names[row+1]..'_'..col..'.png')
 end
 local tag=sprite:newTag(row*4+1,row*4+4);tag.name=names[row+1]
end
local slice=sprite:newSlice(Rectangle(0,0,64,64));slice.name='contact';slice.pivot=Point(32,32)
sprite:saveAs(root..'/assets/source/effects/arena_creep_impacts/arena_creep_impacts.aseprite')

