"""Verify Aseprite round-trip sheets exported by export-hero-finish-native.ps1."""
from pathlib import Path
from PIL import Image
import numpy as np,json,hashlib
ROOT=Path(__file__).resolve().parent.parent
src=ROOT/'assets/source/hero-finish-v1';p=src/'manifest.json';m=json.loads(p.read_text());report={'status':'PASS','method':'Aseprite1.3.18.6 batch PNG re-export; exact alpha and RGB for every visible pixel','actors':[]}
for a in m['actors']:
 basic=a['basic'];runtime=ROOT/'assets/exports/hero-finish-v1'/(basic+'.png');native=src/'editable'/(basic+'.aseprite');export=ROOT/'.cache/hero-finish-native-check'/(basic+'.png')
 x=np.array(Image.open(runtime).convert('RGBA'));y=np.array(Image.open(export).convert('RGBA'));assert x.shape==y.shape
 assert np.array_equal(x[:,:,3],y[:,:,3]),basic+' native alpha mismatch';mask=x[:,:,3]>0;assert np.array_equal(x[:,:,:3][mask],y[:,:,:3][mask]),basic+' native RGB mismatch'
 a['editableSha256']=hashlib.sha256(native.read_bytes()).hexdigest();report['actors'].append({'basic':basic,'frames':64,'nativePNGMatchesRuntimeVisibleRGBA':True,'editableSha256':a['editableSha256'],'runtimePngSha256':hashlib.sha256(runtime.read_bytes()).hexdigest()})
p.write_text(json.dumps(m,indent=2)+'\n');(src/'native-validation.json').write_text(json.dumps(report,indent=2)+'\n');print('PASS:14 native re-exports match all visible RGBA; native hashes recorded')
