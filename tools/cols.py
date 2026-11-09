import sys
from PIL import Image
out=sys.argv[1];w=int(sys.argv[2]);H=int(sys.argv[3]);fs=sys.argv[4:]
cols=[]
for f in fs:
  im=Image.open(f);im=im.resize((w,int(im.height*w/im.width)))
  for y in range(0,im.height,H):cols.append(im.crop((0,y,w,min(im.height,y+H))))
W=Image.new('RGB',(len(cols)*(w+8),H),(200,200,200))
for k,c in enumerate(cols):W.paste(c,(k*(w+8),0))
W.save(out,quality=72);print(out,W.size)
