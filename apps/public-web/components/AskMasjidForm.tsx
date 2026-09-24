"use client";

import { useState } from "react";
import Link from "next/link";

export function AskMasjidForm({
  categories,
  privacyNotice
}: {
  categories: string[];
  privacyNotice: string;
}) {
  const [startedAt] = useState(() => Date.now());
  const [state, setState] = useState<{ tone: "idle" | "success" | "error"; message: string }>({
    tone: "idle",
    message: ""
  });

  async function handleSubmit(formData: FormData) {
    setState({ tone: "idle", message: "Submitting..." });
    try {
      const response = await fetch("/api/community/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          email: formData.get("email"),
          category: formData.get("category"),
          question: formData.get("question"),
          consent: formData.get("consent") === "on",
          websiteField: formData.get("websiteField"),
          startedAt
        })
      });
      const data = await response.json() as {
        ok?: boolean;
        message?: string;
        error?: string;
        errors?: string[];
      };
      if (!response.ok || !data.ok) {
        throw new Error(data.errors?.join(" ") || data.error || "Unable to submit this question.");
      }
      setState({ tone: "success", message: data.message || "Your question was received for private review." });
    } catch (error) {
      setState({
        tone: "error",
        message: error instanceof Error ? error.message : "Unable to submit this question."
      });
    }
  }

  return (
    <section className="directory-form-band" id="ask-masjid">
      <div>
        <span className="kicker">Ask the masjid</span>
        <h3>Send a private question</h3>
        <p>{privacyNotice}</p>
        <p>This service routes general masjid questions. It does not provide automated religious rulings.</p>
      </div>
      <form action={handleSubmit} className="directory-form-grid">
        <label>Name (optional)<input name="name" autoComplete="name" maxLength={120} /></label>
        <label>Email<input name="email" required type="email" autoComplete="email" maxLength={200} /></label>
        <label className="full-field">
          Category
          <select name="category" required defaultValue="">
            <option value="" disabled>Choose a category</option>
            {categories.map((category) => <option value={category} key={category}>{category}</option>)}
          </select>
        </label>
        <label className="full-field">Question<textarea name="question" required minLength={10} maxLength={3000} rows={7} /></label>
        <label className="honeypot" aria-hidden="true">Website<input name="websiteField" tabIndex={-1} autoComplete="off" /></label>
        <label className="checkbox-row full-field">
          <input name="consent" type="checkbox" required />
          <span>I consent to private review and follow-up about this question. See the <Link className="inline-link" href="/privacy">Privacy Policy</Link>.</span>
        </label>
        <div className="full-field">
          <button className="button primary button-native" type="submit">Submit Privately</button>
        </div>
        <p className={`form-status full-field ${state.tone}`} aria-live="polite">{state.message}</p>
      </form>
    </section>
  );
}
