local root=app.params.root or '.'
for _,id in ipairs({'nhan_kiem_hop_nhat','bach_phien_phong_bao'}) do
  local old=Image{fromFile=root..'/docs/evidence/renovation-v2/'..id..'-old.png'}
  local new=Image{fromFile=root..'/docs/evidence/renovation-v2/'..id..'-new.png'}
  local pair=Image(1024,480);pair:drawImage(old,Point(0,0));pair:drawImage(new,Point(512,0))
  pair:saveAs(root..'/assets/exports/renovation-v2/review/'..id..'-comparison.png')
end
print('Packed two native comparison pairs')
