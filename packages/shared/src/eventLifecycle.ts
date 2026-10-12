import type { EventItem } from "./types";

export const discontinuedEventIds = ["event-history-of-fiqh", "event-heart-antidotes", "event-quran-reflections", "event-prophetic-foundations", "event-creed-essentials"] as const;
export const academyEventTitle = "HBIC Qur'an Academy — Children's Classes";
export const academyEventDescription = "Children's Qur'an, Qa'idah and Tajweed classes at Masjid Bilal, Calgary. Mondays & Thursdays, 5:30 PM–7:00 PM. $50 CAD per child per month, payable online by card or cash at HBIC. Online registration is required. The 2026–2027 term runs October 5, 2026–February 1, 2027, followed by the Ramadan/Eid break. One special Thursday activity each month; dates are in the Academy calendar.";
export const academyPosterFile = "HBIC_Quran_Academy_2026-27_Poster.jpeg";
/** Verified on HBIC Youth's public reel, dated October 7, 2026. */
export const summerCampHighlightUrl = "https://www.instagram.com/hbicyouth/reel/DeLkPvEB-Qq/";
export function publicEventImagePath(image: string) {
  if (/^https:\/\//.test(image) || image.startsWith("/")) return image;
  return [academyPosterFile, "quran-academy.jpeg", "summer-camp-2026.jpeg", "masjid-exterior.png"].includes(image) ? `/photos/${image}` : `/media/images/${image}`;
}

/** Targeted, repeat-safe correction; unrelated records and metadata are retained. */
export function correctApprovedEvent(event: EventItem): EventItem {
  if ((discontinuedEventIds as readonly string[]).includes(event.id)) return { ...event, lifecycle: "discontinued", archived: true, visible: false, featured: false, notificationEnabled: false, registrationLink: "" };
  if (event.id === "event-summer-camp-2026") return { ...event, lifecycle: "completed", archived: true, visible: true, featured: false, notificationEnabled: false, registrationLink: "", highlightUrl: summerCampHighlightUrl, date: "July–August 2026", startTime: "", endTime: "", recurringSchedule: "", summary: "A completed summer of learning, friendship and community activities.", description: "HBIC Summer Camp 2026 brought children together during July–August for Islamic learning, creative activities, sports and friendship at Masjid Bilal. This program has finished." };
  if (event.id === "event-quran-academy") return { ...event, title: academyEventTitle, subtitle: "2026–2027 Term", summary: "Mondays & Thursdays · 5:30–7:00 PM · $50 CAD per child/month", description: academyEventDescription, date: "Mondays & Thursdays", recurringSchedule: "Mondays & Thursdays, 5:30 PM–7:00 PM", startTime: "5:30 PM", endTime: "7:00 PM", location: "Masjid Bilal · Hazrat Bilal Islamic Centre, Calgary", image: academyPosterFile, posterStatus: "ready", registrationLink: "https://hbic.ca/quran-academy", lifecycle: "active", archived: false, visible: true, status: "published", featured: true };
  return event;
}
