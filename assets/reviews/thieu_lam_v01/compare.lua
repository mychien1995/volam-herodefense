-- Static QA board from existing pixels only; never creates runtime artwork.
local root=app.params.root or '.'
local board=Sprite(1280,900,ColorMode.RGB)
local image=Image(1280,900,ColorMode.RGB)
local inputs={
  {'assets/reviews/thieu_lam_v01/both_weapons_phaser_2x.png',0,0,640,520},
  {'assets/concepts/heroes/thieu-lam/thieu-lam-concept-v02.png',704,0,512,512},
  {'assets/reviews/thieu_lam_v01/dao_gameplay_1280x720.png',0,540,640,360},
  {'assets/references/current_game_2026_10_29_placeholder_anti_reference.png',640,540,640,360},
}
for _,v in ipairs(inputs) do
  local source=Image{fromFile=root..'/'..v[1]}
  source:resize(v[4],v[5])
  image:drawImage(source,Point(v[2],v[3]))
end
board:newCel(board.layers[1],1,image,Point(0,0))
board:saveAs(root..'/assets/reviews/thieu_lam_v01/reference_runtime_comparison.png')
