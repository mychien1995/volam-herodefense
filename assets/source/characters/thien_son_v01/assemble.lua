-- Assemble only newly generated original raster poses. No concept cropping or replacement drawing.
local root=app.params.root or '.'
if app.fs.isFile(root .. '/assets/approved_thien_son.lock.json') then
  error('Approved Thien Son baseline is locked; use a separately reviewed revision.')
end
local folder=root .. '/assets/source/characters/thien_son_v01'
local f=assert(io.open(folder .. '/source_components_v01.json','r'))
local sources=json.decode(f:read('*a'));f:close()
local g=assert(io.open(folder .. '/frame_sources_v01.json','r'))
local layout=json.decode(g:read('*a'));g:close()
local pc=app.pixelColor
for _,style in ipairs({'fan','dao'}) do
  local id=style=='fan' and 'hero_thien_son' or 'hero_thien_son_dao'
  local sprite=Sprite(80,80,ColorMode.RGB)
  local layer=sprite.layers[1];layer.name='Original generated pixels - aligned alpha-clean cels'
  local count=0;local tags={}
  for _,dir in ipairs({'down','left','right','up'}) do
    local key=dir .. '_' .. style
    local record=sources[key];local model=layout.sources[key]
    assert(record.components==10,'Expected 10 isolated poses in '..key)
    local source=Image{fromFile=folder .. '/' .. record.source}
    for _,state in ipairs({'idle','walk','basic_attack'}) do
      local first,last,ms=1,2,350
      if state=='walk' then first,last,ms=3,6,120 end
      if state=='basic_attack' then first,last,ms=7,10,75 end
      local start=count+1
      for i=first,last do
        local entry=record.frames[i];local b=entry.bounds
        local crop=Image(b[3]-b[1],b[4]-b[2],ColorMode.RGB)
        -- Exact connected source pixels, retaining source RGB; remove low-alpha generated halo.
        -- Runs isolate touching bounding boxes without copying any neighbouring character.
        for _,run in ipairs(entry.runs) do
          for x=run[2],run[3]-1 do
            local color=source:getPixel(x,run[1])
            crop:drawPixel(x-b[1],run[1]-b[2],pc.rgba(pc.rgbaR(color),pc.rgbaG(color),pc.rgbaB(color),255))
          end
        end
        local scale=model.scale
        local w=math.floor(crop.width*scale+0.5);local h=math.floor(crop.height*scale+0.5)
        crop:resize(w,h) -- nearest-neighbour, fixed scale per source, never fit each pose separately.
        local fx=math.floor((model.footX[i]-b[1])*scale+0.5)
        local fy=math.floor((entry.foot[2]-b[2])*scale+0.5)
        local ox,oy=40-fx,64-fy
        assert(ox>0 and oy>0 and ox+w<80 and oy+h<80,'Clipping '..key..'/'..i)
        local canvas=Image(80,80,ColorMode.RGB);canvas:drawImage(crop,Point(ox,oy))
        count=count+1;if count>1 then sprite:newEmptyFrame(count) end
        sprite:newCel(layer,count,canvas,Point(0,0));sprite.frames[count].duration=ms/1000
      end
      tags[#tags+1]={name=state..'_'..dir,from=start,to=count}
    end
  end
  for _,range in ipairs(tags) do local tag=sprite:newTag(range.from,range.to);tag.name=range.name;tag.aniDir=AniDir.FORWARD end
  local slice=sprite:newSlice(Rectangle(0,0,80,80));slice.name='feet';slice.pivot=Point(40,64)
  slice.data='Presentation ground contact only. No authoritative collision/damage change.'
  sprite:saveAs(folder..'/'..id..'.aseprite')
  print('Assembled '..id..': '..count..' distinct original cels, 12 tags, 80x80, pivot40,64')
end
