local root=app.params.root or '.'
local base=root..'/assets/source/renovation-v3'
app.fs.makeDirectory(base..'/references')
local f=assert(io.open(base..'/actors.json','r'));local actors=json.decode(f:read('*a'));f:close()
local montage=Image(256*6,300*math.ceil(#actors/6))
for i,a in ipairs(actors) do
 local path=root..'/assets/exports/renovation-v1/runtime/'..a.id
 local f=assert(io.open(path..'.json','r'));local atlas=json.decode(f:read('*a'));f:close()
 local r=atlas.frames.idle_down_0.frame
 local cut=Image(Image{fromFile=path..'.png'},Rectangle(r.x,r.y,r.w,r.h));local b=cut:shrinkBounds();cut=Image(cut,b)
 cut:resize{width=cut.width*2,height=cut.height*2,method='nearest'}
 cut:saveAs(base..'/references/'..a.id..'.png')
 montage:drawImage(cut,Point(((i-1)%6)*256+128-math.floor(cut.width/2),math.floor((i-1)/6)*300+280-cut.height))
end
montage:saveAs(base..'/references/montage.png')
print('V3 reference cels extracted '..#actors)
