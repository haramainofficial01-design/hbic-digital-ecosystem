# HBIC Calgary Demo Recordings

Controlled demo recording kit for director review.

The scripts record polished product demos without showing terminal windows, browser devtools, source code, local file paths, deployment tokens, database credentials, or private environment values.

## Outputs

Recordings are saved in:

```text
demo-recordings/output/
```

The scripts also try to copy recordings to:

```text
~/Desktop/HBIC-Demo-Recordings/
```

If macOS blocks Desktop access, the recording is still saved in `demo-recordings/output/`.

## Dependencies

Install project dependencies first:

```bash
npm install --ignore-scripts --no-audit --fund=false
```

The web/admin recorders use Playwright. They prefer installed Google Chrome via Playwright's `chrome` channel. If Chrome is not available, install Playwright's browser:

```bash
npx playwright install chromium
```

MP4 compression uses `ffmpeg-static` from the project dev dependencies when available. A system `ffmpeg` also works:

```bash
brew install ffmpeg
```

## Public Website Recording

Desktop pass:

```bash
npm run demo:record:web
```

Mobile responsive pass:

```bash
npm run demo:record:web:mobile
```

Both passes:

```bash
npm run demo:record:web:all
```

Outputs:

```text
demo-recordings/output/hbic-public-website-desktop-demo.webm
demo-recordings/output/hbic-public-website-mobile-demo.webm
```

By default, the script starts the local public website server and records viewport-only video. To record the deployed preview instead:

```bash
PUBLIC_SITE_URL=https://hbic-calgary-app.vercel.app npm run demo:record:web:all
```

## Admin Dashboard Recording

```bash
npm run demo:record:admin
```

Output:

```text
demo-recordings/output/hbic-admin-dashboard-demo.webm
```

The admin recorder uses safe Playwright API mocks for draft/save/publish, so it demonstrates the workflow without writing production data or needing real secrets. It does not expose real admin credentials.

## iPhone Simulator App Recording

```bash
npm run demo:record:ios
```

Output:

```text
demo-recordings/output/hbic-ios-app-demo.mov
```

The script chooses the best available large iPhone simulator in this order:

1. iPhone 17 Pro Max
2. iPhone Air
3. iPhone 16 Pro Max
4. iPhone 15 Pro Max
5. iPhone 14 Pro Max

If the simulator or Expo build cannot be fully automated, use this manual fallback:

1. Open Simulator.
2. Run the app from `apps/mobile` with `npx expo run:ios`.
3. Start recording with:
   `xcrun simctl io booted recordVideo demo-recordings/output/hbic-ios-app-demo.mov`
4. Tap through Home, Prayer, Events, Donate, More, Media, Youth, Programs, Contact, About, Settings, Notifications, and back Home.
5. Stop recording with `Ctrl+C`.

Keep the mobile recording under 3-5 minutes.

## Compression

```bash
npm run demo:compress
```

Outputs:

```text
demo-recordings/output/compressed/
```

Compression removes audio and creates director-shareable MP4 files.

## Safe Demo Rules

- Do not show source code.
- Do not show terminal windows in recordings.
- Do not show browser devtools.
- Do not expose real admin passwords, environment variables, Vercel tokens, or Firebase credentials.
- Use demo admin mode for the dashboard recording unless the director is explicitly approved for live production access.
- Share videos through a private link first, then discuss production access as the next milestone.
