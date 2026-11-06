local root=app.params.root;local src=root..'/assets/source/renovation-v5';local out=root..'/assets/exports/renovation-v5'
local f=assert(io.open(src..'/export-plan.json'));local plan=json.decode(f:read('*a'));f:close();local pc=app.pixelColor
local function clean(im)for p in im:pixels() do if pc.rgbaA(p())<12 then p(0) end end;return im end
for _,s in ipairs(plan) do
 local raw=Image{fromFile=src..'/raw/'..s.source..'.png'};local cw,ch=math.floor(raw.width/s.grid[1]),math.floor(raw.height/s.grid[2]);local cuts={};local largest=0;local standing=0
 for i=0,s.grid[1]*s.grid[2]-1 do
  local im=clean(Image(raw,Rectangle((i%s.grid[1])*cw,math.floor(i/s.grid[1])*ch,cw,ch)));local b=im:shrinkBounds();assert(not b.isEmpty,s.id..' empty cel');im=Image(im,b);cuts[#cuts+1]=im;largest=math.max(largest,im.width,im.height);if i%s.grid[1]==0 then standing=math.max(standing,im.height) end
 end
 local scale=s.size/(s.type=='body' and standing or largest);local cW,cH=s.canvas[1],s.canvas[2];local sprite=Sprite(cW,cH,ColorMode.RGB);local entries={}
 for i,im in ipairs(cuts) do
  im:resize{width=math.max(1,math.floor(im.width*scale+.5)),height=math.max(1,math.floor(im.height*scale+.5)),method='bilinear'};clean(im)
  local canvas=Image(cW,cH);local x=math.floor(cW/2-im.width/2);local y=s.type=='body' and 320-im.height or math.floor(cH/2-im.height/2)
  canvas:drawImage(im,Point(x,y));if i>1 then sprite:newEmptyFrame(i) end;sprite:newCel(sprite.layers[1],i,canvas,Point(0,0));sprite.frames[i].duration=.08
  local name=tostring(i-1);if s.type=='body' then name=({'down','left','right','up'})[math.floor((i-1)/4)+1]..'_'..((i-1)%4) end
  local b=canvas:shrinkBounds();assert(b.x>0 and b.y>0 and b.x+b.width<cW and b.y+b.height<cH,'V5 clipped '..s.id..' '..name)
  entries[#entries+1]={name=name,image=Image(canvas,b),trim={x=b.x,y=b.y,w=b.width,h=b.height}}
  local tag=sprite:newTag(i,i);tag.name=name
 end
 local width=1024;local x,y,h=4,4,0
 for _,e in ipairs(entries) do if x+e.image.width+4>width then x=4;y=y+h+4;h=0 end;e.x=x;e.y=y;x=x+e.image.width+4;h=math.max(h,e.image.height) end
 local sheet=Image(width,y+h+4);local meta={frames={},meta={image=s.id..'.png',size={w=width,h=sheet.height},scale='1'}}
 for _,e in ipairs(entries) do sheet:drawImage(e.image,Point(e.x,e.y));meta.frames[e.name]={frame={x=e.x,y=e.y,w=e.image.width,h=e.image.height},rotated=false,trimmed=true,spriteSourceSize=e.trim,sourceSize={w=cW,h=cH},duration=80} end
 sheet:saveAs(out..'/'..s.id..'.png');sprite:saveAs(src..'/editable/'..s.id..'.aseprite');sprite:close();local f=assert(io.open(out..'/'..s.id..'.json','w'));f:write(json.encode(meta));f:close();print('V5 '..s.id..' '..#entries..' cels')
end
for _,id in ipairs({'hero_cai_bang','hero_thien_son','hero_vo_dang','hero_thieu_lam'}) do
 local prefix=root..'/assets/exports/renovation-v1/runtime/'..id;local f=assert(io.open(prefix..'.json'));local meta=json.decode(f:read('*a'));f:close();local r=meta.frames.idle_down_0.frame;local input=Image{fromFile=prefix..'.png'};local im=Image(input,Rectangle(r.x,r.y,r.w,r.h));local scale=88/im.height;im:resize{width=math.floor(im.width*scale+.5),height=88,method='bilinear'};local avatar=Image(128,128);avatar:drawImage(im,Point(math.floor((128-im.width)/2),112-im.height));avatar:saveAs(out..'/portrait-'..id..'.png')
 local s=Sprite(128,128,ColorMode.RGB);s:newCel(s.layers[1],1,avatar,Point(0,0));s:saveAs(src..'/editable/portrait-'..id..'.aseprite');s:close()
end
print('V5 EXPORT COMPLETE')
