# HBIC 1.5.1 release handoff

## Live production

- Public website and TV display: `https://hbic.ca`
- Display admin: `https://hbic.ca/display-admin`
- Dedicated admin dashboard: `https://hbic-calgary-admin-haramain-team.vercel.app`

## Prepared store assets

- App Store iPhone screenshots: `output/store/app-store/iphone-6.3/`
- App Store Watch screenshot: `output/store/app-store/apple-watch/`
- App Store icon: `output/store/app-store/app-icon-1024.png`
- Google Play phone screenshots: `output/store/google-play/phone-screenshots/`
- Google Play Wear OS screenshot: `output/store/google-play/wear-os-screenshots/`
- Google Play icon: `output/store/google-play/app-icon-512.png`

All phone screenshots were captured from release builds on iPhone 18 Pro Simulator or Pixel 9 API 36 emulator. The App Store icon is 1024x1024 RGB PNG; the Google Play icon is 512x512 32-bit PNG with alpha. The iPhone set is 1206x2622 and the Android set is 1080x1920.

## Release metadata

- Version: `1.5.1`
- Apple What's New: `A unified Masjid Bilal experience with live official prayer and Iqamah times, a refreshed first-launch guide, improved notifications, and companion support for Apple Watch, widgets, and Wear OS.`
- Google Play release name: `1.5.1 — Unified prayer schedule & watch support`

## Terminal release commands

Run from the repository root. The `eas submit` commands deliberately omit `--what-to-test`; that EAS changelog field is not available on the current plan.

```zsh
export PATH="/Users/sahlshafiq/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH"
cd "/Users/sahlshafiq/Documents/Coding/HBICCalgaryApp"

npm install
npm run build:web
npm run typecheck --workspace @hbic/public-web
npm run typecheck
npm run lint
npm run test:prayer
npm run test:prayer-sync
npm run test:onboarding
npm run test:admin-auth
npm run test:display
npm run test:halal
npm run test:community
npm run test:notifications
npm run test:notification-payload
npm run test:privacy
npm --workspace @hbic/mobile run native:verify:targets
npm --workspace @hbic/mobile run native:test:snapshot

cd apps/mobile
npx eas-cli build --platform ios --profile production --wait --message "Masjid Bilal 1.5.1 — unified prayer schedule, onboarding and watch support"
npx eas-cli submit --platform ios --profile store --latest --wait

npx eas-cli build --platform android --profile production --wait --message "Masjid Bilal 1.5.1 — unified prayer schedule, onboarding and watch support"
npx eas-cli submit --platform android --profile store --latest --wait
```

EAS submits the binary. Upload the prepared listing icon/screenshots in App Store Connect and Google Play Console before sending the respective releases to review. EAS does not manage store-listing artwork.

## Current external limitations

- Personal Firebase administrator accounts with MFA still require the Firebase/Google Cloud Identity Platform permission and billing decision. Shared access stays available until that is completed.
- A real device must be used for final APNs/FCM provider delivery and custom notification-sound confirmation; automated schedule, payload, permission, and deep-link tests are green.
- Wear OS Play distribution needs the existing Play upload-signing credentials; the verified local Wear AAB is not a Play-submission substitute.
- Zepp distribution needs a real Zepp developer app ID instead of the present placeholder.
