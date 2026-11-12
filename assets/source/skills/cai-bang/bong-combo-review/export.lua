-- Exports image-generated cels with registered feet, staff contact, and blast pivots.
local root = assert(app.params.root)
local subdir = '/skills/cai-bang/bong-combo-review/'
local source = root .. '/assets/source' .. subdir
local out = root .. '/assets/exports' .. subdir
local nativeBody = app.params.pack == 'native-body'
local editableOut
if nativeBody then
  editableOut = root .. '/assets/source/m3d-sprite-continuity/'
  out = root .. '/artifacts/m3d-sprite-continuity-export/bong/'
end
local beats = {'thrust', 'sweep', 'rising', 'overhead'}
local directions = {'right', 'left', 'down', 'up'}

local function round(n) return math.floor(n + 0.5) end
local function read(name) return Image{fromFile=source .. name .. '.png'} end
local function cell(image, column, row, rows)
  local x = math.floor((column - 1) * image.width / 4)
  local y = math.floor((row - 1) * image.height / rows)
  local w = math.floor(column * image.width / 4) - x
  local h = math.floor(row * image.height / rows) - y
  local cut = Image(w, h, ColorMode.RGB)
  cut:drawImage(image, Point(-x, -y))
  return cut
end

local function place(target, image, scaleX, scaleY, anchor, position)
  image:resize{
    width=round(image.width * scaleX),
    height=round(image.height * scaleY),
    method='bilinear',
  }
  target:drawImage(image, Point(
    position[1] - round(anchor[1] * scaleX),
    position[2] - round(anchor[2] * scaleY)
  ))
end

local function pack(name, width, height, clips, clipsPerRow, render)
  local sprite = Sprite(width, height, ColorMode.RGB)
  local layer = sprite.layers[1]
  layer.name = name .. ' | registered original raster'
  local columns = clipsPerRow * 4
  local total = 0
  for _, clip in ipairs(clips) do total = total + #clip.durations end
  local atlas = Image(columns * width, math.ceil(total / columns) * height, ColorMode.RGB)
  local frames = {}
  local frameIndex = 0
  for clipIndex, clip in ipairs(clips) do
    local firstFrame = frameIndex + 1
    for i, duration in ipairs(clip.durations) do
      local image = Image(width, height, ColorMode.RGB)
      render(image, clip, i)
      frameIndex = frameIndex + 1
      if frameIndex > 1 then sprite:newEmptyFrame(frameIndex) end
      sprite:newCel(layer, frameIndex, image, Point(0, 0))
      sprite.frames[frameIndex].duration = duration / 1000
      local x = ((frameIndex - 1) % columns) * width
      local y = math.floor((frameIndex - 1) / columns) * height
      atlas:drawImage(image, Point(x, y))
      frames[clip.name .. '_' .. (i - 1)] = {
        frame={x=x, y=y, w=width, h=height},
        rotated=false,
        trimmed=false,
        spriteSourceSize={x=0, y=0, w=width, h=height},
        sourceSize={w=width, h=height},
      }
    end
    local tag = sprite:newTag(firstFrame, frameIndex)
    tag.name = clip.name
  end
  sprite:saveAs((editableOut or source) .. name .. '.aseprite')
  atlas:saveAs(out .. name .. '.png')
  local f = assert(io.open(out .. name .. '.json', 'w'))
  f:write(json.encode({frames=frames, meta={size={w=atlas.width, h=atlas.height}, scale='1'}}))
  f:close()
end

if app.params.pack == 'pha-giap-lava' then
  local path = '/skills/cai-bang/pha-giap-lava/'
  source = root .. '/assets/source' .. path
  out = root .. '/assets/exports' .. path
  assert(loadfile(source .. 'export.lua'))(read, cell, place, pack)
  return
end

local bodySheets = {right=read('right'), down=read('down'), up=read('up'), upSmash=read('up-smash')}
local feet = {
  right={
    {{135,267},{111,267},{108,267},{133,267}},
    {{134,265},{124,266},{126,265},{115,265}},
    {{134,265},{117,267},{116,267},{125,267}},
    {{132,269},{112,269},{120,269},{118,269}},
  },
  down={
    {{153,261},{160,261},{155,261},{158,260}},
    {{156,260},{153,260},{146,260},{154,260}},
    {{155,261},{156,260},{155,259},{155,261}},
    {{154,263},{155,264},{156,264},{156,264}},
  },
  up={
    {{139,280},{135,280},{133,280},{137,280}},
    {{140,280},{137,280},{132,280},{134,280}},
    {{140,280},{137,280},{132,280},{136,280}},
    {{263,647},{253,647},{255,650},{261,651}},
  },
}
local scales = {right=0.218, down=0.213, up=0.237}
local body = {}
for _, direction in ipairs(directions) do
  for row, beat in ipairs(beats) do
    body[#body+1] = {
      name='combo_' .. beat .. '_' .. direction,
      direction=direction,
      row=row,
      durations=row == 4 and {100, 50, 50, 67} or {67, 67, 67, 66},
    }
  end
end
local density = nativeBody and 2 or 1
pack('body', 128 * density, 144 * density, body, nativeBody and 2 or 4, function(target, clip, i)
  local direction = clip.direction == 'left' and 'right' or clip.direction
  local smashRear = direction == 'up' and clip.row == 4
  local image = smashRear and cell(bodySheets.upSmash, i, 1, 1)
    or cell(bodySheets[direction], i, clip.row, 4)
  if clip.row == 2 and (i == 4 or (i == 3 and direction == 'down')) then
    -- Remove small spill from the preceding generated cell's staff tip.
    for y = 0, image.height - 1 do
      for x = 0, 11 do image:drawPixel(x, y, 0) end
    end
  end
  local scale = density * (smashRear and 0.128 or scales[direction])
  place(target, image, scale, scale, feet[direction][clip.row][i], {64 * density,104 * density})
  if clip.direction == 'left' then target:flip(FlipType.HORIZONTAL) end
end)

if nativeBody then return end

local trail = read('trail')
local trailAnchors = {
  {{107,175},{116,175},{119,173},{119,173}},
  {{128,191},{148,192},{145,192},{146,187}},
  {{107,206},{114,206},{128,204},{128,207}},
  {{170,69},{229,253},{222,249},{218,245}},
}
local trailPositions = {{64,64},{64,64},{64,64},{64,76}}
local trailClips = {}
for _, clip in ipairs(body) do
  if clip.row == 4 or clip.direction == 'left' or clip.direction == 'right' then
    trailClips[#trailClips+1] = clip
  end
end
pack('trail', 128, 112, trailClips, 4, function(target, clip, i)
  local image = cell(trail, i, clip.row, 4)
  local p = trailPositions[clip.row]
  if clip.row == 4 and i == 1 then p = {46,35} end
  local vertical = clip.direction == 'up' or clip.direction == 'down'
  local sx = ({0.16,0.24,0.24,vertical and 0.17 or 0.27})[clip.row]
  local sy = ({0.16,0.24,0.24,vertical and 0.2 or 0.27})[clip.row]
  place(target, image, sx, sy, trailAnchors[clip.row][i], p)
  if clip.direction == 'left' then target:flip(FlipType.HORIZONTAL) end
end)

local ground = read('ground')
local centers = {{224,279},{219,279},{210,282},{212,282},{226,269},{218,269},{217,269},{216,269}}
pack('ground', 112, 84, {{name='impact',durations={35,45,50,65,80,90,105,110}}}, 2,
  function(target, _, i)
    local image = cell(ground, (i - 1) % 4 + 1, i <= 4 and 1 or 2, 2)
    place(target, image, 0.216, 0.216, centers[i], {56,44})
  end)

local castClips = {}
local pull = read('pull')
local pullRow = {right=1, down=2, up=3}
local pullFeet = {{196,316},{197,314},{195,317}}
for _, direction in ipairs(directions) do
  castClips[#castClips+1] = {name='pull_' .. direction,direction=direction,durations={67,67,67,66}}
end
pack('pull', 128, 144, castClips, 4, function(target, clip, i)
  local direction = clip.direction == 'left' and 'right' or clip.direction
  local row = pullRow[direction]
  place(target, cell(pull,i,row,3), 0.161, 0.161, pullFeet[row], {64,104})
  if clip.direction == 'left' then target:flip(FlipType.HORIZONTAL) end
end)

local pha = read('pha')
for pixel in pha:pixels() do
  if app.pixelColor.rgbaA(pixel()) < 32 then pixel(0) end
end
local longClips = {}
for _, direction in ipairs(directions) do
  longClips[#longClips+1] = {name='pha_' .. direction,direction=direction,durations={100,100,100,700}}
end
local longPoses = {
  right={
    {crop={0,0,345,335},feet={149,285}},
    {crop={345,0,726,335},feet={442,285},hand={517,179},tip={712,72},to={185,-92}},
    {crop={726,0,1100,335},feet={802,283},hand={897,244},tip={1081,281},to={200,5}},
    {crop={1100,0,1536,335},feet={1198,282},hand={1264,229},tip={1470,270},to={200,5}},
  },
  down={
    {crop={0,335,350,686},feet={156,594}},
    {crop={350,335,735,686},feet={468,594},hand={520,488},tip={676,381},to={90,-88}},
    {crop={735,335,1105,686},feet={879,565},hand={886,541},tip={873,656},to={0,128}},
    {crop={1105,335,1536,686},feet={1269,570},hand={1273,539},tip={1259,646},to={0,128}},
  },
  up={
    {crop={0,686,350,1024},feet={155,930}},
    {crop={350,686,725,1024},feet={458,930},hand={538,823},tip={688,725},to={62,-111}},
    {rear=true,column=2,feet={253,647},hand={356,330},tip={400,126},to={2,-128}},
    {rear=true,column=3,feet={255,650},hand={324,363},tip={344,157},to={2,-128}},
  },
}

-- Remap only the part of the original raster pole beyond the hands. The ground
-- contact stays aligned with the existing V8 sweep and fissure.
local function fitShaft(target, old, from, tip, destination, halfWidth)
  local function axis(to)
    local dx,dy = to[1]-from[1],to[2]-from[2]
    local length = math.sqrt(dx*dx+dy*dy)
    return dx/length,dy/length,length
  end
  local sx,sy,sourceLength = axis(tip)
  local dx,dy,length = axis(destination)
  local function visit(to, work)
    for y = math.max(0, math.floor(math.min(from[2],to[2])-halfWidth-2)),
      math.min(target.height-1, math.ceil(math.max(from[2],to[2])+halfWidth+2)) do
      for x = math.max(0, math.floor(math.min(from[1],to[1])-halfWidth-2)),
        math.min(target.width-1, math.ceil(math.max(from[1],to[1])+halfWidth+2)) do
        work(x,y,x-from[1],y-from[2])
      end
    end
  end
  visit(tip, function(x,y,rx,ry)
    if rx*sx+ry*sy >= 0 and math.abs(-rx*sy+ry*sx) <= halfWidth then
      target:drawPixel(x,y,0)
    end
  end)
  visit(destination, function(x,y,rx,ry)
    local t,v = rx*dx+ry*dy,-rx*dy+ry*dx
    if t >= 0 and t <= length+halfWidth and math.abs(v) <= halfWidth then
      local endBand = 3
      local u = t >= length-endBand and t-length+sourceLength
        or t*(sourceLength-endBand)/(length-endBand)
      local ix,iy=round(from[1]+sx*u-sy*v),round(from[2]+sy*u+sx*v)
      if ix>=0 and ix<old.width and iy>=0 and iy<old.height then
        local px=old:getPixel(ix,iy)
        if app.pixelColor.rgbaA(px)>10 then target:drawPixel(x,y,px) end
      end
    end
  end)
end

pack('pha', 512, 448, longClips, 2, function(target, clip, i)
  local direction = clip.direction == 'left' and 'right' or clip.direction
  local pose = longPoses[direction][i]
  local scale = pose.rear and 0.128 or (direction == 'right' and 0.252 or 0.225)
  local x,y = 0,0
  local image
  if pose.rear then
    image = cell(bodySheets.upSmash,pose.column,1,1)
  else
    local r = pose.crop
    x,y = r[1],r[2]
    image = Image(pha,Rectangle(x,y,r[3]-x,r[4]-y))
  end
  local pivot = {256,224}
  place(target,image,scale,scale,{pose.feet[1]-x,pose.feet[2]-y},pivot)
  if pose.hand then
    local function point(p)
      return {pivot[1]+(p[1]-pose.feet[1])*scale,pivot[2]+(p[2]-pose.feet[2])*scale}
    end
    fitShaft(target,Image(target),point(pose.hand),point(pose.tip),
      {pivot[1]+pose.to[1],pivot[2]+pose.to[2]},pose.rear and 3 or 3.7)
  end
  if clip.direction == 'left' then target:flip(FlipType.HORIZONTAL) end
end)

-- New skill review assets use the same registration/export path in a sibling pack.
source = root .. '/assets/source/skills/cai-bang/bong-skill-review/'
out = root .. '/assets/exports/skills/cai-bang/bong-skill-review/'
local function cleanAlpha(image, cutoff)
  for pixel in image:pixels() do
    if app.pixelColor.rgbaA(pixel()) < cutoff then pixel(0) end
  end
  return image
end

local mach = cleanAlpha(read('long-mach'), 24)
local fan = {name='fan',durations={40,55,85,100}}
local fissure = {name='fissure',durations={60,120,175,310}}
pack('long-mach',256,160,{fan,fissure},2,function(target,clip,i)
  local x=math.floor((i-1)*mach.width/4)
  local w=math.floor(i*mach.width/4)-x
  local isFan=clip.name=='fan'
  local y=math.floor((isFan and 0 or 0.72)*mach.height)
  local h=math.floor((isFan and 0.69 or 1)*mach.height)-y
  local cut=Image(mach,Rectangle(x,y,w,h))
  local rootY=math.floor((isFan and 0.55 or 0.807)*mach.height)-y
  local rootX=math.floor(w*0.05)
  place(target,cut,200/(w*0.90),isFan and 0.32 or 0.25,{rootX,rootY},{20,120})
end)

local function blast(name, centers, durations)
  local sheet=cleanAlpha(read(name), 24)
  pack(name,256,172,{{name='impact',durations=durations}},2,function(target,_,i)
    local cut=cell(sheet,(i-1)%4+1,i<=4 and 1 or 2,2)
    place(target,cut,0.52,0.45,centers[i],{128,86})
  end)
end
blast('nham-chan',{{220,237},{222,237},{223,238},{226,239},
  {224,238},{225,238},{224,238},{223,238}},
  {35,40,50,65,90,110,140,150})
blast('nham-trieu',{{224,256},{224,258},{220,259},{220,259},
  {224,236},{224,237},{220,237},{220,237}},
  {32,42,55,75,100,135,185,215})

local contacts=cleanAlpha(read('contacts'), 100)
local contactClips={}
local contactRows={right=1,down=2,up=3}
local contactFeet={
  right={{310,368},{301,922}},
  down={{776,368},{771,922}},
  up={{1214,367},{1236,922}},
}
local staffTips={right={200,5},down={0,128},up={2,-128}}

-- The red/gold shaft samples authored pixels from the review's Phá Giáp pole.
-- Pin the far end to the existing gameplay-camera V8 socket.
local function extendContactStaff(target,from,to)
  local dx,dy=to[1]-from[1],to[2]-from[2]
  local length=math.sqrt(dx*dx+dy*dy)
  local ux,uy=dx/length,dy/length
  for y=math.floor(math.min(from[2],to[2])-3),math.ceil(math.max(from[2],to[2])+3) do
    for x=math.floor(math.min(from[1],to[1])-3),math.ceil(math.max(from[1],to[1])+3) do
      local rx,ry=x-from[1],y-from[2]
      local t,v=rx*ux+ry*uy,-rx*uy+ry*ux
      if t>=0 and t<=length+1 and math.abs(v)<2.6 then
        local s=t>=length-3 and (1+(t-length)/38) or t/(length-3)*0.92
        local px=pha:getPixel(round(902+179*s-0.2*v*3),round(244+37*s+v*3))
        if app.pixelColor.rgbaA(px)>32 then target:drawPixel(x,y,px) end
      end
    end
  end
end

for _, direction in ipairs(directions) do
  contactClips[#contactClips+1]={name='long_'..direction,direction=direction,row=1,durations={130}}
  contactClips[#contactClips+1]={name='stomp_'..direction,direction=direction,row=2,durations={310}}
end
pack('contacts',512,448,contactClips,2,function(target,clip)
  local direction=clip.direction=='left' and 'right' or clip.direction
  local col=contactRows[direction]
  local x0=math.floor((col-1)*contacts.width/3)
  local y0=math.floor((clip.row-1)*contacts.height/2)
  local x1=math.floor(col*contacts.width/3)
  local y1=math.floor(clip.row*contacts.height/2)
  local cut=Image(contacts,Rectangle(x0,y0,x1-x0,y1-y0))
  local foot=contactFeet[direction][clip.row]
  local pivot={256,224}
  local scale=clip.row==1 and 0.17 or 0.138
  local endpoint=staffTips[direction]
  local to={pivot[1]+endpoint[1],pivot[2]+endpoint[2]}
  if clip.row==1 and direction=='up' then
    extendContactStaff(target,{pivot[1],pivot[2]-19},to)
  end
  place(target,cut,scale,scale,{foot[1]-x0,foot[2]-y0},pivot)
  if clip.row==1 and direction~='up' then
    local from=direction=='right' and {272,222} or {256,223}
    extendContactStaff(target,from,to)
  end
  if clip.direction=='left' then target:flip(FlipType.HORIZONTAL) end
end)
