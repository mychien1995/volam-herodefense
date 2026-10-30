local root=app.params.root or '.'
local function single(folder,id)
  local sprite=app.open(root..'/assets/source/'..folder..'/'..id..'.aseprite')
  sprite:saveCopyAs(root..'/assets/exports/'..folder..'/'..id..'.png')
  if folder=='dungeon_cards' then
    app.command.ExportSpriteSheet{ui=false,askOverwrite=false,type=SpriteSheetType.ROWS,columns=1,
      textureFilename=root..'/assets/exports/'..folder..'/'..id..'_atlas.png',
      dataFilename=root..'/assets/exports/'..folder..'/'..id..'.json',dataFormat=SpriteSheetDataFormat.JSON_HASH,
      filenameFormat='{tag}',borderPadding=2,shapePadding=2,trim=false,listLayers=true,listTags=true}
  end
  sprite:close()
end
single('arena_v2','ground')
for _,id in ipairs({'forest','desert','sea','hell'}) do single('dungeon_cards',id) end
local paving=app.open(root..'/assets/source/arena_v2/paving.aseprite')
app.command.ExportSpriteSheet{ui=false,askOverwrite=false,type=SpriteSheetType.ROWS,columns=4,
  textureFilename=root..'/assets/exports/arena_v2/paving.png',dataFilename=root..'/assets/exports/arena_v2/paving.json',
  dataFormat=SpriteSheetDataFormat.JSON_HASH,filenameFormat='{tag}',trim=false,borderPadding=0,shapePadding=0,listLayers=true,listTags=true}
paving:close()
print('Exported arena ground, paving atlas and four cards/metadata from edited Aseprite sources')
