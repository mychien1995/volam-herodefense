local s=Sprite(3,2,ColorMode.RGB);local im=Image(3,2);im:drawPixel(0,0,app.pixelColor.rgba(255,0,0,255));s:newCel(s.layers[1],1,im,Point(0,0))
app.command.Rotate{angle=90}
assert(s.width==2 and s.height==3,'Native quarter rotation dimensions')
print('Native Rotate command PASS '..s.width..'x'..s.height);s:close()
