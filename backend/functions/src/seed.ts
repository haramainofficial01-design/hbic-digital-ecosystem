import { initializeApp, cert, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import {
  demoAnnouncements,
  demoAuditLogs,
  demoDonationCategories,
  demoEidSchedule,
  demoEvents,
  demoIqamahTime,
  demoJumuahSchedule,
  demoMediaItems,
  demoPrayerTime,
  demoPushLogs,
  demoRamadanSchedule,
  demoServices,
  demoVolunteerOpportunities,
  hbicSettings
} from "@hbic/shared";

const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;

initializeApp(
  serviceAccountPath
    ? { credential: cert(JSON.parse(serviceAccountPath)) }
    : { credential: applicationDefault() }
);

const db = getFirestore();

async function setCollection<T extends { id?: string }>(collection: string, records: T[]) {
  await Promise.all(
    records.map((record, index) => {
      const id = record.id ?? String(index + 1);
      return db.collection(collection).doc(id).set(record, { merge: true });
    })
  );
}

async function main() {
  await db.collection("settings").doc("main").set(hbicSettings, { merge: true });
  await db.collection("prayerTimes").doc(demoPrayerTime.date).set(demoPrayerTime, { merge: true });
  await db.collection("iqamahTimes").doc(demoIqamahTime.date).set(demoIqamahTime, { merge: true });
  await db.collection("jumuahSchedules").doc("current").set(demoJumuahSchedule, { merge: true });
  await db.collection("ramadanSchedules").doc("current").set(demoRamadanSchedule, { merge: true });
  await db.collection("eidSchedules").doc("current").set(demoEidSchedule, { merge: true });
  await setCollection("announcements", demoAnnouncements);
  await setCollection("events", demoEvents);
  await setCollection("programs", demoServices);
  await setCollection("donationCategories", demoDonationCategories);
  await setCollection("mediaItems", demoMediaItems);
  await setCollection("volunteerOpportunities", demoVolunteerOpportunities);
  await setCollection("pushNotificationLogs", demoPushLogs);
  await setCollection("auditLogs", demoAuditLogs);
}

main()
  .then(() => {
    console.log("HBIC Calgary demo data seeded.");
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
