import type { Metadata } from "next";
import Link from "next/link";
import {
  privacyContactEmail
} from "@hbic/shared";
import { SiteChrome } from "../../components/SiteChrome";
import { getPublishedPageContent as getPublishedContent } from "../../lib/contentStore";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Privacy Policy | Masjid Bilal",
  description: "Privacy practices for the Masjid Bilal mobile app and Hazrat Bilal Islamic Centre website.",
  alternates: { canonical: "/privacy" }
};

export default async function PrivacyPage() {
  const { content } = await getPublishedContent();
  const { settings } = content;

  return (
    <SiteChrome settings={settings} contentVersion={content.version}>
      <main className="section legal-page">
        <header className="legal-hero">
          <span className="eyebrow">Privacy &amp; Legal</span>
          <h1>Privacy Policy</h1>
          <p>
            This policy explains how Hazrat Bilal Islamic Centre handles information through the Masjid Bilal mobile app and this website.
          </p>
          <p className="legal-updated">Effective and last updated: October 11, 2026</p>
        </header>

        <div className="legal-layout">
          <nav className="legal-index" aria-label="Privacy policy sections">
            <strong>On this page</strong>
            <a href="#scope">Scope</a>
            <a href="#information">Information we handle</a>
            <a href="#use">How information is used</a>
            <a href="#sharing">Service providers and sharing</a>
            <a href="#retention">Retention and deletion</a>
            <a href="#choices">Your choices</a>
            <a href="#children">Children&apos;s privacy</a>
            <a href="#security">Security</a>
            <a href="#contact">Contact us</a>
          </nav>

          <article className="legal-copy">
            <section id="scope">
              <h2>Who this policy covers</h2>
              <p>
                Masjid Bilal is the public app name used by Hazrat Bilal Islamic Centre, a Calgary, Alberta charitable organization. This policy covers the Masjid Bilal mobile app and the website at <Link href="/">hbic.ca</Link>.
              </p>
              <p>You can browse prayer times, programs, events, media, and general community information without creating an account.</p>
            </section>

            <section id="information">
              <h2>Information we handle</h2>
              <h3>Information you choose to provide</h3>
              <ul>
                <li>Private question forms may collect your email address, an optional name, a selected category, and the text of your question.</li>
                <li>Restaurant directory forms may collect business and contact details, including a contact name, email, phone number, address, website, and the information entered in the form.</li>
                <li>Messages sent by phone or email are handled through your phone or email provider and by the centre staff who respond.</li>
              </ul>

              <h3>Notifications</h3>
              <p>
                If you allow remote notifications, the app sends a notification token, device platform, app version and environment, selected notification categories, last registration time, and a one-way hash of an app-generated installation identifier to our backend. The hash supports safe token rotation and removal; it is not an advertising identifier. We use this information only to deliver and troubleshoot the Masjid Bilal updates you selected.
              </p>

              <h3>Information stored on your device</h3>
              <p>
                The app stores your theme, language, notification preferences, a cached copy of published community content, and the identifiers and status of locally scheduled prayer alerts on your device. Prayer schedules remain on the device and are not uploaded. Cached content lets the app show the last successfully downloaded information when a connection is unavailable.
              </p>

              <h3>Technical and anti-abuse information</h3>
              <p>
                Our hosting and infrastructure providers process standard connection information needed to operate and protect the service. For public forms, the server uses limited request information to create a keyed security fingerprint for rate limiting and duplicate protection; the raw network address and browser identifier are not saved in the form record.
              </p>

              <h3>Quran reading, recordings and Recite Assist</h3>
              <p>
                Quran bookmarks, reading preferences, personal word-review flags and self-reported memorization progress stay on your device or in your browser. Microphone access is optional and starts only when you choose recording, on-device voice search or Recite Assist. HBIC does not upload your microphone audio or use it to train a model. In the app, you can choose to keep selected recordings privately on the device, replay them and delete them from your Library. Session-only recordings are discarded when you leave or background the practice screen. Browser recordings can be reviewed locally or downloaded only when you choose; leaving or backgrounding the page discards the browser recording. Recite Assist keeps a bounded audio window in memory and erases it when stopped or backgrounded. Its early-preview feedback is not a verified recitation or Tajweed assessment.
              </p>
              <p>
                Quran Foundation supplies Quran text, meaning translations and Mushaf fonts; MP3Quran supplies credited streaming recordings. Recite Assist downloads public, integrity-checked model data from Hugging Face only after your consent. These providers receive standard connection information for requested downloads or streams, not your microphone audio. Quran reading does not require an account.
              </p>

              <h3>Optional community practice challenges</h3>
              <p>
                Joining a community challenge is separate and optional. It requires a verified account and adult consent to publish a nickname and active practice-time total. Firebase handles the account email and account identifier for authentication. HBIC stores your account identifier, chosen nickname, challenge consent, credited practice time and limited session receipts to prevent duplicate credit. Only your nickname, time and rank appear in public standings; your email, account identifier, recordings and word-review history are not displayed. Rankings measure credited practice time, not recitation accuracy or proof of attention. Event dates, rules and any prizes must be published by authorized HBIC staff.
              </p>
              <p>
                You can leave a challenge from its screen to remove your nickname and standing. Private session records may remain for duplicate-credit protection and operational troubleshooting. Contact <a href={`mailto:${privacyContactEmail}`}>{privacyContactEmail}</a> from your account email for access, correction or deletion requests. Leaving a challenge does not cancel an Academy enrollment or alter its payment history.
              </p>

              <h3>Information we do not collect in the current app</h3>
              <p>
                The current Masjid Bilal app does not require a public user account, does not contain third-party advertising, does not use an advertising identifier, does not include a user analytics or crash-reporting SDK, and does not collect or transmit your precise location. Qibla direction features use device sensors locally when available.
              </p>
            </section>

            <section id="use">
              <h2>How we use information</h2>
              <ul>
                <li>Provide current prayer, iqamah, Jumu&apos;ah, event, program, donation, and media information.</li>
                <li>Deliver requested notifications and remember your notification choices.</li>
                <li>Route private questions and directory submissions to authorized centre staff for review and follow-up.</li>
                <li>Prevent spam, repeated submissions, misuse, and security incidents.</li>
                <li>Maintain service reliability and respond to support or privacy requests.</li>
              </ul>
            </section>

            <section id="sharing">
              <h2>Service providers and sharing</h2>
              <p>We do not sell personal information and do not share it for third-party advertising.</p>
              <p>We use service providers only where needed to run the service:</p>
              <ul>
                <li>Vercel hosts the public website and server routes.</li>
                <li>Google Firebase provides protected database and administrative infrastructure.</li>
                <li>Expo, Apple Push Notification service, and Firebase Cloud Messaging support notification delivery when you enable notifications.</li>
                <li>Your device platform, browser, phone, email, map, donation, and social-media providers process information when you choose to use their services or open an external link.</li>
              </ul>
              <p>We may disclose information when required by law, to protect users or the centre, or with your direction or consent.</p>
            </section>

            <section id="retention">
              <h2>Retention and deletion</h2>
              <p>
                We keep personal information only while it is reasonably needed to provide the requested service, complete follow-up, maintain necessary operational records, protect the service, or meet legal obligations. Authorized administrators can close and permanently delete private question and directory submissions.
              </p>
              <p>
                Notification tokens remain active until they are disabled, become invalid, or you use the app&apos;s removal control. Delivery records are retained only for operational troubleshooting and do not contain message content from your device.
              </p>
              <p>
                To request access, correction, or deletion of information you submitted, email <a href={`mailto:${privacyContactEmail}`}>{privacyContactEmail}</a>. Please use the same email address supplied with the submission so we can verify and locate the request.
              </p>
            </section>

            <section id="delete-account">
              <h2>Request account or data deletion — Masjid Bilal / HBIC</h2>
              <p>
                To request deletion of your Masjid Bilal / HBIC account and associated information, email <a href={`mailto:${privacyContactEmail}?subject=Masjid%20Bilal%20account%20deletion`}>{privacyContactEmail}</a> from your registered email with the subject “Masjid Bilal account deletion”. You may also request deletion of a specific submission or challenge data without deleting your account. Do not send a password, card number or identity document.
              </p>
              <p>
                HBIC staff verify that you own the account, remove the authentication account and information that is no longer needed, including your public challenge nickname and standing, and explain any records that must be retained. Necessary tuition, donation, receipt, audit and safeguarding records may be retained for their applicable legal or operational retention period; deleting an account does not erase a completed financial transaction or automatically refund it. Ask staff to confirm any remaining Academy renewal is stopped as part of the request. This is a staff-handled deletion request, not an immediate automatic deletion.
              </p>
              <p>
                Your microphone recordings and personal word reviews are only on your device. Delete recordings from My Library; remove the app to clear its local data. HBIC cannot remotely retrieve or delete those recordings.
              </p>
            </section>

            <section id="choices">
              <h2>Your choices</h2>
              <ul>
                <li>You can use the main informational features without creating an account or submitting a form.</li>
                <li>You can decline notification permission, change notification categories, or remove this device from Masjid Bilal notifications in the app.</li>
                <li>You can clear locally stored app information by removing the app from your device.</li>
                <li>You can contact us to request access, correction, or deletion of a private submission.</li>
              </ul>
            </section>

            <section id="children">
              <h2>Children&apos;s privacy</h2>
              <p>
                Our community information includes family and youth programs, but the forms are not intended for children to submit independently. A parent or guardian should contact the centre for a child. If you believe a child provided personal information without appropriate permission, contact us so we can review and delete it.
              </p>
            </section>

            <section id="security">
              <h2>Security</h2>
              <p>
                We use access controls, server-side validation, rate limiting, and encrypted network connections to protect information. No system can guarantee absolute security, so we limit collection and restrict administrative access to authorized personnel.
              </p>
            </section>

            <section id="changes">
              <h2>Changes to this policy</h2>
              <p>We may update this policy when the app, website, providers, or legal requirements change. The effective date at the top identifies the current version.</p>
            </section>

            <section id="contact" className="legal-contact">
              <h2>Contact us</h2>
              <p><strong>Hazrat Bilal Islamic Centre</strong></p>
              <p>{settings.address}</p>
              <p><a href={`mailto:${privacyContactEmail}`}>{privacyContactEmail}</a> · <a href={`tel:${settings.phone}`}>{settings.phone}</a></p>
            </section>
          </article>
        </div>
      </main>
    </SiteChrome>
  );
}
