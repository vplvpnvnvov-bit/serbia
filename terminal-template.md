# macOS Terminal .command template with tmux

## Usage

Copy to root of any project, customize params at top, then:
```bash
chmod +x ProjectName.command
open ProjectName.command
```

## Template

```bash
#!/bin/zsh
# ─── PARAMS ────────────────────────────────────────────────
ICON="📱"               # emoji for window title + banner
PROJECT="Seeker Farm"   # project short name
BANNER="Seeker Farm — работает"
BG_R=0; BG_G=18000; BG_B=14000  # background color RGB (0–65535)
SESSION="seeker"        # tmux session name
START_CMD="npm run dev" # command to run in main pane
# ───────────────────────────────────────────────────────────

osascript -e "
tell application \"Terminal\"
    repeat with w in windows
        if w is not null then
            set background color of w to {$BG_R, $BG_G, $BG_B}
            set normal text color of w to {60000, 60000, 60000}
            set title displays custom title of w to true
            set custom title of w to \"$ICON $PROJECT\"
        end if
    end repeat
end tell" 2>/dev/null

cd \"$(dirname \"$0\")\" || exit 1
# source .venv/bin/activate  # если нужно
clear

if ! command -v tmux &>/dev/null; then
    echo "✗ tmux not found. Install: brew install tmux"
    exit 1
fi

tmux kill-session -t "$SESSION" 2>/dev/null
tmux new-session -d -s "$SESSION" "$START_CMD"
tmux set -t "$SESSION" mouse on
tmux split-window -t "$SESSION" -v -l 7 -d "
printf '\n┌─────────────────────────────┐\n│\n│  $ICON  $BANNER │\n│\n└─────────────────────────────┘\n'
exec tail -f /dev/null
"
tmux set-hook -w -t "$SESSION":0 window-resized 'resize-pane -t .1 -y 7'
tmux attach -t "$SESSION"
```

## Colors (RGB 0–65535)

| Color | R | G | B |
|---|---|---|---|
| Dark purple (Serbia) | 8000 | 4000 | 15000 |
| Teal | 0 | 18000 | 14000 |
| Dark green | 0 | 10000 | 0 |
| Brown | 10000 | 6000 | 2000 |
| Off-white text | 60000 | 60000 | 60000 |

## Notes

- First run may need Terminal permission in *System Settings → Privacy & Security → Automation*
- Creates two copies: in project root + Desktop
- tmux session auto-kills on re-run to avoid duplicates
- Bottom pane is 7 rows fixed via window-resized hook
