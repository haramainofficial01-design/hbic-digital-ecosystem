import { build } from 'esbuild';
import { chromium } from '@playwright/test';
import { readFile, mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';

const output = resolve('output/admin-academy-restoration');
await mkdir(output, { recursive: true });
const bundled = await build({ entryPoints: ['apps/admin-web/test/academy-fixture.tsx'], bundle: true, write: false, platform: 'browser', format: 'iife', jsx: 'automatic', define: { 'process.env.NODE_ENV': '"production"' } });
const css = await readFile('apps/admin-web/app/globals.css', 'utf8');
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage(); const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.route('**/*', route => {
    const path = new URL(route.request().url()).pathname;
    if (route.request().url().startsWith('http://academy.fixture/')) return route.fulfill(path === '/bundle.js'
      ? { contentType: 'text/javascript', body: bundled.outputFiles[0].text }
      : { contentType: 'text/html', body: `<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>` });
    return route.abort();
  });
  await page.goto('http://academy.fixture/');
  await page.getByText('6 families', { exact: true }).waitFor();
  const nav = page.getByRole('navigation', { name: 'Quran Academy areas' });
  const overviewTuition = page.locator('.academy-admin-stats > div').filter({ hasText: 'Paid tuition' });
  assert.match(await overviewTuition.innerText(), /\$150\.00/);
  assert.match(await overviewTuition.innerText(), /Cash \$100\.00 · Card \$50\.00/);
  await nav.getByRole('button', { name: 'Tuition exemptions', exact: true }).click();
  await page.getByRole('heading', { name: 'Tuition-exempt students and families', exact: true }).waitFor();
  assert.equal(await page.locator('.academy-admin-family-list button').count(), 2);
  await nav.getByRole('button', { name: 'Payments', exact: true }).click();
  const payments = await page.getByLabel('Monthly payment breakdown').innerText();
  for (const value of ['$150.00', '$100.00', '$50.00']) assert.ok(payments.includes(value));
  assert.equal(await page.getByLabel('Actual cash and card receipts').count(), 0);
  assert.equal(await page.locator('.academy-admin-family-list').getByRole('button', { name: /exempt Fixture Parent/ }).count(), 0);
  assert.equal(await page.locator('.academy-admin-family-list').getByText('Fatima Fixture', { exact: false }).count(), 0);
  assert.equal(await page.locator('.academy-admin-family-list').getByRole('button', { name: /withdrawn Fixture Parent/ }).count(), 0);
  await nav.getByRole('button', { name: 'Students', exact: true }).click();
  const exemptStudent = page.locator('.academy-admin-family-list button').filter({ hasText: 'Hafsa Fixture' });
  assert.equal(await exemptStudent.count(), 1, 'Exempt students stay enrolled');
  assert.doesNotMatch(await exemptStudent.innerText(), /\$|Paid cash|Paid online/);
  const mixedExemptStudent = page.locator('.academy-admin-family-list button').filter({ hasText: 'Fatima Fixture' });
  assert.doesNotMatch(await mixedExemptStudent.innerText(), /\$|Paid cash|Paid online/);
  await nav.getByRole('button', { name: 'Registrations', exact: true }).click();
  const exemptRegistration = page.locator('.academy-admin-family-list button').filter({ hasText: 'exempt Fixture Parent' });
  assert.equal(await exemptRegistration.count(), 1);
  assert.equal((await exemptRegistration.locator('em').innerText()).toLowerCase(), 'tuition exempt');
  await nav.getByRole('button', { name: 'Attendance', exact: true }).click();
  await page.getByRole('heading', { name: 'Boys · 2', exact: true }).waitFor();
  await page.getByRole('heading', { name: 'Girls · 3', exact: true }).waitFor();
  await page.getByLabel('Group for Hafsa Fixture').selectOption('boys');
  await page.getByRole('heading', { name: 'Boys · 3', exact: true }).waitFor();
  const student = page.locator('.academy-admin-family-list > div').filter({ has: page.getByText('Hafsa Fixture', { exact: false }) });
  await student.getByRole('button', { name: 'Present', exact: true }).click();
  await page.getByText(/Attendance saved for/).waitFor();
  assert.equal(await student.getByRole('button', { name: 'Present', exact: true }).getAttribute('aria-pressed'), 'true');
  await nav.getByRole('button', { name: 'Families', exact: true }).click();
  await page.getByLabel('Payment status').selectOption('exempt');
  assert.equal(await page.locator('.academy-admin-family-list button').count(), 2);
  const exemptFamily = page.locator('.academy-admin-family-list button').filter({ hasText: 'exempt Fixture Parent' });
  assert.doesNotMatch(await exemptFamily.innerText(), /\$|Paid cash|Paid online/);
  await exemptFamily.click();
  await page.getByRole('checkbox').waitFor();
  assert.equal(await page.locator('.academy-admin-payment').count(), 0);
  assert.equal(await page.getByRole('heading', { name: 'Payment arrangement', exact: true }).count(), 0);
  assert.equal(await page.getByRole('heading', { name: 'Payment history', exact: true }).count(), 0);
  assert.doesNotMatch(await page.locator('.academy-admin-result').innerText(), /\$|Paid cash|Paid online/);
  assert.equal(await page.evaluate(() => window.academyTestRequests.filter(r => r.path.includes('/family?familyId=exempt')).length), 0);
  assert.equal(await page.getByRole('checkbox').isChecked(), true);
  page.once('dialog', dialog => dialog.dismiss());
  await page.getByRole('checkbox').click();
  assert.equal(await page.getByRole('checkbox').isChecked(), true);
  assert.equal(await page.evaluate(() => window.academyTestRequests.filter(r => /\/cash$|\/tuition-exemption$/.test(r.path)).length), 0);
  const sections = ['Overview','Families','Students','Attendance','Registrations','Tuition exemptions','Classes','Calendar','Announcements','Payments','Scan Pass','Programs','Settings'];
  for (const width of [320,430,768,1440]) for (const colorScheme of ['light','dark']) {
    await page.setViewportSize({ width, height: 900 }); await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
    for (const section of sections) {
      await nav.getByRole('button', { name: section, exact: true }).click();
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${width}px ${colorScheme} ${section} overflow`);
    }
    await nav.getByRole('button', { name: 'Attendance', exact: true }).click();
    await page.screenshot({ path: `${output}/attendance-${width}-${colorScheme}.png`, fullPage: true });
  }
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ actualComponent: true, syntheticDataOnly: true, exemptions: true, cashVsCard: true, matchingNonExemptTotals: true, exemptPaymentInformationHidden: true, exemptEnrollmentAndAttendanceRetained: true, boysGirlsAttendance: true, attendanceSave: true, exemptionConfirmation: true, noLiveWrites: true, layoutsChecked: 104, browserErrors: errors }));
} finally { await browser.close(); }
