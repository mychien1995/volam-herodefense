local root=app.params.root
local f=assert(io.open(root..'/assets/exports/skills/thien-son/icons_manifest_v01.json','r'))
local m=json.decode(f:read('*a'));f:close()
local spr=Sprite(64,64,ColorMode.RGB)
spr.layers[1].name='13 approved-concept icon rasters; final art approval pending'
for i,icon in ipairs(m.icons) do
 if i>1 then spr:newEmptyFrame(i) end
 local im=Image{fromFile=root..'/'..icon.file}
 spr:newCel(spr.layers[1],i,im,Point(0,0))
 local tag=spr:newTag(i,i);tag.name=icon.id
end
spr:saveAs(root..'/assets/source/skills/thien-son/icons/thien_son_icons_v01.aseprite')

