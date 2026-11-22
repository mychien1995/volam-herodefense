"""Transcode user-supplied MP3s, retaining originals, silence and stereo image."""
import hashlib, json, subprocess
from pathlib import Path
import numpy as np

ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'assets/sounds/skills'
EXPORT=SOURCE/'original-four-schools-ogg'
MASTERS=ROOT/'assets/source/audio/original-four-schools-decoded-v01'
EXPORT.mkdir(parents=True,exist_ok=True)
MASTERS.mkdir(parents=True,exist_ok=True)
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def run(args): return subprocess.check_output(args)
def pcm(path,channels):
    return np.frombuffer(run(['ffmpeg','-v','error','-nostdin','-i',str(path),'-f','f32le','-ar','48000','-ac',str(channels),'pipe:1']),dtype='<f4')
clips=[]
for mp3 in sorted(SOURCE.glob('*.mp3')):
    if not mp3.name.startswith(('cai-bang-','thien-son-','thieu-lam-','vo-dang-')): continue
    info=json.loads(run(['ffprobe','-v','error','-select_streams','a:0','-show_entries','stream=channels','-of','json',str(mp3)]))['streams'][0]
    channels=info['channels']
    wav=MASTERS/(mp3.stem+'.wav'); ogg=EXPORT/(mp3.stem+'.ogg')
    subprocess.run(['ffmpeg','-v','error','-nostdin','-y','-i',str(mp3),'-ar','48000','-c:a','pcm_f32le',str(wav)],check=True)
    subprocess.run(['ffmpeg','-v','error','-nostdin','-y','-i',str(wav),'-c:a','libvorbis','-q:a','8',str(ogg)],check=True)
    original=pcm(wav,channels); converted=pcm(ogg,channels)
    n=min(len(original),len(converted))
    assert np.isfinite(converted).all() and abs(len(original)-len(converted))/(48000*channels)<.05
    correlation=float(np.corrcoef(original[:n],converted[:n])[0,1])
    assert correlation>.97,(mp3.name,correlation)
    clips.append({'source':mp3.relative_to(ROOT).as_posix(),'wav':wav.relative_to(ROOT).as_posix(),'ogg':ogg.relative_to(ROOT).as_posix(),'sourceSha256':sha(mp3),'wavSha256':sha(wav),'oggSha256':sha(ogg),'channels':channels,'sampleRate':48000,'seconds':len(original)/channels/48000,'correlation':correlation})
assert len(clips)==44,len(clips)
manifest={'version':1,'origin':'User-supplied MP3s; transcoded without synthesis, gain, trimming or normalization','wavNote':'Decoded PCM archive, not a restoration of information lost in MP3','codec':'Ogg Vorbis quality 8; original channel count; 48kHz','clips':clips}
(EXPORT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
client=ROOT/'apps/game-client/src/skill-sounds.ts'
text=client.read_text(encoding='utf8')
for c in clips:
    old="../../../"+c['source']+'?url'
    text=text.replace(old,"../../../"+c['ogg']+'?url')
client.write_text(text,encoding='utf8')
print(json.dumps({'files':len(clips),'minimumCorrelation':min(c['correlation'] for c in clips)}))
