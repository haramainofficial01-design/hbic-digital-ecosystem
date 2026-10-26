# Qur’an Class Celebration posters

Thursday, October 29, 2026 · 5:30–7:30 PM
HBIC Qur’an Academy · Masjid Bilal · Calgary

The current artwork replaces the earlier teaser design. It has no generated imagery, generated lettering, stock imagery or illustrations. All lettering is actual typeset text, using Georgia and Avenir Next with ordinary serif/sans-serif fallbacks. Font files are not included or redistributed.

- Brothers: navy, teal and cool off-white.
- Sisters: plum, rose and warm blush.
- Both: a completed event-poster layout with one intentionally empty centre programme field. No activities, menu or segment times have been invented. Teaser phrases and gift imagery have been removed.

## Files

Each edition includes a 2160 × 2700 PNG for sharing and a 1080 × 1350 editable SVG source. The SVG has live text; install the named fonts when editing to retain the same layout. The PNG preserves the rendered typography on any device.

The source is `Render Posters.mjs`. From the project root, run:

```sh
node 'assets/academy-celebration/Render Posters.mjs'
```

This renders the fixed SVG geometry and text using local headless Chromium. It makes no network requests and does not use an image-generation service. Exports were visually checked together for colour distinction, legibility, spacing, side labels, the date and time, and an empty programme area. Text bounds are checked against the artwork safe area during export.

These are prepared poster files only. Saving them does not send messages to families or publish content to the website or apps.
