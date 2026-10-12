/** Scroll only HBIC's parent page; never interact with Stripe Checkout. */
export const academyCalendarNavigationScript = `(() => {
  if (!['hbic.ca', 'www.hbic.ca'].includes(location.hostname) || location.pathname !== '/quran-academy') return;
  const target = document.getElementById('academy-calendar') || document.getElementById('academy-account');
  if (!target) return;
  target.focus({preventScroll:true});
  target.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
})(); true;`;
