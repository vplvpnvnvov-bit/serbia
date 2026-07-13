#!/bin/bash
cd "$(dirname "$0")"
kill $(lsof -ti:8080) 2>/dev/null
echo "├─ Компьютер: http://localhost:8080"
LAN_IP=$(python3 -c "import subprocess as s
for i in ['en0','en1']:
 try:
  print('├─ Телефон:   http://'+s.check_output(['ipconfig','getifaddr',i],text=True).strip()+':8080'); break
 except: pass
" 2>/dev/null)
open http://localhost:8080
python3 -m http.server 8080
