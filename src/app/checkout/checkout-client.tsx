"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import QRCode from "qrcode";
import { COURSE_PRICE_PKR } from "@/src/lib/pricing";
import SocialProof from "../social-proof";

type PaymentTab = "local" | "international";
type Method = "meezan" | "upaisa" | "secondaryWallet" | "citibank" | "crypto";
type Course = { slug: string; title: string; category: string; price: number };
type PaymentDetails = { title: string; account: string; accountTitle: string; amount: string; extra?: string; routing?: string; swift?: string };

const localMethods: Array<{ id: Method; label: string }> = [
  { id: "meezan", label: "Meezan Bank" },
  { id: "upaisa", label: "UPaisa / NayaPay" },
  { id: "secondaryWallet", label: "Secondary Mobile Wallet" },
];
const internationalMethods: Array<{ id: Method; label: string }> = [
  { id: "citibank", label: "Citibank International" },
  { id: "crypto", label: "Crypto (USDT)" },
];
const paymentDetails: Record<Method, PaymentDetails> = {
  meezan: { title: "Meezan Bank", account: "02290107660173", accountTitle: "Muhammad Wajdan Chaudhry", amount: `PKR ${COURSE_PRICE_PKR}` },
  upaisa: { title: "UPaisa / NayaPay", account: "03377775957", accountTitle: "Muhammad Wajdan Chaudhry", amount: `PKR ${COURSE_PRICE_PKR}` },
  secondaryWallet: { title: "JazzCash / EasyPaisa / Secondary Wallet", account: process.env.NEXT_PUBLIC_JAZZCASH_ACCOUNT || "03398033003", accountTitle: process.env.NEXT_PUBLIC_PAYMENT_BENEFICIARY || "Muhammad Wajdan Chaudhry", amount: `PKR ${COURSE_PRICE_PKR}` },
  citibank: { title: "Citibank International Wire / Bank Transfer", account: process.env.NEXT_PUBLIC_CITIBANK_ACCOUNT || "70587070002569995", accountTitle: process.env.NEXT_PUBLIC_PAYMENT_BENEFICIARY || "Muhammad Wajdan Chaudhry", amount: "Minimum $10 USD", extra: `Routing ${process.env.NEXT_PUBLIC_CITIBANK_ROUTING || "031100209"} · SWIFT ${process.env.NEXT_PUBLIC_CITIBANK_SWIFT || "CITIUS33"}`, routing: process.env.NEXT_PUBLIC_CITIBANK_ROUTING || "031100209", swift: process.env.NEXT_PUBLIC_CITIBANK_SWIFT || "CITIUS33" },
  crypto: { title: "USDT Crypto Transfer", account: process.env.NEXT_PUBLIC_USDT_WALLET || "TBtx2zv5uq3napwAWViN8jb88wfk93HcPG", accountTitle: "USDT · TRC20 / BEP20", amount: "Minimum $10 USD", extra: "Confirm the selected network before sending." },
};

async function readJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text.trim()) return {} as T;
  try { return JSON.parse(text) as T; } catch { throw new Error("The server returned an invalid response. Please try again."); }
}

export default function CheckoutClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [tab, setTab] = useState<PaymentTab>("local");
  const [method, setMethod] = useState<Method>("meezan");
  const [courseSlug, setCourseSlug] = useState(() => searchParams.get("course") || "");
  const [courseQuery, setCourseQuery] = useState("");
  const [courses, setCourses] = useState<Course[]>([]);
  const [configuredDetails, setConfiguredDetails] = useState(paymentDetails);
  const [reference, setReference] = useState("");
  const [proof, setProof] = useState<File | null>(null);
  const [copied, setCopied] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [walletQr, setWalletQr] = useState("");

  useEffect(() => {
    void fetch("/api/courses").then(async (response) => {
      const body = await readJson<{ courses?: Course[]; error?: string }>(response);
      if (!response.ok) throw new Error(body.error || `Course list failed (${response.status}).`);
      if (!Array.isArray(body.courses)) throw new Error("The course service returned an invalid response.");
      const available = body.courses;
      setCourses(available);
      const requestedSlug = searchParams.get("course") || "";
      const selected = available.find((course) => course.slug === requestedSlug);
      setCourseSlug(selected?.slug || "");
      setCourseQuery(selected?.title || "");
      if (available.length === 0) setMessage("No published courses are currently available for checkout.");
      else if (requestedSlug && !selected) setMessage("The selected course is no longer available for checkout.");
    }).catch((error: unknown) => setMessage(error instanceof Error ? error.message : "Unable to load courses."));
  }, [searchParams]);

  useEffect(() => {
    void fetch("/api/payments/instructions")
      .then(async (response) => {
        const body = await readJson<{ instructions?: Record<Method, { label?: string; accountNumber?: string; accountTitle?: string; amount?: number; currency?: string; wallet?: string; network?: string; routing?: string; swift?: string }> }>(response);
        if (!response.ok || !body.instructions) return;
        const instructions = body.instructions;
        setConfiguredDetails({
          meezan: { ...paymentDetails.meezan, account: instructions.meezan.accountNumber || paymentDetails.meezan.account, accountTitle: instructions.meezan.accountTitle || paymentDetails.meezan.accountTitle, amount: `${instructions.meezan.currency} ${instructions.meezan.amount}` },
          upaisa: { ...paymentDetails.upaisa, account: instructions.upaisa.accountNumber || paymentDetails.upaisa.account, accountTitle: instructions.upaisa.accountTitle || paymentDetails.upaisa.accountTitle, amount: `${instructions.upaisa.currency} ${instructions.upaisa.amount}` },
          secondaryWallet: { ...paymentDetails.secondaryWallet, account: instructions.secondaryWallet.accountNumber || paymentDetails.secondaryWallet.account, accountTitle: instructions.secondaryWallet.accountTitle || paymentDetails.secondaryWallet.accountTitle, amount: `${instructions.secondaryWallet.currency} ${instructions.secondaryWallet.amount}` },
          citibank: { ...paymentDetails.citibank, account: instructions.citibank.accountNumber || paymentDetails.citibank.account, accountTitle: instructions.citibank.accountTitle || paymentDetails.citibank.accountTitle, amount: `Minimum $${instructions.citibank.amount} USD`, routing: instructions.citibank.routing || paymentDetails.citibank.routing, swift: instructions.citibank.swift || paymentDetails.citibank.swift, extra: `Routing ${instructions.citibank.routing || paymentDetails.citibank.routing} · SWIFT ${instructions.citibank.swift || paymentDetails.citibank.swift}` },
          crypto: { ...paymentDetails.crypto, account: instructions.crypto.wallet || paymentDetails.crypto.account, accountTitle: `USDT · ${instructions.crypto.network || "TRC20 / BEP20"}`, amount: `Minimum $${instructions.crypto.amount} USD` },
        });
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    let active = true;
    void QRCode.toDataURL(configuredDetails.crypto.account, { width: 180, margin: 1, errorCorrectionLevel: "H" })
      .then((url) => { if (active) setWalletQr(url); })
      .catch(() => { if (active) setWalletQr(""); });
    return () => { active = false; };
  }, [configuredDetails.crypto.account]);

  const visibleCourses = useMemo(() => courses.filter((course) => `${course.title} ${course.category}`.toLowerCase().includes(courseQuery.toLowerCase())).slice(0, 8), [courses, courseQuery]);
  const methodsForTab = tab === "local" ? localMethods : internationalMethods;

  async function copyValue(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      window.setTimeout(() => setCopied((current) => current === label ? "" : current), 1800);
    } catch {
      setMessage("Clipboard access was unavailable. Select and copy the account details manually.");
    }
  }

  async function checkout(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    const selectedCourse = courses.find((course) => course.slug === courseSlug);
    if (!selectedCourse || selectedCourse.title !== courseQuery) { setMessage("Choose a course from the course list before submitting."); return; }
    if (!reference.trim()) { setMessage("Enter your transaction ID, hash, or reference number."); return; }
    setLoading(true);
    try {
      const formData = new FormData();
      formData.set("courseSlug", selectedCourse.slug);
      formData.set("method", method);
      formData.set("reference", reference.trim());
      if (proof) formData.set("proof", proof);
      const response = await fetch("/api/payments/checkout", { method: "POST", body: formData });
      const body = await readJson<{ error?: string; bypassed?: boolean; status?: string; paymentId?: number; alreadySubmitted?: boolean }>(response);
      if (response.status === 401) {
        const next = `/checkout?course=${encodeURIComponent(selectedCourse.slug)}`;
        window.location.replace(`/?next=${encodeURIComponent(next)}`);
        return;
      }
      if (!response.ok) throw new Error(body.error || `Payment submission failed (${response.status}).`);
      if (body.bypassed) {
        setMessage("Admin access confirmed. Certificate payment bypassed.");
        router.push("/dashboard");
        return;
      }
      setMessage(body.alreadySubmitted
        ? `Payment request #${body.paymentId} is already pending verification. Taking you to your dashboard...`
        : `Payment request #${body.paymentId} submitted. Verification is in progress (usually approved within 1–2 hours).`);
      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to submit payment. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="checkout-shell payment-checkout">
      <p className="eyebrow">CERTIFICATE CHECKOUT</p>
      <h1>Unlock your next credential.</h1>
      <p className="admin-copy">Pay before or after your assessment. Once verified, payment unlocks the course; if you have already passed, the certificate is issued with approval.</p>
      <SocialProof compact />

      <div className="payment-trust-row" aria-label="Payment security guarantees">
        <span>🔒 256-bit SSL Secure</span><span>✦ Official Registry Verification</span><span>✓ Admin Review &amp; Approval</span>
      </div>

      <div className="payment-tabs" role="tablist" aria-label="Payment region">
        <button type="button" role="tab" aria-selected={tab === "local"} className={tab === "local" ? "active" : ""} onClick={() => { setTab("local"); setMethod("meezan"); }}>Local Payment · PKR</button>
        <button type="button" role="tab" aria-selected={tab === "international"} className={tab === "international" ? "active" : ""} onClick={() => { setTab("international"); setMethod("citibank"); }}>International / Crypto · USD</button>
      </div>

      <section className="payment-instructions" aria-live="polite">
        <div className="payment-instructions-heading"><div><p className="eyebrow">{tab === "local" ? "PAKISTAN TRANSFERS" : "INTERNATIONAL TRANSFERS"}</p><h2>{tab === "local" ? "Choose a local payment method" : "Choose an international method"}</h2></div><strong className="payment-amount">{tab === "local" ? `PKR ${COURSE_PRICE_PKR}` : "Minimum $10 USD"}</strong></div>
        {tab === "international" && <p className="payment-minimum-notice">Minimum transfer amount: $10 USD</p>}
        <div className={`payment-options-grid ${tab === "international" ? "international" : "local"}`}>
          {methodsForTab.map(({ id }) => {
            const option = configuredDetails[id];
            const isCrypto = id === "crypto";
            const isCitibank = id === "citibank";
            return (
              <article className={`payment-option-card ${method === id ? "selected" : ""}`} key={id}>
                <div className="payment-option-header"><h3>{option.title}</h3><span className="payment-amount">{option.amount}</span></div>
                <div className="payment-account-card">
                  <div className="payment-account-copy"><span>{isCrypto ? "Wallet address" : isCitibank ? "Account number" : id === "meezan" ? "Account number" : "Mobile account number"}</span><strong>{option.account}</strong></div>
                  <button type="button" className="copy-account-button" onClick={() => void copyValue(`${id}-account`, option.account)}>{copied === `${id}-account` ? "Copied!" : "Copy"}</button>
                </div>
                <div className="payment-beneficiary"><span>{isCrypto ? "Network" : "Account title"}</span><strong>{option.accountTitle}</strong></div>
                {option.extra && <p className="payment-extra">{option.extra}</p>}
                {isCitibank && <div className="payment-copy-secondary"><button type="button" className="copy-account-button secondary" onClick={() => void copyValue(`${id}-routing`, option.routing || "")}>{copied === `${id}-routing` ? "Routing copied!" : `Copy routing · ${option.routing}`}</button><button type="button" className="copy-account-button secondary" onClick={() => void copyValue(`${id}-swift`, option.swift || "")}>{copied === `${id}-swift` ? "SWIFT copied!" : `Copy SWIFT · ${option.swift}`}</button></div>}
                {isCrypto && <div className="crypto-payment-tools">
                  {walletQr && <Image src={walletQr} alt="QR code for the configured USDT wallet" width={120} height={120} unoptimized />}
                  <p>Send at least $10 USD equivalent to the wallet using TRC20 or BEP20, then enter the transaction hash below.</p>
                </div>}
                <button type="button" className="payment-select-method" aria-pressed={method === id} onClick={() => setMethod(id)}>{method === id ? "Selected for payment" : "Use this payment method"}</button>
              </article>
            );
          })}
        </div>
      </section>

      <form className="checkout-form payment-proof-form" onSubmit={checkout}>
        <label htmlFor="course-search">Certificate course
          <input id="course-search" role="combobox" aria-autocomplete="list" aria-controls="course-options" aria-expanded={Boolean(courseQuery && !courseSlug)} value={courseQuery} onChange={(event) => { setCourseQuery(event.target.value); setCourseSlug(""); }} placeholder="Search available courses" required />
          {courseQuery && !courseSlug && <span className="course-autocomplete" id="course-options" role="listbox">{visibleCourses.map((course) => <button type="button" role="option" aria-selected={course.slug === courseSlug} key={course.slug} onClick={() => { setCourseSlug(course.slug); setCourseQuery(course.title); }}>{course.title}<small>{course.category}</small></button>)}{visibleCourses.length === 0 && <span>No matching courses.</span>}</span>}
        </label>

        <label htmlFor="payment-method">Payment method used
          <select id="payment-method" value={method} onChange={(event) => setMethod(event.target.value as Method)}>
            {(tab === "local" ? localMethods : internationalMethods).map((option) => <option value={option.id} key={option.id}>{option.label}</option>)}
          </select>
        </label>

        <label htmlFor="payment-reference">Transaction ID (TID) / Hash / Reference Number
          <input id="payment-reference" value={reference} onChange={(event) => setReference(event.target.value)} placeholder="Enter the transfer reference or transaction hash" maxLength={180} required />
        </label>

        <label htmlFor="payment-proof">Payment screenshot / receipt <span className="optional-label">Optional · JPG, PNG, WebP, or PDF · max 8 MB</span>
          <input id="payment-proof" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(event) => setProof(event.target.files?.[0] || null)} />
        </label>
        {proof && <p className="selected-proof-name">Selected receipt: {proof.name}</p>}

        {message && <p className="payment-message" role="status">{message}</p>}
        <button className="submit-button payment-submit" type="submit" disabled={loading || !courseSlug}>{loading ? "Submitting for verification..." : "Submit Payment for Verification"}</button>
        <p className="payment-review-note">After you submit, the course appears in your dashboard as <strong>Verification in Progress</strong>. Reviews are usually completed within 1–2 hours.</p>
      </form>
    </main>
  );
}