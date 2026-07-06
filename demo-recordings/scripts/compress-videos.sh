#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
INPUT_DIR="$ROOT_DIR/demo-recordings/output"
OUTPUT_DIR="$INPUT_DIR/compressed"

mkdir -p "$OUTPUT_DIR"

FFMPEG_BIN="${FFMPEG_BIN:-}"

if [[ -z "$FFMPEG_BIN" ]] && command -v ffmpeg >/dev/null 2>&1; then
  FFMPEG_BIN="$(command -v ffmpeg)"
fi

if [[ -z "$FFMPEG_BIN" ]]; then
  NODE_FFMPEG="$ROOT_DIR/node_modules/ffmpeg-static/ffmpeg"
  if [[ -x "$NODE_FFMPEG" ]]; then
    FFMPEG_BIN="$NODE_FFMPEG"
  fi
fi

if [[ -z "$FFMPEG_BIN" ]]; then
  PLAYWRIGHT_FFMPEG="$(find "$HOME/Library/Caches/ms-playwright" -path '*/ffmpeg-mac' -type f 2>/dev/null | head -1 || true)"
  if [[ -n "$PLAYWRIGHT_FFMPEG" ]]; then
    FFMPEG_BIN="$PLAYWRIGHT_FFMPEG"
  fi
fi

if [[ -z "$FFMPEG_BIN" ]]; then
  echo "ffmpeg is not installed. Install it first or run: npx playwright install ffmpeg"
  exit 0
fi

for input in "$INPUT_DIR"/*.webm "$INPUT_DIR"/*.mov; do
  [[ -f "$input" ]] || continue
  name="$(basename "$input")"
  base="${name%.*}"
  output="$OUTPUT_DIR/$base.mp4"
  echo "Compressing $name -> $(basename "$output")"
  "$FFMPEG_BIN" -y -i "$input" \
    -c:v libx264 -preset medium -crf 24 \
    -pix_fmt yuv420p \
    -movflags +faststart \
    -an \
    "$output"
done

echo "Compressed videos saved in $OUTPUT_DIR"
