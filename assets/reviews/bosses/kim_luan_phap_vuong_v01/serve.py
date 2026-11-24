"""Local-only static art review; owns only its bound socket; no game server."""
from pathlib import Path
from functools import partial
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
import mimetypes
import sys
mimetypes.add_type('text/javascript', '.mjs')
root=Path(__file__).resolve().parents[4]
port=int(sys.argv[1]) if len(sys.argv)>1 else 5418
print(f'Kim Luan Phaser art review: http://127.0.0.1:{port}/assets/reviews/bosses/kim_luan_phap_vuong_v01/',flush=True)
ThreadingHTTPServer(('127.0.0.1',port),partial(SimpleHTTPRequestHandler,directory=str(root))).serve_forever()
