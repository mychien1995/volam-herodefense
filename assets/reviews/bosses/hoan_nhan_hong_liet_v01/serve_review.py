"""Local-only art review server. No game server, mutations or recording."""
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from functools import partial
from pathlib import Path
import sys
root=Path(__file__).resolve().parents[4]
port=int(sys.argv[1]) if len(sys.argv)>1 else 5198
print(f'Art review: http://127.0.0.1:{port}/assets/reviews/bosses/hoan_nhan_hong_liet_v01/',flush=True)
ThreadingHTTPServer(('127.0.0.1',port),partial(SimpleHTTPRequestHandler,directory=str(root))).serve_forever()
