-- Assemble generated raster poses at one common source scale per strip.
-- No character geometry or synthetic walk/attack is painted by this script.
local root=app.params.root or '.'
local recipePath=assert(app.params.recipe,'recipe parameter required')
local f=assert(io.open(root..'/'..recipePath,'r'));local recipe=json.decode(f:read('*a'));f:close()
local pc=app.pixelColor
local colors={};local palette=Palette(#recipe.palette+1)
palette:setColor(0,Color{r=0,g=0,b=0,a=0})
for i,hex in ipairs(recipe.palette) do
  local r,g,b=tonumber(hex:sub(1,2),16),tonumber(hex:sub(3,4),16),tonumber(hex:sub(5,6),16)
  colors[i]={r,g,b};palette:setColor(i,Color{r=r,g=g,b=b,a=255})
end
local sprite=Sprite(recipe.canvas[1],recipe.canvas[2],ColorMode.RGB)
sprite.layers[1].name='Original generated poses / common-scale native assembly'
sprite:setPalette(palette)
local images={};local ranges={};local previous=nil
local inputImages={}
for index,entry in ipairs(recipe.frames) do
  local canvas=Image(recipe.canvas[1],recipe.canvas[2],ColorMode.RGB)
  if entry.native then
    canvas:drawImage(Image{fromFile=root..'/'..entry.native},Point(0,0))
  else
    local raw=inputImages[entry.raw]
    if not raw then raw=Image{fromFile=root..'/'..entry.raw};inputImages[entry.raw]=raw end
    local b=entry.bounds;local w,h=b[3]-b[1],b[4]-b[2]
    local crop=Image(raw,Rectangle(b[1],b[2],w,h))
    for it in crop:pixels() do
      local c=it();it(pc.rgbaA(c)>=220 and pc.rgba(pc.rgbaR(c),pc.rgbaG(c),pc.rgbaB(c),255) or 0)
    end
    local nw,nh=math.floor(w*entry.scale+0.5),math.floor(h*entry.scale+0.5)
    crop:resize(nw,nh)
    local ox=recipe.pivot[1]-math.floor((entry.foot[1]-b[1])*entry.scale+0.5)
    local oy=recipe.pivot[2]-math.floor((entry.foot[2]-b[2])*entry.scale+0.5)
    assert(ox>=0 and oy>=0 and ox+nw<=recipe.canvas[1] and oy+nh<=recipe.canvas[2],
      'Clipped '..entry.name..' '..ox..','..oy..' '..nw..'x'..nh)
    for y=0,nh-1 do for x=0,nw-1 do
      local c=crop:getPixel(x,y)
      if pc.rgbaA(c)>0 then
        local best,dist=nil,math.huge
        for _,p in ipairs(colors) do
          local dr,dg,db=pc.rgbaR(c)-p[1],pc.rgbaG(c)-p[2],pc.rgbaB(c)-p[3]
          local d=3*dr*dr+4*dg*dg+2*db*db
          if d<dist then best,dist=p,d end
        end
        canvas:drawPixel(ox+x,oy+y,pc.rgba(best[1],best[2],best[3],255))
      end
    end end
  end
  if index>1 then sprite:newEmptyFrame(index) end
  sprite:newCel(sprite.layers[1],index,canvas,Point(0,0))
  sprite.frames[index].duration=entry.durationMs/1000
  images[index]=canvas
  local tag=entry.state..'_'..entry.direction
  if tag~=previous then ranges[#ranges+1]={name=tag,from=index,to=index};previous=tag
  else ranges[#ranges].to=index end
end
for _,r in ipairs(ranges) do local tag=sprite:newTag(r.from,r.to);tag.name=r.name end
local slice=sprite:newSlice(Rectangle(0,0,recipe.canvas[1],recipe.canvas[2]))
slice.name='feet';slice.pivot=Point(recipe.pivot[1],recipe.pivot[2])
slice.data='Presentation only; unchanged server collision and combat timing.'
sprite:saveAs(root..'/'..recipe.source)
local columns=recipe.columns or 10
local sheet=Image(columns*recipe.canvas[1],math.ceil(#images/columns)*recipe.canvas[2],ColorMode.RGB)
local frames={}
for i,image in ipairs(images) do
  local x=((i-1)%columns)*recipe.canvas[1];local y=math.floor((i-1)/columns)*recipe.canvas[2]
  sheet:drawImage(image,Point(x,y))
  local entry=recipe.frames[i]
  frames[entry.name]={frame={x=x,y=y,w=recipe.canvas[1],h=recipe.canvas[2]},rotated=false,trimmed=false,
    spriteSourceSize={x=0,y=0,w=recipe.canvas[1],h=recipe.canvas[2]},sourceSize={w=recipe.canvas[1],h=recipe.canvas[2]},duration=entry.durationMs}
end
sheet:saveAs(root..'/'..recipe.sheet)
local data={frames=frames,meta={image=app.fs.fileName(recipe.sheet),size={w=sheet.width,h=sheet.height},
  scale='1',format='RGBA8888',footPivot={recipe.pivot[1],recipe.pivot[2]},productionStatus='candidate_pending_final_director_review'}}
local output=assert(io.open(root..'/'..recipe.atlas,'w'));output:write(json.encode(data));output:close()
print('Assembled '..recipe.id..': '..#images..' native cels / fixed strip scales / source+PNG+JSON')
