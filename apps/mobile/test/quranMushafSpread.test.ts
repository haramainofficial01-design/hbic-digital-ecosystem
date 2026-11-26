import assert from "node:assert/strict";
import { test } from "node:test";
import { validMushafPageNumber } from "@hbic/shared";
import { mushafPresentation, mushafSpreadStart, mushafTurn } from "../src/quran/mushafSpread";

test("fold layouts use the reported hinge, preserving a standard window", () => {
  assert.deepEqual(mushafPresentation(null), { kind: "single" });
  assert.deepEqual(mushafPresentation({ width: 955, height: 450 }), { kind: "single" });
  assert.deepEqual(mushafPresentation({
    width: 650, height: 800, x: 319, y: -26, right: 331, bottom: 816, active: 0,
  }), { kind: "spread" });
  assert.deepEqual(mushafPresentation({
    width: 650, height: 800, x: 307, y: -26, right: 329, bottom: 816, active: 1,
  }), { kind: "spread", hinge: { left: 307, gap: 22, right: 321 } });
  assert.deepEqual(mushafPresentation({
    width: 931, height: 505, x: -8, y: 196, right: 936, bottom: 231, active: 1,
  }), { kind: "tabletop", top: 196, gap: 35 });
  assert.deepEqual(mushafPresentation({
    width: 398, height: 600, x: 191, y: 0, right: 204, bottom: 600, active: 1,
  }), { kind: "single" });
});

test("each ayah page belongs to one right-to-left spread and paging stays within the Mushaf", () => {
  for (let page = 1; page <= 604; page++) {
    const right = mushafSpreadStart(page);
    assert.equal(right % 2, 1);
    assert.ok(page === right || page === right + 1);
    assert.ok(validMushafPageNumber(right) && validMushafPageNumber(right + 1));
    assert.equal(mushafTurn(page, 1, true), right + 2);
    assert.equal(mushafTurn(page, -1, true), right - 2);
    assert.equal(mushafTurn(page, 1, false), page + 1);
    assert.equal(mushafTurn(page, -1, false), page - 1);
  }
  assert.equal(validMushafPageNumber(mushafTurn(1, -1, true)), false);
  assert.equal(validMushafPageNumber(mushafTurn(604, 1, true)), false);
});
