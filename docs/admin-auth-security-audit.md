# HBIC Admin Authentication Audit

## Current model

The administrative web interface calls protected APIs hosted by the public
Next.js deployment. For private Quran Academy records, an administrator signs in
with a personal Firebase email and password. The email must be verified and
approved through `ADMIN_SUPER_EMAILS` or an explicitly granted admin role; the
server verifies the signed ID token on every protected request. A separate
session endpoint confirms approval before the UI enables private records.

The older shared HBIC email/password remains available for content publishing
only. It uses HTTP Basic over HTTPS with credentials stored in Vercel environment
variables. It does not unlock private Academy family or payment records. MFA is
not required: HBIC opted for approved personal password sign-in because Firebase
TOTP project-configuration access was unavailable and the extra step was
operationally burdensome.

The legacy `X-Admin-Secret` and bearer-key authorization paths have been removed.

## Risks

The shared publishing account cannot identify which person performed an action;
rotate it if disclosed. Personal Academy accounts are attributable and can be
revoked individually, but password-only access is less resistant to phishing or
credential reuse than MFA. Use strong unique passwords and promptly remove
departing staff from the approved list/roles. A password-reset email by itself
does not grant an unapproved account Academy access.

## Implemented boundaries

1. Shared publishing credentials are checked server-side with timing-safe
   comparisons and non-enumerating errors.
2. Academy endpoints reject shared credentials and require a signed, verified,
   approved personal Firebase account with an Academy role.
3. The old publish-key path remains removed. Public `/display` is read-only.
4. Draft concurrency, atomic publication, prayer propagation, and notifications
   remain unchanged.

## Future hardening

HBIC can later add passkeys/MFA if its Firebase project and staff workflow
support them. That would require a deliberate migration for existing admins;
do not silently turn it on during a live Academy term.
