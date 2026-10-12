import assert from "node:assert/strict";
import test from "node:test";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { build } from "esbuild";
import { chromium } from "playwright";
import { academyCalendarNavigationScript } from "../../mobile/src/services/academyCalendarNavigation";

const root = path.resolve(import.meta.dirname, "../../..");

async function fixture() {
  const result = await build({ write: false, bundle: true, platform: "browser", format: "iife", jsx: "automatic", outdir: "/tmp/hbic-academy-calendar-render-only", define: { "process.env.NODE_ENV": '"production"' },
    stdin: { resolveDir: root, loader: "tsx", contents: `import React from'react';import{createRoot}from'react-dom/client';import{AcademyParent}from'./apps/public-web/components/AcademyParent';
const items=[{id:'past',date:'2026-10-01',type:'no_class',title:'Preparation day'},
{id:'thanksgiving',date:'2026-10-12',type:'class',title:'Quran Academy class',note:'5:30–7:00 p.m.'},
{id:'special',date:'2026-10-15',type:'special_class',title:'Monthly activity',note:'Games and an Islamic presentation.'},
{id:'closure',date:'2026-10-19',type:'no_class',title:'Staff closure',note:'No class on this date.'},
{id:'changed',date:'2026-10-22',type:'time_changed',title:'Updated class time',note:'Class starts at 6:00 PM.'},
{id:'nov',date:'2026-11-02',type:'class',title:'Quran Academy class'},
{id:'dec',date:'2026-12-03',type:'class',title:'Quran Academy class'},
{id:'jan',date:'2027-01-04',type:'class',title:'Quran Academy class'},
{id:'final',date:'2027-02-01',type:'class',title:'Final class'},
{id:'break',date:'2027-02-02',type:'no_class',title:'Ramadan/Eid break',note:'Next term to be announced.'}];
const family={id:'fixture-family',guardianName:'Example Parent',reference:'QA-FIXTURE',enrollmentState:'active',enrollmentStartPeriod:'2026-10',children:[{id:'fixture-child',name:'Example Child',classId:null}],paymentChoice:'cash',paymentState:'not_due',billingPeriod:'2026-10',amountCents:0,passToken:null};
window.qaRequests=[];window.qaFailCalendar=false;
window.fetch=async(url,options)=>{window.qaRequests.push({url,authorized:Boolean(options?.headers?.Authorization)});let data={ok:true};let ok=true;
if(url==='/api/academy/billing')data={registrationOpen:true,cardAvailable:true};
if(url==='/api/academy/family')data={family};
if(url==='/api/academy/content'){ok=!window.qaFailCalendar;data={content:{classes:[],calendar:items,announcements:[]}};}
return{ok,status:ok?200:503,json:async()=>data};};
createRoot(document.getElementById('root')).render(<AcademyParent/>);` },
    plugins: [{ name: "explicit-fake-parent-session", setup(b) {
      b.onResolve({ filter: /^firebase\/auth$/ }, () => ({ path: "auth", namespace: "fixture" }));
      b.onResolve({ filter: /lib\/academyFirebaseClient$/ }, () => ({ path: "client", namespace: "fixture" }));
      b.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: args.path === "client"
        ? `import{fixtureAuth}from'firebase/auth';export const getAcademyClientAuth=()=>fixtureAuth;`
        : `export const fixtureUser={uid:'fixture-parent',email:'parent@example.invalid',emailVerified:true,reload:async()=>{},getIdToken:async()=>'fixture-token-not-a-real-token'};export const fixtureAuth={currentUser:fixtureUser};export function onAuthStateChanged(_,cb){queueMicrotask(()=>cb(fixtureUser));return()=>{}};export const signOut=async()=>{};export const createUserWithEmailAndPassword=async()=>({user:fixtureUser});export const signInWithEmailAndPassword=createUserWithEmailAndPassword;export const sendEmailVerification=async()=>{};export const sendPasswordResetEmail=async()=>{};`, loader: "js", resolveDir: root }));
    } }] });
  return { script: result.outputFiles.find(file => file.path.endsWith(".js"))!.text, css: result.outputFiles.find(file => file.path.endsWith(".css"))!.text };
}

test("actual signed-in parent UI has a prominent calendar, readable full schedule, refresh recovery and no narrow-screen overflow", async () => {
  // Real components/CSS, fake private session/data; no production parent access.
  const { script, css } = await fixture();
  const browser = await chromium.launch({ headless: true });
  try {
    for (const width of [320, 390, 768, 1280]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      try {
        await page.clock.install({ time: new Date("2026-10-12T18:00:00Z") });
        await page.setContent(`<style>*{box-sizing:border-box}body{margin:0;font-family:system-ui}${css}</style><div id="root"></div><script>${script}</script>`);
        const calendar = page.getByRole("region", { name: "Academy Calendar", exact: true });
        await calendar.getByText("Monday, October 12, 2026", { exact: true }).first().waitFor();
        assert.equal(await page.getByRole("link", { name: "Academy Calendar ↓" }).count(), 1);
        assert.ok(await page.evaluate(() => {
          const calendar = document.getElementById("academy-calendar")!;
          return calendar.compareDocumentPosition([...document.querySelectorAll("small")].find(node => node.textContent?.startsWith("TUITION"))!) & Node.DOCUMENT_POSITION_FOLLOWING;
        }), "calendar appears before tuition/payment controls");
        assert.equal(await calendar.getByText("Preparation day").count(), 0);
        await calendar.getByRole("button", { name: "Thursday, October 15, 2026: Special Thursday", exact: true }).click();
        await calendar.getByText("Special Thursday", { exact: true }).waitFor();
        await calendar.getByRole("button", { name: "Monday, October 19, 2026: No class", exact: true }).click();
        await calendar.getByText("Staff closure", { exact: true }).waitFor();
        await calendar.getByRole("button", { name: "Thursday, October 22, 2026: Time changed", exact: true }).click();
        await calendar.getByText("Class starts at 6:00 PM.", { exact: true }).waitFor();
        if (width === 390 && process.env.HBIC_ACADEMY_CALENDAR_SCREENSHOTS === "1") {
          const directory = path.join(root, "output/academy-calendar-qa");
          await mkdir(directory, { recursive: true });
          await calendar.screenshot({ path: path.join(directory, "phone-parent-calendar-fixture.png") });
        }
        assert.equal(await calendar.getByText("February 2027", { exact: true }).count(), 0);
        await calendar.getByRole("button", { name: "View full schedule" }).click();
        await calendar.getByRole("heading", { name: "February 2027" }).waitFor();
        await calendar.getByText("Final class", { exact: true }).waitFor();
        await calendar.getByText("Ramadan/Eid break", { exact: true }).waitFor();
        if (width === 1280 && process.env.HBIC_ACADEMY_CALENDAR_SCREENSHOTS === "1") {
          const directory = path.join(root, "output/academy-calendar-qa");
          await mkdir(directory, { recursive: true });
          await calendar.screenshot({ path: path.join(directory, "desktop-parent-calendar-fixture.png") });
        }
        assert.equal(await calendar.getByRole("button", { name: "Show selected date" }).getAttribute("aria-expanded"), "true");
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `Overflow at ${width}`);
        assert.ok(await page.evaluate(() => [...document.querySelectorAll("#academy-calendar time")].every(node => {
          const rect = node.getBoundingClientRect(); return rect.width >= 50 && rect.height >= 40;
        })), "readable date chips");
        await page.evaluate(() => { (window as any).qaFailCalendar = true; });
        await calendar.getByRole("button", { name: "Refresh Academy calendar" }).click();
        await calendar.getByRole("status").filter({ hasText: "last loaded dates" }).waitFor();
        await page.evaluate(() => { (window as any).qaFailCalendar = false; });
        await calendar.getByRole("button", { name: "Refresh Academy calendar" }).click();
        await calendar.getByRole("status").waitFor({ state: "detached" });
        assert.ok(await page.evaluate(() => (window as any).qaRequests.filter((request: any) => request.url === "/api/academy/content").every((request: any) => request.authorized)));
        await calendar.getByRole("button", { name: "Show selected date" }).click();
        assert.equal(await calendar.getByRole("heading", { name: "February 2027" }).count(), 0);
        await calendar.getByRole("button", { name: "Next calendar month" }).click();
        await calendar.getByRole("group", { name: "November 2026 calendar" }).waitFor();
        await calendar.getByRole("button", { name: "Monday, November 2, 2026: Class", exact: true }).click();
        await calendar.getByText("Monday, November 2, 2026", { exact: true }).waitFor();
        await calendar.getByRole("button", { name: "Previous calendar month" }).click();
        await calendar.getByRole("group", { name: "October 2026 calendar" }).waitFor();
        assert.equal(await calendar.getByRole("button", { name: "Previous calendar month" }).isDisabled(), true);
      } finally { await page.close(); }
    }
  } finally { await browser.close(); }
});

test("app shortcut focuses the same secure calendar, honors reduced motion and does nothing on Stripe", () => {
  for (const hostname of ["hbic.ca", "www.hbic.ca", "checkout.stripe.com"]) {
    for (const reduced of [true, false]) {
      const calls: unknown[] = [];
      const target = { focus: (options: unknown) => calls.push(options), scrollIntoView: (options: unknown) => calls.push(options) };
      vm.runInNewContext(academyCalendarNavigationScript, {
        location: { hostname, pathname: hostname === "checkout.stripe.com" ? "/c/pay" : "/quran-academy" },
        document: { getElementById: () => target }, matchMedia: () => ({ matches: reduced })
      });
      assert.deepEqual(calls.map(call => JSON.parse(JSON.stringify(call))), hostname === "checkout.stripe.com" ? [] : [{ preventScroll: true }, { block: "start", behavior: reduced ? "auto" : "smooth" }]);
    }
  }
  const ids: string[] = [];
  vm.runInNewContext(academyCalendarNavigationScript, { location: { hostname: "hbic.ca", pathname: "/quran-academy" }, document: { getElementById: (id: string) => { ids.push(id); return null; } } });
  assert.deepEqual(ids, ["academy-calendar", "academy-account"]);
});

test("shipped app route retains WebView authentication and wires a Calendar shortcut instead of enabling the retired native registration", async () => {
  const route = await readFile(path.join(root, "apps/mobile/app/quran-academy.tsx"), "utf8");
  assert.match(route, /label="Calendar"/);
  assert.match(route, /injectJavaScript\(academyCalendarNavigationScript\)/);
  assert.match(route, /disabled=\{error \|\| !onAcademyPage\}/);
  assert.match(route, /sharedCookiesEnabled/);
  assert.doesNotMatch(route, /QuranAcademyNativeScreen/);
});
