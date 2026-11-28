# Prayer Room over HDMI

Connect a Raspberry Pi 4 or 5 to the Samsung TV with a micro-HDMI cable and its own power supply. Use Raspberry Pi OS 64-bit **with Desktop**, connect the Pi to Wi-Fi or Ethernet, and enable desktop automatic login for the account that will run the display. [Raspberry Pi kiosk guide](https://www.raspberrypi.com/tutorials/how-to-use-a-raspberry-pi-in-kiosk-mode/)

1. Copy the **entire extracted Prayer Room folder** onto the Pi. Open a terminal in that folder.
2. Run `sh kiosk/install.sh` as the signed-in user. If Chromium is missing, install it with `sudo apt install chromium` and rerun the installer.
3. Log out and back in, or restart the Pi. Select its HDMI input on the Samsung. On the Pi, use the desktop display settings to select a resolution the TV offers, and disable screen blanking if you want the ambient display to stay visible.

The Pi serves Prayer Room on its own loopback address. The Mac can be off. Live HBIC prayer updates, broadcasts and recitations still require internet. Use a keyboard or a USB remote that sends arrow, Enter and Escape keys. Samsung Home opens Smart Hub and the TV’s installed apps.

To update, run the installer from the new full folder and reopen the session. The separate Chromium profile retains your reciter choice and playback position. To exit kiosk mode, press **Alt+F4**. Run `sh kiosk/install.sh uninstall` to remove the app and its automatic startup entry. Its profile remains under `~/.local/state/shafiq-prayer-room` unless the account sets a custom XDG state path.
