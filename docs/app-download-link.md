# One Masjid Bilal app link

Share **https://hbic.ca/download**.

- iPhone/iPad/iPod browser hints redirect to the existing official Apple listing
  (app ID `6790937097`).
- Android browser hints redirect to the existing official Google Play listing
  (package `ca.hbic.calgary.app`).
- Other or unrecognized devices go to `/app`, which already offers both stores.
  A browser deliberately disguising its device may also receive this choice.

This is a temporary server redirect, without JavaScript, cookies, added tracking
or a third-party smart-link service. It uses only the ordinary User-Agent header.
Responses are dynamic and non-cacheable, varying by User-Agent so one phone's
destination is not reused for another. Destinations come from existing fixed
store configuration; query parameters cannot choose a target or reach the stores.
GET and HEAD are supported. Native app updates are not required.

`npm run test:app-download` checks five groups: iOS/in-app browsers,
Android/tablets/in-app browsers, unknown/desktop/unsupported devices, cache
isolation, and HEAD/query safety. No prayer, TV, Academy or payment behaviour is
changed.
