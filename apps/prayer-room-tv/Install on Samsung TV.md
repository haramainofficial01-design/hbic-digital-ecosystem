# Install Prayer Room on a Samsung TV

## On your 75-inch Samsung

1. Connect the TV to the same home Wi-Fi as the Mac. The Mac must be signed in and awake.
2. On the Samsung remote press **Home**, open **Apps**, then **Internet**. Enter **http://MAC-LAN-IP:8765/**. Select the **star** to save Prayer Room to bookmarks.
3. Open **Settings → All Settings → Advanced Features → Start Screen Option**. Turn **Start with Smart Hub Home** off. If offered, turn **Autorun Samsung TV Plus** off and **Autorun Last App** on.
4. Return to the Internet app with Prayer Room showing. Press **Power** once to put the TV in standby; turn it back on. If it opens Prayer Room, leave Prayer Room open before switching the TV off each night.

Samsung's manual makes last-app startup dependent on the TV and the app. A bookmark stays saved, but some firmware opens the browser start page or Smart Hub after standby. Use the HDMI setup below for a dedicated display. If your router changes the Mac’s address, reserve its current address in the router’s DHCP settings to keep the same bookmark.

## Permanent display through HDMI

Use a Raspberry Pi 4 or 5 that can stay plugged into wall power beside the TV. The [standalone setup](kiosk/README.md) installs the included Prayer Room files on the Pi and starts them full-screen at desktop login. Once set up, the Pi works independently of the Mac. Internet is needed for live times and media.

On the Samsung, select the Pi’s HDMI input. Keep **Start with Smart Hub Home** and **Autorun Samsung TV Plus** off where available. Keep the Pi powered and leave the TV on its Prayer Room HDMI input before pressing Power. Samsung resumes the last source. After using another app or input, return to this HDMI input before turning off the TV. Press **Home** whenever you want Samsung apps, including YouTube and Prime Video. Use a keyboard or wireless mini-keyboard with the Pi for navigation.

[Samsung Canada support and manual for UN75U7900FFXZC](https://www.samsung.com/ca/support/model/UN75U7900FFXZC/) · [Samsung start screen settings](https://www.samsung.com/au/support/tv-audio-video/configuring-start-screen-for-the-samsung-tv/)

## Install locally as a Samsung TV app

This source is unsigned. The target is the Canadian 75-inch U7900F (UN75U7900FFXZC), a
2025 Crystal UHD model. Samsung lists it on Tizen 9.0 and recommends
TV Extension 9.0 or later. This package targets Tizen 9.0 as its
minimum. Samsung requires a signed package and a physical test on your TV.

1. On the TV, go to **Settings → All Settings → Support → About This TV**.
   Confirm the model code is **UN75U7900FFXZC**. To find the TV’s local
   IP address, open **Settings → All Settings → Connections → Network →
   Network Status**, then **IP Settings** if offered.
2. On the Mac, install Tizen Studio with the Samsung TV Extensions and
   Samsung Certificate Extension 2.0.73 or later. Open Tizen Studio and create a **TV-Samsung
   → Web Application → Basic Project**. Use a locally installed TV profile
   version. Copy the Prayer Room dashboard files, **config.xml**, and
   **tizen-icon.png** to the project root. The local **index.html** is the
   entry point.
3. Connect the Mac and TV to the same network. On supported TVs open **Smart
   Hub → Apps → App Settings**, enter `12345`, enable **Developer Mode**, enter
   your Mac's LAN address, and reboot the TV.
4. In **Tizen Studio → Device Manager → Remote Device Manager**, add the TV's
   LAN address and connect. Create a Samsung certificate profile in
   Certificate Manager and include the connected TV's device ID (DUID) in the
   distributor certificate. Use **Permit to install applications** in
   Device Manager when prompted.
5. Build and sign the Tizen Web package, then choose **Run As → Tizen Web
   Application** with the TV selected. Verify that it opens from the TV,
   displays current Calgary timings, and plays recitations and each live
   channel with the physical remote. A local app loads its interface on the
   TV itself. Internet is still required for fresh timings and streaming.
6. If the installed app offers **Add to Home**, pin it. Some models offer
   **Settings → All Settings → Advanced Features → Start Screen Option →
   Autorun Last App**. Try that on your model if you want the app to reopen
   after power-on. Samsung makes this dependent on both the model and the app.

Developer Mode is Samsung's device-testing route. Routine public Smart Hub
installation requires separate approval through Samsung's Seller Office.
Samsung's supported local installation method is through the SDK over the
network.

[Samsung Canada model support and manual](https://www.samsung.com/ca/support/model/UN75U7900FFXZC/) ·
[Samsung SDK setup](https://developer.samsung.com/smarttv/develop/getting-started/setting-up-sdk/installing-tv-sdk.html) ·
[Connect the target TV](https://developer.samsung.com/smarttv/develop/getting-started/using-sdk/tv-device.html) ·
[Create the signing profile](https://developer.samsung.com/smarttv/develop/getting-started/setting-up-sdk/creating-certificates.html) ·
[Samsung startup settings](https://www.samsung.com/ae/support/tv-audio-video/use-autorun-start-screen-options-on-your-samsung-tv/)

## What to verify on the physical TV

- Samsung's standard app graphics surface on a 4K UHD TV is 1920 × 1080.
  The TV scales it to the panel. Video resolution is separate. The embedded
  live player uses the qualities made available by the broadcaster and device.
- Some streams restrict embedded playback or may require an HTTPS page with
  a referrer. If the embedded player fails on the installed version, try the
  official viewing link using the TV's streaming app or browser.
- Enable the adhan preview in the app settings before expecting automatic
  sound. Standby and backgrounding can suspend the page. Some TV browsers
  block scheduled audio.

[Samsung app resolution guide](https://developer.samsung.com/smarttv/develop/guides/fundamentals/managing-screen-resolution.html) ·
[Samsung UHD playback guide](https://developer.samsung.com/smarttv/develop/guides/multimedia/4k-8k-uhd-video.html)
