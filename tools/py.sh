#!/usr/bin/env bash
# Run a Python script with an interpreter that has faster-whisper + flask
# (the local transcriber and audio QA). Override with MIMANE_PYTHON=/path/to/python.
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
py="${MIMANE_PYTHON:-}"
if [[ -z "$py" ]]; then
  for c in "$root/tools/transcriber/.venv/bin/python" "$root/../../ai-workforce/.venv-tts/bin/python" python3; do
    if command -v "$c" >/dev/null 2>&1 && "$c" -c "import faster_whisper, flask, flask_cors" 2>/dev/null; then py="$c"; break; fi
  done
fi
if [[ -z "$py" ]]; then
  echo "No Python with faster-whisper found. Install it once with:" >&2
  echo "  python3 -m venv tools/transcriber/.venv && tools/transcriber/.venv/bin/pip install -r tools/transcriber/requirements.txt" >&2
  exit 1
fi
exec "$py" "$@"
