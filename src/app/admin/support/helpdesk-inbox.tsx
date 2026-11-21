"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Message = { id: string; sender: "USER" | "AI" | "ADMIN"; content: string; createdAt: string };
type Ticket = { id: string; userId: string | null; userName: string; userEmail: string | null; subject: string; status: "OPEN" | "RESOLVED"; isAiHandled: boolean; createdAt: string; updatedAt: string; messages: Message[] };

async function readJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text.trim()) return {} as T;
  try { return JSON.parse(text) as T; } catch { throw new Error("Invalid response from the support service."); }
}

export default function HelpDeskInbox() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [reply, setReply] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/support/chat", { cache: "no-store" });
      const body = await readJson<{ tickets?: Ticket[]; error?: string }>(response);
      if (!response.ok) throw new Error(body.error || "Unable to load the help desk inbox.");
      const items = body.tickets || [];
      setTickets(items);
      setSelectedId((current) => current && items.some((ticket) => ticket.id === current) ? current : items[0]?.id || "");
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load the help desk inbox.");
    }
  }, []);

  useEffect(() => {
    const initial = window.setTimeout(() => void load(), 0);
    const poll = window.setInterval(() => void load(), 3500);
    return () => { window.clearTimeout(initial); window.clearInterval(poll); };
  }, [load]);

  const selected = useMemo(() => tickets.find((ticket) => ticket.id === selectedId) || null, [tickets, selectedId]);

  async function action(payload: { ticketId: string; action: "reply" | "toggleAi" | "resolve" | "reopen"; message?: string; isAiHandled?: boolean }) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin/support/chat", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      const body = await readJson<{ error?: string }>(response);
      if (!response.ok) throw new Error(body.error || "Unable to update this conversation.");
      if (payload.action === "reply") setReply("");
      await load();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Unable to update this conversation.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="admin-shell helpdesk-admin-shell">
      <p className="eyebrow">CERTIFIED SKILLDUCK / LIVE HELP DESK</p>
      <h1>Support inbox.</h1>
      <p className="admin-copy">Live conversations refresh every 3.5 seconds. Human replies automatically pause AI responses.</p>
      {error && <p className="login-error" role="alert">{error}</p>}
      <div className="helpdesk-admin-grid">
        <aside className="helpdesk-ticket-list" aria-label="Support conversations">
          <div className="helpdesk-list-header"><strong>Conversations</strong><span>{tickets.filter((ticket) => ticket.status === "OPEN").length} active</span></div>
          {tickets.length === 0 ? <p className="helpdesk-empty">No help desk conversations yet.</p> : tickets.map((ticket) => {
            const latest = ticket.messages[ticket.messages.length - 1];
            return <button type="button" className={`helpdesk-ticket-item ${ticket.id === selectedId ? "active" : ""}`} key={ticket.id} onClick={() => setSelectedId(ticket.id)}>
              <span className="helpdesk-ticket-item-top"><strong>{ticket.userName || "Student"}</strong><span className={`helpdesk-status-dot ${ticket.status.toLowerCase()}`} /></span>
              <span className="helpdesk-ticket-preview">{latest?.content || ticket.subject}</span>
              <span className="helpdesk-ticket-item-bottom"><small>{ticket.userEmail || "Guest"}</small><em className={ticket.isAiHandled ? "ai" : "human"}>{ticket.isAiHandled ? "AI handling" : "Admin handling"}</em></span>
              <span className="helpdesk-ticket-time">{new Date(ticket.updatedAt).toLocaleString()}</span>
            </button>;
          })}
        </aside>

        <section className="helpdesk-thread" aria-label="Selected support conversation">
          {!selected ? <div className="helpdesk-thread-empty"><strong>Select a conversation</strong><p>Choose a thread on the left to review messages and reply.</p></div> : <>
            <header className="helpdesk-thread-header">
              <div><p className="eyebrow">{selected.status === "OPEN" ? "ACTIVE CONVERSATION" : "RESOLVED CONVERSATION"}</p><h2>{selected.userName || "Student"}</h2><p>{selected.userEmail || "Guest user"} · {selected.messages.length} messages</p></div>
              <div className="helpdesk-thread-controls">
                <label className="helpdesk-toggle"><span>AI Auto-Reply</span><input type="checkbox" checked={selected.isAiHandled} disabled={busy || selected.status === "RESOLVED"} onChange={(event) => void action({ ticketId: selected.id, action: "toggleAi", isAiHandled: event.target.checked })} /><strong>{selected.isAiHandled ? "ON" : "OFF"}</strong></label>
                {selected.status === "OPEN" ? <button type="button" className="helpdesk-resolve-button" disabled={busy} onClick={() => void action({ ticketId: selected.id, action: "resolve" })}>Mark Ticket as Resolved</button> : <button type="button" className="helpdesk-resolve-button" disabled={busy} onClick={() => void action({ ticketId: selected.id, action: "reopen" })}>Reopen Ticket</button>}
              </div>
            </header>
            <div className="helpdesk-admin-messages">
              {selected.messages.map((message) => <article className={`helpdesk-admin-message ${message.sender.toLowerCase()}`} key={message.id}>
                <div><strong>{message.sender === "USER" ? selected.userName : message.sender === "AI" ? "SkillDuck AI Assistant" : "Admin Support"}</strong><time>{new Date(message.createdAt).toLocaleString()}</time></div>
                <p>{message.content}</p>
              </article>)}
            </div>
            <form className="helpdesk-admin-reply" onSubmit={(event) => { event.preventDefault(); if (reply.trim()) void action({ ticketId: selected.id, action: "reply", message: reply }); }}>
              <label htmlFor="admin-help-reply">Reply as Admin <span>Sending a reply automatically turns AI Auto-Reply off.</span></label>
              <textarea id="admin-help-reply" rows={3} maxLength={5000} value={reply} onChange={(event) => setReply(event.target.value)} placeholder="Write a clear, helpful response..." disabled={busy} />
              <button className="submit-button" type="submit" disabled={busy || !reply.trim()}>{busy ? "Sending..." : "Send Admin Reply"}</button>
            </form>
          </>}
        </section>
      </div>
    </main>
  );
}
