local root=app.params.root or "."
local function read(path)local f=assert(io.open(path,"r"));local value=json.decode(f:read("*a"));f:close();return value end
local folder=root.."/assets/exports/effects/nam_de_dark_v01/"
local atlas=read(folder.."effects.json")
local manifest=read(folder.."manifest.json")
local sheet=Image{fromFile=folder.."effects.png"}
local sprite=Sprite(512,512,ColorMode.RGB)
for i,entry in ipairs(manifest.frames) do
 if i>1 then sprite:newEmptyFrame(i) end
 local frame=atlas.frames[entry.name].frame
 sprite:newCel(sprite.layers[1],i,Image(sheet,Rectangle(frame.x,frame.y,frame.w,frame.h)),Point(0,0))
 sprite.frames[i].duration=.12
 local tag=sprite:newTag(i,i);tag.name=entry.name
end
sprite:saveAs(root.."/assets/source/effects/nam_de_dark_v01/effects.aseprite")
sprite:close()
