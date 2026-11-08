-- Raster registration and staff deformation for the approved lava strike.
local read, cell, place, pack = ...
local color = app.pixelColor
local rgbaA = color.rgbaA
local reach, density = 0.6, 2
local function round(n) return math.floor(n + 0.5) end

local function clean(image, cutoff, solid)
  for pixel in image:pixels() do
    local value = pixel()
    local alpha = rgbaA(value)
    if alpha < cutoff then
      pixel(0)
    elseif solid and alpha >= 248 and alpha < 255 then
      pixel(color.rgba(color.rgbaR(value),color.rgbaG(value),color.rgbaB(value),255))
    end
  end
  return image
end

local poses = clean(read('poses'), 108)
local rows = {right={0,355}, down={355,790}, up={790,1247}}
local feet = {
  right={{193,342},{554,342},{973,342}},
  down={{212,738},{625,734},{1034,732}},
  up={{211,1190},{612,1190},{1038,1190}},
}
local shafts = {
  right={
    {grip={620,250}, erase={620,215,840,345}, tip={175,-24}, bow=9},
    {grip={1050,274}, erase={1050,250,1261,350}, tip={200,5}, bow=6},
  },
  down={
    {grip={628,682}, erase={598,682,647,790}, tip={5,98}, bow=8},
    {grip={1034,680}, erase={1015,680,1054,790}, tip={0,128}, bow=4},
  },
  up={
    {grip={653,947}, erase={641,790,732,947}, tip={34,-103}, bow=-8},
    {grip={1038,946}, erase={1021,790,1056,946}, tip={2,-128}, bow=-4},
  },
}
-- Preserve the part held in the hands and shorten the exposed windup shaft.
local raisedShafts = {
  right={grip={191,91}, erase={95,0,223,90}, tip={162,63}},
  down={grip={214,461}, erase={193,355,232,461}, tip={213,428}},
  up={grip={209,898}, erase={187,790,232,898}, tip={209,846}},
}

-- Sample the authored red lacquer, dragon motif and end band from the front
-- contact cel. Stretch the shaft along a bow, leaving the end band undistorted.
local function drawShaft(target, x, y, tip, bow)
  local dx,dy = tip[1]-x,tip[2]-y
  local length = math.sqrt(dx*dx+dy*dy)
  local ux,uy = dx/length,dy/length
  local cap = 5*density
  local halfWidth = 3.4*density
  local padding = math.abs(bow)+halfWidth+2
  for py=math.floor(math.min(y,tip[2])-padding),math.ceil(math.max(y,tip[2])+padding) do
    for px=math.floor(math.min(x,tip[1])-padding),math.ceil(math.max(x,tip[1])+padding) do
      local rx,ry=px-x,py-y
      local along=rx*ux+ry*uy
      local t=along/length
      if t>=0 and t<=1 then
        local across=-rx*uy+ry*ux-4*t*(1-t)*bow
        if math.abs(across)<=halfWidth then
          local sampleY=along>length-cap and 783-(length-along)*25/cap
            or 682+76*along/(length-cap)
          local pixel=poses:getPixel(round(1034+across*5/density),round(sampleY))
          if rgbaA(pixel)>10 then target:drawPixel(px,py,pixel) end
        end
      end
    end
  end
end

local clips={}
for _, direction in ipairs({'right','left','down','up'}) do
  clips[#clips+1]={name='slam_'..direction, direction=direction, durations={100,100,100}}
end

pack('body',544,384,clips,1,function(target,clip,i)
  local direction=clip.direction=='left' and 'right' or clip.direction
  local x=math.floor((i-1)*poses.width/3)
  local w=math.floor(i*poses.width/3)-x
  local y,last=table.unpack(rows[direction])
  local cut=Image(poses,Rectangle(x,y,w,last-y))
  local foot=feet[direction][i]
  local pivot={272,192}
  local scale=(direction=='down' and 0.159 or 0.179)*density
  local shaft=i==1 and raisedShafts[direction] or shafts[direction][i-1]
  local x1,y1,x2,y2=table.unpack(shaft.erase)
  cut:clear(Rectangle(x1-x,y1-y,x2-x1,y2-y1))
  local function at(point)
    return {pivot[1]+(point[1]-foot[1])*scale,pivot[2]+(point[2]-foot[2])*scale}
  end
  local grip=at(shaft.grip)
  local tip=i==1 and at(shaft.tip) or {
    pivot[1]+round(shaft.tip[1]*reach*density),
    pivot[2]+round(shaft.tip[2]*reach*density),
  }
  drawShaft(target,grip[1],grip[2],tip,(shaft.bow or 0)*reach*density)
  place(target,cut,scale,scale,{foot[1]-x,foot[2]-y},pivot)
  clean(target,8,true)
  if clip.direction=='left' then target:flip(FlipType.HORIZONTAL) end
end)

local effects=clean(read('effects'), 42)
local anchors={trail={{332,408},{333,408},{332,408},{334,408}},
  impact={{222,369},{197,369},{193,369},{211,370}}}
pack('effects',256,224,{
  {name='trail',durations={33,67,54,66}},
  {name='impact',durations={45,100,125,245}},
},2,function(target,clip,i)
  local trail=clip.name=='trail'
  local cut=cell(effects,i,trail and 1 or 2,2)
  local scale=trail and 0.31 or 0.23
  place(target,cut,scale,scale,anchors[clip.name][i],{152,170})
end)
