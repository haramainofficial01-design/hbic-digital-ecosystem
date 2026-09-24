"use client";

import { useState } from "react";
import Link from "next/link";

type FormState = { tone: "idle" | "success" | "error"; message: string };

async function submitInterest(payload: Record<string, unknown>) {
  const response = await fetch("/api/halal/interest", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await response.json() as { ok?: boolean; message?: string; error?: string; errors?: string[] };
  if (!response.ok || !data.ok) throw new Error(data.errors?.join(" ") || data.error || "Unable to submit this form.");
  return data.message || "Thank you. Your submission was received.";
}

export function HalalDirectoryForms({ restaurantFormEnabled }: { restaurantFormEnabled: boolean }) {
  const [notifyState, setNotifyState] = useState<FormState>({ tone: "idle", message: "" });
  const [interestState, setInterestState] = useState<FormState>({ tone: "idle", message: "" });
  const [notifyStartedAt] = useState(() => Date.now());
  const [interestStartedAt] = useState(() => Date.now());

  async function handleNotify(formData: FormData) {
    setNotifyState({ tone: "idle", message: "Submitting..." });
    try {
      const message = await submitInterest({
        kind: "directory-notify",
        email: formData.get("email"),
        consent: formData.get("consent") === "on",
        acknowledgement: true,
        websiteField: formData.get("websiteField"),
        startedAt: notifyStartedAt
      });
      setNotifyState({ tone: "success", message });
    } catch (error) {
      setNotifyState({ tone: "error", message: error instanceof Error ? error.message : "Unable to submit." });
    }
  }

  async function handleInterest(formData: FormData) {
    setInterestState({ tone: "idle", message: "Submitting..." });
    try {
      const message = await submitInterest({
        kind: "restaurant-interest",
        businessName: formData.get("businessName"),
        contactPerson: formData.get("contactPerson"),
        email: formData.get("email"),
        phone: formData.get("phone"),
        address: formData.get("address"),
        cuisine: formData.get("cuisine"),
        website: formData.get("website"),
        currentHalalClaim: formData.get("currentHalalClaim"),
        message: formData.get("message"),
        consent: formData.get("consent") === "on",
        acknowledgement: formData.get("acknowledgement") === "on",
        websiteField: formData.get("websiteField"),
        startedAt: interestStartedAt
      });
      setInterestState({ tone: "success", message });
    } catch (error) {
      setInterestState({ tone: "error", message: error instanceof Error ? error.message : "Unable to submit." });
    }
  }

  return (
    <>
      <section className="directory-form-band" id="notify">
        <div>
          <span className="kicker">Directory updates</span>
          <h3>Know when reviewed listings are available</h3>
          <p>Receive one practical update when the Masjid Bilal directory is ready.</p>
        </div>
        <form action={handleNotify} className="directory-inline-form">
          <label>
            Email address
            <input name="email" type="email" autoComplete="email" required maxLength={200} />
          </label>
          <label className="honeypot" aria-hidden="true">
            Website
            <input name="websiteField" tabIndex={-1} autoComplete="off" />
          </label>
          <label className="checkbox-row">
            <input name="consent" type="checkbox" required />
            <span>I agree that Masjid Bilal may contact me about the directory. See the <Link className="inline-link" href="/privacy">Privacy Policy</Link>.</span>
          </label>
          <button className="button primary button-native" type="submit">Notify Me</button>
          <p className={`form-status ${notifyState.tone}`} aria-live="polite">{notifyState.message}</p>
        </form>
      </section>

      {restaurantFormEnabled ? (
        <section className="directory-form-band" id="restaurant-interest">
          <div>
            <span className="kicker">Muslim business owner?</span>
            <h3>Request consideration for the upcoming directory</h3>
            <p>Submissions are reviewed privately. Sending this form is not halal verification, approval, endorsement, or publication.</p>
          </div>
          <form action={handleInterest} className="directory-form-grid">
            <label>Business name<input name="businessName" required maxLength={140} /></label>
            <label>Contact person<input name="contactPerson" required autoComplete="name" maxLength={120} /></label>
            <label>Email<input name="email" required type="email" autoComplete="email" maxLength={200} /></label>
            <label>Phone<input name="phone" required type="tel" autoComplete="tel" maxLength={40} /></label>
            <label className="full-field">Business address<input name="address" required autoComplete="street-address" maxLength={240} /></label>
            <label>Business category<input name="cuisine" required maxLength={120} /></label>
            <label>Website (optional)<input name="website" type="url" autoComplete="url" maxLength={500} /></label>
            <label className="full-field">Ownership and halal details, where relevant<textarea name="currentHalalClaim" required maxLength={800} rows={4} /></label>
            <label className="full-field">Additional message<textarea name="message" maxLength={2000} rows={5} /></label>
            <label className="honeypot" aria-hidden="true">Website<input name="websiteField" tabIndex={-1} autoComplete="off" /></label>
            <label className="checkbox-row full-field">
              <input name="consent" type="checkbox" required />
              <span>I consent to private review and follow-up about this business submission. See the <Link className="inline-link" href="/privacy">Privacy Policy</Link>.</span>
            </label>
            <label className="checkbox-row full-field">
              <input name="acknowledgement" type="checkbox" required />
              <span>I understand that submission is not verification, endorsement, approval, or automatic publication.</span>
            </label>
            <div className="full-field">
              <button className="button primary button-native" type="submit">Submit for Private Review</button>
            </div>
            <p className={`form-status full-field ${interestState.tone}`} aria-live="polite">{interestState.message}</p>
          </form>
        </section>
      ) : (
        <section className="directory-form-band" id="restaurant-interest">
          <div>
            <span className="kicker">Business interest</span>
            <h3>Private intake is being prepared</h3>
            <p>The review form will open after the directory workflow completes final security review.</p>
          </div>
        </section>
      )}
    </>
  );
}
