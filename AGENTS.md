# HBIC project continuity

The user's canonical private GitHub repository is:
https://github.com/haramainofficial01-design/hbic-digital-ecosystem

For future HBIC work in this checkout:

- Preserve existing work and make only requested, scoped changes.
- Commit completed changes with descriptive messages and push them to this repository before handing off. If authentication or networking prevents a push, report that explicitly; never claim an unpushed change is backed up remotely.
- Stage explicit reviewed paths, not a blanket `git add .`. Inspect diffs for credentials and private parent/student/payment information before each commit.
- Never commit environment secrets, signing keys/certificates, service-account credentials, private records, generated native projects, local agent configuration, or local build/output caches.
- Keep release commits and rollback references recoverable. Never force-push or rewrite existing release history without explicit authorization.
- Do not change production hosting, configure automatic deployments, or create builds merely because code was pushed.
- The real Expo app is `apps/mobile`, project `79283015-cb87-48ef-9761-81ab87641205`, owner `hbiccas-team`, bundle/package `ca.hbic.calgary.app`. Run mobile release commands only from that directory. Never use a root Expo project or initialize a new project.
- Preserve the canonical prayer API/resolver/cache, manual overrides, TV flow, existing signing credentials, and Watch/widget identifiers.

The default branch contains the current integrated source. Continue feature/release work on the existing appropriate branch and push that branch; do not merge unverified release changes merely to update the default branch.
