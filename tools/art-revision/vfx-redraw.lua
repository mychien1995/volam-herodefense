-- Uses drawn and retained raster masters, not procedural VFX geometry.
local root=app.params.root
local f=assert(io.open(root..'/'..app.params.plan,'r'))
local plan=json.decode(f:read('*a'));f:close()
local pc=app.pixelColor
local cache={}
local function load(p)
 if not cache[p] then cache[p]=Image{fromFile=root..'/'..p} end
 return cache[p]
end
local ramps={}
for k,p in pairs(plan.themes) do
 local c={}
 for _,h in ipairs(p) do c[#c+1]={tonumber(h:sub(1,2),16),tonumber(h:sub(3,4),16),tonumber(h:sub(5,6),16)} end
 ramps[k]=c
end
local function transform(im,dir)
 if dir=='right' then return im end
 local rot=dir=='up' or dir=='down'
 local w,h=im.width,im.height
 local out=Image(rot and h or w,rot and w or h,ColorMode.RGB)
 for p in im:pixels() do
  local x,y=p.x,p.y
  if dir=='left' or dir=='up_left' or dir=='down_left' then x=w-1-x
  elseif dir=='up' then x,y=y,w-1-x
  elseif dir=='down' then x,y=h-1-y,x end
  out:drawPixel(x,y,p())
 end
 return out
end
for _,e in ipairs(plan.assets) do
 local original=Image{fromFile=root..'/'..e.original}
 local out=Image{fromFile=root..'/'..e.base}
 for _,r in ipairs(e.protected) do
  for y=r[2],r[2]+r[4]-1 do for x=r[1],r[1]+r[3]-1 do out:drawPixel(x,y,original:getPixel(x,y)) end end
 end
 for _,a in ipairs(e.edits) do
  local r,b,v,z=a.rect,a.box,a.inkBox,a.sourceRect
  local bx,by,bw,bh=b[1],b[2],b[3]-b[1],b[4]-b[2]
  local vx,vy,vw,vh=v[1]-bx,v[2]-by,v[3]-v[1],v[4]-v[2]
  local donor=transform(Image(load(a.source),Rectangle(z[1],z[2],z[3],z[4])),a.facing)
  local w,h=donor.width*a.sx,donor.height*a.sy
  -- Common clip scale; a smaller registered cel may only contain, never
  -- stretch, that pose. This avoids chopping a tip into a rectangle.
  local fit=math.min(1,vw/w,vh/h)
  if a.lavaRim then fit=math.min(fit,vw*.25/w,vh*.29/h) end
  donor:resize(math.max(1,math.floor(w*fit+.5)),math.max(1,math.floor(h*fit+.5)))
  local ink=Image(bw,bh,ColorMode.RGB)
  -- Retain the original perimeter as a faint fringe. This preserves the exact
  -- registered cel bounds and phase extent while allowing new interior alpha.
  for y=0,bh-1 do for x=0,bw-1 do
    local c=original:getPixel(r[1]+bx+x,r[2]+by+y)
    local alpha=pc.rgbaA(c)
    if alpha>0 then ink:drawPixel(x,y,pc.rgba(pc.rgbaR(c),pc.rgbaG(c),pc.rgbaB(c),math.max(1,math.floor(alpha*(a.lavaRim and .78 or .17))))) end
  end end
  for p in donor:pixels() do
    local c=p();local alpha=pc.rgbaA(c)
    if alpha<=a.alphaFloor then p(0)
    else
     local R,G,B=pc.rgbaR(c),pc.rgbaG(c),pc.rgbaB(c)
     local palette=ramps[a.theme]
     if palette then
      local l=(R*.27+G*.59+B*.14)/255
      local i=math.min(#palette,math.max(1,math.floor(l*(#palette-1)+1.5)))
      R,G,B=table.unpack(palette[i])
     end
     local visible=a.alphaFloor>26 and (alpha>220 and 255 or alpha>190 and 222 or 168) or alpha
     local v=math.min(a.peak,math.floor(visible*a.peak/255+.5))
     p(pc.rgba(R,G,B,v))
    end
  end
  if a.lavaRim then
   -- The ground ring is the readable damage extent. Place hand-painted
   -- lava/rock groups along it rather than replacing it with a center burst.
   local points={}
   for i=0,6 do
    local angle=i*2*math.pi/7-.2
    points[#points+1]={vx+vw*(.5+.365*math.cos(angle)),vy+vh*(.5+.335*math.sin(angle))}
   end
   table.sort(points,function(p,q)return p[2]<q[2] end)
   for i,p in ipairs(points) do
    local x=math.max(vx,math.min(vx+vw-donor.width,math.floor(p[1]-donor.width/2)))
    local y=math.max(vy,math.min(vy+vh-donor.height,math.floor(p[2]-donor.height*.72)))
    ink:drawImage(donor,Point(x,y))
   end
  else ink:drawImage(donor,Point(vx+math.floor((vw-donor.width)/2),vy+math.floor((vh-donor.height)/2))) end
  for y=0,bh-1 do for x=0,bw-1 do
   local c=ink:getPixel(x,y)
   local alpha=math.min(a.peak,pc.rgbaA(c))
   if x<vx or x>=vx+vw or y<vy or y>=vy+vh then alpha=math.min(64,alpha) end
   out:drawPixel(r[1]+bx+x,r[2]+by+y,pc.rgba(pc.rgbaR(c),pc.rgbaG(c),pc.rgbaB(c),alpha))
  end end
 end
 out:saveAs(root..'/'..e.candidate)
 local sp=Sprite(out.width,out.height,ColorMode.RGB)
 sp.layers[1].name='Painted VFX retarget / original atlas layout'
 sp:newCel(sp.layers[1],1,out,Point(0,0));sp:saveAs(root..'/'..e.source);sp:close()
end
