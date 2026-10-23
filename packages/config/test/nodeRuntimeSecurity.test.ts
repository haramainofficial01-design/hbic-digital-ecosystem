import assert from "node:assert/strict";
import test from "node:test";
import { nodeRuntimeSecurity } from "../src/nodeRuntimeSecurity";

test("rejects every affected patch line and accepts the exact upstream security floors", () => {
  for (const [oldVersion, fixedVersion] of [["22.23.3", "22.23.4"], ["24.22.0", "24.22.1"], ["26.12.0", "26.12.1"]]) {
    assert.equal(nodeRuntimeSecurity(oldVersion).patched, false);
    assert.equal(nodeRuntimeSecurity(fixedVersion).patched, true);
    assert.equal(nodeRuntimeSecurity(`v${fixedVersion}`).patched, true);
    assert.equal(nodeRuntimeSecurity(fixedVersion).minimumPatchedVersion, fixedVersion);
  }
});

test("compares version numbers numerically and does not approve unreviewed or prerelease runtimes", () => {
  for (const version of ["24.22.2", "24.23.0", "24.100.0", "26.13.0", "22.24.0"]) assert.equal(nodeRuntimeSecurity(version).patched, true);
  for (const version of ["24.9.99", "26.8.1", "20.99.99", "18.20.8", "27.0.0", "24.22.1-rc.1", "24.x", "invalid", ""]) assert.equal(nodeRuntimeSecurity(version).patched, false);
});
