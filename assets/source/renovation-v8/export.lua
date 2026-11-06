local root=app.params.root;local src=root..'/assets/source/renovation-v8';local out=root..'/assets/exports/renovation-v8';local pc=app.pixelColor
local f=assert(io.open(src..'/export-plan.json'));local P=json.decode(f:read('*a'));f:close();local W,H=P.canvas[1],P.canvas[2];local PX,PY=P.pivot[1],P.pivot[2]
local function round(x)return math.floor(x+.5)end
local function clean(im)for p in im:pixels()do if pc.rgbaA(p())<12 then p(0)end end;return im end
local function sample(im,x,y)
 local x0,y0=math.floor(x),math.floor(y);local dx,dy=x-x0,y-y0;local aa,rr,gg,bb=0,0,0,0
 for j=0,1 do for i=0,1 do local xx,yy=x0+i,y0+j;if xx>=0 and yy>=0 and xx<im.width and yy<im.height then local c=im:getPixel(xx,yy);local w=(i==0 and 1-dx or dx)*(j==0 and 1-dy or dy);local a=pc.rgbaA(c)*w;aa=aa+a;rr=rr+pc.rgbaR(c)*a;gg=gg+pc.rgbaG(c)*a;bb=bb+pc.rgbaB(c)*a end end end
 return aa<12 and 0 or pc.rgba(round(rr/aa),round(gg/aa),round(bb/aa),round(aa))
end
local function mirror(im)local n=Image(im.width,im.height);for y=0,im.height-1 do for x=0,im.width-1 do n:putPixel(im.width-1-x,y,im:getPixel(x,y))end end;return n end
local function save(id,cels,contacts)
 local sprite=Sprite(W,H,ColorMode.RGB);local entries={};local x,y,rowH=4,4,0;local width=2048
 for i,c in ipairs(cels)do local b=c.image:shrinkBounds();assert(not b.isEmpty and b.x>0 and b.y>0 and b.x+b.width<W and b.y+b.height<H,'clipping '..id..c.name)
  if i>1 then sprite:newEmptyFrame(i)end;sprite:newCel(sprite.layers[1],i,c.image,Point(0,0));sprite.frames[i].duration=c.duration/1000;local tag=sprite:newTag(i,i);tag.name=c.name
  local im=Image(c.image,b);if x+im.width+4>width then x=4;y=y+rowH+4;rowH=0 end
  entries[#entries+1]={name=c.name,image=im,x=x,y=y,trim={x=b.x,y=b.y,w=b.width,h=b.height},duration=c.duration};x=x+im.width+4;rowH=math.max(rowH,im.height)
 end
 local sheet=Image(width,y+rowH+4);local data={frames={},meta={image=id..'.png',size={w=width,h=sheet.height},scale='1'},contacts=contacts}
 for _,e in ipairs(entries)do sheet:drawImage(e.image,Point(e.x,e.y));data.frames[e.name]={frame={x=e.x,y=e.y,w=e.image.width,h=e.image.height},rotated=false,trimmed=true,spriteSourceSize=e.trim,sourceSize={w=W,h=H},duration=e.duration}end
 sheet:saveAs(out..'/'..id..'.png');sprite:saveAs(src..'/editable/'..id..'.aseprite');sprite:close();local f=assert(io.open(out..'/'..id..'.json','w'));f:write(json.encode(data));f:close();print('V8 '..id..' '..#cels..' cels')
end
local bodies,contacts,audit={},{},{}
for _,s in ipairs(P.bodies)do
 local raw=Image{fromFile=src..'/raw/'..s.source..'.png'};local scale=P.bodyHeight/(s.feet[1][2]-s.head);local normalized={}
 for i=0,3 do
  local x0=math.floor((i%2)*raw.width/2);local x1=math.floor((i%2+1)*raw.width/2);local y0=math.floor(math.floor(i/2)*raw.height/2);local y1=math.floor((math.floor(i/2)+1)*raw.height/2)
  local im=clean(Image(raw,Rectangle(x0,y0,x1-x0,y1-y0)));local b=im:shrinkBounds();assert(b.x>0 and b.y>0 and b.x+b.width<im.width and b.y+b.height<im.height,'source clipping '..s.source..i)
  im=Image(im,b);im:resize{width=round(im.width*scale),height=round(im.height*scale),method='bilinear'};clean(im)
  local canvas=Image(W,H);canvas:drawImage(im,Point(round(PX-(s.feet[i+1][1]-b.x)*scale),round(PY-(s.feet[i+1][2]-b.y)*scale)))
  local function point(p)return {x=PX+(p[1]-s.feet[i+1][1])*scale,y=PY+(p[2]-s.feet[i+1][2])*scale}end
  normalized[i+1]={image=canvas,grip=s.grips[i+1] and point(s.grips[i+1]),tip=s.tips[i+1] and point(s.tips[i+1])}
 end
 local strike=normalized[3];local dx,dy=strike.tip.x-strike.grip.x,strike.tip.y-strike.grip.y;local n=math.sqrt(dx*dx+dy*dy);local axis=s.targetAxis
 local wanted=(s.target-(axis=='x' and strike.grip.x-PX or strike.grip.y-PY))/(axis=='x' and dx/n or dy/n)
 assert(wanted>P.shaftCut+P.capLength,'short requested shaft')
 for i,c in ipairs(normalized)do
  local before=Image(c.image)
  if c.tip then
   local gx,gy=c.grip.x,c.grip.y;local dx,dy=c.tip.x-gx,c.tip.y-gy;local length=math.sqrt(dx*dx+dy*dy);local ux,uy=dx/length,dy/length;local vx,vy=-uy,ux;local cut=P.shaftCut;local radius=P.shaftRadius
   assert(length>cut+P.capLength,'shaft too short for controlled stretch '..s.direction..i)
   local function bounds(l)local ex,ey=gx+ux*l,gy+uy*l;local sx,sy=gx+ux*cut,gy+uy*cut;return math.max(0,math.floor(math.min(sx,ex)-radius-2)),math.min(W-1,math.ceil(math.max(sx,ex)+radius+2)),math.max(0,math.floor(math.min(sy,ey)-radius-2)),math.min(H-1,math.ceil(math.max(sy,ey)+radius+2))end
   local ax,bx,ay,by=bounds(length+radius)
   for y=ay,by do for x=ax,bx do local t=(x-gx)*ux+(y-gy)*uy;local v=(x-gx)*vx+(y-gy)*vy;if t>=cut and math.abs(v)<=radius then c.image:putPixel(x,y,0)end end end
   ax,bx,ay,by=bounds(wanted+radius)
   for y=ay,by do for x=ax,bx do local t=(x-gx)*ux+(y-gy)*uy;local v=(x-gx)*vx+(y-gy)*vy
    if t>=cut and t<=wanted+radius and math.abs(v)<=radius then
     local sourceT=t>=wanted-P.capLength and t-(wanted-length) or cut+(t-cut)*(length-P.capLength-cut)/(wanted-P.capLength-cut)
     local color=sample(before,gx+ux*sourceT+vx*v,gy+uy*sourceT+vy*v);if pc.rgbaA(color)>=12 then c.image:putPixel(x,y,color)end
    end
   end end
   for y=PY-90,PY+8 do for x=PX-50,PX+50 do assert(before:getPixel(x,y)==c.image:getPixel(x,y),'body/hand altered during shaft fit '..s.direction..i)end end
   if i==3 then contacts[s.direction]={gx+ux*wanted-PX,gy+uy*wanted-PY};audit[s.direction]={scale=scale,oldLength=length,newLength=wanted,protectedBodyUnchanged=true}end
  end
  bodies[#bodies+1]={image=c.image,name=s.direction..'_'..(i-1),duration=({100,100,100,700})[i]}
  if s.direction=='right'then
   local left=Image(W,H);left:drawImage(mirror(c.image),Point(1,0));bodies[#bodies+1]={image=left,name='left_'..(i-1),duration=({100,100,100,700})[i]}
  end
 end
end
contacts.left={-contacts.right[1],contacts.right[2]};save('staff_long_body',bodies,contacts)
local f=assert(io.open(src..'/shaft-audit.json','w'));f:write(json.encode(audit));f:close()
local S=P.sweep;local raw=Image{fromFile=root..'/'..S.source};local sweep={}
for row=0,2 do for col=0,3 do
 local x=S.columns[col+1];local y=S.rows[row+1];local im=clean(Image(raw,Rectangle(x,y,S.columns[col+2]-x,S.rows[row+2]-y)));local cx=S.sourceContact[row+1][1]+math.floor(col*raw.width/4)-x;local cy=S.sourceContact[row+1][2]
 if row==2 then local n=Image(im.width,im.height);for yy=0,im.height-1 do for xx=0,im.width-1 do n:putPixel(xx,im.height-1-yy,im:getPixel(xx,yy))end end;im=n;cy=im.height-1-cy end
 local b=im:shrinkBounds();local sx,sy=S.scales[row+1][1],S.scales[row+1][2];im=Image(im,b);im:resize{width=round(im.width*sx),height=round(im.height*sy),method='bilinear'};clean(im)
 local d=S.directions[row+1];local contact=contacts[d];local canvas=Image(W,H);canvas:drawImage(im,Point(round(PX+contact[1]-(cx-b.x)*sx),round(PY+contact[2]-(cy-b.y)*sy)))
 sweep[#sweep+1]={image=canvas,name=d..'_'..col,duration=({130,70,120,160})[col+1]}
 if row==0 then local left=Image(W,H);left:drawImage(mirror(canvas),Point(1,0));sweep[#sweep+1]={image=left,name='left_'..col,duration=({130,70,120,160})[col+1]}end
end end
save('staff_long_sweep',sweep,contacts)
local F=P.fissure;local raw=Image{fromFile=src..'/raw/'..F.source..'.png'};local cracks={}
for i=0,3 do
 local x0=math.floor((i%2)*raw.width/2);local y0=math.floor(math.floor(i/2)*raw.height/2);local im=clean(Image(raw,Rectangle(x0,y0,math.floor((i%2+1)*raw.width/2)-x0,math.floor((math.floor(i/2)+1)*raw.height/2)-y0)))
 local a,b=F.root[i+1],F.tip[i+1];local dx,dy=b[1]-a[1],b[2]-a[2];local len=math.sqrt(dx*dx+dy*dy);local ux,uy=dx/len,dy/len;local sx,sy=F.nativeLength/len,F.widthScale;local canvas=Image(W,H)
 for y=PY-80,PY+80 do for x=PX-130,PX+490 do local t=(x-PX)/sx;local v=(y-PY)/sy;local color=sample(im,a[1]+ux*t-uy*v,a[2]+uy*t+ux*v);if pc.rgbaA(color)>=12 then canvas:putPixel(x,y,color)end end end
 cracks[#cracks+1]={image=canvas,name=tostring(i),duration=175}
end
save('staff_fissure',cracks,contacts);print('V8 EXPORT COMPLETE')
