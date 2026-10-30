-- Re-export artist-edited sources without regenerating or repainting them.
local root=app.params.root or '.'
local src=root..'/assets/source/arena_art01/'
local out=root..'/assets/exports/arena_art01/'
local function sheet(sprite,name,format)
  app.sprite=sprite
  app.command.ExportSpriteSheet{ui=false,askOverwrite=false,type=SpriteSheetType.ROWS,
    columns=4,textureFilename=out..name..'.png',dataFilename=out..name..'.json',
    dataFormat=SpriteSheetDataFormat.JSON_HASH,filenameFormat=format or '{tag}',
    shapePadding=2,borderPadding=2,trim=false,listLayers=true,listTags=true,listSlices=true}
end
local function layerImage(sprite,layer,frame)
  local im=Image(sprite.width,sprite.height,ColorMode.RGB)
  local cel=layer:cel(frame);if cel then im:drawImage(cel.image,cel.position) end
  return im
end
local ground=app.open(src..'arena_ground.aseprite')
ground:saveCopyAs(out..'arena_ground.png')
ground:close()
local wall=app.open(src..'wall.aseprite');wall:saveCopyAs(out..'wall.png');wall:close()
for _,name in ipairs({'world','garden','ambient','hud','hud_frames','hud_states'}) do
  local sprite=app.open(src..name..'.aseprite')
  sheet(sprite,name,name=='ambient' and '{tag}_{tagframe}' or '{tag}')
  if name~='ambient' then
    for _,tag in ipairs(sprite.tags) do
      local frame=tag.fromFrame.frameNumber
      local image=Image(sprite.width,sprite.height,ColorMode.RGB);image:drawSprite(sprite,frame)
      if name=='hud_frames' then
        local sizes={panel_frame={600,164},hotbar_frame={600,124},portrait_frame={128,128},bar_hp={360,32},bar_mp={360,32},bar_exp={360,32}}
        local size=sizes[tag.name];image=Image(image,Rectangle(0,0,size[1],size[2]))
      end
      image:saveAs(out..tag.name..'.png')
      if name=='world' then
        layerImage(sprite,sprite.layers[1],frame):saveAs(out..tag.name..'_base.png')
        layerImage(sprite,sprite.layers[2],frame):saveAs(out..tag.name..'_top.png')
      elseif name=='garden' and tag.name=='bridge' then
        local deck=layerImage(sprite,sprite.layers[1],frame)
        deck:drawImage(layerImage(sprite,sprite.layers[2],frame))
        deck:saveAs(out..'bridge_deck.png')
        layerImage(sprite,sprite.layers[3],frame):saveAs(out..'bridge_front.png')
      end
    end
  end
  sprite:close()
end
local palm=app.open(src..'icon_palm.aseprite');palm:saveCopyAs(out..'icon_palm.png');palm:close()
local key=Image{fromFile=out..'icon_empty.png'};key:resize(24,20);key:saveAs(out..'key_badge.png')
print('Re-exported ART01 edited Aseprite sources, PNGs, padded JSON atlases and layers')
