-- Align source raster cels and export genuine editable animation sources.
local root=app.params.root or '.'
local folder=root..'/assets/source/characters/vo_dang_v01'
local function read(path) local f=assert(io.open(path,'r'));local v=json.decode(f:read('*a'));f:close();return v end
local sources=read(folder..'/source_components_v01.json')
local layout=read(folder..'/frame_sources_v01.json')
if app.fs.isFile(root..'/assets/approved_vo_dang.lock.json') then error('Approved Vo Dang is locked; use a separately reviewed revision.') end
local pc=app.pixelColor
for _,style in ipairs({'quyen','kiem'}) do
  local id=style=='quyen' and 'hero_vo_dang' or 'hero_vo_dang_kiem'
  local width=style=='kiem' and 96 or 80
  local pivot=width/2
  local sprite=Sprite(width,80,ColorMode.RGB)
  local layer=sprite.layers[1];layer.name='Original generated poses - aligned source pixels'
  local count=0;local tags={};local lastTag=nil
  for _,frame in ipairs(layout.frames) do
    if frame.style==style then
      local record=sources[frame.source];local entry=record.frames[frame.component+1];local b=entry.bounds
      local source=Image{fromFile=folder..'/'..record.source}
      local crop=Image(b[3]-b[1],b[4]-b[2],ColorMode.RGB)
      for _,run in ipairs(entry.runs) do
        for x=run[2],run[3]-1 do
          local c=source:getPixel(x,run[1])
          crop:drawPixel(x-b[1],run[1]-b[2],pc.rgba(pc.rgbaR(c),pc.rgbaG(c),pc.rgbaB(c),255))
        end
      end
      local w=math.floor(crop.width*frame.scale+0.5);local h=math.floor(crop.height*frame.scale+0.5)
      crop:resize(w,h)
      local fx=math.floor((frame.sourceFoot[1]-b[1])*frame.scale+0.5)
      local fy=math.floor((frame.sourceFoot[2]-b[2])*frame.scale+0.5)
      local ox,oy=pivot-fx,64-fy
      assert(ox>0 and oy>0 and ox+w<width and oy+h<80,'Clipped '..style..'/'..frame.name..' at '..ox..','..oy..' size '..w..','..h)
      count=count+1;if count>1 then sprite:newEmptyFrame(count) end
      sprite:newCel(layer,count,crop,Point(ox,oy));sprite.frames[count].duration=frame.durationMs/1000
      local name=frame.state..'_'..frame.direction
      if name~=lastTag then tags[#tags+1]={name=name,from=count,to=count};lastTag=name else tags[#tags].to=count end
    end
  end
  for _,range in ipairs(tags) do local tag=sprite:newTag(range.from,range.to);tag.name=range.name;tag.aniDir=AniDir.FORWARD end
  local slice=sprite:newSlice(Rectangle(0,0,width,80));slice.name='feet';slice.pivot=Point(pivot,64)
  slice.data='Presentation-only ground contact, no authoritative timing or collision.'
  sprite:saveAs(folder..'/'..id..'.aseprite')
  print('Assembled '..id..': '..count..' cels, '..#tags..' tags')
end
