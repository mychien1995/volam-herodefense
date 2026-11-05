local root=app.params.root or '.'
local function read(path)local f=assert(io.open(root..'/'..path,'r'));local v=json.decode(f:read('*a'));f:close();return v end
local manifest=read('apps/game-client/src/renovation-actions.generated.json')
local out=root..'/docs/evidence/renovation-v3'
local colors={app.pixelColor.rgba(49,57,56,255),app.pixelColor.rgba(63,70,65,255)}
local function background(w,h)local im=Image(w,h);for p in im:pixels() do p(colors[1+(math.floor(p.x/16)+math.floor(p.y/16))%2]) end;return im end
local page=0
for first=1,#manifest.bodies,8 do page=page+1;local sheet=background(1280,math.min(8,#manifest.bodies-first+1)*190)
 for row=0,math.min(7,#manifest.bodies-first) do local b=manifest.bodies[first+row];local im=Image{fromFile=root..b.url:gsub('/assets/','/assets/exports/')};local atlas=read(b.url:gsub('/assets/','assets/exports/'):gsub('%.png$','.json'))
  local names={'down_0','down_1','down_2','down_3','left_1','right_1','up_1','up_3'}
  for col,name in ipairs(names) do local f=atlas.frames[name];local r=f.frame;local s=f.spriteSourceSize;local cut=Image(im,Rectangle(r.x,r.y,r.w,r.h));local x=(col-1)*160+80-b.pivot[1]+s.x;local y=row*190+158-b.pivot[2]+s.y;sheet:drawImage(cut,Point(x,y)) end
 end;sheet:saveAs(out..'/bodies-contact-'..page..'.png')
end
local jobs=read('assets/source/renovation-v3/generation-jobs.json').jobs
local extras=read('assets/source/renovation-v3/extra-jobs.json').jobs;for _,j in ipairs(extras) do jobs[#jobs+1]=j end
local cells={};for _,j in ipairs(jobs) do if j.kind~='body' then
 local im=Image{fromFile=root..'/assets/source/renovation-v3/raw/'..j.id..'.png'};local gx,gy=j.grid[1],j.grid[2];local cw,ch=math.floor(im.width/gx),math.floor(im.height/gy)
 for row=0,gy-1 do local col=math.min(1,gx-1);local cut=Image(im,Rectangle(col*cw,row*ch,cw,ch));local bounds=cut:shrinkBounds();if not bounds.isEmpty then cut=Image(cut,bounds) end;local scale=math.min(1,170/cut.width,170/cut.height);cut:resize{width=math.max(1,math.floor(cut.width*scale)),height=math.max(1,math.floor(cut.height*scale)),method='bilinear'};cells[#cells+1]=cut end
 end end
for first=1,#cells,48 do local sheet=background(1440,math.ceil(math.min(48,#cells-first+1)/8)*180);for i=first,math.min(first+47,#cells) do local index=i-first;local cut=cells[i];sheet:drawImage(cut,Point((index%8)*180+(180-cut.width)/2,math.floor(index/8)*180+(180-cut.height)/2)) end;sheet:saveAs(out..'/fx-source-contact-'..math.floor((first-1)/48+1)..'.png') end
print('V3 review contacts complete')
