"use client";

import { useEffect, useState } from "react";

type Payment = {
  id: number;
  amount: string;
  currency: string;
  method: string;
  reference: string | null;
  proofUrl?: string | null;
  status: "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED";
  certificateStatus: "PENDING_APPROVAL" | "APPROVED" | "REJECTED";
  examScore: number | null;
  examTitle: string | null;
  certificateNo: string | null;
  createdAt: string;
  user: { name: string | null; email: string };
  course: { title: string; slug: string };
};

function displayMethod(method: string) {
  const labels: Record<string, string> = {
    MEEZAN_BANK: "Meezan Bank",
    UPAISA_NAYAPAY: "UPaisa / NayaPay",
    SECONDARY_WALLET: "JazzCash / Wallet",
    JAZZCASH: "JazzCash",
    CITIBANK_WIRE: "Citibank",
    USDT_TRON: "Crypto",
    BANK_TRANSFER: "Bank transfer",
  };
  return labels[method] || method.replaceAll("_", " ");
}

export default function AdminPaymentsClient() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [error, setError] = useState("");

  async function load() {
    const response = await fetch("/api/admin/payments");
    if (!response.ok) {
      setError("Unable to load payment submissions.");
      return;
    }
    const body = await response.json() as { payments?: Payment[]; pendingCount?: number };
    setPayments(body.payments || []);
    setPendingCount(body.pendingCount || 0);
  }

  useEffect(() => {
    const initial = window.setTimeout(() => void load(), 0);
    const refresh = window.setInterval(() => void load(), 15000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(refresh);
    };
  }, []);

  async function review(payment: Payment, status: "APPROVED" | "REJECTED") {
    setError("");
    try {
      const response = await fetch("/api/payments/review", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          paymentId: payment.id,
          status,
          reviewNote: status === "APPROVED" ? "Payment verified and approved by admin" : "Payment proof rejected after verification",
        }),
      });
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(body.error || "Unable to update this payment.");
      await load();
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : "Unable to update this payment.");
    }
  }

  return (
    <main className="admin-shell">
      <p className="eyebrow">ADMIN PAYMENT INBOX</p>
      <h1>Certificate approval queue.</h1>
      <p className="admin-copy">Verify each receipt. Approval unlocks the course immediately; if the student has already passed, the certificate is issued at the same time.</p>
      <p className="course-status-badge" role="status">{pendingCount} payment{pendingCount === 1 ? "" : "s"} awaiting verification</p>
      {error && <p className="login-error">{error}</p>}
      <section className="admin-ticket-list">
        <div className="admin-table-scroll">
          <table className="admin-data-table">
            <thead>
              <tr><th>Student</th><th>Course</th><th>Method</th><th>Transaction ID (TID)</th><th>Amount</th><th>Receipt</th><th>Assessment</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {payments.length === 0 ? <tr><td className="admin-table-empty" colSpan={9}>No payment submissions yet.</td></tr> : payments.map((payment) => (
                <tr key={payment.id}>
                  <td><strong>{payment.user.name || "Student"}</strong><small>{payment.user.email}</small></td>
                  <td>{payment.course.title}</td>
                  <td>{displayMethod(payment.method)}</td>
                  <td><code>{payment.reference || "Not provided"}</code></td>
                  <td className="admin-payment-amount">{payment.currency} {Number(payment.amount).toLocaleString("en-PK")}</td>
                  <td>{payment.proofUrl ? <a className="admin-receipt-link" href={`/api/admin/payments/${payment.id}/proof`} target="_blank" rel="noreferrer">View receipt ↗</a> : <span className="admin-muted">No receipt</span>}</td>
                  <td>{payment.examTitle ? `${payment.examTitle}${payment.examScore !== null ? ` · ${payment.examScore}%` : ""}` : "Not taken yet"}</td>
                  <td><span className={`admin-payment-status ${payment.status.toLowerCase()}`}>{payment.status === "PENDING" ? "Pending review" : payment.status}</span></td>
                  <td>
                    <div className="admin-payment-actions">
                      <button className="approve" disabled={payment.status !== "PENDING"} onClick={() => void review(payment, "APPROVED")}>Approve Payment &amp; Issue Certificate</button>
                      <button className="reject" disabled={payment.status !== "PENDING"} onClick={() => void review(payment, "REJECTED")}>Reject</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="admin-table-note">Approving a student who has not taken the assessment unlocks the course. Passing later will issue their certificate automatically.</p>
      </section>
    </main>
  );
}
