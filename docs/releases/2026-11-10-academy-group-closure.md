# One-day Academy group closure

November 12, 2026 is a girls-only closure. The boys’ Qur’an class remains at 5:30–7:00 PM, and November 19 and all other dates keep their existing schedule. The signed-in website calendar and app Academy view share the same server feed. A one-day group override replaces the generic class entry for that date: a girls-only family sees No class; families with a boys’ class still see class on the date alongside the explicit girls-only closure note. No native app update is needed.

The existing authenticated Academy feed also supports private family notices. It strips audience identifiers from the response. A private notice retains a non-public class target so an older deployment cannot treat it as a general announcement. The November 12 notice expires at midnight Calgary time. No roster membership, tuition, payment or enrolment is changed by this release.

Twenty-five calendar/shared tests pass, including girls-only, boys-only, mixed and unassigned views, the following Thursday, private audience enforcement and identifier removal. Public web TypeScript passes.

Production deployment `dpl_Es8t5etM8HiaKULpxyckQSk2kszm` was promoted to hbic.ca on November 10. Verification against production records confirmed the closure applies only to November 12, boys and mixed schedules stay open, the targeted notice is returned only for allowed families and the endpoint rejects unauthenticated requests. No Academy push device was registered for the confirmed target audience. Recipient lists and delivery records stay outside Git.
