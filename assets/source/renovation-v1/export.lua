local root=app.params.root or "."
local source=root.."/assets/source/renovation-v1"
local dest=root.."/assets/exports/renovation-v1"
app.fs.makeDirectory(dest)
app.fs.makeDirectory(source.."/editable")
local function read(path)
  local file=assert(io.open(path,"r"));local data=json.decode(file:read("*a"));file:close();return data
end
local function write(path,data)
  local file=assert(io.open(path,"w"));file:write(json.encode(data));file:close()
end
local pc=app.pixelColor
local function clean(image,cutoff)
  for entry in image:pixels() do if pc.rgbaA(entry())<cutoff then entry(0) end end
  return image
end
local function reduce(image,factor)
  image:resize{width=math.max(1,math.floor(image.width*factor+0.5)),height=math.max(1,math.floor(image.height*factor+0.5)),method="bilinear"}
  return clean(image,4)
end
local function silhouette(image)
  -- Keep authored edge alpha within three source pixels of the solid drawing.
  -- Background haze never becomes a visible rectangular cel after reduction.
  local width,height=image.width,image.height
  local solid,horizontal={},{}
  for y=0,height-1 do for x=0,width-1 do
    if pc.rgbaA(image:getPixel(x,y))>=224 then solid[y*width+x]=true end
  end end
  for y=0,height-1 do
    local count=0
    for x=0,2 do if solid[y*width+x] then count=count+1 end end
    for x=0,width-1 do
      if x+3<width and solid[y*width+x+3] then count=count+1 end
      if x-4>=0 and solid[y*width+x-4] then count=count-1 end
      if count>0 then horizontal[y*width+x]=true end
    end
  end
  for x=0,width-1 do
    local count=0
    for y=0,2 do if horizontal[y*width+x] then count=count+1 end end
    for y=0,height-1 do
      if y+3<height and horizontal[(y+3)*width+x] then count=count+1 end
      if y-4>=0 and horizontal[(y-4)*width+x] then count=count-1 end
      if count==0 then image:putPixel(x,y,0) end
    end
  end
  return clean(image,32)
end
local catalog=read(source.."/catalog.json")
local layout=read(source.."/layout.json")
local exported={}
for _,actor in ipairs(catalog.actors) do
  local definition=layout.actors[actor.id]
  if definition then
    local original=Image{fromFile=root.."/"..actor.raw}
    local width,height,pivotX,pivotY=320,256,160,224
    local sprite=Sprite(width,height)
    local sheet=Image(width*5,height*4)
    local metadata={frames={},meta={image=actor.id..".png",size={w=width*5,h=height*4},scale="1"}}
    local frameIndex=0
    for rowIndex,row in ipairs(definition.rows) do
      for columnIndex,cel in ipairs(row.cels) do
        local b,s=cel.bounds,cel.source
        local crop=silhouette(Image(original,Rectangle(s[1]+b[1],s[2]+b[2],b[3]-b[1],b[4]-b[2])))
        crop=reduce(crop,row.scale)
        local x=math.floor(pivotX-(cel.feet[1]-b[1])*row.scale+0.5)
        local y=math.floor(pivotY-(cel.feet[2]-b[2])*row.scale+0.5)
        assert(x>1 and y>1 and x+crop.width<width-1 and y+crop.height<height-1,"Clipped "..actor.id.." "..row.direction)
        local canvas=Image(width,height);canvas:drawImage(crop,Point(x,y))
        local state=columnIndex==1 and "idle" or "walk"
        local name=state.."_"..row.direction.."_"..(columnIndex==1 and 0 or columnIndex-2)
        frameIndex=frameIndex+1
        if frameIndex>1 then sprite:newEmptyFrame(frameIndex) end
        sprite:newCel(sprite.layers[1],frameIndex,canvas,Point(0,0))
        sprite.frames[frameIndex].duration=state=="idle" and 0.35 or 0.11
        local tag=sprite:newTag(frameIndex,frameIndex);tag.name=name
        local sx,sy=(columnIndex-1)*width,(rowIndex-1)*height
        sheet:drawImage(canvas,Point(sx,sy))
        metadata.frames[name]={frame={x=sx,y=sy,w=width,h=height},sourceSize={w=width,h=height},spriteSourceSize={x=0,y=0,w=width,h=height},rotated=false,trimmed=false,duration=state=="idle" and 350 or 110}
      end
    end
    local slice=sprite:newSlice(Rectangle(0,0,width,height));slice.name="feet";slice.pivot=Point(pivotX,pivotY)
    sprite:saveAs(source.."/editable/"..actor.id..".aseprite")
    sheet:saveAs(dest.."/"..actor.id..".png")
    write(dest.."/"..actor.id..".json",metadata)
    sprite:close()
    exported[#exported+1]={id=actor.id,name=actor.name,group=actor.group,biome=actor.biome,height=actor.height,canvas={width,height},pivot={pivotX,pivotY},frames=20}
  elseif actor.id=="hero_vo_dang_kiem" then
    -- Aseprite decoded JSON objects are userdata. Copy fields to plain tables
    -- before nesting them inside a newly encoded runtime manifest.
    exported[#exported+1]={id=actor.id,name=actor.name,group=actor.group,biome=actor.biome,height=actor.height,reuse={sheet=actor.reuse.sheet,atlas=actor.reuse.atlas},canvas={192,160},pivot={96,128},frames=20}
  end
end
write(dest.."/actors.json",{status="candidate",assets=exported})
print("Exported "..#exported.." actors including retained accepted artwork")
local scenes={}
for _,scene in ipairs(catalog.scenes) do
  local groundPath=source.."/raw/"..scene.id.."-ground.png"
  local propsPath=source.."/raw/"..scene.id.."-props.png"
  if app.fs.isFile(groundPath) and layout.props[scene.id] then
    local ground=Image{fromFile=groundPath}
    ground:resize{width=1478,height=1064,method="bilinear"}
    ground:saveAs(dest.."/"..scene.id.."-ground.png")
    local edit=Sprite(1478,1064);edit:newCel(edit.layers[1],1,ground,Point(0,0));edit:saveAs(source.."/editable/"..scene.id.."-ground.aseprite");edit:close()
    local original=Image{fromFile=propsPath}
    local props={}
    for index,definition in ipairs(layout.props[scene.id]) do
      local s,b=definition.source,definition.bounds
      local image=silhouette(Image(original,Rectangle(s[1]+b[1],s[2]+b[2],b[3]-b[1],b[4]-b[2])))
      image=reduce(image,math.min(definition.height/image.height,370/image.width))
      local canvas=Image(384,384);canvas:drawImage(image,Point(math.floor((384-image.width)/2),368-image.height))
      local id=scene.id.."-prop-"..index
      canvas:saveAs(dest.."/"..id..".png")
      local edit=Sprite(384,384);edit:newCel(edit.layers[1],1,canvas,Point(0,0));edit:saveAs(source.."/editable/"..id..".aseprite");edit:close()
      props[#props+1]={image="/assets/renovation-v1/"..id..".png",height=definition.height}
    end
    scenes[#scenes+1]={id=scene.id,name=scene.name,ground="/assets/renovation-v1/"..scene.id.."-ground.png",props=props}
  end
end
local props={}
for _,id in ipairs({"tree-jade","tree-blossom","lantern","banner","statue","bamboo"}) do
  props[#props+1]={image="/assets/visual-upgrade-2/"..id..".png",height=240}
end
table.insert(scenes,1,{id="arena",name="Trung Tâm Võ Lâm",ground="/assets/visual-upgrade-2/ground.png",props=props})
write(dest.."/catalog.json",{status="candidate",assets=exported,scenes=scenes})
app.fs.makeDirectory(dest.."/originals")
for _,actor in ipairs(catalog.actors) do
  local original=Image{fromFile=root.."/"..actor.identity}
  original:saveAs(dest.."/originals/"..actor.id..".png")
end
print("Exported "..#scenes.." scenes with independently occluding props")

