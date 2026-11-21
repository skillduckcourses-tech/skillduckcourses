"use client";

import { useEffect, useState } from "react";

type Ticket = { id: number; subject: string; message: string; status: "OPEN" | "IN_PROGRESS" | "RESOLVED"; adminNote: string | null; createdAt: string; user: { name: string | null; email: string }; course: { title: string } | null };

export default function AdminTicketsClient() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [error, setError] = useState("");
  async function load() { const response = await fetch("/api/admin/tickets"); if (!response.ok) { setError("Unable to load support tickets."); return; } const body = (await response.json()) as { tickets: Ticket[] }; setTickets(body.tickets); }
  useEffect(() => { const initialLoad = window.setTimeout(() => void load(), 0); const interval = window.setInterval(() => void load(), 15000); return () => { window.clearTimeout(initialLoad); window.clearInterval(interval); }; }, []);
  async function update(id: number, status: Ticket["status"], adminNote: string) { const response = await fetch("/api/admin/tickets", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, status, adminNote }) }); if (response.ok) void load(); }
  return <main className="admin-shell"><p className="eyebrow">ADMIN SUPPORT DESK</p><h1>Student tickets.</h1><p className="admin-copy">Tickets refresh automatically every 15 seconds.</p><p><a className="text-link" href="/admin/videos">Open video CMS</a> <a className="text-link" href="/admin/payments">Open payment inbox</a></p>{error && <p className="login-error">{error}</p>}<section className="admin-ticket-list">{tickets.length === 0 ? <p>No tickets yet.</p> : tickets.map((ticket) => <article className="admin-ticket" key={ticket.id}><div><p className="course-category">{ticket.status}</p><h2>{ticket.subject}</h2><p>{ticket.message}</p><small>{ticket.user.name || ticket.user.email} | {ticket.course?.title || "General support"} | {new Date(ticket.createdAt).toLocaleString()}</small><p className="admin-reply-preview">{ticket.adminNote ? `Latest reply: ${ticket.adminNote}` : "No reply sent yet."}</p></div><TicketReply ticket={ticket} onUpdate={update} /></article>)}</section></main>;
}

function TicketReply({ ticket, onUpdate }: { ticket: Ticket; onUpdate: (id: number, status: Ticket["status"], reply: string) => Promise<void> | void }) {
  const [reply, setReply] = useState(ticket.adminNote || ""); const [status, setStatus] = useState<Ticket["status"]>(ticket.status);
  return <form className="ticket-actions" onSubmit={(event) => { event.preventDefault(); void onUpdate(ticket.id, status, reply); }}><textarea value={reply} onChange={(event) => setReply(event.target.value)} placeholder="Write a reply..." rows={3} required /><select value={status} onChange={(event) => setStatus(event.target.value as Ticket["status"])}><option value="OPEN">Open</option><option value="IN_PROGRESS">In progress</option><option value="RESOLVED">Resolved</option></select><button className="course-action" type="submit">Send reply</button></form>;
}