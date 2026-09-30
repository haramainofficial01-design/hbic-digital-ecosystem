/* eslint-disable @typescript-eslint/no-require-imports */
import { registerHijriDateFormatter } from "@hbic/shared";
import { DateTimeFormat } from "@formatjs/intl-datetimeformat";

// Keep the polyfill scoped to the Hijri calculation. Replacing Intl globally
// would also change unrelated device-local date and number formatting.
const nativeFormatter = Intl.DateTimeFormat;
const intl = Intl as unknown as { DateTimeFormat: typeof Intl.DateTimeFormat };
try {
  intl.DateTimeFormat = DateTimeFormat as unknown as typeof Intl.DateTimeFormat;
  // These imports register only the two app languages, Calgary's timezone,
  // and the same Umm al-Qura calendar used by the website/server resolver.
  require("@formatjs/intl-datetimeformat/locale-data/en.js");
  require("@formatjs/intl-datetimeformat/locale-data/ur.js");
  require("@formatjs/intl-datetimeformat/add-golden-tz.js");
  require("@formatjs/intl-datetimeformat-calendar-islamic-umalqura");
  require("@formatjs/intl-datetimeformat-calendar-islamic-umalqura/locale-data/en.js");
  require("@formatjs/intl-datetimeformat-calendar-islamic-umalqura/locale-data/ur.js");
} finally {
  intl.DateTimeFormat = nativeFormatter;
}

registerHijriDateFormatter((date, timeZone) => new DateTimeFormat("en-u-ca-islamic-umalqura", {
  timeZone,
  day: "numeric",
  month: "long",
  year: "numeric"
}).formatToParts(date) as Intl.DateTimeFormatPart[]);
