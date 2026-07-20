#!/bin/zsh
osascript -e 'tell application "Terminal" to set background color of window 1 to {0, 10000, 25000}'
osascript -e 'tell application "Terminal" to set normal text color of window 1 to {60000, 60000, 60000}'
osascript -e 'tell application "Terminal" to set custom title of window 1 to "🇷🇸 Serbia"'

PROJECT_DIR="/Users/openclaw/Developer/web/Serbia"
cd "$PROJECT_DIR"
clear

if ! command -v tmux &>/dev/null; then
    echo "tmux not found. Install: brew install tmux"
    exit 1
fi

SESSION="serbia"
tmux kill-session -t "$SESSION" 2>/dev/null
lsof -ti:8000 | xargs kill -9 2>/dev/null
sleep 0.5

tmux new-session -d -s "$SESSION" -c "$PROJECT_DIR" 'python3 -m http.server 8000'
tmux set -t "$SESSION" mouse on
tmux split-window -t "$SESSION" -v -l 7 -d 'printf "\n┌─────────────────────────────┐\n│                             │\n│  🇷🇸  Serbia │\n│                             │\n└─────────────────────────────┘\n" && exec tail -f /dev/null'
tmux set-hook -w -t "$SESSION":0 window-resized 'resize-pane -t .1 -y 7'

sleep 1
open http://localhost:8000
tmux attach -t "$SESSION"
