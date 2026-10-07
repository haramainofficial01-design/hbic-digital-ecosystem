/** No timer remains scheduled while its screen or application is inactive. */
export function startVisibleClock(
  tick: () => void,
  intervalMs: number,
  subscribe: (listener: (active: boolean) => void) => () => void,
  initiallyActive: boolean
): () => void {
  let timer: ReturnType<typeof setInterval> | undefined;
  const stop = () => {
    if (timer !== undefined) clearInterval(timer);
    timer = undefined;
  };
  const update = (active: boolean) => {
    stop();
    if (!active) return;
    tick();
    timer = setInterval(tick, intervalMs);
  };
  const unsubscribe = subscribe(update);
  update(initiallyActive);
  return () => { stop(); unsubscribe(); };
}
