"use client";
import { useEffect, useRef, useState } from "react";
import { donationFunds, donationAmountCents, donationFund } from "@hbic/shared";
import styles from "./DonationForm.module.css";

export function DonationForm() {
  const [fund, setFund] = useState("general"), [amount, setAmount] = useState("50");
  const [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  const attempt = useRef<{ signature: string; id: string } | null>(null);
  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    if (donationFund(query.get("fund"))) setFund(query.get("fund")!);
    if (donationAmountCents(query.get("amount")) !== null) setAmount(query.get("amount")!);
    if (query.has("cancelled")) setMessage("Payment was cancelled. You can change the category or amount and try again.");
    if (query.has("checkout")) {
      setMessage("Checking your donation with Stripe…");
      const controller = new AbortController();
      void fetch(`/api/donations/status?session=${encodeURIComponent(query.get("checkout")!)}`, { signal: controller.signal })
        .then(async response => { const status = await response.json(); if (!response.ok) throw new Error(status.error);
          setMessage(status.paid ? `Thank you. Your CA$${(status.amountCents / 100).toFixed(2)} donation to ${status.category} is confirmed.`
            : "Your donation is awaiting Stripe payment confirmation. Please check your Checkout confirmation."); })
        .catch(error => { if (!controller.signal.aborted) setMessage(error.message ?? "Your donation status could not be confirmed."); });
      return () => controller.abort();
    }
  }, []);
  async function checkout(event: React.FormEvent) {
    event.preventDefault(); if (busy) return;
    if (donationAmountCents(amount) === null) { setMessage("Enter an amount from CA$1 to CA$10,000."); return; }
    setBusy(true); setMessage("");
    const signature = `${fund}:${amount}`;
    if (attempt.current?.signature !== signature) attempt.current = { signature, id: crypto.randomUUID() };
    try {
      const response = await fetch("/api/donations/checkout", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fund, amount, requestId: attempt.current.id }) });
      const body = await response.json();
      if (!response.ok || !body.url?.startsWith("https://checkout.stripe.com/")) throw new Error(body.error ?? "Checkout could not open.");
      window.location.assign(body.url);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Please try again."); setBusy(false); }
  }
  return <form onSubmit={checkout} className={`card full ${styles.form}`} id="donation-form" style={{ maxWidth: 760, margin: "0 auto", width: "100%" }}>
    <span className="kicker">Secure Stripe donation · CAD</span><h3>Choose where your donation goes</h3>
    <label className={styles.field}>Donation category<select className={styles.control} value={fund} onChange={e => setFund(e.target.value)} disabled={busy}>
      {donationFunds.map(f => <option value={f.id} key={f.id}>{f.title}</option>)}
    </select></label>
    <p className={`muted ${styles.description}`}>{donationFund(fund)?.description}</p>
    <div className="actions" aria-label="Suggested amounts">{[50,100,150].map(value => <button type="button" key={value}
      className={`button ${amount === String(value) ? "primary" : "light"}`} aria-pressed={amount === String(value)} disabled={busy}
      onClick={() => setAmount(String(value))}>CA${value}</button>)}</div>
    <label className={styles.field}>Donation amount (CAD)<input className={styles.control} aria-label="Custom donation amount in Canadian dollars" type="number" min="1" max="10000" step="0.01"
      inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} disabled={busy} required /></label>
    <p className="muted">One-time donation. Your category is recorded with your payment. Card details are collected securely by Stripe.</p>
    <button className="button primary" type="submit" disabled={busy}>{busy ? "Opening secure Checkout…" : `Donate CA$${amount || "0"}`}</button>
    {message && <p role="status">{message}</p>}
  </form>;
}
