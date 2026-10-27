export const potluckEvent = {
  id: "october-2026", title: "Class party potluck", date: "Thursday, October 29",
  time: "5:30–7:30 PM", attendance: "30–35 students",
  closesAt: "2026-10-30T01:30:00.000Z", publicNamesUntil: "2026-11-06T01:30:00.000Z"
} as const;

export const potluckItems = [
  { id: "napkins", title: "Napkins", category: "Table essentials", example: "e.g. 40 napkins", maxSignups: 1 },
  { id: "plates", title: "Plates", category: "Table essentials", example: "e.g. 40 plates", maxSignups: 1 },
  { id: "utensils", title: "Utensils", category: "Table essentials", example: "e.g. 40 sets", maxSignups: 1 },
  { id: "sandwiches", title: "Sandwiches", category: "Food", example: "e.g. 12 sandwiches", maxSignups: 2 },
  { id: "pizza", title: "Pizza", category: "Food", example: "e.g. 2 large pizzas", maxSignups: 2 },
  { id: "pasta", title: "Pasta", category: "Food", example: "e.g. 2 dishes, 10 servings", maxSignups: 2 },
  { id: "rice", title: "Any rice dish", category: "Food", example: "e.g. 2 dishes, 10 servings", maxSignups: 2 },
  { id: "snacks", title: "Fruit snacks / snack packs", category: "Food", example: "e.g. 20 packs", maxSignups: 2 },
  { id: "juice", title: "Juice boxes", category: "Drinks", example: "e.g. 12 boxes", maxSignups: 2 }
] as const;

export type PotluckEntry = { id: string; itemId: string; name: string; quantity: string; owner: string; cancelled: boolean; updatedAt: string };
export type PotluckSuggestion = { id: string; title: string; name: string; quantity: string; owner: string; status: "pending" | "approved" | "rejected"; updatedAt: string };
export type PotluckState = { entries: PotluckEntry[]; suggestions: PotluckSuggestion[] };
export type PotluckAction = { action?: unknown; id?: unknown; itemId?: unknown; name?: unknown; quantity?: unknown; title?: unknown };
export type PotluckView = ReturnType<typeof publicPotluck>;
export class PotluckError extends Error { constructor(message: string, public status = 400) { super(message); } }
export const emptyPotluck = (): PotluckState => ({ entries: [], suggestions: [] });

function text(value: unknown, label: string, max: number, required = true) {
  if (typeof value !== "string") throw new PotluckError(`Enter ${label}.`);
  const cleaned = value.normalize("NFC").replace(/\s+/g, " ").trim();
  if ((required && !cleaned) || cleaned.length > max || /[<>\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/u.test(cleaned))
    throw new PotluckError(`Check ${label} (${max} characters maximum).`);
  return cleaned;
}
function id(value: unknown) {
  if (typeof value !== "string" || !/^[a-f\d]{8}-(?:[a-f\d]{4}-){3}[a-f\d]{12}$/i.test(value)) throw new PotluckError("Refresh the page and try again.");
  return value;
}
export function potluckOpen(now = Date.now()) { return now < Date.parse(potluckEvent.closesAt); }
export function availableItems(state: PotluckState) {
  return [...potluckItems, ...state.suggestions.filter(s => s.status === "approved").map(s => ({ id: `idea-${s.id}`, title: s.title, category: "Suggestions", example: "Quantity or servings", maxSignups: 1 }))];
}
export function publicPotluck(state: PotluckState, owner: string, now = Date.now()) {
  const showNames = now < Date.parse(potluckEvent.publicNamesUntil);
  const allowed = new Set(availableItems(state).map(item => item.id));
  return { event: potluckEvent, open: potluckOpen(now), items: availableItems(state),
    entries: showNames ? state.entries.filter(e => !e.cancelled && allowed.has(e.itemId)).map(({ id, itemId, name, quantity, owner: holder }) => ({ id, itemId, name, quantity, mine: holder === owner })) : [],
    mySuggestions: state.suggestions.filter(s => s.owner === owner).map(({ id, title, status }) => ({ id, title, status })) };
}

/** Pure transaction reducer. Ownership and approval are enforced before storage. */
export function changePotluck(input: PotluckState, body: PotluckAction, actor: { owner: string; admin?: boolean }, now = Date.now()): PotluckState {
  const state = structuredClone(input), key = id(body.id), stamp = new Date(now).toISOString();
  if (!actor.admin && !potluckOpen(now) && body.action !== "remove") throw new PotluckError("Signups are closed.", 409);
  if (body.action === "remove") {
    const entry = state.entries.find(e => e.id === key);
    if (!entry || (!actor.admin && entry.owner !== actor.owner)) throw new PotluckError("This entry can only be changed on the device that added it.", 403);
    entry.cancelled = true; entry.updatedAt = stamp; return state;
  }
  if (body.action === "approve" || body.action === "reject") {
    if (!actor.admin) throw new PotluckError("Staff approval is required.", 403);
    const suggestion = state.suggestions.find(s => s.id === key);
    if (!suggestion) throw new PotluckError("Suggestion not found.", 404);
    suggestion.status = body.action === "approve" ? "approved" : "rejected"; suggestion.updatedAt = stamp;
    if (body.action === "approve" && !state.entries.some(e => e.id === key)) {
      state.entries.push({ id: key, itemId: `idea-${key}`, name: suggestion.name, quantity: suggestion.quantity, owner: suggestion.owner, cancelled: false, updatedAt: stamp });
    }
    return state;
  }
  const name = text(body.name, "your first name", 40), quantity = text(body.quantity, "the quantity", 60);
  if (body.action === "suggest") {
    const title = text(body.title, "the item", 70), previous = state.suggestions.find(s => s.id === key);
    if (previous) {
      if (previous.owner !== actor.owner) throw new PotluckError("This suggestion belongs to another device.", 403);
      return state; // Retried submissions never reset staff decisions.
    }
    if (state.suggestions.length >= 80 || state.suggestions.filter(s => s.owner === actor.owner).length >= 5) throw new PotluckError("Please contact Academy staff for more suggestions.", 409);
    if (state.entries.some(e => e.id === key)) throw new PotluckError("Refresh the page and try again.", 409);
    state.suggestions.push({ id: key, title, name, quantity, owner: actor.owner, status: "pending", updatedAt: stamp }); return state;
  }
  if (body.action !== "save") throw new PotluckError("Choose an item and try again.");
  const item = availableItems(state).find(i => i.id === body.itemId);
  if (!item) throw new PotluckError("Choose an item from the list.");
  const entry = state.entries.find(e => e.id === key);
  if (entry && entry.owner !== actor.owner) throw new PotluckError("This entry belongs to another device.", 403);
  if (state.entries.some(e => e.id !== key && e.owner === actor.owner && e.itemId === body.itemId && !e.cancelled)) throw new PotluckError("You already signed up for this item. Use Edit to change it.", 409);
  // The store applies this reducer inside the same Firestore transaction as the write.
  // Keep existing signups editable, even if a new limit is below the existing count.
  const keepingSpot = entry && !entry.cancelled && entry.itemId === item.id;
  if (!keepingSpot && state.entries.filter(e => !e.cancelled && e.itemId === item.id).length >= item.maxSignups)
    throw new PotluckError(`${item.title} is covered. Please choose another item.`, 409);
  if (!entry && state.entries.length >= 350) throw new PotluckError("Please contact Academy staff to add your item.", 409);
  if (!entry && state.entries.filter(e => e.owner === actor.owner && !e.cancelled).length >= 20) throw new PotluckError("Please edit an existing entry or contact Academy staff.", 409);
  if (entry) Object.assign(entry, { itemId: item.id, name, quantity, cancelled: false, updatedAt: stamp });
  else state.entries.push({ id: key, itemId: item.id, name, quantity, owner: actor.owner, cancelled: false, updatedAt: stamp });
  return state;
}
