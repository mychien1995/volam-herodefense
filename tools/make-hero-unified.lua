local root=app.params.root or "."
local function read(path)local f=assert(io.open(path,"r"));local d=json.decode(f:read("*a"));f:close();return d end
local cfg=read(root.."/"..app.params.profile);local base=root.."/assets/exports/"..cfg.folder.."/";local m=read(base.."manifest.json");local atlas=read(base.."body.json");local sheet=Image{fromFile=base.."body.png"};local sprite=Sprite(cfg.canvas[1],cfg.canvas[2],ColorMode.RGB);local n=0;local tags={}
for _,dir in ipairs(m.directions)do
 for _,group in ipairs(cfg.groups)do
  local first=n+1
  for _,pose in ipairs(group.poses)do
   n=n+1;if n>1 then sprite:newEmptyFrame(n)end
   local a=assert(atlas.frames[pose.."_"..dir]);local f=a.frame;local s=a.spriteSourceSize
   sprite:newCel(sprite.layers[1],n,Image(sheet,Rectangle(f.x,f.y,f.w,f.h)),Point(s.x,s.y));sprite.frames[n].duration=group.durationMs/1000
  end
  table.insert(tags,{first=first,last=n,name=group.name.."_"..dir})
 end
end
for _,t in ipairs(tags)do sprite:newTag(t.first,t.last).name=t.name end
sprite:saveAs(root.."/assets/source/"..cfg.folder.."/body.aseprite");sprite:close();print('Saved '..n..' coherent cels')
