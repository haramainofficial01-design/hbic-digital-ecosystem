#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
OUTPUT_DIR="$ROOT_DIR/demo-recordings/output"
DESKTOP_DIR="$HOME/Desktop/HBIC-Demo-Recordings"
OUTPUT_FILE="$OUTPUT_DIR/hbic-ios-app-demo.mov"
RECORD_SECONDS="${RECORD_SECONDS:-240}"
RUN_EXPO="${RUN_EXPO:-1}"
APP_BUNDLE_ID="${APP_BUNDLE_ID:-ca.hbic.calgary.app}"
APP_URL="${APP_URL:-hbiccalgary://}"

mkdir -p "$OUTPUT_DIR"

pick_device() {
  local candidates=(
    "iPhone 17 Pro Max"
    "iPhone Air"
    "iPhone 16 Pro Max"
    "iPhone 15 Pro Max"
    "iPhone 14 Pro Max"
  )

  for candidate in "${candidates[@]}"; do
    if xcrun simctl list devices available | grep -q "$candidate"; then
      echo "$candidate"
      return 0
    fi
  done

  xcrun simctl list devices available | awk -F '[()]' '/iPhone/ {print $1; exit}' | sed 's/[[:space:]]*$//'
}

DEVICE_NAME="${DEVICE_NAME:-$(pick_device)}"

if [[ -z "$DEVICE_NAME" ]]; then
  echo "No available iPhone simulator was found. Open Xcode once and install an iOS simulator runtime, then retry."
  exit 1
fi

echo "Using simulator: $DEVICE_NAME"
open -a Simulator
xcrun simctl boot "$DEVICE_NAME" 2>/dev/null || true
xcrun simctl bootstatus "$DEVICE_NAME" -b

if [[ "$RUN_EXPO" == "1" ]]; then
  echo "Building and launching HBIC Calgary. This can take a few minutes on the first run."
  (
    cd "$ROOT_DIR/apps/mobile"
    npx expo run:ios --device "$DEVICE_NAME"
  ) &
  EXPO_PID=$!
  sleep "${APP_LAUNCH_WAIT_SECONDS:-45}"
else
  echo "RUN_EXPO=0 set. Launching the installed HBIC Calgary app."
  xcrun simctl launch booted "$APP_BUNDLE_ID" >/dev/null 2>&1 || xcrun simctl openurl booted "$APP_URL" || true
  sleep "${APP_LAUNCH_WAIT_SECONDS:-5}"
fi

echo "Starting iPhone simulator recording: $OUTPUT_FILE"
echo "Manual demo path: Home > Prayer > Events > Donate > More > Media > Youth > Programs > Contact > About > Settings > Notifications > Home."
xcrun simctl io booted recordVideo --force "$OUTPUT_FILE" &
REC_PID=$!

if [[ "${TOGGLE_APPEARANCE:-0}" == "1" ]]; then
  sleep 10
  xcrun simctl ui booted appearance dark || true
  sleep 10
  xcrun simctl ui booted appearance light || true
  remaining=$((RECORD_SECONDS - 20))
  if [[ "$remaining" -gt 0 ]]; then
    sleep "$remaining"
  fi
else
  sleep "$RECORD_SECONDS"
fi

echo "Stopping recording."
kill -INT "$REC_PID" 2>/dev/null || true
wait "$REC_PID" 2>/dev/null || true

if [[ "${DEMO_COPY_DESKTOP:-1}" != "0" ]]; then
  mkdir -p "$DESKTOP_DIR" 2>/dev/null || true
  cp "$OUTPUT_FILE" "$DESKTOP_DIR/" 2>/dev/null || true
fi

if [[ -n "${EXPO_PID:-}" ]]; then
  wait "$EXPO_PID" 2>/dev/null || true
fi

echo "Saved iOS demo recording to:"
echo "$OUTPUT_FILE"
