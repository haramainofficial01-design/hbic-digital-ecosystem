import type { LanguageCode } from "./types";
import { companionMessage, companionQuestionTerms, companionSocialIntent } from "./bilalMessages";
import { translateUi } from "./i18n/ui";

export const bilalCompanionName = "Bilal";
export const bilalCompanionWelcome = "I’m Bilal. How can I help you today?";
export const bilalCompanionDisclaimer = "Public HBIC information, not a staff member or a religious authority. Please don’t share personal, student or payment details.";
export const bilalCompanionSuggestions = ["Today’s prayer times", "Quran Academy", "Donation options", "Contact the masjid"];

export interface CompanionSource { id: string; title: string; href: string }
export interface CompanionFact extends CompanionSource { text: string; terms: string[]; translations?: Partial<Record<LanguageCode, string>> }
export interface CompanionRequest { question: string; previousQuestions: string[]; language?: LanguageCode }
export interface CompanionReply {
  ok: true; answer: string; sources: CompanionSource[]; mode: "published-info";
  asOf: string; contentVersion: number; topicIds: string[]; needsHuman: boolean;
}

const paths = new Set(["/", "/contact", "/about", "/prayer-times", "/quran-academy", "/quran", "/events", "/programs", "/donate", "/community", "/youth", "/app", "/privacy"]);
export function safeCompanionLink(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value, "https://hbic.ca");
    if (url.origin !== "https://hbic.ca" || url.username || url.password || !paths.has(url.pathname)) return null;
    return `https://hbic.ca${url.pathname}${url.hash}`;
  } catch { return null; }
}

export function validateCompanionRequest(value: unknown): CompanionRequest | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  if (Object.keys(input).some(key => !["question", "previousQuestions", "language"].includes(key))) return null;
  if (input.language !== undefined && (typeof input.language !== "string" || !["en", "ur", "fa-AF", "ar"].includes(input.language))) return null;
  if (typeof input.question !== "string" || !input.question.trim() || input.question.length > 800 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(input.question)) return null;
  const previous = input.previousQuestions ?? [];
  if (!Array.isArray(previous) || previous.length > 4 || previous.some(text => typeof text !== "string" || text.length > 800)) return null;
  return { question: input.question.trim(), previousQuestions: previous as string[], ...(input.language ? { language: input.language as LanguageCode } : {}) };
}

export function normalizeCompanionQuestion(text: string) {
  return text.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f\u064b-\u065f\u0670]/g, "").replace(/[’‘]/g, "'").replace(/[^\p{L}\p{N}\s']/gu, " ").replace(/\s+/g, " ").trim();
}

/** These questions never reach any private data store. No external model is used. */
export function companionBoundary(question: string): "private" | "religious" | "political" | null {
  const q = normalizeCompanionQuestion(question);
  if (/\b(?:api key|secret key|system prompt|environment variable|service account|bank account|payout|roster|student list|admin password|credit card number|cvv)\b/.test(q) ||
    /\b(?:my|our) (?:(?:academy|quran|class|donation|monthly) ){0,3}(?:child|son|daughter|family|account|payment|receipt|balance|attendance|enrollment|enrolment|password|tuition|fees|registration|student|subscription|bill|invoice)\b/.test(q) ||
    /\b(?:refund|charged twice|double charged|overcharged|exempt|exemption|waive my|how much do i owe|cancel my|cancel our)\b/.test(q) ||
    /\b(?:cancel|withdraw|stop renewal|stop charging)\b.*\b(?:enrollment|enrolment|registration|class|classes|academy|tuition|subscription)\b/.test(q) ||
    /(?:میر[ےای]|ہمار[ےای]).{0,45}(?:ادائیگی|فیس|بچے|بچہ|بیٹا|بیٹی|اکاونٹ|حاضری|اندراج|داخلہ|رجسٹریشن|رسید|پاس ورڈ)|حساب من|پرداخت من|فرزند من|فیس من|طفلم|دفعتي|رسومي|ابني|ابنتي|طفلي|حسابي|الغاء التسجيل|لغو ثبت نام|استرداد|بازپرداخت|رقم کی واپسی/.test(q) ||
    /\b[^\s@]+@[^\s@]+\.[^\s@]+\b/.test(question) || /(?:\d[ -]?){10,}/.test(question)) return "private";
  if (/\b(?:fatwa|haram|religious ruling|islamic ruling|is it permissible|is it allowed|is my prayer valid|is my recitation correct|is my recitation valid|tajweed correct|zakat eligible|zakat eligibility|can zakat|may zakat)\b/.test(q) ||
    /\b(?:halal|halal or haram)\b/.test(q) && !/restaurant|directory/.test(q) || /فتوى|فتوی|حرام|حکم شرعی|حكم شرعي/.test(q)) return "religious";
  if (/\b(?:who should i vote|how should i vote|vote yes|vote no|support separation|oppose separation|which party|which candidate|referendum|election|separate from canada)\b/.test(q) || /استفتاء|ریفرنڈم|همه پرسی|انتخابات/.test(q)) return "political";
  return null;
}

export function companionVisibleOnRoute(pathname: string, native = false) {
  if (/^\/(?:admin|display|prayer-display|quran|quran-academy|academy|donate|checkout|payment)(?:\/|$)/.test(pathname)) return false;
  return !native || ["/", "/prayer", "/events", "/more", "/settings", "/contact", "/programs", "/youth", "/community", "/media", "/about"].includes(pathname);
}

export function selectCompanionFacts(request: CompanionRequest, facts: CompanionFact[]): CompanionFact[] {
  const original = normalizeCompanionQuestion(request.question);
  let q = companionQuestionTerms(original);
  if (/^(?:what about|and |how much|what time|is it |are they |when |where |how do i |can i |does it |اور |چقدر|و فیس|والرسوم|وكم|و کم)/.test(original) && original.split(" ").length <= 8) {
    const previous = request.previousQuestions.at(-1);
    if (previous && !companionBoundary(previous)) q += ` ${companionQuestionTerms(normalizeCompanionQuestion(previous))}`;
  }
  if (/academy|class|classes/.test(q) && /how much|cost|price|fee|tuition|pay|payment|renew|subscription/.test(q)) q += " academy fees tuition";
  if (/academy|class|classes/.test(q) && /class today|class tonight|holiday|calendar|cancel|activity/.test(q)) q += " parent calendar";
  const words = new Set(q.split(" "));
  const scored = facts.map(fact => ({ fact, score: (fact.id === "prayer.next" && /next prayer/.test(q) ? 20 : 0) + fact.terms.reduce((score, term) => {
    const token = normalizeCompanionQuestion(term);
    return score + (token.includes(" ") ? q.includes(token) ? 5 : 0 : words.has(token) ? 2 : 0);
  }, 0) })).filter(item => item.score >= 2).sort((a, b) => b.score - a.score);
  if (!scored.length) return [];
  return scored.filter(item => item.score >= scored[0].score * .55).slice(0, 3).map(item => item.fact);
}

/** Only server-authored statements are returned. There is no outside AI
 * service, generated fact, payment action or privileged account lookup. */
export function companionReply(input: {
  request: CompanionRequest; facts: CompanionFact[]; now: Date; contentVersion: number;
  ready?: boolean;
}): CompanionReply {
  const { request, facts, now, contentVersion } = input;
  const source = (value: CompanionSource): CompanionSource => ({ ...value, title: translateUi(request.language ?? "en", value.title) });
  const contact = source({ id: "contact", title: "Contact Masjid Bilal", href: "https://hbic.ca/contact" });
  const base = { ok: true as const, mode: "published-info" as CompanionReply["mode"], asOf: now.toISOString(), contentVersion, topicIds: [] as string[], needsHuman: true };
  const boundary = companionBoundary(request.question);
  if (boundary === "private") return { ...base, answer: companionMessage(request.language, "private"), sources: [contact, source({ id: "academy-account", title: "Secure Quran Academy account", href: "https://hbic.ca/quran-academy" })] };
  if (boundary === "religious" || boundary === "political") return { ...base, answer: companionMessage(request.language, boundary), sources: [contact] };
  if (input.ready === false) return { ...base, answer: companionMessage(request.language, "unavailable"), sources: [contact] };
  const social = companionSocialIntent(normalizeCompanionQuestion(request.question));
  if (social) return { ...base, answer: companionMessage(request.language, social), sources: [], topicIds: [`companion.${social}`], needsHuman: false };
  // Future/different dates require an actual schedule for that date, not today's times.
  const normalized = companionQuestionTerms(normalizeCompanionQuestion(request.question));
  if (/\b(?:tomorrow|next week|next month|yesterday|monday|tuesday|wednesday|thursday|friday|saturday|sunday|january|february|march|april|june|july|august|september|october|november|december)\b|\bmay\s+\d|\d{4}[-/]\d{1,2}[-/]\d{1,2}|غدا|کل(?: |$)|فردا|هفته بعد|اگلے ہفتے|الاسبوع القادم|یکشنبه|دوشنبه|سه شنبه|چهارشنبه|پنجشنبه|شنبه|پیر|منگل|بدھ|جمعرات|ہفتہ|اتوار|الاثنين|الثلاثاء|الاربعاء|الخميس|السبت|الاحد/.test(`${request.question.toLowerCase()} ${normalized}`) && /\b(?:prayer|fajr|adhan|iqamah|maghrib|isha|dhuhr|asr|sunrise)\b/.test(normalized)) {
    return { ...base, answer: companionMessage(request.language, "date"), sources: [source({ id: "prayer", title: "Live prayer timetable", href: "https://hbic.ca/prayer-times" })] };
  }
  const selected = selectCompanionFacts(request, facts);
  if (!selected.length) return { ...base, answer: companionMessage(request.language, "unknown"), sources: [contact] };
  const sources = [...new Map(selected.map(({ id, title, href }) => [href, source({ id, title, href })])).values()];
  return { ...base, answer: selected.map(fact => !request.language || request.language === "en" ? fact.text : fact.translations?.[request.language] ?? `${companionMessage(request.language, "original")}\n${fact.text}`).join("\n\n"), sources, topicIds: selected.map(fact => fact.id), needsHuman: false };
}
