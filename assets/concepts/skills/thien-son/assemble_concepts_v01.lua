-- Layout/extraction only. Never authors or exports production animation.
local f=assert(io.open(app.params.recipe,'r'))
local r=json.decode(f:read('*a'));f:close()
local root=app.params.root
local function load(path) return Image{fromFile=root..'/'..path} end
for _,c in ipairs(r.icons) do
 local source=load(c.source)
 local b=c.rect
 assert(b[1]>=0 and b[2]>=0 and b[1]+b[3]<=source.width and b[2]+b[4]<=source.height)
 local cut=Image(b[3],b[4],ColorMode.RGB)
 cut:drawImage(source,Point(-b[1],-b[2]))
 cut:resize{width=256,height=256,method='nearest'}
 cut:saveAs(root..'/'..c.output)
 print('Concept icon only: '..c.id)
end
local tileW,tileH,gap=768,512,8
local overview=Image(tileW*2+gap*3,tileH*5+gap*6,ColorMode.RGB)
overview:clear(app.pixelColor.rgba(25,48,52,255))
for n,path in ipairs(r.boards) do
 local im=load(path)
 im:resize{width=tileW,height=tileH,method='nearest'}
 overview:drawImage(im,Point(gap+((n-1)%2)*(tileW+gap),gap+math.floor((n-1)/2)*(tileH+gap)))
end
overview:saveAs(root..'/assets/concepts/skills/thien-son/thien-son-skill-overview-v01.png')
print('10 key-pose CONCEPT boards composed; no runtime atlas created')
