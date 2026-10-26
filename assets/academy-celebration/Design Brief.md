# Qur’an Class Celebration posters

Thursday, October 29, 2026 · 5:30–7:30 PM
HBIC Qur’an Academy · Masjid Bilal · Calgary

## Current artwork

The current editions use an editorial event-programme composition, replacing the earlier plain and arch-border designs. They contain real typeset Didot display lettering, Avenir Next supporting text and Georgia footer text. All font files remain on the local system and are not redistributed. There is no image-generated artwork or generated lettering.

The only raster source included in the SVG is the existing official masjid logo from `apps/public-web/public/brand/hbic-logo.png`. Folded-paper rosettes, ribbons, layered sheets, light/shadow and the framing are authored SVG geometry and gradients. The brothers’ edition uses a sharper 24-fold teal rosette on deep petrol, with ivory and gold type. The sisters’ edition uses a finer 32-fold rose rosette on warm blush, with plum type. Their base surfaces, contrast and rosette construction differ, rather than simply changing a label.

Both retain an entirely empty programme field in the central sheet. No activities, menu, segment timings or other unconfirmed event details have been invented. The confirmed overall time remains 5:30–7:30 PM. No teaser copy is included.

## Files

Each edition has a 2160 × 2700 PNG for sharing and a 1080 × 1350 editable SVG. The PNG preserves the typography on any device. For editing live SVG text, install Didot and Avenir Next; standard fallbacks are specified but will alter the typography.

The editable source is `Render Posters.mjs`. From the project root:

```sh
node 'assets/academy-celebration/Render Posters.mjs'
```

Exports use local headless Chromium with network requests blocked. Both editions were visually inspected for typography, spacing, colour contrast, logo, side labels, date/time and the empty programme area. The export checks text against the artwork safe bounds.

These files are prepared artwork. Saving them does not send messages or publish them to HBIC’s website or apps.
