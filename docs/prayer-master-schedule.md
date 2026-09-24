# HBIC Canonical Prayer Schedule

## Production data flow

```text
Iqamah.ca HBIC adapter
        |
        v
server-side prayer resolver + last-successful Firestore cache
        ^
        |
per-prayer admin iqamah override / optional Jumu'ah override
        |
        v
effective HBIC schedule
        |
        +--> hbic.ca and /prayer-times
        +--> /display
        +--> /api/content/published (iOS and Android)
        +--> /api/content/prayer-snapshot (native fallback)
        +--> phone snapshot bridge --> iOS widgets, Watch, complications
```

The existing HBIC-specific upstream adapter is configured by
`IQAMAH_CA_HBIC_SOURCE_URL` (with `HBIC_PRAYER_SOURCE_URL` retained as a
compatibility name). Its repository fallback is the existing
`hbic-update-times-dev-api` endpoint. Mobile and Apple clients never fetch the
upstream provider directly.

## Resolution rules

- Automatic adhan and iqamah values originate from the Iqamah.ca HBIC adapter.
- An active admin iqamah override replaces only its prayer's automatic iqamah.
- Clearing that override immediately returns the effective value to the latest
  automatic value.
- Jumu'ah uses the upstream value unless `jumuahSchedule.manualOverride` is true.
- TV-only fields are presentation settings only; there are no TV-only prayer
  times.
- `America/Edmonton` is authoritative for service dates, midnight rollover,
  absolute prayer timestamps, and next-prayer calculations.

## Refresh and failure behavior

The resolver stores the most recent successful raw upstream feed in the existing
Firestore integration cache. Public reads reuse a same-day value for at most five
minutes, after which the next request refreshes upstream. The always-on TV checks
the canonical display endpoint every minute, so a running display observes a new
upstream schedule without a browser reload and initiates an upstream refresh no
more often than the server interval.

If the upstream request fails, the resolver keeps the last successful feed and
reapplies the current overrides. If that integration cache is unavailable but the
published record still contains a valid schedule, it retains that schedule rather
than replacing it with blanks. Failures and timestamps are exposed by the
protected prayer-sync/diagnostics endpoints.

## Admin behavior

The general admin and `/display-admin` show or consume the same resolver state.
For each iqamah entry the general admin exposes the automatic value, optional
manual override, and currently public value. The focused display admin provides
the same distinction with a one-click clear action. Publishing uses the existing
draft/version checks, canonical content record, page revalidation, publication
revision, and native refresh signal.

## Consistency contract

`getPublishedContent()` invokes the resolver before content is returned. Both
public content and `createWidgetPrayerSnapshot()` are produced from that resolved
record. The snapshot includes absolute timestamps and a stable schedule revision;
the mobile provider caches that contract, and the Apple bridge passes it to Watch
and widgets. This is the invariant under test:

```text
TV == website == iOS == Android == Watch == widgets == complications
```
