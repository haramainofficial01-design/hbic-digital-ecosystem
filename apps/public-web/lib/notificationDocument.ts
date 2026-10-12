/** Remove undefined map values; keep array positions, nulls and Firestore types. */
export function notificationDocument<T>(value: T, ancestors = new Set<object>()): T {
  if (value === undefined) return null as T;
  if (!value || typeof value !== "object") return value;
  const prototype = Object.getPrototypeOf(value);
  if (!Array.isArray(value) && prototype !== Object.prototype && prototype !== null) return value;
  if (ancestors.has(value)) throw new Error("Notification data must not contain cycles.");
  const next = new Set(ancestors).add(value);
  if (Array.isArray(value)) return Array.from(value, item => notificationDocument(item, next)) as T;
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined)
    .map(([key, item]) => [key, notificationDocument(item, next)])) as T;
}
