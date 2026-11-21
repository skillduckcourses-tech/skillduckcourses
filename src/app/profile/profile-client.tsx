"use client";

import { useEffect, useState } from "react";

export default function ProfileClient() {
  const [fullName, setFullName] = useState("");
  const [locked, setLocked] = useState(false);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { void fetch("/api/profile").then((response) => response.json()).then((body: { user?: { fullName?: string | null; name?: string | null } }) => { const value = body.user?.fullName || ""; setFullName(value); setLocked(Boolean(value)); }).catch(() => setMessage("Unable to load your profile.")); }, []);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setMessage("");
    setSaving(true);
    try {
      const response = await fetch("/api/profile", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ fullName }) });
      const body = await response.json().catch(() => ({})) as { error?: string; user?: { fullName?: string } };
      if (!response.ok) { setMessage(body.error || "Your profile could not be updated."); return; }
      setFullName(body.user?.fullName || fullName.trim());
      setLocked(true);
      setMessage("Your official certificate name is now locked.");
    } finally { setSaving(false); }
  }

  return <main className="profile-shell"><p className="eyebrow">PROFILE SETTINGS</p><h1>Your official name.</h1><p className="profile-copy">This name is used for identity verification and every SkillDuck certificate.</p><form className="profile-form" onSubmit={save}><label htmlFor="full-name">Full name<input id="full-name" value={fullName} onChange={(event) => setFullName(event.target.value)} disabled={locked} autoComplete="name" required /></label><p className="profile-warning">⚠️ Please write carefully. Your full name can only be set ONCE and will appear on all official SkillDuck certificates.</p><button className="submit-button" type="submit" disabled={saving || locked}>{locked ? "Name locked" : saving ? "Saving..." : "Save official name"}</button>{message && <p role="status">{message}</p>}</form></main>;
}
