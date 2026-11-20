/** Minute-only UI wakes at wall-clock boundaries and does no work in hidden tabs. */
export function startVisibleMinuteClock(tick: () => void, isVisible: () => boolean) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let stopped = false;
  const pause = () => { clearTimeout(timer); timer = undefined; };
  const update = () => {
    pause();
    if (stopped || !isVisible()) return;
    tick();
    timer = setTimeout(update, 60_000 - Date.now() % 60_000);
  };
  update();
  return { update, stop() { stopped = true; pause(); } };
}
