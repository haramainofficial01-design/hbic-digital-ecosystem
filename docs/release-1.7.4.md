# Masjid Bilal 1.7.4

Donation Checkout uses the existing Academy Stripe server client/account. Funds
are validated server-side; prices are exact CAD cents. Checkout, product and
PaymentIntent metadata carry `hbicPaymentKind=donation`, `donationCategory` and
`donationCategoryName`. Donations use one-time payment mode and cannot create an
Academy family, tuition subscription or Academy pass. The signed existing
webhook records confirmed donations separately in `donationPayments`; replay
uses the Checkout Session ID as the record key. The return page retrieves Stripe
status and never confirms a payment from a URL alone.

English, Urdu, Dari (`fa-AF`) and Arabic interface preferences persist locally.
The first introduction page offers all four languages. The reviewed interface
catalog applies to controls, navigation, practice instructions and Academy
controls/policy in the app's embedded website. Arabic/Dari/Urdu use RTL text.
Centre-authored notices, parent/student names, addresses, Quran text, and Quran
meaning retain their source content; a language preference does not rewrite
them. Academy policy translations are pinned to the current v5 policy.

The Android Quran JSI library in 1.7.3 had 4 KB ELF alignment, while other 64-bit
libraries were already aligned. Prebuild now links that target with the
documented 16 KB maximum/common page size flags. Validate all 64-bit LOAD
segments in the final AAB before submission. R8 minification, resource shrinking
and full mode remain enabled; 1.7.3 mapped 7,283 of 8,236 classes to renamed
symbols (88.4%). Keep the verified Expo reflection rules.

Three mobile photographs use smaller derivatives; originals are preserved.
Android images request resize/downsampling. The homepage image uses absolute
fill instead of percentages inside a padded ImageBackground.

Android edge-to-edge is explicitly enabled and safe areas remain in use.
React Native/Expo include legacy system-bar calls for older Android versions;
Play's static recommendation may continue to identify these dependencies.
Do not remove their compatibility methods merely to suppress a recommendation.

Focused donation, webhook, locale and onboarding tests, both typechecks, mobile
bundles and the website build are required. The existing app identifiers,
credentials, Academy billing rules, prayer resolver and Watch targets remain.
