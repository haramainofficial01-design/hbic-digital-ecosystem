# HBIC Admin Authentication Audit

## Current model

The two administrative web interfaces call mutation APIs hosted by the public
Next.js deployment. The protected routes all invoke the same server-side
authorization helper. The shared HBIC sign-in uses HTTP Basic authorization over
HTTPS with production credentials stored only as encrypted Vercel environment
variables. The email may persist locally; the password is kept in browser
`sessionStorage` and is cleared when that browser session ends.

The legacy `X-Admin-Secret` and bearer-key authorization paths have been removed.

## Risks

The requested shared account is operationally simple, but it cannot identify
which person performed an action. Anyone holding the credentials has the same
permissions, selective revocation is impossible, and it does not satisfy the
individual-account, MFA, RBAC, or attributable-audit objectives in the security
handoff. Basic credentials are replayable until rotated, even though transport is
protected by HTTPS and the password is not embedded in client bundles.

## Implemented migration

1. Both admin prompts now request the same HBIC email and password.
2. All protected APIs validate both fields server-side with timing-safe
   comparisons and a non-enumerating error message.
3. The old publish-key code path and production variable were removed.
4. Public routes, including `/display`, remain unauthenticated and read-only.
5. Existing draft concurrency, atomic publication, canonical prayer propagation,
   and notification paths are unchanged.

## Recommended target model

The long-term security target remains individual Firebase Authentication
accounts, required MFA for privileged roles, server-side role checks, revocable
sessions, and append-only audit events containing the authenticated actor UID.
That migration requires named administrator identities and MFA enrollment; a
single shared account cannot provide those properties.
