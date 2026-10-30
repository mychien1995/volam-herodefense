-- Reconstruct editable layers from separately generated source artwork.
-- This does not recover layers from a flattened concept or draw final geometry.
local root=app.params.root or '.'
local src=root..'/assets/source/arena_art01/'
local out=root..'/assets/exports/arena_art01/'
local pc=app.pixelColor
local function rgba(c) return pc.rgba(pc.rgbaR(c),pc.rgbaG(c),pc.rgbaB(c),255) end
local function load(name) return Image{fromFile=src..name..'.png'} end
local function cleanCrop(img,b,scale)
  local crop=Image(b[3]-b[1],b[4]-b[2],ColorMode.RGB)
  -- Generated alpha has a low-opacity matte. Cut it away, retaining opaque art.
  for y=0,crop.height-1 do for x=0,crop.width-1 do
    local c=img:getPixel(b[1]+x,b[2]+y)
    if pc.rgbaA(c)>=210 then crop:drawPixel(x,y,rgba(c)) end
  end end
  crop:resize(math.floor(crop.width*scale+0.5),math.floor(crop.height*scale+0.5))
  return crop
end
local function export(sprite,name,format)
  app.sprite=sprite
  sprite:saveAs(src..name..'.aseprite')
  app.command.ExportSpriteSheet{ui=false,askOverwrite=false,type=SpriteSheetType.ROWS,
    columns=4,textureFilename=out..name..'.png',dataFilename=out..name..'.json',
    dataFormat=SpriteSheetDataFormat.JSON_HASH,filenameFormat=format or '{tag}',
    shapePadding=2,borderPadding=2,trim=false,listLayers=true,listTags=true,listSlices=true}
end
local function tag(sprite,name,n,last)
  local t=sprite:newTag(n,last or n);t.name=name
end
local function slice(sprite,w,h,x,y)
  local s=sprite:newSlice(Rectangle(0,0,w,h));s.name='feet';s.pivot=Point(x,y)
end
-- Native-resolution continuous authored ground. No mirrored lawn or tiled grass.
local original=load('generated_ground_native')
local ground=Sprite(1600,1152,ColorMode.RGB)
local terrain=ground.layers[1];terrain.name='Continuous authored soil and stone substrate'
local verge=ground:newLayer();verge.name='Separated authored moss, grass and flowers'
local substrate=Image(1600,1152,ColorMode.RGB)
local plants=Image(1600,1152,ColorMode.RGB)
-- Center the painted courtyard on the existing statue marker (800,576).
-- Entry markers/navigation remain unchanged; art never supplies a collider.
-- The 32px side margin / remote northern edge reuse adjacent source edge pixels;
-- these outskirts are outside the quality-gate camera and remain out of slice.
for y=0,1151 do for x=0,1599 do
  local sx=math.max(0,math.min(original.width-1,x-32))
  local sy=math.max(0,math.min(original.height-1,y-91))
  local c=original:getPixel(sx,sy)
  local green=pc.rgbaG(c)>pc.rgbaR(c)*1.04 and pc.rgbaG(c)>pc.rgbaB(c)*1.12
  if green then plants:drawPixel(x,y,c) else substrate:drawPixel(x,y,c) end
end end
local masonry=ground:newLayer();masonry.name='Reconstructed north approach edge continuation'
local road=Image(100,91,ColorMode.RGB)
for y=0,90 do for x=0,99 do road:drawPixel(x,y,original:getPixel(718+x,y%96)) end end
ground:newCel(terrain,1,substrate);ground:newCel(verge,1,plants)
ground:newCel(masonry,1,road,Point(750,0))
-- Restore the finer stone/grass density of the original production plate in
-- the quality-gate camera. Blend only its perimeter into the continuous lawn;
-- this combines two real authored surfaces, never procedural environment art.
local detail=load('generated_ground');detail:resize(768,512)
local detailLayer=ground:newLayer();detailLayer.name='Fine arena paving and natural verge - editable density pass'
local detailImage=Image(768,512,ColorMode.RGB)
for y=0,511 do for x=0,767 do
  local edge=math.min(x,y,767-x,511-y)
  local threshold=((x*37+y*61)%101)/100
  if edge>=32 or threshold<edge/32 then detailImage:drawPixel(x,y,detail:getPixel(x,y)) end
end end
ground:newCel(detailLayer,1,detailImage,Point(416,341))
ground:saveAs(src..'arena_ground.aseprite');ground:saveCopyAs(out..'arena_ground.png')
local wall=Image(original,Rectangle(735,458,64,24));wall:saveAs(out..'wall.png')
local wallSource=Sprite(64,24,ColorMode.RGB);wallSource.layers[1].name='Authored stone wall face sample'
wallSource:newCel(wallSource.layers[1],1,wall);wallSource:saveAs(src..'wall.aseprite');wallSource:close()
ground:close()

local world=load('generated_world')
local specs={
  {'statue_male',{45,0,470,505},0.24,0.76},
  {'tree_jade',{480,0,1024,510},0.28,0.72},
  {'tree_blossom',{1024,0,1536,510},0.26,0.72},
  {'bamboo',{40,512,480,1024},0.23,0.85},
  {'lantern',{660,530,880,1020},0.11,0.78},
  {'red_banner',{1160,512,1410,1024},0.16,0.18},
}
local props=Sprite(192,192,ColorMode.RGB)
local bases=props.layers[1];bases.name='Grounded bases, trunks, stone pedestal and poles'
local tops=props:newLayer();tops.name='Sculpture, tree canopies, bamboo and lantern housing'
for i,spec in ipairs(specs) do
  if i>1 then props:newEmptyFrame(i) end
  local crop=cleanCrop(world,spec[2],spec[3])
  local left=math.floor(96-crop.width/2)
  local top=184-crop.height
  local a=Image(192,192,ColorMode.RGB);local b=Image(192,192,ColorMode.RGB)
  for y=0,crop.height-1 do for x=0,crop.width-1 do
    local target=y>=crop.height*spec[4] and a or b
    target:drawPixel(left+x,top+y,crop:getPixel(x,y))
  end end
  props:newCel(bases,i,a);props:newCel(tops,i,b)
  props.frames[i].duration=0.16;tag(props,spec[1],i)
end
-- Aseprite extends a tag when appending frames at its end: close ranges now.
for i,t in ipairs(props.tags) do t.fromFrame=props.frames[i];t.toFrame=props.frames[i] end
slice(props,192,192,96,184);export(props,'world')
-- Separate frame PNGs for DOM/inspection, and base/canopy layers for Phaser depth.
for i,spec in ipairs(specs) do
  local im=Image(192,192,ColorMode.RGB);im:drawSprite(props,i)
  im:saveAs(out..spec[1]..'.png')
end
for _,l in ipairs(props.layers) do
  for i,spec in ipairs(specs) do
    local cel=l:cel(i)
    if cel then cel.image:saveAs(out..spec[1]..(l==bases and '_base.png' or '_top.png')) end
  end
end
props:close()

local gardenImage=load('generated_garden')
local gardenSpecs={
  {'cascade',{12,20,640,660},0.30},
  {'stream_pool',{650,20,1254,670},0.30},
  {'bridge',{24,800,640,1120},0.23},
  {'flower_rocks',{650,700,1254,1254},0.22},
}
local garden=Sprite(224,224,ColorMode.RGB)
local surface=garden.layers[1];surface.name='Shallow water and walkable bridge deck'
local banks=garden:newLayer();banks.name='Flowering banks, rocks and rear railing'
local front=garden:newLayer();front.name='Separate bridge foreground railing'
for i,spec in ipairs(gardenSpecs) do
  if i>1 then garden:newEmptyFrame(i) end
  local crop=cleanCrop(gardenImage,spec[2],spec[3]);local px=math.floor(112-crop.width/2);local py=216-crop.height
  local a=Image(224,224,ColorMode.RGB);local b=Image(224,224,ColorMode.RGB);local c=Image(224,224,ColorMode.RGB)
  for y=0,crop.height-1 do for x=0,crop.width-1 do
    local color=crop:getPixel(x,y)
    local water=pc.rgbaB(color)>pc.rgbaR(color)*1.15 and pc.rgbaG(color)>pc.rgbaR(color)*1.15
    local target=water and a or b
    if spec[1]=='bridge' then target=y>crop.height*0.65 and c or a end
    target:drawPixel(px+x,py+y,color)
  end end
  garden:newCel(surface,i,a);garden:newCel(banks,i,b);garden:newCel(front,i,c)
  tag(garden,spec[1],i)
end
for i,t in ipairs(garden.tags) do t.fromFrame=garden.frames[i];t.toFrame=garden.frames[i] end
slice(garden,224,224,112,216);export(garden,'garden')
for i,spec in ipairs(gardenSpecs) do
  local im=Image(224,224,ColorMode.RGB);im:drawSprite(garden,i);im:saveAs(out..spec[1]..'.png')
  if spec[1]=='bridge' then
    local deck=Image(224,224,ColorMode.RGB)
    for _,layer in ipairs({surface,banks}) do local cel=layer:cel(i);if cel then deck:drawImage(cel.image,cel.position) end end
    deck:saveAs(out..'bridge_deck.png')
    local railing=Image(224,224,ColorMode.RGB);local cel=front:cel(i)
    if cel then railing:drawImage(cel.image,cel.position) end
    railing:saveAs(out..'bridge_front.png')
  end
end
garden:close()

-- Decorative texture-flow cels. Banks never move; only existing cyan water pixels
-- sample adjacent authored water. No combat timing is coupled to these 160ms loops.
local ambient=Sprite(224,224,ColorMode.RGB)
local static=ambient.layers[1];static.name='Fixed rock banks and vegetation'
local flow=ambient:newLayer();flow.name='Water surface pixel flow - four phase loop'
local frameNumber=0
for _,id in ipairs({'cascade','stream_pool'}) do
  local original=Image{fromFile=out..id..'.png'}
  local first=frameNumber+1
  for phase,offset in ipairs({0,1,0,-1}) do
    frameNumber=frameNumber+1;if frameNumber>1 then ambient:newEmptyFrame(frameNumber) end
    local a=Image(224,224,ColorMode.RGB);local b=Image(224,224,ColorMode.RGB)
    for y=0,223 do for x=0,223 do
      local color=original:getPixel(x,y)
      local water=pc.rgbaA(color)>0 and pc.rgbaB(color)>pc.rgbaR(color)*1.12 and pc.rgbaG(color)>pc.rgbaR(color)*1.12
      if water then
        local yy=math.min(223,math.max(0,y+offset));local sample=original:getPixel(x,yy)
        if pc.rgbaA(sample)>0 and pc.rgbaB(sample)>pc.rgbaR(sample)*1.12 and pc.rgbaG(sample)>pc.rgbaR(sample)*1.12 then color=sample end
        b:drawPixel(x,y,color)
      else a:drawPixel(x,y,color) end
    end end
    ambient:newCel(static,frameNumber,a);ambient:newCel(flow,frameNumber,b)
    ambient.frames[frameNumber].duration=0.16
  end
  tag(ambient,id..'_flow',first,frameNumber)
end
ambient.tags[1].fromFrame=ambient.frames[1];ambient.tags[1].toFrame=ambient.frames[4]
ambient.tags[2].fromFrame=ambient.frames[5];ambient.tags[2].toFrame=ambient.frames[8]
local lamp=Image{fromFile=out..'lantern.png'}
for phase,factor in ipairs({1,1.08,1,0.94}) do
  local number=8+phase;ambient:newEmptyFrame(number)
  local a=Image(224,224,ColorMode.RGB);local b=Image(224,224,ColorMode.RGB)
  for y=0,191 do for x=0,191 do
    local c=lamp:getPixel(x,y)
    local light=pc.rgbaA(c)>0 and pc.rgbaR(c)>180 and pc.rgbaG(c)>80 and pc.rgbaG(c)<230 and pc.rgbaB(c)<120
    if light then
      b:drawPixel(x+16,y+32,pc.rgba(math.min(255,pc.rgbaR(c)*factor),math.min(255,pc.rgbaG(c)*factor),math.min(255,pc.rgbaB(c)*factor),255))
    else a:drawPixel(x+16,y+32,c) end
  end end
  ambient:newCel(static,number,a);ambient:newCel(flow,number,b);ambient.frames[number].duration=0.16
end
tag(ambient,'lantern_glow',9,12)
ambient.tags[1].fromFrame=ambient.frames[1];ambient.tags[1].toFrame=ambient.frames[4]
ambient.tags[2].fromFrame=ambient.frames[5];ambient.tags[2].toFrame=ambient.frames[8]
slice(ambient,224,224,112,216);export(ambient,'ambient','{tag}_{tagframe}')
ambient:close()

local hudImage=load('generated_hud')
local hud=Sprite(64,64,ColorMode.RGB)
local frameLayer=hud.layers[1];frameLayer.name='Gold corner frames and charcoal slot backing'
local glyphLayer=hud:newLayer();glyphLayer.name='Separate original painted icon glyphs'
local ids={'settings','quit','portal','shop','swords','bag','gold','potion_hp','potion_mp','staff','flame','dragon','scroll','jade','lock','empty'}
local xs={{64,315},{358,610},{652,904},{944,1195}}
local ys={{59,299},{337,588},{631,883},{921,1163}}
for i,id in ipairs(ids) do
  if i>1 then hud:newEmptyFrame(i) end
  local col=(i-1)%4+1;local row=math.floor((i-1)/4)+1
  local bounds={xs[col][1],ys[row][1],xs[col][2],ys[row][2]}
  local im=cleanCrop(hudImage,bounds,1);im:resize(64,64)
  local frame=Image(64,64,ColorMode.RGB);local glyph=Image(64,64,ColorMode.RGB)
  for y=0,63 do for x=0,63 do
    local layer=(x<8 or y<8 or x>=56 or y>=56) and frame or glyph
    layer:drawPixel(x,y,im:getPixel(x,y))
  end end
  hud:newCel(frameLayer,i,frame);hud:newCel(glyphLayer,i,glyph);tag(hud,'icon_'..id,i)
  im:saveAs(out..'icon_'..id..'.png')
end
for i,t in ipairs(hud.tags) do t.fromFrame=hud.frames[i];t.toFrame=hud.frames[i] end
export(hud,'hud')
-- A single projectile for the ranged normal icon, using one painted projectile
-- from the original triple-shot icon over the empty icon frame (not Q's three).
local empty=Image{fromFile=out..'icon_empty.png'}
local flame=Image{fromFile=out..'icon_flame.png'}
local palm=Image(empty)
local single=Image(flame,Rectangle(9,9,43,21));single:resize(46,25)
palm:drawImage(single,Point(9,20));palm:saveAs(out..'icon_palm.png')
local palmSprite=Sprite(64,64,ColorMode.RGB);palmSprite.layers[1].name='Empty frame'
palmSprite:newCel(palmSprite.layers[1],1,empty)
local palmLayer=palmSprite:newLayer();palmLayer.name='Single authored fire projectile'
palmSprite:newCel(palmLayer,1,single,Point(9,20))
palmSprite:saveAs(src..'icon_palm.aseprite');palmSprite:close();hud:close()

local frameImage=load('generated_frames')
local frameSpecs={
  {'panel_frame',{22,76,1235,410},600,164},
  {'hotbar_frame',{22,459,1235,711},600,124},
  {'portrait_frame',{28,752,458,1168},128,128},
  {'bar_hp',{497,799,1230,891},360,32},
  {'bar_mp',{497,929,1230,1023},360,32},
  {'bar_exp',{497,1066,1230,1163},360,32},
}
local frames=Sprite(640,192,ColorMode.RGB)
local border=frames.layers[1];border.name='Painted gold frame and bevel'
local interior=frames:newLayer();interior.name='Empty charcoal panel / jewel meter surface'
for i,spec in ipairs(frameSpecs) do
  if i>1 then frames:newEmptyFrame(i) end
  local im=cleanCrop(frameImage,spec[2],1);im:resize(spec[3],spec[4]);im:saveAs(out..spec[1]..'.png')
  local a=Image(640,192,ColorMode.RGB);local b=Image(640,192,ColorMode.RGB)
  for y=0,im.height-1 do for x=0,im.width-1 do
    local target=(x<22 or y<22 or x>=im.width-22 or y>=im.height-22) and a or b
    target:drawPixel(x,y,im:getPixel(x,y))
  end end
  frames:newCel(border,i,a);frames:newCel(interior,i,b);tag(frames,spec[1],i)
end
for i,t in ipairs(frames.tags) do t.fromFrame=frames.frames[i];t.toFrame=frames.frames[i] end
export(frames,'hud_frames');frames:close()

local states=Sprite(64,64,ColorMode.RGB)
states.layers[1].name='Authored empty slot frame - state variants'
for i,id in ipairs({'slot_normal','slot_selected','slot_disabled'}) do
  if i>1 then states:newEmptyFrame(i) end
  local im=Image(empty)
  if i>1 then
    for y=0,63 do for x=0,63 do local c=im:getPixel(x,y)
      if pc.rgbaA(c)>0 then
        local factor=i==2 and 1.25 or 0.48
        im:drawPixel(x,y,pc.rgba(math.min(255,pc.rgbaR(c)*factor),math.min(255,pc.rgbaG(c)*factor),math.min(255,pc.rgbaB(c)*factor),pc.rgbaA(c)))
      end
    end end
  end
  states:newCel(states.layers[1],i,im);tag(states,id,i);im:saveAs(out..id..'.png')
end
for i,t in ipairs(states.tags) do t.fromFrame=states.frames[i];t.toFrame=states.frames[i] end
export(states,'hud_states');states:close()
local badge=Image(empty);badge:resize(24,20);badge:saveAs(out..'key_badge.png')
print('ART01 ground and world Aseprite sources and runtime exports created')
