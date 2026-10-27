import { test } from "node:test";
import assert from "node:assert/strict";
import { availableItems, changePotluck, emptyPotluck, potluckEvent, potluckItems, publicPotluck } from "../lib/potluckModel";
import { potluckBody, potluckOwner, potluckResponse, sameOrigin } from "../lib/potluckStore";

const now = Date.parse("2026-10-27T00:00:00Z"), first = "4baf4472-bd88-4223-857f-04e5025c5ab2", second = "ec3a2954-c1b3-4cd6-86d3-67127dfebee7";
const parent = { owner: "private-owner-a" }, other = { owner: "private-owner-b" }, staff = { owner: "staff", admin: true };
const signup = { action: "save", id: first, itemId: "pasta", name: "Parent", quantity: "2 dishes, 10 servings" };

test("active items include pasta and rice, with Calgary closing time", () => {
  assert.equal(potluckItems.length, 9); assert.ok(potluckItems.some(i => i.id === "rice"));
  assert.equal(new Intl.DateTimeFormat("en-CA", { timeZone: "America/Edmonton", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(potluckEvent.closesAt)), "19:30");
});
test("save retries do not duplicate; owners can edit and cancel without mutating the input", () => {
  const original = emptyPotluck(), saved = changePotluck(original, signup, parent, now);
  assert.equal(original.entries.length, 0);
  const retried = changePotluck(saved, signup, parent, now); assert.equal(retried.entries.length, 1);
  const edited = changePotluck(retried, { ...signup, quantity: "2 dishes, 12 servings" }, parent, now);
  assert.equal(edited.entries[0].quantity, "2 dishes, 12 servings");
  assert.equal(publicPotluck(changePotluck(edited, { action: "remove", id: first }, parent, now), parent.owner, now).entries.length, 0);
});
test("another device cannot change or remove a signup, and cannot approve suggestions", () => {
  const saved = changePotluck(emptyPotluck(), signup, parent, now);
  for (const body of [signup, { action: "remove", id: first }, { action: "approve", id: first }]) assert.throws(() => changePotluck(saved, body, other, now), /belongs|device|approval/);
});
test("pending suggestions are private; staff approval publishes one item and one signup", () => {
  const suggestion = { ...signup, action: "suggest", title: "Dates" };
  const pending = changePotluck(emptyPotluck(), suggestion, parent, now);
  assert.equal(availableItems(pending).length, 9); assert.equal(publicPotluck(pending, other.owner, now).mySuggestions.length, 0);
  assert.equal(publicPotluck(pending, parent.owner, now).mySuggestions[0].status, "pending");
  const approved = changePotluck(pending, { action: "approve", id: first }, staff, now);
  const twice = changePotluck(approved, { action: "approve", id: first }, staff, now);
  assert.equal(availableItems(twice).length, 10); assert.equal(publicPotluck(twice, other.owner, now).entries.length, 1);
  assert.equal(changePotluck(twice, suggestion, parent, now).suggestions[0].status, "approved");
  const rejected = changePotluck(twice, { action: "reject", id: first }, staff, now);
  assert.equal(publicPotluck(rejected, other.owner, now).entries.length, 0); assert.equal(availableItems(rejected).length, 9);
});
test("unknown, unapproved, duplicate and invalid input is rejected", () => {
  for (const replacement of [{ itemId: "water" }, { itemId: "idea-unapproved" }, { name: "" }, { name: "<script>" }, { name: "A".repeat(41) }, { quantity: "" }, { id: "../../other" }, { action: "approve" }]) assert.throws(() => changePotluck(emptyPotluck(), { ...signup, ...replacement }, parent, now));
  const saved = changePotluck(emptyPotluck(), signup, parent, now);
  assert.throws(() => changePotluck(saved, { ...signup, id: second }, parent, now), /already signed up/);
});
test("supplies allow one signup; food and drinks allow two", () => {
  for (const item of potluckItems) {
    const limit = item.category === "Table essentials" ? 1 : 2;
    assert.equal(item.maxSignups, limit);
    let state = emptyPotluck();
    for (let index = 0; index < limit; index++) state = changePotluck(state, { ...signup, id: index ? second : first, itemId: item.id }, { owner: `parent-${index}` }, now);
    assert.throws(() => changePotluck(state, { ...signup, id: "d271e652-6460-4d1d-99e2-f1af8fdc582f", itemId: item.id }, other, now), error => error instanceof Error && "status" in error && error.status === 409 && /covered/.test(error.message));
    assert.equal(state.entries.length, limit);
  }
});
test("covered signups stay editable; removal frees a spot and cancelled entries cannot reclaim it", () => {
  const saved = changePotluck(emptyPotluck(), { ...signup, itemId: "plates" }, parent, now);
  const edited = changePotluck(saved, { ...signup, itemId: "plates", quantity: "40 plates" }, parent, now);
  assert.equal(edited.entries[0].quantity, "40 plates");
  const removed = changePotluck(edited, { action: "remove", id: first }, parent, now);
  const replacement = changePotluck(removed, { ...signup, id: second, itemId: "plates" }, other, now);
  assert.throws(() => changePotluck(replacement, { ...signup, itemId: "plates" }, parent, now), /covered/);
});
test("lower limits preserve existing signups and allow their owners to edit", () => {
  const saved = changePotluck(emptyPotluck(), { ...signup, itemId: "plates" }, parent, now);
  saved.entries.push({ ...saved.entries[0], id: second, owner: other.owner });
  const edited = changePotluck(saved, { ...signup, itemId: "plates", quantity: "40 plates" }, parent, now);
  assert.equal(edited.entries.filter(e => !e.cancelled).length, 2);
  assert.equal(edited.entries[0].quantity, "40 plates");
  assert.throws(() => changePotluck(edited, { ...signup, id: "d271e652-6460-4d1d-99e2-f1af8fdc582f", itemId: "plates" }, { owner: "third" }, now), /covered/);
});
test("moving an existing signup into a covered item is rejected without losing the original", () => {
  const pasta = changePotluck(emptyPotluck(), signup, parent, now);
  const covered = changePotluck(pasta, { ...signup, id: second, itemId: "plates" }, other, now);
  assert.throws(() => changePotluck(covered, { ...signup, itemId: "plates" }, parent, now), /covered/);
  assert.equal(covered.entries.find(e => e.id === first)?.itemId, "pasta");
});
test("approved suggestions have one spot occupied by the suggesting parent", () => {
  const pending = changePotluck(emptyPotluck(), { ...signup, action: "suggest", title: "Dates" }, parent, now);
  const approved = changePotluck(pending, { action: "approve", id: first }, staff, now);
  assert.equal(availableItems(approved).find(i => i.id === `idea-${first}`)?.maxSignups, 1);
  assert.throws(() => changePotluck(approved, { ...signup, id: second, itemId: `idea-${first}` }, other, now), /covered/);
});
test("closed events reject new submissions; names disappear from public output after retention", () => {
  const saved = changePotluck(emptyPotluck(), signup, parent, now), closed = Date.parse(potluckEvent.closesAt);
  assert.throws(() => changePotluck(saved, { ...signup, id: second }, other, closed), /closed/);
  assert.equal(publicPotluck(saved, parent.owner, closed).open, false);
  assert.equal(publicPotluck(saved, parent.owner, Date.parse(potluckEvent.publicNamesUntil)).entries.length, 0);
  assert.equal(changePotluck(saved, { action: "remove", id: first }, parent, closed).entries[0].cancelled, true);
});
test("public JSON never exposes ownership hashes or staff-only records", () => {
  const state = changePotluck(emptyPotluck(), signup, parent, now), view = publicPotluck(state, other.owner, now);
  assert.equal(JSON.stringify(view).includes(parent.owner), false); assert.equal(view.entries[0].mine, false);
  assert.equal(publicPotluck(state, parent.owner, now).entries[0].mine, true);
});
test("owner capability is random, HTTP-only, scoped, and required for writes", () => {
  const req = new Request("https://hbic.ca/api/potluck"), owner = potluckOwner(req, true);
  assert.throws(() => potluckOwner(req), /Refresh/); assert.equal(owner.token.length, 64);
  const cookie = potluckResponse({}, 200, owner.token).headers.get("set-cookie")!;
  assert.match(cookie, /HttpOnly/i); assert.match(cookie, /SameSite=lax/i); assert.match(cookie, /Path=\/api\/potluck/i);
  const resumed = potluckOwner(new Request(req.url, { headers: { cookie: `hbic-potluck-owner=${owner.token}` } }));
  assert.equal(resumed.owner, owner.owner); assert.equal(resumed.fresh, false);
});
test("cross-origin writes and oversized or malformed bodies are rejected", async () => {
  assert.throws(() => sameOrigin(new Request("https://hbic.ca/api/potluck", { headers: { origin: "https://another.example" } })), /Open the signup/);
  assert.throws(() => sameOrigin(new Request("https://hbic.ca/api/potluck", { headers: { "sec-fetch-site": "cross-site" } })), /Open the signup/);
  sameOrigin(new Request("https://hbic.ca/api/potluck", { headers: { origin: "https://hbic.ca" } }));
  for (const body of ["{bad", "[]", "null", " ".repeat(5000)]) await assert.rejects(potluckBody(new Request("https://hbic.ca/api/potluck", { method: "POST", headers: { "content-type": "application/json" }, body })));
  assert.deepEqual(await potluckBody(new Request("https://hbic.ca/api/potluck", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(signup) })), signup);
});
