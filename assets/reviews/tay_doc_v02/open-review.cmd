@echo off
cd /d "%~dp0..\\..\\.."
start "" http://127.0.0.1:5397
node assets/reviews/tay_doc_v02/server.mjs

