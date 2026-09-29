#!/bin/sh
# launchd entry point for the automatic CV publication (see docs/maintenance.md).
# Sets a PATH that includes TeX, Homebrew (node, gh, poppler) and git; runs the
# publisher; posts a macOS notification when it fails. Extra arguments are passed on.
PATH="/opt/homebrew/bin:/usr/local/bin:/Library/TeX/texbin:/usr/bin:/bin:/usr/sbin:/sbin"
export PATH
cd "$(dirname "$0")/.." || exit 1

log="$HOME/Library/Logs/publish-cv.log"
if [ -f "$log" ] && [ "$(wc -c < "$log")" -gt 1000000 ]; then
  mv -f "$log" "$log.1"
fi

echo "=== $(date '+%Y-%m-%d %H:%M:%S %Z') publish-cv start ($*) ==="
node scripts/publish-cv.mjs "$@"
status=$?
echo "=== $(date '+%Y-%m-%d %H:%M:%S %Z') publish-cv exit $status ==="

if [ "$status" -ne 0 ]; then
  osascript -e 'display notification "自动发布 CV 失败，详见 ~/Library/Logs/publish-cv.log；下次触发会重试" with title "publish-cv"' >/dev/null 2>&1
fi
exit "$status"
