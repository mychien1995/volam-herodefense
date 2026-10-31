local root=app.params.root
local src=root..'/assets/source/bamboo_forest/'
local out=root..'/assets/exports/bamboo_forest/'
-- Importing source PNGs is an explicit preparation step. Ordinary export reads
-- artist-edited Aseprite files and never reconstructs their artwork.
local names={'bamboo_jade','bamboo_gold','bamboo_single','bush','grass_tuft','moss_root','stump','canopy','stone_lantern','ruin_wall','shrine','bamboo_fence','bamboo_gate','stone_monument','training_dummy','moss_rocks','exit_portal','bridge_deck','bridge_front'}
local prepare=app.params.prepare=='true'
for _,name in ipairs(names) do
 local file=src..'sprites/'..name
 if prepare then
  local s=app.open(file..'.png');s.layers[1].name='Authored '..name..' - cleaned alpha'
  s:saveAs(file..'.aseprite');s:close()
 else
  local s=app.open(file..'.aseprite');s:saveCopyAs(file..'.png');s:close()
 end
end
if prepare then
 local s=app.open(src..'terrain.png');s.layers[1].name='Authored materials and matched transition tiles'
 s:saveAs(src..'terrain.aseprite');s:close()
else
 local s=app.open(src..'terrain.aseprite');s:saveCopyAs(out..'terrain.png');s:close()
 -- Repack edited sprite PNGs on the fixed padded atlas grid.
 local atlas=Sprite(1024,768,ColorMode.RGB)
 atlas.layers[1].name='Named reusable sprites - fixed padded cells'
 for i,name in ipairs(names) do
  local im=Image{fromFile=src..'sprites/'..name..'.png'}
  local layer=atlas:newLayer();layer.name=name
  atlas:newCel(layer,1,im,Point(2+((i-1)%5)*196,2+math.floor((i-1)/5)*196))
 end
 atlas:saveCopyAs(out..'scenery.png');atlas:close()
end
print(prepare and 'Prepared editable Bamboo Forest Aseprite sources' or 'Exported edited Bamboo Forest source PNGs')
