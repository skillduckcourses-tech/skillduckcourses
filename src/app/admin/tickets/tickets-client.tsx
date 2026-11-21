"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Ticket = { id: number; subject: string; message: string; status: "OPEN" | "IN_PROGRESS" | "RESOLVED"; adminNote: string | null; createdAt: string; updatedAt: string; user: { name: string | null; email: string }; course: { title: string } | null };

async function readJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text.trim()) return {} as T;
  try { return JSON.parse(text) as T; } catch { throw new Error("Invalid response from the support service."); }
}

export default function AdminTicketsClient() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const loadSequenceRef = useRef(0);

  const load = useCallback(async () => {
    const sequence = ++loadSequenceRef.current;
    try {
      const response = await fetch("/api/admin/tickets", { cache: "no-store" });
      const body = await readJson<{ tickets?: Ticket[]; error?: string }>(response);
      if (!response.ok) throw new Error(body.error || "Unable to load support tickets.");
      if (!Array.isArray(body.tickets)) throw new Error("The support service returned invalid tickets.");
      if (sequence !== loadSequenceRef.current) return;
      setTickets(body.tickets);
      setError("");
    } catch (loadError) {
      if (sequence !== loadSequenceRef.current) return;
      setError(loadError instanceof Error ? loadError.message : "Unable to load support tickets.");
    }
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void load(), 0);
    const interval = window.setInterval(() => void load(), 15000);
    return () => { window.clearTimeout(initialLoad); window.clearInterval(interval); };
  }, [load]);

  async function update(id: number, status: Ticket["status"], adminNote: string) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin/tickets", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, status, adminNote }) });
      const body = await readJson<{ ticket?: Ticket; error?: string }>(response);
      if (!response.ok) throw new Error(body.error || "Unable to update support ticket.");
      if (!body.ticket) throw new Error("The support service did not return the updated ticket.");
      await load();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Unable to update support ticket.");
    } finally {
      setBusy(false);
    }
  }

  return <main className="admin-shell"><p className="eyebrow">ADMIN SUPPORT DESK</p><h1>Student tickets.</h1><p className="admin-copy">Tickets refresh automatically every 15 seconds.</p><p><a className="text-link" href="/admin/videos">Open video CMS</a> <a className="text-link" href="/admin/payments">Open payment inbox</a></p>{error && <p className="login-error" role="alert">{error}</p>}<section className="admin-ticket-list">{tickets.length === 0 ? <p>No tickets yet.</p> : tickets.map((ticket) => <article className="admin-ticket" key={ticket.id}><div><p className="course-category">{ticket.status}</p><h2>{ticket.subject}</h2><p>{ticket.message}</p><small>{ticket.user.name || ticket.user.email} | {ticket.course?.title || "General support"} | {new Date(ticket.createdAt).toLocaleString()}</small><p className="admin-reply-preview">{ticket.adminNote ? `Latest reply: ${ticket.adminNote}` : "No reply sent yet."}</p></div><TicketReply key={`${ticket.id}-${ticket.updatedAt}`} ticket={ticket} onUpdate={update} busy={busy} /></article>)}</section></main>;
}

function TicketReply({ ticket, onUpdate, busy }: { ticket: Ticket; onUpdate: (id: number, status: Ticket["status"], reply: string) => Promise<void> | void; busy: boolean }) {
  const [reply, setReply] = useState(ticket.adminNote || ""); const [status, setStatus] = useState<Ticket["status"]>(ticket.status);
  return <form className="ticket-actions" onSubmit={(event) => { event.preventDefault(); void onUpdate(ticket.id, status, reply); }}><textarea value={reply} onChange={(event) => setReply(event.target.value)} placeholder="Write a reply..." rows={3} maxLength={5000} required disabled={busy} /><select value={status} onChange={(event) => setStatus(event.target.value as Ticket["status"])} disabled={busy}><option value="OPEN">Open</option><option value="IN_PROGRESS">In progress</option><option value="RESOLVED">Resolved</option></select><button className="course-action" type="submit" disabled={busy}>{busy ? "Saving..." : "Send reply"}</button></form>;
}