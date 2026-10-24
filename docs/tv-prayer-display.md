# Masjid Bilal TV prayer display

The prayer-hall display is a public, read-only kiosk page designed for Amazon Fire TV Silk and fixed screens. It shows Masjid Bilal branding, Calgary date/time, current Calgary weather, next prayer/countdown, today’s prayer and iqamah times, Jumu’ah, one optional notice, hbic.ca, verified social accounts, and the website/app QR.

## URLs

- Public kiosk: `https://hbic.ca/display`
- Focused staff editor: `https://hbic.ca/display-admin`
- Public display JSON: `https://hbic.ca/api/display`
- Compact current weather JSON: `https://hbic.ca/api/display/weather`

The staff editor requires the same admin publish key as the main HBIC admin dashboard. The key is stored only in that browser’s local storage and sent in the existing `X-Admin-Secret` header.

## Canonical data rule

There is one prayer schedule. `/display` reads the same published content and generated prayer snapshot as the public website, iOS/Android apps, widgets, and Apple Watch.

- Adhan times come from the existing HBIC timetable integration.
- Iqamah edits in the focused editor update the canonical iqamah fields and existing shared override records.
- Jumu’ah edits update the existing canonical Jumu’ah schedule.
- Publishing uses the existing draft/publish transaction, version preconditions, page revalidation, and device refresh signal.
- Only the title, visibility toggles, weather visibility, QR visibility, and single short notice are TV presentation settings.
- There are no TV-only prayer, iqamah, Jumu’ah, source, or schedule overrides.

## Refresh and offline behaviour

The kiosk updates its digital seconds every second. There is no analog clock. The minute-resolution countdown and prayer cards update at their next visible minute change or exact adhan/iqamah boundary, without unnecessary second-by-second rerenders. It checks the display endpoint every minute, refreshes immediately after reconnection and at Calgary date rollover. Current weather refreshes every 15 minutes and is omitted silently if unavailable, so weather can never obscure or interrupt prayer times.

The live clock has its own wall-second-aligned timer. The sky recomputes every 30 seconds; the prayer schedule wakes only when its visible content can change. When the page is hidden, live timers, weather drawing, CSS motion and network refreshes pause and recalculate immediately when it becomes visible again. Weather uses two bounded surfaces: clouds are rasterized only when their reading or size changes, then drift as one composite layer; rain/snow uses a canvas capped at 960×540 pixels, 24 particles and at most 20 drawing frames per second (16 for snow). Clear, cloudy and fog conditions have no repeating JavaScript drawing loop. Reduced motion draws a static scene. No WebGL, weather video, live blur or individual particle layers are used. The sun follows the existing canonical daylight calculation. Wind direction affects precipitation, strong wind gently sways the central lettering, and measured letter positions anchor snow caps and highlighted droplets. The six prayer tiles retain static translucent layers. Identical display polls do not replace the rendered tree or rewrite its local cache, and stalled requests time out so later reconnects can retry. Browser storage is best-effort, so disabled or full local storage does not prevent the display from loading or refreshing.

The weather readout sits in a rounded glass capsule with static tint, inset
highlights and a soft top reflection. The temperature and icon are approximately
10% larger than the initial Fire TV revision. This material uses no backdrop
filter, new animation, image asset or JavaScript work. Long condition labels
wrap within the capsule while the digital clock stays on one line.

Each changed, confirmed prayer payload is stored as the last-known-good browser snapshot. A newer cached snapshot is never overwritten by an older server response during startup, and a snapshot for yesterday is never selected for today. During a network interruption the display keeps showing the last confirmed schedule and labels it as cached while retrying. A recovered connection updates the screen without navigation or a full-page reload.

## Fire TV installation

1. Open Amazon Silk on the Fire TV.
2. Visit `https://hbic.ca/display` and add it as a favourite/bookmark.
3. Put Silk into full-screen mode and disable the screen saver/sleep timer for the display device.
4. Confirm the television’s date and time are automatic. The kiosk itself renders all prayer logic in `America/Edmonton`.
5. Verify the full schedule is inside the television’s safe area. The page is designed for 1280×720, 1366×768, 1920×1080, and 4K without scrolling.
6. On the actual Fire TV, leave the page open for several minutes and confirm the seconds and countdown advance smoothly, active weather remains visible, and reconnecting Wi-Fi refreshes without reloading. Browser emulation and a successful site build do not substitute for this device check.

Keep the previous television system available until staff have verified the production URL on the actual Fire TV and deliberately switched the input/bookmark.

## 15 October 2026 performance verification

The display-only optimisation keeps the same canonical prayer source, daily
rollover, Jumu’ah, notice, current weather, QR and social sections. Twelve TV
unit tests and the public-web typecheck/build pass. Headless production-render
checks at 1280×720 (clear), 1920×1080 (rain), and 3840×2160 (snow) show six
prayer cards, advancing clock seconds, no document overflow and no browser
exceptions. The rendered rain layout was visually inspected. A simulated
display API failure retained the last confirmed schedule while seconds
advanced; reconnect cleared the cached-state label without reloading.

These checks do **not** prove that Amazon's Downloader browser on the masjid's
Fire Stick will remain stable over a full prayer day. Staff should use the
documented Silk kiosk setup, test the updated public URL on the actual device,
and keep the previous display available until it passes that test.

### Production deployment — 15 October 2026

- Isolated release source `ae2357dfefb1d4eca9b94b968c955610939fc492` on
  `release/tv-display-2026-10-15` is based on the previously deployed
  `252ee4d8445b9e878c0203272577ecb1e32e75ed`. Only the five display optimisation
  files differ; later Quran research and other feature-branch changes are not
  included. Both source branches are pushed to the canonical repository.
- Existing Vercel public project deployment
  `dpl_DTjoTyeVnzjWPXsyArrUJNZqbKF2` completed its production build and was
  promoted after staged checks. Vercel's alias records independently confirm
  `hbic.ca`, `www.hbic.ca`, `hbic-calgary.vercel.app` and
  `hbic-calgary-app.vercel.app` all point to this deployment. The previous
  `dpl_5HG6c67foG1TyAd8AiFoBtaBmjNt` remains the rollback deployment.
- The live `/display` HTML's JavaScript contains the new display implementation.
  Headless checks against both the staged deployment and `https://hbic.ca`
  passed at 1280×720 clear, 1920×1080 rain, and 3840×2160 snow: six visible
  prayer cards, advancing seconds, no page overflow and no browser exceptions.
  A locally simulated public API failure retained the confirmed schedule and
  advancing clock; recovery removed the reconnecting label. Screenshots were
  inspected. These browser checks do not substitute for a Fire Stick soak test.
- Before promotion, public prayer times, publication version 16 and all display
  settings matched the existing production response. Home, Quran, Academy,
  donations and display-admin GET checks returned 200. No private records or
  publication settings were changed by verification.

Repeat the read-only live check explicitly with:

```sh
HBIC_TV_VERIFY_URL=https://hbic.ca npx tsx --test apps/public-web/test/tvDisplayLive.test.mts
```

The test is skipped unless the URL is explicitly provided. Its optional
`HBIC_TV_VERIFY_SCREENSHOTS=1` captures are written under ignored `output/`.
Reload the existing Fire Stick bookmark once to load the updated code.

## 23 October 2026 Fire TV rendering revision

- Removed the analog clock. Enlarged temperature/condition and added wind speed,
  with consistent vector weather icons. Prayer times, source selection, overrides,
  Jumu'ah, notices, QR destinations and publishing settings are unchanged.
- Replaced separate CSS particle layers, cloud/fog blurs and the central weather
  film with the bounded renderer described above. The Friday badge no longer
  applies a backdrop filter. Kiosk pages skip general-site intro and toast work.
- Production-build browser checks passed for 960×540 rain, 1280×720 clear,
  1366×768 clouds, 1920×1080 rain/fog/storm and 3840×2160 snow: six visible
  prayer cards, advancing seconds, no page overflow or browser exceptions,
  bounded weather surfaces and no backdrop filters. Offline recovery passed.
- Fifteen focused tests cover canonical prayer transitions, weather modes and
  allocation bounds, background/reduced-motion pause, resume, and thirty
  renderer mount/dispose cycles. The public-web typecheck, production build and
  five existing runtime-security tests passed. Existing unrelated build warnings
  remain; no new warning is attributed to the display changes.
- A three-minute Chromium run at 1280×720 with sixfold CPU throttling and six
  weather replacements had zero browser errors, zero DOM-node growth, zero
  event-listener growth and 462,736 bytes of post-GC heap growth. Clock samples
  stayed aligned with wall time. This is bounded browser evidence, **not a
  physical Fire Stick certification or a full-day stability claim**.
- Twelve-second measurements on the same desktop/viewport, before and after:

  | Scene | Browser layers | CSS animations | Main-thread task seconds |
  | --- | --- | --- | --- |
  | Rain | 65 → 13 | 48 → 2 | 0.600604 → 0.088624 |
  | Snow | 56 → 10 | 39 → 1 | 0.122095 → 0.067192 |
  | Clouds | 18 → 10 | 4 → 1 | 0.018453 → 0.012476 |

  These are short desktop samples, not estimates of Fire TV frame rate or
  memory savings. The capped precipitation surface is 960×540; cached clouds
  are 960×297 at a 16:9 viewport, independent of hardware pixel density.

Repeat the bounded soak explicitly with public GETs only:

```sh
HBIC_TV_VERIFY_URL=https://hbic.ca HBIC_TV_SOAK_SECONDS=180 npx tsx --test apps/public-web/test/tvDisplaySoak.test.mts
```

The soak is skipped unless both variables are provided. Its aggregate output
is written to ignored `output/tv-display-fire-tv/soak.json`. No private staff or
payment endpoints are called. No Fire Stick is attached to this workstation;
staff must still confirm long-running stability on the masjid's device.

### Production release verification

- Source `100411258877e4ba83052df4777f8a201c1cab1d` is committed and pushed to
  the canonical `feature/quran-reader-practice` branch. The public deployment
  `dpl_A9wH1uA5kLa9cHtiPCfs6Yctak72` completed an uncached production build
  and was promoted after staged GET verification. Its metadata matches that
  exact commit. Vercel alias records confirm `hbic.ca`, `www.hbic.ca`,
  `hbic-calgary.vercel.app` and `hbic-calgary-app.vercel.app` all point to it.
- The seven browser viewport/weather checks above also passed against the
  public `https://hbic.ca/display`, including restricted browser storage,
  offline schedule retention/recovery, bounded canvases and no analog clock.
  The weather readout does not overlap the digital clock. Rendered 540p and
  4K views were visually inspected.
- A second three-minute run against the public production URL, again with
  sixfold CPU throttling and six weather replacements, passed with zero browser
  errors, zero DOM-node growth, zero listener growth and 462,544 bytes of
  post-GC heap growth. Clock samples stayed current. This remains browser
  validation rather than an attached Fire Stick soak test.
- Before and after promotion, publication version 20, all six prayer entries
  and display settings matched. Home, Quran, Academy, donations, display and
  the staff editor returned 200; billing reported card availability; anonymous
  diagnostics returned 401. No payment, private record or content publication
  was changed by these read-only checks.
- The previous public deployment `dpl_7a2XHs2rmS8x5ZK2wFU3EuDoWkY9` remains
  recoverable. This change concerns the web TV display and does not require a
  mobile OTA or app-store build.
- The application/dependency security patches remain in this release, but the
  separate managed Node runtime issue is still open. See
  [the security record](security-node-2026-10-23.md); a successful TV release
  does not establish that Vercel has patched its function runtime.

### Glass weather readout release

Source `d3ffc072645a70c34cb79ec7911e3f742f8b4fb8` was pushed and deployed as
`dpl_5AgbifSEhSEFMP19SiA6M4xbJBPz`, then promoted after staged schedule,
weather and stylesheet checks. Deployment metadata and all four public alias
records match that source. The preceding
`dpl_A9wH1uA5kLa9cHtiPCfs6Yctak72` remains recoverable.

The production build and the seven public viewport/weather checks passed with
advancing clock seconds, offline recovery, six prayer cards and no backdrop
filters, overflow or browser exceptions. A separate layout check used −33°C,
“Heavy snow showers” and wind at 38 km/h across 960×540, 1280×720, 1366×768,
1920×1080 and 3840×2160: no header overlap and no wrapped digital clock.
The live capsule was visually inspected, with the temperature rendered at
57.6px on a 1920px viewport versus the preceding 51.84px. Canonical prayer
entries and display settings matched before and after promotion.

## Staff publishing

1. Open `/display-admin` from a trusted staff computer, or choose **Prayer Display** in the existing web admin dashboard.
2. Enter the existing admin publish key and select **Load protected draft**.
3. Edit canonical iqamah/Jumu’ah values or the small set of presentation options.
4. Choose **Save & publish everywhere** and confirm.
5. Wait for the success message confirming both the published content version and live `/api/display` verification.

The optional notice is limited to 140 characters and can have a start and expiry time. Use it for one immediately useful message, such as Jumu’ah door closure or parking guidance. Do not use it as an event feed or rotating banner.
