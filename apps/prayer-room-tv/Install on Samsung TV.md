# Install Prayer Room on a Samsung TV

## Save it in the TV browser now

1. Put the TV and the Mac on the same home network.
2. Open Internet on the TV and enter `http://MAC-LAN-IP:8765/`. If the Mac's
   network address changes, use its new local address with port 8765.
3. Select the star by the browser address bar to bookmark the page, where
   offered. The bookmark reopens the dashboard whenever the Mac is awake
   and serving it at that address.
4. If Internet offers **Add to Home** in **Home → Apps → App Settings**,
   pin it for quicker access to your bookmarks.

[Samsung TV bookmark instructions](https://www.samsung.com/co/support/tv-audio-video/smart-tv-uhd-4k-un50ku6000-how-to-add-a-page-to-bookmarks/) ·
[Samsung Canada Smart Hub instructions](https://www.samsung.com/ca/support/tv-audio-video/install-an-app-on-your-samsung-tv/)

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
