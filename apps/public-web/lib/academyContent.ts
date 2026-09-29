import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { ACADEMY_ALBERTA_GENERAL_HOLIDAYS, ACADEMY_TERM_END_DATE, academyRecurringClasses } from "@hbic/shared";
import { academyDb, AcademyError } from "./academyStore";

export type AcademyClass = { id: string; name: string; teacher: string; dayOfWeek: number; startTime: string; endTime: string; room: string; level: "qaida" | "quran" | "mixed"; capacity: number; active: boolean };
export type AcademyCalendarItem = { id: string; title: string; date: string; type: "class" | "special_class" | "no_class" | "holiday" | "time_changed" | "event"; classIds: string[]; note: string };
export type AcademyAnnouncement = { id: string; title: string; message: string; priority: "normal" | "high"; classIds: string[]; publishedAt: string; expiresAt: string | null };

function text(value: unknown, label: string, max = 120) {
  const result = String(value ?? "").trim();
  if (!result || result.length > max) throw new AcademyError(`Enter ${label} (up to ${max} characters).`);
  return result;
}
function classIds(value: unknown) {
  if (!Array.isArray(value) || value.length > 30 || value.some((item) => typeof item !== "string" || !/^[A-Za-z0-9_-]{1,100}$/.test(item))) throw new AcademyError("Choose valid class targets.");
  return value as string[];
}
function time(value: unknown) {
  if (typeof value !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) throw new AcademyError("Use 24-hour time, such as 10:00.");
  return value;
}
function date(value: unknown) {
  const parsed = typeof value === "string" ? Date.parse(`${value}T12:00:00Z`) : NaN;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(parsed) || new Date(parsed).toISOString().slice(0, 10) !== value) throw new AcademyError("Enter a valid calendar date.");
  return value;
}

export function validateAcademyItem(kind: "class" | "calendar" | "announcement", input: unknown) {
  const value = input && typeof input === "object" ? input as Record<string, unknown> : {};
  if (kind === "class") {
    const dayOfWeek = Number(value.dayOfWeek);
    const capacity = Number(value.capacity);
    if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) throw new AcademyError("Choose a class day.");
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 100) throw new AcademyError("Choose a capacity between 1 and 100.");
    if (value.level !== "qaida" && value.level !== "quran" && value.level !== "mixed") throw new AcademyError("Choose a class level.");
    const startTime = time(value.startTime), endTime = time(value.endTime);
    if (endTime <= startTime) throw new AcademyError("Class end time must be after start time.");
    return { name: text(value.name, "class name"), teacher: text(value.teacher, "teacher", 100), dayOfWeek, startTime, endTime,
      room: text(value.room, "room", 70), level: value.level, capacity, active: value.active !== false };
  }
  if (kind === "calendar") {
    if (!["class", "special_class", "no_class", "holiday", "time_changed", "event"].includes(String(value.type))) throw new AcademyError("Choose a calendar type.");
    const calendarDate = date(value.date);
    if (value.type === "special_class" && new Date(`${calendarDate}T12:00:00Z`).getUTCDay() !== 4) {
      throw new AcademyError("The monthly special activity must be on a Thursday.");
    }
    return { title: text(value.title, "calendar title"), date: calendarDate, type: value.type,
      classIds: classIds(value.classIds ?? []), note: String(value.note ?? "").trim().slice(0, 500) };
  }
  if (value.priority !== "normal" && value.priority !== "high") throw new AcademyError("Choose announcement priority.");
  const publishedAt = text(value.publishedAt, "publish date", 30);
  const expiresAt = value.expiresAt ? text(value.expiresAt, "expiry date", 30) : null;
  if (Number.isNaN(Date.parse(publishedAt)) || (expiresAt && Number.isNaN(Date.parse(expiresAt)))) throw new AcademyError("Enter valid announcement dates.");
  return { title: text(value.title, "announcement title"), message: text(value.message, "announcement message", 3000),
    priority: value.priority, classIds: classIds(value.classIds ?? []), publishedAt, expiresAt };
}

const collection = { class: "academyClasses", calendar: "academyCalendar", announcement: "academyAnnouncements" } as const;

export async function saveAcademyItem(kind: keyof typeof collection, input: unknown, actorUid: string, id?: string) {
  const db = academyDb();
  const data = validateAcademyItem(kind, input);
  const ref = id ? db.collection(collection[kind]).doc(id) : db.collection(collection[kind]).doc();
  if (id && !/^[A-Za-z0-9_-]{1,100}$/.test(id)) throw new AcademyError("Invalid record ID.");
  if (id && !(await ref.get()).exists) throw new AcademyError("Record not found.", 404);
  if (kind === "calendar" && "type" in data && data.type === "special_class") {
    const existing = await db.collection(collection.calendar).where("type", "==", "special_class").get();
    if (existing.docs.some((doc) => doc.id !== id && String(doc.data().date).slice(0, 7) === data.date.slice(0, 7))) {
      throw new AcademyError("This month already has a special Thursday. Edit its date instead.", 409);
    }
  }
  await ref.set({ ...data, updatedBy: actorUid, updatedAt: new Date().toISOString() }, { merge: true });
  return { id: ref.id, ...data };
}

export async function listAcademyContent(admin = false, classFilter: string[] = []) {
  const db = academyDb();
  const [classDocs, calendarDocs, announcementDocs] = await Promise.all([
    db.collection(collection.class).limit(200).get(),
    db.collection(collection.calendar).limit(500).get(),
    db.collection(collection.announcement).limit(200).get()
  ]);
  const now = Date.now();
  const targeted = (ids: string[]) => ids.length === 0 || ids.some((id) => classFilter.includes(id));
  return {
    classes: classDocs.docs.map((doc) => ({ id: doc.id, ...doc.data() } as AcademyClass))
      .filter((item) => admin || item.active === true && classFilter.includes(item.id)) as AcademyClass[],
    calendar: (() => {
      const explicit = calendarDocs.docs.map((doc) => ({ id: doc.id, ...doc.data() } as AcademyCalendarItem))
        .filter((item) => admin || targeted(item.classIds ?? []));
      const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Edmonton", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
      const pick = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value;
      const today = `${pick("year")}-${pick("month")}-${pick("day")}`;
      const defaults: AcademyCalendarItem[] = ([
        { id: "academy-preparation-2026-10-01", date: "2026-10-01", title: "No class — Academy preparation day", type: "no_class", classIds: [],
          note: "There is no class October 1. The first regular class is Monday, October 5." },
        ...ACADEMY_ALBERTA_GENERAL_HOLIDAYS.map((holiday) => ({ id: `alberta-holiday-${holiday.date}`, date: holiday.date,
          title: holiday.title, type: "holiday" as const, classIds: [],
          note: holiday.date === "2026-10-12" ? "No Academy class on this Alberta general holiday." : "Alberta general holiday; no regular Academy class is scheduled on this date." })),
        { id: "academy-term-end-2027-02-01", date: ACADEMY_TERM_END_DATE, title: "Academy term ends", type: "event", classIds: [],
          note: "Final scheduled class of the term, 5:30–7:00 p.m. No classes afterward through Ramadan and Eid al-Fitr; resumption after Eid is to be announced." },
        { id: "academy-ramadan-eid-break-2027", date: "2027-02-02", title: "Ramadan & Eid al-Fitr break — no classes", type: "no_class", classIds: [],
          note: "The term ended February 1. No classes during the Ramadan and Eid al-Fitr break. HBIC will announce the resumption date after Eid." }
      ] as AcademyCalendarItem[]).filter((item) => item.date >= today && !explicit.some((existing) => existing.date === item.date));
      const changedDates = new Set(explicit.filter((item) => ["no_class", "holiday", "time_changed", "special_class"].includes(item.type)).map((item) => item.date));
      const specialDates = explicit.filter((item) => item.type === "special_class").map((item) => item.date);
      const recurring = academyRecurringClasses(today, 150, specialDates).filter((item) => !changedDates.has(item.date))
        .map((item) => ({ id: `recurring-${item.date}`, date: item.date, title: item.title, type: item.type,
          classIds: [] as string[], note: item.note }));
      return [...recurring, ...explicit, ...defaults].sort((a, b) => String(a.date).localeCompare(String(b.date)));
    })() as AcademyCalendarItem[],
    announcements: announcementDocs.docs.map((doc) => ({ id: doc.id, ...doc.data() } as AcademyAnnouncement))
      .filter((item) => admin || targeted(item.classIds ?? []) && Date.parse(String(item.publishedAt)) <= now && (!item.expiresAt || Date.parse(String(item.expiresAt)) >= now))
      .sort((a, b) => String(b.publishedAt).localeCompare(String(a.publishedAt))) as AcademyAnnouncement[]
  };
}

export async function assignAcademyChild(familyId: string, childId: string, classId: string, actorUid: string) {
  const db = academyDb();
  if (![familyId, childId, classId].every((id) => /^[A-Za-z0-9_-]{1,128}$/.test(id))) throw new AcademyError("Invalid family, child or class reference.");
  const familyRef = db.collection("academyFamilies").doc(familyId);
  const classRef = db.collection(collection.class).doc(classId);
  await db.runTransaction(async (tx) => {
    const [family, academyClass] = await Promise.all([tx.get(familyRef), tx.get(classRef)]);
    if (!family.exists || !academyClass.exists || academyClass.data()?.active !== true) throw new AcademyError("Active family and class are required.", 404);
    const children = family.data()?.children as { id: string; classId: string | null }[];
    const selected = children.find((child) => child.id === childId);
    if (!selected) throw new AcademyError("Child not found in this family.", 404);
    if (selected.classId === classId) return;
    if (Number(academyClass.data()?.enrolledCount ?? 0) >= Number(academyClass.data()?.capacity ?? 0)) throw new AcademyError("This class is full.", 409);
    const previousRef = selected.classId ? db.collection(collection.class).doc(selected.classId) : null;
    const previous = previousRef ? await tx.get(previousRef) : null;
    tx.update(familyRef, { children: children.map((child) => child.id === childId ? { ...child, classId } : child), enrollmentState: "active", updatedAt: new Date().toISOString() });
    tx.update(classRef, { enrolledCount: FieldValue.increment(1) });
    if (previousRef && previous?.exists) tx.update(previousRef, { enrolledCount: FieldValue.increment(-1) });
    tx.create(db.collection("academyAudit").doc(), { action: "class_assigned", familyId, childId, classId, actorUid, at: new Date().toISOString() });
  });
}
