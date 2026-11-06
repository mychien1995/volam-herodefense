local root=app.params.root;local src=root..'/assets/source/renovation-v6';local out=root..'/assets/exports/renovation-v6';local pc=app.pixelColor
local f=assert(io.open(src..'/export-plan.json'));local plan=json.decode(f:read('*a'));f:close()
local function clean(im)for p in im:pixels() do if pc.rgbaA(p())<12 then p(0) end end;return im end
for _,s in ipairs(plan) do
 local raw=Image{fromFile=src..'/raw/'..s.source..'.png'};local cuts={};local largest,standing=0,0
 for row=0,s.grid[2]-1 do for col=0,s.grid[1]-1 do
  local x=math.floor(col*raw.width/s.grid[1]);local right=math.floor((col+1)*raw.width/s.grid[1]);local y=math.floor(row*raw.height/s.grid[2]);local bottom=math.floor((row+1)*raw.height/s.grid[2]);if s.rows then y=s.rows[row+1];bottom=s.rows[row+2] end
  local im=clean(Image(raw,Rectangle(x,y,right-x,bottom-y)));local b=im:shrinkBounds();assert(not b.isEmpty,s.id..' empty');local px,py=im.width/2,im.height/2
  if s.type=='body' then local foot=s.feet[row*s.grid[1]+col+1];px,py=foot[1],foot[2];if col==0 then standing=math.max(standing,py-b.y) end end
  local name=s.directions and s.directions[row+1]..'_'..col or string.format('%d',row*s.grid[1]+col)
  cuts[#cuts+1]={image=Image(im,b),name=name,foot={px-b.x,py-b.y}};largest=math.max(largest,b.width,b.height)
 end end
 local scale=s.size/(s.type=='body' and standing or largest);local cW,cH=s.canvas[1],s.canvas[2];local sprite=Sprite(cW,cH,ColorMode.RGB);local entries={}
 for i,c in ipairs(cuts) do
  local im=c.image;im:resize{width=math.max(1,math.floor(im.width*scale+.5)),height=math.max(1,math.floor(im.height*scale+.5)),method='bilinear'};clean(im)
  local canvas=Image(cW,cH);local x,y=math.floor((cW-im.width)/2),math.floor((cH-im.height)/2)
  if s.type=='body' then x=math.floor(200-c.foot[1]*scale+.5);y=math.floor(320-c.foot[2]*scale+.5) end
  canvas:drawImage(im,Point(x,y));if i>1 then sprite:newEmptyFrame(i) end;sprite:newCel(sprite.layers[1],i,canvas,Point(0,0));sprite.frames[i].duration=.08;local tag=sprite:newTag(i,i);tag.name=c.name
  local b=canvas:shrinkBounds();assert(b.x>0 and b.y>0 and b.x+b.width<cW and b.y+b.height<cH,'clipped '..s.id..c.name)
  entries[#entries+1]={name=c.name,image=Image(canvas,b),trim={x=b.x,y=b.y,w=b.width,h=b.height}}
 end
 local width=1024;local x,y,h=4,4,0
 for _,e in ipairs(entries) do if x+e.image.width+4>width then x=4;y=y+h+4;h=0 end;e.x=x;e.y=y;x=x+e.image.width+4;h=math.max(h,e.image.height) end
 local sheet=Image(width,y+h+4);local meta={frames={},meta={image=s.id..'.png',size={w=width,h=sheet.height},scale='1'}}
 for _,e in ipairs(entries) do sheet:drawImage(e.image,Point(e.x,e.y));meta.frames[e.name]={frame={x=e.x,y=e.y,w=e.image.width,h=e.image.height},rotated=false,trimmed=true,spriteSourceSize=e.trim,sourceSize={w=cW,h=cH},duration=80} end
 sheet:saveAs(out..'/'..s.id..'.png');sprite:saveAs(src..'/editable/'..s.id..'.aseprite');sprite:close();local f=assert(io.open(out..'/'..s.id..'.json','w'));f:write(json.encode(meta));f:close();print('V6 '..s.id..' '..#entries..' cels')
end
print('V6 EXPORT COMPLETE')
