import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { defaultContent, getPastEvents, getPublicEvents, normalizeContent, toPublicContent } from "../src/content";
import { academyPosterFile, correctApprovedEvent, discontinuedEventIds, publicEventImagePath, summerCampHighlightUrl } from "../src/eventLifecycle";

test("discontinued fallback programs cannot return through the obsolete feature flag", () => {
  const c=normalizeContent({featureFlags:{...defaultContent.featureFlags,historyOfFiqhEventEnabled:true}});
  const current=getPublicEvents(c);
  for(const id of discontinuedEventIds) assert.ok(!current.some(e=>e.id===id));
  for(const e of c.events.filter(e=>(discontinuedEventIds as readonly string[]).includes(e.id))) {
    assert.equal(e.visible,false);assert.equal(e.notificationEnabled,false);assert.equal(e.featured,false);
  }
});
test("Summer Camp is preserved in a separate public archive with no registration or reminder", () => {
  const c=toPublicContent(defaultContent),past=getPastEvents(c);
  assert.ok(!c.events.some(e=>e.id==='event-summer-camp-2026'));
  assert.equal(past.length,1);assert.equal(past[0].registrationLink,'');assert.equal(past[0].notificationEnabled,false);
  assert.equal(past[0].highlightUrl,summerCampHighlightUrl);
  assert.equal(getPastEvents(toPublicContent(c)).length,1);
});
test("Academy keeps its ID and exact approved schedule, fee, poster and registration", () => {
  const e=getPublicEvents(defaultContent).find(e=>e.id==='event-quran-academy')!;
  assert.match(e.title,/Children's Classes/);assert.equal(e.date,'Mondays & Thursdays');
  assert.equal(e.startTime,'5:30 PM');assert.equal(e.endTime,'7:00 PM');
  assert.match(e.description,/\$50 CAD per child per month/);assert.match(e.description,/February 1, 2027/);
  assert.equal(e.registrationLink,'https://hbic.ca/quran-academy');assert.equal(e.image,academyPosterFile);
  assert.equal(publicEventImagePath(e.image),`/photos/${academyPosterFile}`);
});
test("cleanup is idempotent and does not change unrelated current events", () => {
  for(const e of defaultContent.events)assert.deepEqual(correctApprovedEvent(correctApprovedEvent(e)),correctApprovedEvent(e));
  const unrelated={...defaultContent.events[0],id:'unrelated',visible:true};
  assert.equal(correctApprovedEvent(unrelated),unrelated);
});
test("one canonical reel is used by the archive and Media record", () => {
  assert.equal(defaultContent.mediaItems.find(m=>m.id==='summer-camp-2026-highlights')?.videoUrl,getPastEvents(defaultContent)[0].highlightUrl);
});
test("mobile archive has no enrollment prompt and Academy opens the existing native flow", () => {
  const youth = readFileSync(new URL("../../../apps/mobile/app/youth.tsx", import.meta.url), "utf8");
  const detail = readFileSync(new URL("../../../apps/mobile/app/event-detail.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(youth, /Register your child today|Contact to enroll|Join the camp/);
  assert.match(youth, /getPastEvents\(content\)/);
  assert.match(detail, /router\.push\("\/quran-academy"/);
  assert.doesNotMatch(detail, /visibleEvents\[0\]/);
  assert.match(detail, /!completed \? <AppButton/);
});
