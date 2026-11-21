"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";

type Sender = "USER" | "AI" | "ADMIN";
type Message = { id: string; sender: Sender; content: string; createdAt: string };
type ChatTicket = { id: string; status: "OPEN" | "RESOLVED"; isAiHandled: boolean; messages: Message[] };

const quickPrompts = ["Certificate Fee?", "Payment Methods", "How to Verify?", "Talk to Admin"];

async function jsonResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text.trim()) return {} as T;
  try { return JSON.parse(text) as T; } catch { throw new Error("The support service returned an invalid response."); }
}

export default function HelpDeskWidget() {
  const [open, setOpen] = useState(false);
  const [ticketId, setTicketId] = useState("");
  const [ticket, setTicket] = useState<ChatTicket | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTicketId(window.localStorage.getItem("skillduck_help_ticket") || "");
    setName(window.localStorage.getItem("skillduck_help_name") || "");
    setEmail(window.localStorage.getItem("skillduck_help_email") || "");
  }, []);

  const refresh = useCallback(async () => {
    if (!ticketId) return;
    try {
      const query = new URLSearchParams({ ticketId });
      if (email) query.set("email", email);
      const response = await fetch(`/api/support/chat?${query}`, { cache: "no-store" });
      const body = await jsonResponse<{ ticket?: ChatTicket; error?: string }>(response);
      if (!response.ok) throw new Error(body.error || "Unable to refresh your conversation.");
      if (body.ticket) setTicket(body.ticket);
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to refresh your conversation.");
    }
  }, [ticketId, email]);

  useEffect(() => {
    if (!open || !ticketId) return;
    void refresh();
    const interval = window.setInterval(() => void refresh(), 3500);
    return () => window.clearInterval(interval);
  }, [open, ticketId, refresh]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [ticket?.messages.length, open]);

  async function send(event?: FormEvent, text = draft) {
    event?.preventDefault();
    const content = text.trim();
    if (!content || busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/support/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ticketId: ticketId || undefined, message: content, name: name || undefined, email: email || undefined }),
      });
      const body = await jsonResponse<{ ticketId?: string; messages?: Message[]; isAiHandled?: boolean; escalated?: boolean; error?: string }>(response);
      if (!response.ok || !body.ticketId) throw new Error(body.error || "Unable to send your message.");
      setTicketId(body.ticketId);
      window.localStorage.setItem("skillduck_help_ticket", body.ticketId);
      if (name) window.localStorage.setItem("skillduck_help_name", name);
      if (email) window.localStorage.setItem("skillduck_help_email", email);
      setTicket((current) => ({
        id: body.ticketId!,
        status: "OPEN",
        isAiHandled: body.isAiHandled ?? current?.isAiHandled ?? true,
        messages: body.messages || current?.messages || [],
      }));
      setDraft("");
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Unable to send your message.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="helpdesk-widget">
      {open && <section className="helpdesk-panel" aria-label="Certified SkillDuck support chat">
        <header className="helpdesk-header">
          <div className="helpdesk-header-mark">SD</div>
          <div><strong>Certified SkillDuck</strong><span>{ticket?.isAiHandled === false ? "Admin Support · Human follow-up" : "AI Assistant · Online"}</span></div>
          <button type="button" className="helpdesk-close" aria-label="Close help desk" onClick={() => setOpen(false)}>×</button>
        </header>
        <div className="helpdesk-messages" aria-live="polite">
          {!ticket?.messages.length && <div className="helpdesk-welcome"><strong>How can we help?</strong><p>Ask about assessments, certificate payments, verification, or your account.</p></div>}
          {ticket?.messages.map((message) => <article className={`helpdesk-message ${message.sender.toLowerCase()}`} key={message.id}>
            <span className="helpdesk-sender">{message.sender === "AI" ? "SkillDuck AI Assistant" : message.sender === "ADMIN" ? "Admin Support" : "You"}</span>
            <p>{message.content}</p>
            <time>{new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time>
          </article>)}
          {ticket?.status === "RESOLVED" && <p className="helpdesk-resolved-note">This conversation was marked resolved. Send a new message to reopen it.</p>}
          <div ref={bottomRef} />
        </div>
        {!ticket?.messages.length && <div className="helpdesk-chips">{quickPrompts.map((prompt) => <button type="button" key={prompt} onClick={() => setDraft(prompt)}>{prompt}</button>)}</div>}
        {!ticketId && <div className="helpdesk-guest-fields"><input aria-label="Your name" placeholder="Name (optional)" value={name} onChange={(event) => setName(event.target.value)} /><input aria-label="Your email" type="email" placeholder="Email for replies (optional)" value={email} onChange={(event) => setEmail(event.target.value)} /></div>}
        {error && <p className="helpdesk-error" role="alert">{error}</p>}
        <form className="helpdesk-compose" onSubmit={(event) => void send(event)}>
          <textarea aria-label="Write a support message" placeholder={ticket?.isAiHandled === false ? "Write to Admin Support..." : "Write your message..."} rows={2} value={draft} maxLength={5000} onChange={(event) => setDraft(event.target.value)} />
          <button type="submit" disabled={busy || !draft.trim()} aria-label="Send message">{busy ? "…" : "➤"}</button>
        </form>
        <p className="helpdesk-privacy">Never send passwords, full card numbers, or wallet recovery phrases.</p>
      </section>}
      <button className="helpdesk-launcher" type="button" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        <span className="helpdesk-launcher-icon">{open ? "×" : "?"}</span><strong>{open ? "Close help" : "Help Desk"}</strong>
      </button>
    </div>
  );
}
