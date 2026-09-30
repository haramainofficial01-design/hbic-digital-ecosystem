/** Accept only HBIC pass URLs/tokens or the complete public Academy reference. */
export function parseAcademyPassLookup(input: string): { token: string } | { reference: string } | null {
  const value = input.trim();
  const pass = value.match(/^https:\/\/hbic\.ca\/a\/([A-Za-z0-9_-]{43})\/?$/i);
  if (pass) return { token: pass[1] };
  if (/^[A-Za-z0-9_-]{43}$/.test(value)) return { token: value };
  const reference = value.match(/^(?:https?:\/\/)?(?:www\.)?hbic\.ca\/(QA-[A-F0-9]{10})\/?$/i)?.[1] ?? value;
  if (/^QA-[A-F0-9]{10}$/i.test(reference)) return { reference: reference.toUpperCase() };
  return null;
}
