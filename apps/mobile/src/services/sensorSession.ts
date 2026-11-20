/** Retire pending async sensor starts as well as already attached sensors. */
export function createSensorSession() {
  let epoch = 0;
  let sensor: { remove(): void } | null = null;
  const stop = () => { epoch++; sensor?.remove(); sensor = null; };
  return {
    stop,
    begin() { stop(); return epoch; },
    current(token: number) { return token === epoch; },
    attach(token: number, next: { remove(): void }) {
      if (token !== epoch) { next.remove(); return; }
      sensor?.remove(); sensor = next;
    }
  };
}
