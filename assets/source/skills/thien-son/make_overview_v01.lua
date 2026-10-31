local root=app.params.root
local folder=root..'/assets/reviews/skills/thien-son/'
local ids={'lien_hoa_phien','luc_duong_chuong','luu_phong_bo','chiet_mai_thu','bach_phien_phong_bao','phi_anh_tram','truy_hon_dao','phong_anh_hoan_vi','liet_phong_dao','bach_liet_thien_kich'}
local out=Image(948,1358,ColorMode.RGB)
out:clear(app.pixelColor.rgba(20,45,49,255))
local first=Image{fromFile=folder..ids[1]..'_combined_v01.png'}
local icons=Image(948,82,ColorMode.RGB);icons:drawImage(first,Point(-166,-628))
out:drawImage(icons,Point(0,0))
for i,id in ipairs(ids) do
 local im=Image{fromFile=folder..id..'_combined_v01.png'}
 local art=Image(360,220,ColorMode.RGB);art:drawImage(im,Point(-460,-280))
 local caption=Image(360,24,ColorMode.RGB);caption:drawImage(im,Point(-12,-598))
 local x=100+((i-1)%2)*388;local y=100+math.floor((i-1)/2)*250
 out:drawImage(art,Point(x,y));out:drawImage(caption,Point(x,y+222))
end
out:saveAs(folder..'skill_preview_overview_v01.png')

