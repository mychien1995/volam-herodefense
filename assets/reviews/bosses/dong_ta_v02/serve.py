"""Serve only the local art demo and installed Phaser 4; no game server."""
from pathlib import Path
from functools import partial
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
import argparse,subprocess
ROOT=Path(__file__).resolve().parents[4]
args=argparse.ArgumentParser()
args.add_argument('port',type=int,nargs='?',default=5427)
args.add_argument('--dependency-root',type=Path)
a=args.parse_args()
dependency=a.dependency_root or ROOT
phaser=dependency/'apps/game-client/node_modules/phaser/dist/phaser.min.js'
if not phaser.exists():
 common=subprocess.check_output(['git','rev-parse','--git-common-dir'],cwd=ROOT,text=True).strip()
 dependency=Path(common).resolve().parent
 phaser=dependency/'apps/game-client/node_modules/phaser/dist/phaser.min.js'
if not phaser.exists():raise SystemExit('Install the project dependencies or pass --dependency-root.')
class Handler(SimpleHTTPRequestHandler):
 extensions_map = {**SimpleHTTPRequestHandler.extensions_map, '.mjs': 'text/javascript', '.js': 'text/javascript'}
 def do_GET(self):
  if self.path=='/__phaser.js':
   self.send_response(200);self.send_header('Content-Type','application/javascript');self.end_headers();self.wfile.write(phaser.read_bytes())
  else:super().do_GET()
 def log_message(self,*args):pass
print('Dong Ta art demo: http://127.0.0.1:'+str(a.port)+'/assets/reviews/bosses/dong_ta_v02/',flush=True)
ThreadingHTTPServer(('127.0.0.1',a.port),partial(Handler,directory=str(ROOT))).serve_forever()

