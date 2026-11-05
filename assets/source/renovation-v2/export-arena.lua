local root=app.params.root or '.';local pc=app.pixelColor
local raw=Image{fromFile=root..'/assets/source/renovation-v2/raw/arena-materials.png'}
local cw,ch=math.floor(raw.width/2),math.floor(raw.height/2)
local grass={Image(raw,Rectangle(0,0,cw,ch)),Image(raw,Rectangle(cw,0,cw,ch))}
local stone={Image(raw,Rectangle(0,ch,cw,ch)),Image(raw,Rectangle(cw,ch,cw,ch))}
for _,tiles in ipairs({grass,stone}) do for _,tile in ipairs(tiles) do tile:resize{width=512,height=512,method='bilinear'} end end
local floor=Image(3200,2304);local paving=Image(3200,2304)
for y=0,2303,512 do for x=0,3199,512 do local i=(math.floor(x/512)+math.floor(y/512))%2+1
  floor:drawImage(grass[i],Point(x,y));paving:drawImage(stone[i],Point(x,y))
end end
-- Retained arena ground footprint: center (800,616), radius288, roads160 wide.
-- Author-created material detail changes; world mask and anchors do not.
for p in paving:pixels() do
  local dx,dy=math.abs(p.x-1600),math.abs(p.y-1232)
  local inside=dx<=160 or dy<=160 or dx*dx+dy*dy<=576*576
  if not inside then p(0) end
end
floor:drawImage(paving,Point(0,0))
floor:saveAs(root..'/assets/exports/renovation-v2/arena-ground.png')
local sprite=Sprite(3200,2304,ColorMode.RGB)
sprite:newCel(sprite.layers[1],1,floor,Point(0,0));sprite:saveAs(root..'/assets/source/renovation-v2/arena-ground.aseprite');sprite:close()
print('V2 original arena layout exported at density2')
