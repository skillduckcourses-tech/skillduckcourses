"use client";

import { useState } from "react";
import type { FormEvent, PointerEvent } from "react";
import SocialProof from "./social-proof";

export default function HomeClient() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [signup, setSignup] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleHeroCardPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "touch" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const bounds = event.currentTarget.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;

    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;
    event.currentTarget.style.setProperty("--hero-card-tilt-x", `${(-y * 5).toFixed(2)}deg`);
    event.currentTarget.style.setProperty("--hero-card-tilt-y", `${(x * 7).toFixed(2)}deg`);
  }

  function resetHeroCardTilt(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.style.setProperty("--hero-card-tilt-x", "0deg");
    event.currentTarget.style.setProperty("--hero-card-tilt-y", "0deg");
  }

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await fetch(signup ? "/api/auth/signup" : "/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      });
      const body = (await response.json().catch(() => null)) as {
        error?: string;
        user?: { isAdmin?: boolean };
      } | null;
      if (!response.ok) throw new Error(body?.error || "Unable to sign in.");

      if (signup) {
        window.location.replace("/dashboard");
        return;
      }

      const requestedPath = new URLSearchParams(window.location.search).get("next");
      let destination: string | null = null;
      if (requestedPath) {
        try {
          const url = new URL(requestedPath, window.location.origin);
          if (url.origin === window.location.origin) destination = `${url.pathname}${url.search}${url.hash}`;
        } catch {
          destination = null;
        }
      }

      const isAdmin = body?.user?.isAdmin === true;
      const requestingAdmin = destination === "/admin" || destination?.startsWith("/admin/") === true;
      if (requestingAdmin && !isAdmin) {
        setError("This account does not have administrator access.");
        return;
      }
      window.location.replace(destination || (isAdmin ? "/admin" : "/dashboard"));
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Unable to sign in.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="landing">
      <section className="hero-intro">
        <div className="hero-topline"><span>SKILLDUCK / PROFESSIONAL LEARNING PLATFORM</span><span>BUILD SKILLS. SHOW PROOF.</span></div>
        <div className="hero-copy"><div><div className="hero-badge"><span className="status-dot" /> Trusted credentials for ambitious builders</div><p className="eyebrow">CERTIFIED SKILLDUCK / 2026</p><h1>Turn learning into <em>leverage.</em></h1><p className="lead">Focused pathways, practical assessments, and verifiable certificates for the work you want next.</p><div className="hero-actions"><a className="hero-primary" href="#access">Start learning <span aria-hidden="true">-&gt;</span></a><a className="hero-secondary" href="#pathways">Explore pathways</a></div><div className="trust-row"><span><strong>1,240+</strong> active learners</span><span><strong>50</strong> practical pathways</span><span><strong>100%</strong> verifiable results</span></div><SocialProof /></div>
          <div className="landing-panel" onPointerMove={handleHeroCardPointerMove} onPointerLeave={resetHeroCardTilt}>
            <p className="eyebrow" id="access">YOUR NEXT MILESTONE</p>
            <h2>Move with intent.</h2>
            <p className="form-intro">Sign in to pick up a pathway, or create an account and start building your credential.</p>
            <form className="login-form" onSubmit={login}>
              {signup && <label>Name<input type="text" value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" required /></label>}
              <label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" required /></label>
              <label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={signup ? "new-password" : "current-password"} required /></label>
              <button className="google-button" type="submit" disabled={loading}>{loading ? "Working..." : signup ? "Create account" : "Continue locally"} <span aria-hidden="true">-&gt;</span></button>
              {error && <p className="login-error" role="alert">{error}</p>}
            </form>
            <button className="mode-link" type="button" onClick={() => { setSignup(!signup); setError(""); }}>{signup ? "Already have an account? Sign in" : "New here? Create an account"}</button>
            <p className="fine-print">Local credentials only. No Google Cloud project or external provider is required.</p>
          </div>
        </div>
      </section>
      <section className="home-trending" id="pathways"><div className="section-kicker"><p className="eyebrow">POPULAR PATHWAYS</p><span>Curated for practical momentum</span></div><div className="trending-grid">{["Microsoft Azure Fundamentals", "Artificial Intelligence Foundations", "Shopify Store Operations", "Amazon FBA Product Research"].map((title, index) => <article className="trend-card" key={title}><span className="trend-rank">0{index + 1}</span><div><p>{["Cloud & productivity", "AI & machine learning", "Commerce & growth", "E-commerce & FBA"][index]}</p><h3>{title}</h3><span className="trend-meta">{["4.9 / 5", "4.8 / 5", "4.9 / 5", "4.7 / 5"][index]} <span aria-hidden="true">*</span></span></div></article>)}</div></section>
      <section className="proof-section"><div className="section-kicker"><p className="eyebrow">THE OUTCOME</p><span>Small steps, visible progress</span></div><div className="proof-grid"><blockquote>“The assessment format gave me something concrete to show clients. I went from learning quietly to pitching confidently.”<cite>Amna R. / Digital Marketing graduate</cite></blockquote><blockquote>“Clear lessons, a fair exam, and a certificate I could verify. It feels designed for people who are actually building.”<cite>Bilal K. / Cloud fundamentals graduate</cite></blockquote><div className="proof-stat"><strong>92%</strong><span>of surveyed learners would recommend their pathway</span></div></div></section>
    </main>
  );
}