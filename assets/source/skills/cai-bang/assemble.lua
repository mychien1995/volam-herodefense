-- Build only new review assets. Approved runtime sources are read-only.
local f=assert(io.open(app.params.recipe,'r'));local r=json.decode(f:read('*a'));f:close()
local root=app.params.root
local pc=app.pixelColor
local cache={}
local results={}
for _,asset in ipairs(r.assets) do
 local w,h=asset.canvas[1],asset.canvas[2]
 local sprite=Sprite(w,h,ColorMode.RGB)
 sprite.layers[1].name=asset.kind=='character' and (asset.originalGenerated and 'Original new poses and declared approved-frame reuse' or 'Reused approved distinct character poses') or 'Original generated VFX - hard alpha cleanup'
 local count=0
 for _,anim in ipairs(asset.animations) do
  local first=count+1
  for _,frame in ipairs(anim.frames) do
   if not cache[frame.file] then cache[frame.file]=Image{fromFile=root..'/'..frame.file} end
   local src=cache[frame.file]
   local b=frame.rect
   local cut=Image(b[3],b[4],ColorMode.RGB)
   for y=0,b[4]-1 do for x=0,b[3]-1 do
    local sx=x
    if frame.armMirrorBand and y>=frame.armMirrorBand[1] and y<=frame.armMirrorBand[2] then sx=b[3]-1-x end
    local c=src:getPixel(b[1]+sx,b[2]+y)
    local a=pc.rgbaA(c)
    if a>=(frame.alphaThreshold or 1) then
     cut:drawPixel(x,y,pc.rgba(pc.rgbaR(c),pc.rgbaG(c),pc.rgbaB(c),255))
    end
   end end
   local sc=frame.scale or 1
   if sc~=1 then cut:resize{width=math.floor(b[3]*sc+0.5),height=math.floor(b[4]*sc+0.5),method='nearest'} end
   local anchor=frame.anchor
   local ax=math.floor(anchor[1]*sc+0.5);local ay=math.floor(anchor[2]*sc+0.5)
   for cy=0,cut.height-1 do for cx=0,cut.width-1 do
    if pc.rgbaA(cut:getPixel(cx,cy))>0 then
     local tx,ty=asset.pivot[1]-ax+cx,asset.pivot[2]-ay+cy
     assert(tx>=0 and ty>=0 and tx<w and ty<h,'Clipped source pixels in '..asset.id..':'..anim.name)
    end
   end end
   local canvas=Image(w,h,ColorMode.RGB)
   canvas:drawImage(cut,Point(asset.pivot[1]-ax,asset.pivot[2]-ay))
   -- Cardinal VFX transforms are exact quarter-turns, never arbitrary angle interpolation.
   if frame.mirrorX or (frame.rotation and frame.rotation~=0) then
    local rotated=Image(w,h,ColorMode.RGB)
    for y=0,h-1 do for x=0,w-1 do
     local dx,dy=x-asset.pivot[1],y-asset.pivot[2]
     if frame.mirrorX then dx=-dx end
     local tx,ty=dx,dy
     if frame.rotation==90 then tx,ty=-dy,dx elseif frame.rotation==180 then tx,ty=-dx,-dy elseif frame.rotation==270 then tx,ty=dy,-dx end
     tx,ty=tx+asset.pivot[1],ty+asset.pivot[2]
     if tx>=0 and ty>=0 and tx<w and ty<h then rotated:drawPixel(tx,ty,canvas:getPixel(x,y)) end
    end end
    canvas=rotated
   end
   count=count+1
   if count>1 then sprite:newEmptyFrame(count) end
   sprite:newCel(sprite.layers[1],count,canvas,Point(0,0))
   sprite.frames[count].duration=anim.durationMs/1000
   canvas:saveAs(root..'/'..asset.sourceFolder..'/frames/'..anim.name..'_'..(count-first)..'.png')
  end
  local tag=sprite:newTag(first,count);tag.name=anim.name;tag.aniDir=AniDir.FORWARD
 end
 local slice=sprite:newSlice(Rectangle(0,0,w,h));slice.name='origin';slice.pivot=Point(asset.pivot[1],asset.pivot[2])
 slice.data='Presentation anchor only. Damage and hit timing remain server authoritative.'
 sprite:saveAs(root..'/'..asset.sourceFolder..'/'..asset.id..'.aseprite')
 print(asset.id..': '..count..' original/reused animation cels')
end

