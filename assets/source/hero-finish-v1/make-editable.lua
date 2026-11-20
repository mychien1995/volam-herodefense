local root=app.params.root or "."
local function read(path)local f=assert(io.open(path,"r"));local x=json.decode(f:read("*a"));f:close();return x end
local m=read(root.."/assets/source/hero-finish-v1/manifest.json")
local total=0
for _,a in ipairs(m.actors) do
 local path=root.."/assets/exports/hero-finish-v1/"..a.basic
 local atlas=read(path..".json");local sheet=Image{fromFile=path..".png"};local sprite=Sprite(192,176,ColorMode.RGB);local n=0
 for _,dir in ipairs(a.directions) do
  for _,group in ipairs({{name="idle_extra",poses={"inhale","exhale"}},{name="action_library",poses={"windup","strike","alternate","charge","release","recover"}}}) do
   local first=n+1
   for _,pose in ipairs(group.poses) do
    n=n+1;if n>1 then sprite:newEmptyFrame(n) end
    local f=assert(atlas.frames[pose.."_"..dir]).frame
    sprite:newCel(sprite.layers[1],n,Image(sheet,Rectangle(f.x,f.y,f.w,f.h)),Point(0,0))
    sprite.frames[n].duration=group.name=="idle_extra" and .36 or .11
   end
   local tag=sprite:newTag(first,n);tag.name=group.name.."_"..dir
  end
 end
 assert(n==64,"Missing authored cels")
 sprite:saveAs(root.."/assets/source/hero-finish-v1/editable/"..a.basic..".aseprite");sprite:close();total=total+1
end
print("Saved "..total.." editable finish pose libraries")
