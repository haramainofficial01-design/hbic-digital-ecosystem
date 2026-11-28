#!/bin/sh
# Install for the signed-in Raspberry Pi desktop user.
set -eu
mode=${1:-install}
case "$mode" in install|uninstall) ;; *) echo 'Usage: sh kiosk/install.sh [uninstall]' >&2; exit 2;; esac
[ "$(uname -s)" = Linux ] || { echo 'Run this on the Raspberry Pi.' >&2; exit 1; }
[ "$(id -u)" != 0 ] || { echo 'Run as the desktop user, without sudo.' >&2; exit 1; }
if [ "$mode" = install ]; then command -v chromium >/dev/null || { echo 'Install Chromium first: sudo apt install chromium' >&2; exit 1; }; fi
source_dir=$(CDPATH='' cd -- "$(dirname -- "$0")/.." && pwd)
python3 - "$mode" "$source_dir" <<'PY'
import os, shutil, sys, tempfile
from pathlib import Path

mode, source = sys.argv[1], Path(sys.argv[2])
desktop = Path(os.environ.get("XDG_CONFIG_HOME") or Path.home() / ".config") / "autostart/shafiq-prayer-room.desktop"
root = Path(os.environ.get("XDG_DATA_HOME") or Path.home() / ".local/share") / "shafiq-prayer-room"
marker = root / ".prayer-room-install"
desktop_marker = "X-Shafiq-Prayer-Room=true"
if desktop.exists() and desktop_marker not in desktop.read_text().splitlines():
    sys.exit(f"Existing unrelated autostart entry at {desktop}")
if root.exists() and not marker.is_file():
    sys.exit(f"Existing unrelated folder at {root}")
if mode == "uninstall":
    desktop.unlink(missing_ok=True)
    if marker.is_file():
        shutil.rmtree(root)
    print("Removed Prayer Room and its startup entry. The separate Chromium profile is retained.")
    sys.exit()
if not (source / "index.html").is_file() or not (source / "art").is_dir():
    sys.exit("Extract the whole Prayer Room folder before running the installer.")
root.mkdir(parents=True, exist_ok=True)
marker.touch()
with tempfile.TemporaryDirectory(prefix=".building-", dir=root) as temporary:
    work = Path(temporary)
    site = work / "site"
    site.mkdir()
    for item in source.iterdir():
        if item.name == "art":
            shutil.copytree(item, site / "art")
        elif item.is_file() and item.suffix in {".css", ".html", ".js", ".svg", ".png", ".webp", ".woff2", ".txt"}:
            shutil.copy2(item, site / item.name)
    # A single symlink switch exposes a complete release to the local server.
    previous = (root / "site").resolve() if (root / "site").is_symlink() else None
    release = root / ("release-" + work.name.removeprefix(".building-"))
    site.rename(release)
    link = work / "current"
    link.symlink_to(release.name, target_is_directory=True)
    link.replace(root / "site")
    if previous and previous.parent == root.resolve() and previous.name.startswith("release-"):
        shutil.rmtree(previous, ignore_errors=True)
    launch = work / "launch.py"
    launch.write_text('''import functools, http.server, os, pathlib, subprocess, threading
root = pathlib.Path(__file__).resolve().parent
profile = pathlib.Path(os.environ.get("XDG_STATE_HOME") or pathlib.Path.home() / ".local/state") / "shafiq-prayer-room/chromium"
profile.mkdir(parents=True, exist_ok=True)
handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(root / "site"))
with http.server.ThreadingHTTPServer(("127.0.0.1", 18765), handler) as server:
    threading.Thread(target=server.serve_forever, daemon=True).start()
    subprocess.run(["chromium", "--kiosk", "--no-first-run", "--no-default-browser-check", "--user-data-dir=" + str(profile), "http://127.0.0.1:18765/"], check=True)
''')
    launch.replace(root / "launch.py")
desktop.parent.mkdir(parents=True, exist_ok=True)
# Desktop Entry has its own quoting rules; Exec launches Python without a shell.
script = str(root / "launch.py").replace("%","%%")
for char in ('\\','"','`','$'):
    script = script.replace(char, '\\'+char)
script = script.replace('\\','\\\\')
with tempfile.NamedTemporaryFile("w", dir=desktop.parent, delete=False) as f:
    f.write("[Desktop Entry]\nType=Application\nName=Shafiq Family Prayer Room\n"
            f'Exec=/usr/bin/python3 "{script}"\nTerminal=false\n{desktop_marker}\n')
Path(f.name).replace(desktop)
print("Prayer Room is installed. It will open at the next graphical desktop login.")
PY
