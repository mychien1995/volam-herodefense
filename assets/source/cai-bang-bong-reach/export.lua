-- Native Bổng frames from the retained locomotion and combo raster. Preserve hand and feet anchors.
local root = assert(app.params.root)
local source = root .. '/assets/source/cai-bang-bong-reach/'
local output = root .. '/assets/exports/cai-bang-bong-reach/'
local export = root .. '/assets/exports/'
local pc = app.pixelColor
local function readJson(path)
  local file = assert(io.open(path, 'r'))
  local value = json.decode(file:read('*a'))
  file:close()
  return value
end
local function writeJson(path, value)
  local file = assert(io.open(path, 'w'))
  file:write(json.encode(value))
  file:close()
end

local function atlas(path)
  return {
    image = Image{fromFile=export .. path .. '.png'},
    frames = readJson(export .. path .. '.json').frames,
  }
end
local idle = atlas('renovation-v1/runtime/hero_cai_bang')
local combo = atlas('m3d-sprite-continuity/body')
local staffArt = Image{fromFile=root .. '/assets/source/skills/cai-bang/bong-combo-review/right.png'}
local plan = readJson(source .. 'staff-poses.json')
local W,H,PX,PY = 384,320,192,235
local function round(n) return math.floor(n + .5) end

local function sample(image, x, y, keep)
  local x0,y0 = math.floor(x),math.floor(y)
  local red,green,blue,alpha = 0,0,0,0
  for dy=0,1 do for dx=0,1 do
    local u,v=x0+dx,y0+dy
    if u>=0 and v>=0 and u<image.width and v<image.height and (not keep or keep(u,v)) then
      local c=image:getPixel(u,v)
      local w=(dx==0 and 1-(x-x0) or x-x0)*(dy==0 and 1-(y-y0) or y-y0)*pc.rgbaA(c)
      red,green,blue,alpha=red+pc.rgbaR(c)*w,green+pc.rgbaG(c)*w,blue+pc.rgbaB(c)*w,alpha+w
    end
  end end
  if alpha < 1 then return 0 end
  return pc.rgba(round(red/alpha),round(green/alpha),round(blue/alpha),round(alpha))
end

local function stretch(image, spec, extension, isolate)
  local ax,ay,bx,by,span=table.unpack(spec)
  local dx,dy=bx-ax,by-ay
  local length=math.sqrt(dx*dx+dy*dy)
  local ux,uy=dx/length,dy/length
  local vx,vy=-uy,ux
  local cut=length-span
  -- Refine the shaft centerline from its exposed pixels, well beyond the grip.
  local sumT,sumV,sumTV,sumTT,count=0,0,0,0,0
  for y=0,image.height-1 do for x=0,image.width-1 do
    local t=(x-ax)*ux+(y-ay)*uy
    local v=(x-ax)*vx+(y-ay)*vy
    if t>cut+4 and t<length-4 and math.abs(v)<6 and pc.rgbaA(image:getPixel(x,y))>135 then
      sumT,sumV,sumTV,sumTT,count=sumT+t,sumV+v,sumTV+t*v,sumTT+t*t,count+1
    end
  end end
  local slope = count>4 and (sumTV-sumT*sumV/count)/(sumTT-sumT*sumT/count) or 0
  slope=math.max(-.08,math.min(.08,slope))
  local center = count>4 and (sumV-slope*sumT)/count or 0
  local keep
  if isolate then
    center,slope=0,0
    keep=function(x,y)
      local v=(x-ax)*vx+(y-ay)*vy
      return v>=-3.25 and v<=3.6
    end
  end
  local desired=length*(1+extension)
  local result=Image(image)
  local cap=4
  local changed=0
  for y=0,image.height-1 do for x=0,image.width-1 do
    local t=(x-ax)*ux+(y-ay)*uy
    local v=(x-ax)*vx+(y-ay)*vy-center-slope*t
    if t>=cut and t<=desired+6 and math.abs(v)<(isolate and 4.6 or 6.4) then
      local mapped = t >= desired-cap and t-(desired-length)
        or cut+(t-cut)*(length-cap-cut)/(desired-cap-cut)
      local width = 1+.1*math.min(1,(t-cut)/4)
      local offset=v/width+center+slope*mapped
      local c=sample(image,ax+ux*mapped+vx*offset,ay+uy*mapped+vy*offset,keep)
      result:drawPixel(x,y,c)
      changed=changed+1
    end
  end end
  return result, {
    oldLength=length, newLength=desired, widthRatio=1.1, changed=changed,
    gripProtectedBefore=cut, tip={ax+ux*desired+vx*(center+slope*desired),ay+uy*desired+vy*(center+slope*desired)},
  }
end

-- Transfer the lacquer, dragon and bands from the authored thrust staff.
-- The existing standing raster supplies the silhouette and occlusion at the grip.
local function finishIdleStaff(image, spec, info)
  local ax,ay=spec[1],spec[2]
  local dx,dy=info.tip[1]-ax,info.tip[2]-ay
  local length=info.newLength
  local ux,uy=dx/length,dy/length
  local vx,vy=-uy,ux
  local upperStart,lowerEnd=39,27
  local decorated=0
  for y=math.floor(info.tip[2])-2,ay+1 do
    for x=math.floor(math.min(ax,info.tip[1]))-4,math.ceil(math.max(ax,info.tip[1]))+4 do
      local t=(x-ax)*ux+(y-ay)*uy
      local v=(x-ax)*vx+(y-ay)*vy
      if v>=-2.65 and v<=3.35 and t>=-1 and t<=length+1 then
        local u
        if t>=upperStart then
          u=506+(t-upperStart)/(length-upperStart)*101
        elseif t<=lowerEnd then
          u=607-t*.86
        end
        local original=image:getPixel(x,y)
        local alpha=pc.rgbaA(original)
        if u and alpha>0 then
          local center=175-(u-500)*.034
          local paint=sample(staffArt,u,center+v*2.12)
          if pc.rgbaA(paint)>200 then
            image:drawPixel(x,y,pc.rgba(pc.rgbaR(paint),pc.rgbaG(paint),pc.rgbaB(paint),alpha))
            decorated=decorated+1
          end
        end
      end
    end
  end
  return decorated
end


local editable=Sprite(W,H,ColorMode.RGB)
editable.layers[1].name='Cái Bang Bổng | thân, tay và bổng đã căn theo chân'
local frames, cells, tags = {}, {}, {}
local directions={'right','left','down','up'}
local beats={'thrust','sweep','rising','overhead'}

local function baseCel(sheet,key,pivotX,pivotY)
  local f=assert(sheet.frames[key],key)
  local rect=f.frame
  local image=Image(W,H,ColorMode.RGB)
  local crop=Image(sheet.image,Rectangle(rect.x,rect.y,rect.w,rect.h))
  local x,y=PX-pivotX,PY-pivotY
  image:drawImage(crop,Point(x+f.spriteSourceSize.x,y+f.spriteSourceSize.y))
  return image,x,y
end

local function makeCel(key,direction,pose,frameIndex)
  local locomotion=pose=='idle' or pose=='walk'
  local image,x,y
  if locomotion then
    image,x,y=baseCel(idle,key,160,224)
  else
    image,x,y=baseCel(combo,key,128,208)
  end
  if not locomotion and direction=='left' then
    -- Retain the established Bổng left-facing mirror and shared feet anchor.
    local right=assert(cells['combo_'..pose..'_right_'..frameIndex])
    local mirrored=Image(W,H,ColorMode.RGB)
    local box=right.image:shrinkBounds()
    for py=box.y,box.y+box.height-1 do
      for px=box.x,box.x+box.width-1 do
        mirrored:drawPixel(2*PX-1-px,py,right.image:getPixel(px,py))
      end
    end
    return mirrored,right.duration
  end

  local spec={table.unpack(assert(plan[key]))}
  for i=1,4 do spec[i]=spec[i]+(i%2==1 and x or y) end
  local revised,info=stretch(image,spec,.5,locomotion)
  if locomotion then
    revised=stretch(revised,{spec[3],spec[4],spec[1],spec[2],25},0)
    info.decoratedPixels=finishIdleStaff(revised,spec,info)
    assert(info.decoratedPixels>220,key..': incomplete lacquer transfer')
  end
  if key=='combo_sweep_down_3' then
    -- A few pixels from the preceding weapon tip survived the old sheet crop.
    for py=217,231 do for px=129,140 do revised:drawPixel(px,py,0) end end
  end
  local duration = locomotion and (pose=='idle' and 350 or 110)
    or (pose=='overhead' and ({100,50,50,67})[frameIndex+1])
    or ({67,67,67,66})[frameIndex+1]
  return revised,duration
end

local function clip(tag,direction,pose,count)
  local first=#frames+1
  for i=0,count-1 do
    local key=tag..'_'..i
    local image,duration=makeCel(key,direction,pose,i)
    local bounds=image:shrinkBounds()
    assert(bounds.x>0 and bounds.y>0 and bounds.x+bounds.width<W and bounds.y+bounds.height<H,key)
    local frame={key=key,image=image,duration=duration,bounds=bounds}
    frames[#frames+1]=frame
    cells[key]=frame
    local index=#frames
    if index>1 then editable:newEmptyFrame(index) end
    editable:newCel(editable.layers[1],index,image,Point(0,0))
    editable.frames[index].duration=duration/1000
  end
  editable:newTag(first,#frames).name=tag
  tags[#tags+1]={name=tag,from=first-1,to=#frames-1,direction='forward'}
end

for _,direction in ipairs(directions) do
  clip('idle_'..direction,direction,'idle',1)
  clip('walk_'..direction,direction,'walk',4)
  for _,beat in ipairs(beats) do clip('combo_'..beat..'_'..direction,direction,beat,4) end
end

local atlasWidth=1024
local x,y,rowHeight=2,2,0
local entries={}
for _,cell in ipairs(frames) do
  local b=cell.bounds
  if x+b.width+2>atlasWidth then x,y,rowHeight=2,y+rowHeight+4,0 end
  entries[cell.key]={
    frame={x=x,y=y,w=b.width,h=b.height},rotated=false,trimmed=true,
    spriteSourceSize={x=b.x,y=b.y,w=b.width,h=b.height},
    sourceSize={w=W,h=H},duration=cell.duration,
  }
  x=x+b.width+4
  rowHeight=math.max(rowHeight,b.height)
end
local atlas=Image(atlasWidth,y+rowHeight+2,ColorMode.RGB)
for _,cell in ipairs(frames) do
  local f=entries[cell.key].frame
  atlas:drawImage(Image(cell.image,cell.bounds),Point(f.x,f.y))
end
editable:saveAs(source..'bong.aseprite')
atlas:saveAs(output..'bong.png')
writeJson(output..'bong.json',{frames=entries,meta={
  size={w=atlas.width,h=atlas.height},scale='1',pivot={PX,PY},frameTags=tags,
}})
print('Cái Bang Bổng: '..#frames..' native cels')
