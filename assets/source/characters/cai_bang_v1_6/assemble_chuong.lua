-- Assemble newly generated unarmed/palm art; never sample concept-sheet pixels.
local root=app.params.root or '.'
if app.fs.isFile(root .. '/assets/approved_cai_bang.lock.json') then
  error('Approved Cai Bang baseline is locked; do not regenerate it.')
end
local folder=root .. '/assets/source/characters/cai_bang_v1_6'
local main=Image{fromFile=folder .. '/generated/chuong.png'}
local front=Image{fromFile=folder .. '/generated/chuong_front.png'}
local file=assert(io.open(folder .. '/frame_sources_v2.json','r'))
local poses=json.decode(file:read('*a'));file:close()
local sprite=Sprite(80,80,ColorMode.RGB)
local layer=sprite.layers[1]
layer.name='Generated original Chuong - unarmed pixel cels'
local pc=app.pixelColor
local count=0
local ranges={}
local function append(source,b,scale,mirror,duration)
  local w,h=b[3]-b[1],b[4]-b[2]
  local image=Image(w,h,ColorMode.RGB)
  for y=0,h-1 do for x=0,w-1 do
    local c=source:getPixel(b[1]+x,b[2]+y)
    if pc.rgbaA(c)>=220 then image:drawPixel(x,y,pc.rgba(pc.rgbaR(c),pc.rgbaG(c),pc.rgbaB(c),255)) end
  end end
  w,h=math.floor(w*scale+0.5),math.floor(h*scale+0.5)
  image:resize(w,h)
  local fx=math.floor((b[5]-b[1])*scale+0.5)
  local fy=math.floor((b[6]-b[2])*scale+0.5)
  if mirror then image:flip(FlipType.HORIZONTAL);fx=w-fx end
  local x,y=40-fx,64-fy
  assert(x>=0 and y>=0 and x+w<=80 and y+h<=80,'Chuong frame would clip')
  local canvas=Image(80,80,ColorMode.RGB)
  canvas:drawImage(image,Point(x,y))
  count=count+1
  if count>1 then sprite:newEmptyFrame(count) end
  sprite:newCel(layer,count,canvas,Point(0,0))
  sprite.frames[count].duration=duration
end
for _,dir in ipairs({'down','left','right','up'}) do
  for _,state in ipairs({'idle','walk','basic_attack'}) do
    local first,last,duration=1,2,0.35
    if state=='walk' then first,last,duration=3,6,0.12 end
    if state=='basic_attack' then first,last,duration=7,10,0.075 end
    local start=count+1
    for i=first,last do
      if dir=='down' and state=='basic_attack' then append(front,poses.front[i-6],0.098,false,duration)
      elseif dir=='down' then append(main,poses.down[i],0.254,false,duration)
      elseif dir=='up' then append(main,poses.up[i],0.259,false,duration)
      else append(main,poses.left[i],0.265,dir=='right',duration) end
    end
    ranges[#ranges+1]={start,count,state .. '_' .. dir}
  end
end
for _,range in ipairs(ranges) do
  local tag=sprite:newTag(range[1],range[2]);tag.name=range[3];tag.aniDir=AniDir.FORWARD
end
local slice=sprite:newSlice(Rectangle(0,0,80,80))
slice.name='feet';slice.pivot=Point(40,64)
slice.data='Ground contact; presentation only. Server collision unchanged.'
sprite:saveAs(folder .. '/hero_cai_bang_chuong.aseprite')
print('Assembled '..count..' unarmed Chuong cels, 12 tags, 80x80, pivot 40,64')
