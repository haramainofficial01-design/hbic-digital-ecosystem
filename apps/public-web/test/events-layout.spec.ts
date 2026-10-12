import { expect, test } from "@playwright/test";
import { academyPosterFile, summerCampHighlightUrl } from "@hbic/shared";

for(const width of [320,390,768,1440]) test(`${width}px: current Academy and past camp remain distinct`,async({page})=>{
  await page.setViewportSize({width,height:900});
  await page.goto('/events');
  const current=page.locator('section').filter({has:page.getByRole('heading',{name:'Events',exact:true})});
  await expect(current.getByRole('heading',{name:"HBIC Qur'an Academy — Children's Classes",exact:true})).toBeVisible();
  for(const title of ['History of Fiqh','Heart Antidotes',"Qur'an Reflections",'Prophetic Foundations','Creed Essentials','HBIC Summer Camp 2026']) await expect(current.getByRole('heading',{name:title,exact:true})).toHaveCount(0);
  await expect(current.getByRole('link',{name:'Register Now',exact:true})).toHaveAttribute('href','https://hbic.ca/quran-academy');
  await current.getByText('Class details',{exact:true}).click();
  await expect(current).toContainText('Mondays & Thursdays');await expect(current).toContainText('$50 CAD per child per month');await expect(current).toContainText('5:30 PM–7:00 PM');
  const poster=current.locator(`img[src*="${academyPosterFile}"]`);
  await expect(poster).toBeVisible();await expect(poster).toHaveCSS('object-fit','contain');
  const past=page.locator('#past-events');await expect(past).toContainText('Completed · July–August 2026');
  await expect(past.getByRole('link',{name:'Watch Summer Camp 2026 Highlights'})).toHaveAttribute('href',summerCampHighlightUrl);
  await expect(past.getByRole('link',{name:/Register|Contact|Enroll/i})).toHaveCount(0);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
  await page.goto('/media');await expect(page.locator('#past-highlights').getByRole('link',{name:'Watch Summer Camp 2026 Highlights'})).toHaveAttribute('href',summerCampHighlightUrl);
  await page.goto('/programs');await expect(page.locator(`img[src*="${academyPosterFile}"]`)).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
});
