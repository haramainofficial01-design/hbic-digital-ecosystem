# Prayer and public API CPU update — October 31, 2026

Fajr iqamah follows the date-specific Iqamah.ca adhan plus ten minutes. A later explicit staff override takes precedence, matching the existing Maghrib policy. The former fixed Fajr override was removed from the published/draft field only. Dhuhr, Asr, Isha, Maghrib and other content were preserved; transaction verification uses sorted content hashes. No mass notification was sent.

The existing production workflow deployed and promoted `dpl_CjjFhoqjJskaV7LiCQCQXY8Uq4Bg`, source `d6043b7`. Live display and public mobile content agree; staff-entered Dhuhr 1:30 PM, Asr 4:00 PM and Isha 8:00 PM remain intact. Today's Fajr adhan 6:57 AM resolves to iqamah 7:07 AM. Future-day fixtures verify daily drift, the November transition, provider outages, manual precedence and snapshot agreement.

Public timetable/content responses now use a 60-second CDN cache instead of 15 seconds. Browser caches still revalidate; no unbounded stale response window is used. The process-local cache remains 15 seconds, and explicit admin verification remains uncached. Changes can take up to the combined short cache windows to appear during ordinary polling. Private Academy, payment, authentication and admin responses were not made public or cacheable.

Firebase authentication now loads only inside authenticated token verification. Ten fresh-process local samples of the public API helper measured average CPU time of 57.91 ms before and 28.85 ms after (about 50% lower for this isolated module test). This is not an account-wide production CPU reduction measurement. Public CDN cache hits were confirmed live. Existing account usage is not refunded by these changes.

Checks: 22 prayer/auth/cache tests plus 3 public-contract tests passed; public-web typecheck passed. Staged verification confirmed Fajr offset, preservation of other staff times, display/app parity, payment availability and public cache responses. Detailed route CPU metrics were unavailable on the free plan because Vercel requires Observability Plus; no paid upgrade was enabled. No native store build is needed for this server-resolved timetable change.

Rollback source and prior deployment remain recoverable. Private mutation backups, benchmark samples and deployment checks are retained under local output folders, outside Git. The unrelated local certificate Python cache was left untouched.
