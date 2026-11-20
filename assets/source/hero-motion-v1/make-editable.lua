local root=app.params.root or "."
local function read(path)local f=assert(io.open(path,"r"));local x=json.decode(f:read("*a"));f:close();return x end
local m=read(root.."/assets/source/hero-motion-v1/manifest.json")
local dirs={"down","down_right","right","up_right","up","up_left","left","down_left"}
local total=0
for _,a in ipairs(m.actors) do
 local path=root.."/assets/exports/hero-motion-v1/"..a.basic
 local atlas=read(path..".json");local sheet=Image{fromFile=path..".png"};local sprite=Sprite(128,144,ColorMode.RGB);local n=0
 for _,dir in ipairs(dirs) do
  for _,pose in ipairs({"idle","walk"}) do
   local first=n+1;local count=pose=="idle" and 2 or 4
   for i=0,count-1 do
    n=n+1;if n>1 then sprite:newEmptyFrame(n) end
    local f=assert(atlas.frames[pose.."_"..dir.."_"..i]).frame
    local cel=Image(sheet,Rectangle(f.x,f.y,f.w,f.h))
    sprite:newCel(sprite.layers[1],n,cel,Point(0,0))
    sprite.frames[n].duration=pose=="walk" and .115 or (i==0 and 2.3 or .18)
    local check=sprite.cels[#sprite.cels].image
    assert(check.width==128 and check.height==144,"Bad editable canvas")
   end
   local tag=sprite:newTag(first,n);tag.name=pose.."_"..dir
  end
 end
 sprite:saveAs(root.."/assets/source/hero-motion-v1/editable/"..a.basic..".aseprite");sprite:close();total=total+1
end
print("Saved "..total.." editable motion sources")
