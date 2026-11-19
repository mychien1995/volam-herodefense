local root=app.params.root or "."
local function read(path)local f=assert(io.open(path,"r"));local d=json.decode(f:read("*a"));f:close();return d end
local base=root.."/assets/exports/cai-bang-chuong-unified-v1/"
local m=read(base.."manifest.json");local atlas=read(base.."body.json");local sheet=Image{fromFile=base.."body.png"}
local sprite=Sprite(160,144,ColorMode.RGB);local n=0
local groups={{name="idle",poses={"idle_0","idle_1","idle_2","idle_3"},dt=.7},{name="walk",poses={"walk_0","walk_1","walk_2","walk_3"},dt=.11},{name="basic",poses={"windup","strike","alternate","recover"},dt=.11},{name="skill",poses={"charge","release","rise","channel"},dt=.11},{name="hurt",poses={"hurt_0","hurt_1"},dt=.09},{name="death",poses={"death_0","death_1"},dt=.22}}
for _,dir in ipairs(m.directions)do
 for _,g in ipairs(groups)do
  local first=n+1
  for _,pose in ipairs(g.poses)do
   n=n+1;if n>1 then sprite:newEmptyFrame(n)end
   local r=assert(atlas.frames[pose.."_"..dir]).frame
   sprite:newCel(sprite.layers[1],n,Image(sheet,Rectangle(r.x,r.y,r.w,r.h)),Point(0,0));sprite.frames[n].duration=g.dt
  end
  sprite:newTag(first,n).name=g.name.."_"..dir
 end
end
assert(n==160,"Missing coherent body frames")
sprite:saveAs(root.."/assets/source/cai-bang-chuong-unified-v1/body.aseprite");sprite:close()
print("Saved160-frame48-tag coherent body source")
