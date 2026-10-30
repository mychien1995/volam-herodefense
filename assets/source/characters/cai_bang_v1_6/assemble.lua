-- Aseprite assembly/cleanup of newly generated original PNG poses.
-- Never draws character geometry or samples the director's concept sheet.
local root = app.params.root or '.'
if app.fs.isFile(root .. '/assets/approved_cai_bang.lock.json') then
  error('Approved Cai Bang baseline is locked; do not regenerate it.')
end
local folder = root .. '/assets/source/characters/cai_bang_v1_6'
local source = {
  main = Image{fromFile=folder .. '/generated/corrected.png'},
  side = Image{fromFile=folder .. '/generated/left.png'},
  front = Image{fromFile=folder .. '/generated/front_attack.png'},
  sweep = Image{fromFile=folder .. '/generated/left_sweep.png'}
}
local metadataFile=assert(io.open(folder .. '/frame_sources_v2.json','r'))
local sweep=json.decode(metadataFile:read('*a')).sweep
metadataFile:close()
local sprite = Sprite(80, 80, ColorMode.RGB)
local layer = sprite.layers[1]
layer.name = 'Generated original character - aligned pixel cels'
local pc = app.pixelColor
local frames = {}
local ranges = {}
-- Each entry: image, left/top/right/bottom, foot X/Y, fixed scale.
-- Explicit source bounds handle the generator's uneven cell spacing.
local down = {
  {42,38,162,194,106,194}, {221,38,341,194,285,194},
  {409,38,528,194,474,194}, {594,38,713,194,658,194},
  {780,38,899,195,845,195}, {965,38,1086,194,1031,194}
}
local up = {
  {49,599,159,757,102,757}, {227,600,339,757,282,757},
  {415,599,529,758,471,758}, {602,599,714,758,657,758},
  {786,599,901,758,843,758}, {972,600,1089,757,1028,757},
  {1175,590,1304,757,1222,757}, {1373,599,1555,758,1427,758},
  {1582,599,1722,758,1632,758}, {1823,599,1935,757,1878,757}
}
local side = {
  {33,75,343,376,183,376}, {403,76,713,377,554,377},
  {825,73,1147,374,984,374}, {1235,76,1549,380,1380,380},
  {1636,75,1954,374,1778,374}, {33,432,341,731,185,731},
  {402,442,723,725,556,725}, {766,442,1141,728,1009,728},
  {1219,442,1581,734,1419,734}, {1640,432,1949,728,1786,728}
}
local front = {
  {307,48,683,508,523,508}, {909,120,1204,554,1038,508},
  {325,576,734,956,530,956}, {931,573,1206,949,1063,949}
}
local function prepare(image, b, scale, mirror)
  local width, height = b[3]-b[1], b[4]-b[2]
  local cropped = Image(width, height, ColorMode.RGB)
  -- Remove low-alpha generated halo, retaining only existing source colors.
  for y=0,height-1 do
    for x=0,width-1 do
      local c = image:getPixel(b[1]+x,b[2]+y)
      if pc.rgbaA(c) >= 220 then
        cropped:drawPixel(x,y,pc.rgba(pc.rgbaR(c),pc.rgbaG(c),pc.rgbaB(c),255))
      end
    end
  end
  local w, h = math.floor(width*scale+0.5), math.floor(height*scale+0.5)
  cropped:resize(w,h) -- nearest neighbour, no new illustration generated
  local fx, fy = math.floor((b[5]-b[1])*scale+0.5), math.floor((b[6]-b[2])*scale+0.5)
  if mirror then cropped:flip(FlipType.HORIZONTAL); fx=w-fx end
  local canvas = Image(80,80,ColorMode.RGB)
  local px, py = 40-fx, 64-fy
  assert(px >= 0 and py >= 0 and px+w <= 80 and py+h <= 80, 'Frame would clip')
  canvas:drawImage(cropped,Point(px,py))
  return canvas
end
local function append(image,b,scale,mirror,duration)
  local number=#frames+1
  if number>1 then sprite:newEmptyFrame(number) end
  local canvas=prepare(image,b,scale,mirror)
  sprite:newCel(layer,number,canvas,Point(0,0))
  sprite.frames[number].duration=duration
  frames[number]=canvas
end
for _,dir in ipairs({'down','left','right','up'}) do
  for _,state in ipairs({'idle','walk','basic_attack'}) do
    local start=#frames+1
    local first,last,duration=1,2,0.35
    if state=='walk' then first,last,duration=3,6,0.12 end
    if state=='basic_attack' then first,last,duration=7,10,0.075 end
    if state=='basic_attack' and (dir=='left' or dir=='right') then
      first,last,duration=7,12,0.05 -- Six sweeping poses; same 300ms presentation duration.
    end
    for i=first,last do
      if state=='basic_attack' and (dir=='left' or dir=='right') then
        append(source.sweep,sweep[i-6],0.131,dir=='right',duration)
      elseif dir=='down' and state=='basic_attack' then
        append(source.front,front[i-6],0.1135,false,duration)
      elseif dir=='down' then
        append(source.main,down[i],0.282,false,duration)
      elseif dir=='up' then
        append(source.main,up[i],0.278,false,duration)
      else
        append(source.side,side[i],0.146,dir=='right',duration)
      end
    end
    ranges[#ranges+1]={start,#frames,state .. '_' .. dir}
  end
end
-- Create tags after inserting every frame: Aseprite extends end tags on insertion.
for _,range in ipairs(ranges) do
  local tag=sprite:newTag(range[1],range[2])
  tag.name=range[3]
  tag.aniDir=AniDir.FORWARD
end
local slice=sprite:newSlice(Rectangle(0,0,80,80))
slice.name='feet'
slice.pivot=Point(40,64)
slice.data='Ground contact; visual footprint only. Server collision is unchanged.'
sprite:saveAs(folder .. '/hero_cai_bang.aseprite')
frames[1]:saveAs(root .. '/assets/exports/characters/hero_cai_bang_idle.png')
print('Assembled '..#frames..' original raster poses, 12 tags, 80x80, foot pivot 40,64')
