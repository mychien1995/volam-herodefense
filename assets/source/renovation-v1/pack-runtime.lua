local root=app.params.root or '.'
local f=assert(io.open(root..'/assets/source/renovation-v1/runtime-layout.json','r'))
local plan=json.decode(f:read('*a'));f:close()
local dest=root..'/assets/exports/renovation-v1/runtime'
app.fs.makeDirectory(dest)
for _,item in ipairs(plan) do
  local original=Image{fromFile=root..'/'..item.source}
  local width,height=item.cell[1],item.cell[2]
  local sheet=Image(width*5,height*4)
  local atlas={frames={},meta={image=item.actor.id..'.png',size={w=width*5,h=height*4},scale='1'}}
  for index,cel in ipairs(item.frames) do
    local s=cel.source;local image=Image(original,Rectangle(s[1],s[2],s[3],s[4]))
    local x,y=((index-1)%5)*width+2,math.floor((index-1)/5)*height+2
    sheet:drawImage(image,Point(x,y))
    atlas.frames[cel.name]={frame={x=x,y=y,w=image.width,h=image.height},rotated=false,trimmed=true,sourceSize={w=item.actor.canvas[1],h=item.actor.canvas[2]},spriteSourceSize={x=cel.trim[1],y=cel.trim[2],w=image.width,h=image.height},duration=cel.duration}
  end
  sheet:saveAs(dest..'/'..item.actor.id..'.png')
  local file=assert(io.open(dest..'/'..item.actor.id..'.json','w'));file:write(json.encode(atlas));file:close()
end
print('Packed 74 lossless runtime atlases')
