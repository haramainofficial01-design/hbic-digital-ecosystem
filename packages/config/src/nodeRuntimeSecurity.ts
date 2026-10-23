/** Minimum upstream fixes for the October 21, 2026 Node.js security release.
 * https://nodejs.org/en/blog/vulnerability/october-2026-security-releases
 * New major lines require explicit review rather than an unbounded >= range.
 */
const minimumPatchedVersions: Record<number, string> = {
  22: "22.23.4",
  24: "24.22.1",
  26: "26.12.1"
};

export function nodeRuntimeSecurity(version: string) {
  const match = /^v?(\d+)\.(\d+)\.(\d+)$/.exec(version);
  const parts = match ? match.slice(1).map(Number) : [];
  const minimumPatchedVersion = minimumPatchedVersions[parts[0]] ?? null;
  const minimum = minimumPatchedVersion?.split(".").map(Number);
  const patched = Boolean(minimum && (parts[1] > minimum[1] || parts[1] === minimum[1] && parts[2] >= minimum[2]));
  return { nodeVersion: version, minimumPatchedVersion, supported: minimumPatchedVersion !== null, patched,
    advisory: "CVE-2026-111497", policyDate: "2026-10-21" };
}
