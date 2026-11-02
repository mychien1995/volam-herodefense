"""Inspect connected alpha islands to choose lossless source atlas bounds."""
from PIL import Image
from collections import deque
im = Image.open("assets/m3d-r3-arena-production/source/scenery-r1.png")
w, h = im.size
a = im.getchannel("A").point(lambda v: 255 if v > 8 else 0)
pixels = bytearray(a.tobytes())
boxes = []
for seed in range(w*h):
    if not pixels[seed]: continue
    pixels[seed] = 0
    todo = deque([seed])
    left = right = seed % w
    top = bottom = seed // w
    count = 0
    while todo:
        p = todo.popleft()
        x, y = p % w, p // w
        count += 1
        left, right = min(left,x), max(right,x)
        top, bottom = min(top,y), max(bottom,y)
        for q in (p-1 if x else -1,p+1 if x<w-1 else -1,p-w,p+w):
            if 0 <= q < w*h and pixels[q]:
                pixels[q]=0
                todo.append(q)
    if count > 1000: boxes.append((count,(left,top,right+1,bottom+1)))
print(sorted(boxes,reverse=True))
