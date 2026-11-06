local root=app.params.root;local src=root..'/assets/source/renovation-v7';local out=root..'/assets/exports/renovation-v7';local pc=app.pixelColor
local f=assert(io.open(src..'/export-plan.json'));local plan=json.decode(f:read('*a'));f:close()
local function clean(im)for p in im:pixels() do if pc.rgbaA(p())<12 then p(0) end end;return im end
local function flip(im,vertical)
 local next=Image(im.width,im.height)
 for y=0,im.height-1 do for x=0,im.width-1 do next:putPixel(vertical and x or im.width-1-x,vertical and im.height-1-y or y,im:getPixel(x,y)) end end
 return next
end
for _,s in ipairs(plan) do
 local raw=Image{fromFile=src..'/raw/'..s.id..'.png'};local cuts={};local largest=0
 for row=0,s.grid[2]-1 do for col=0,s.grid[1]-1 do
  local x=s.columns and s.columns[col+1] or math.floor(col*raw.width/s.grid[1]);local right=s.columns and s.columns[col+2] or math.floor((col+1)*raw.width/s.grid[1]);local y=s.rows[row+1];local bottom=s.rows[row+2]
  local im=clean(Image(raw,Rectangle(x,y,right-x,bottom-y)));local name=s.directions and s.directions[row+1]..'_'..col or string.format('%d',row*s.grid[1]+col)
  local contact=nil
  if s.id=='staff_sweep' then
   contact={s.contact[row+1][1]+math.floor(col*raw.width/s.grid[1])-x,s.contact[row+1][2]}
   if row==2 then im=flip(im,true);contact[2]=im.height-1-contact[2] end
  end
  local b=im:shrinkBounds();assert(not b.isEmpty,s.id..name..' empty');assert(b.x>0 and b.y>0 and b.x+b.width<im.width and b.y+b.height<im.height,s.id..name..' source overlap')
  cuts[#cuts+1]={image=Image(im,b),name=name,body=b,contact=contact,row=row,col=col};largest=math.max(largest,b.width,b.height)
 end end
 local cW,cH=s.canvas[1],s.canvas[2];local sprite=Sprite(cW,cH,ColorMode.RGB);local entries={}
 local function add(canvas,name,duration,origin)
  if #entries>0 then sprite:newEmptyFrame(#entries+1) end;sprite:newCel(sprite.layers[1],#entries+1,canvas,Point(0,0));sprite.frames[#entries+1].duration=duration/1000;local tag=sprite:newTag(#entries+1,#entries+1);tag.name=name
  local b=canvas:shrinkBounds();assert(b.x>0 and b.y>0 and b.x+b.width<cW and b.y+b.height<cH,'virtual clipping '..s.id..name)
  entries[#entries+1]={name=name,image=Image(canvas,b),trim={x=b.x,y=b.y,w=b.width,h=b.height},duration=duration,origin=origin}
 end
 for _,c in ipairs(cuts) do
  local sx=s.scale and s.scale[1] or s.size/largest;local sy=s.scale and s.scale[2] or sx
  local im=c.image;im:resize{width=math.max(1,math.floor(im.width*sx+.5)),height=math.max(1,math.floor(im.height*sy+.5)),method='bilinear'};clean(im)
  local canvas=Image(cW,cH);local x,y=math.floor((cW-im.width)/2),math.floor((cH-im.height)/2);local origin={.5,.5};local duration=85
  if c.contact then
   local socket=s.sockets[s.directions[c.row+1]];x=math.floor(200+socket[1]-(c.contact[1]-c.body.x)*sx+.5);y=math.floor(320+socket[2]-(c.contact[2]-c.body.y)*sy+.5);origin={.5,.8};duration=({130,70,120,160})[c.col+1]
  elseif s.id=='dragon_coil_fire' then
   local index=c.row*4+c.col;duration=index<8 and 150 or index<10 and 250 or 200
   local head=s.heads[c.name];if head then origin={(x+(head[1]-c.body.x)*sx)/cW,(y+(head[2]-c.body.y)*sy)/cH} end
  end
  canvas:drawImage(im,Point(x,y));add(canvas,c.name,duration,origin)
  if s.id=='staff_sweep' and c.row==0 then
   local left=Image(cW,cH);left:drawImage(flip(canvas,false),Point(s.sockets.left[1]+s.sockets.right[1]+1,0));add(left,'left_'..c.col,duration,origin)
  end
 end
 local width=1024;local x,y,h=4,4,0
 for _,e in ipairs(entries) do if x+e.image.width+4>width then x=4;y=y+h+4;h=0 end;e.x=x;e.y=y;x=x+e.image.width+4;h=math.max(h,e.image.height) end
 local sheet=Image(width,y+h+4);local meta={frames={},meta={image=s.id..'.png',size={w=width,h=sheet.height},scale='1'},origins={}}
 for _,e in ipairs(entries) do sheet:drawImage(e.image,Point(e.x,e.y));meta.frames[e.name]={frame={x=e.x,y=e.y,w=e.image.width,h=e.image.height},rotated=false,trimmed=true,spriteSourceSize=e.trim,sourceSize={w=cW,h=cH},duration=e.duration};meta.origins[e.name]=e.origin end
 sheet:saveAs(out..'/'..s.id..'.png');sprite:saveAs(src..'/editable/'..s.id..'.aseprite');sprite:close();local f=assert(io.open(out..'/'..s.id..'.json','w'));f:write(json.encode(meta));f:close();print('V7 '..s.id..' '..#entries..' cels')
end
print('V7 EXPORT COMPLETE')
