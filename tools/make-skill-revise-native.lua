local root=app.params.root or '.'
local id=assert(app.params.id)
local function read(p)local f=assert(io.open(p,'r'));local d=json.decode(f:read('*a'));f:close();return d end
local bundle=app.params.bundle or 'skill-revise-v01'
local base=root..'/assets/exports/'..bundle..'/'..id..'/'
local m=read(base..'manifest.json');local atlas=read(base..'body.json');local sheet=Image{fromFile=base..'body.png'}
local sprite=Sprite(m.canvas[1],m.canvas[2],ColorMode.RGB);local index=0
for _,clip in ipairs(m.clips)do
 local first=index+1
 for celIndex,name in ipairs(clip.frames)do
  index=index+1;if index>1 then sprite:newEmptyFrame(index)end
  local a=assert(atlas.frames[name]);local f=a.frame;local s=a.spriteSourceSize
  sprite:newCel(sprite.layers[1],index,Image(sheet,Rectangle(f.x,f.y,f.w,f.h)),Point(s.x,s.y))
  sprite.frames[index].duration=(clip.durations and clip.durations[celIndex] or math.floor(1000/clip.fps+0.5))/1000
 end
 sprite:newTag(first,index).name=clip.name
end
sprite:saveAs(root..'/assets/source/'..bundle..'/native/'..id..'.aseprite');sprite:close();print(id..' '..index..' native frames')
