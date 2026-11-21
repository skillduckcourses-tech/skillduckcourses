import { redirect } from "next/navigation";
import { pageMetadata } from "@/src/lib/seo";
import { requireAdmin } from "@/src/lib/server-session";

export const metadata = pageMetadata("Security Settings", "Review administrator access and security configuration for SkillDuck.", "/admin/security", true);

export default async function AdminSecurityPage() {
  const admin = await requireAdmin();
  if (!admin) redirect("/");

  const authSecretReady = Boolean(process.env.AUTH_SECRET && process.env.AUTH_SECRET.length >= 32);
  const aiProviderReady = Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.OPENAI_API_KEY);
  const checks = [
    { title: "Administrator role verified", detail: "Admin routes and sensitive operations verify the account role against the database.", ready: true },
    { title: "Session cookie protection", detail: "The session cookie is HTTP-only, SameSite=Lax, and Secure in production.", ready: true },
    { title: "Signing secret", detail: "Production sessions require a configured AUTH_SECRET with at least 32 characters.", ready: authSecretReady },
    { title: "AI reply provider", detail: "AI auto-replies are available when a Gemini or OpenAI API key is configured.", ready: aiProviderReady },
  ];

  return (
    <main className="admin-shell">
      <p className="eyebrow">PLATFORM CONFIGURATION / SECURITY</p>
      <h1>Security settings.</h1>
      <p className="admin-copy">Review access controls and server configuration. Secret values are never displayed here.</p>
      <section className="admin-security-summary">
        <div><span className="admin-security-avatar">{admin.name.trim().charAt(0).toUpperCase() || "A"}</span><div><small>ACTIVE ADMINISTRATOR</small><strong>{admin.name}</strong><span>{admin.email}</span></div></div>
        <span className="admin-role-chip">ADMIN ROLE VERIFIED</span>
      </section>
      <section className="admin-security-list" aria-label="Security configuration checks">
        {checks.map((check) => (
          <article className="admin-security-check" key={check.title}>
            <span className={check.ready ? "admin-check-icon ready" : "admin-check-icon warning"}>{check.ready ? "✓" : "!"}</span>
            <div><strong>{check.title}</strong><p>{check.detail}</p></div>
            <span className={`admin-check-status ${check.ready ? "ready" : "warning"}`}>{check.ready ? "READY" : "ACTION REQUIRED"}</span>
          </article>
        ))}
      </section>
      {!authSecretReady && process.env.NODE_ENV === "production" ? <p className="admin-security-alert" role="alert">Configure a random AUTH_SECRET of at least 32 characters in the production environment before enabling administrator access.</p> : null}
    </main>
  );
}
