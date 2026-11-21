"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import CertificateCard, { type CertificateView } from "@/src/app/certificates/certificate-card";

type Course = { id: string; title: string; description: string; category: string; isTrending?: boolean; ranking?: number; enrollmentCount?: number; isCompleted?: boolean; paymentStatus?: "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED" | null; certificateStatus?: "PENDING_APPROVAL" | "APPROVED" | "REJECTED" | null; verificationHash?: string | null; certificateNo?: string | null };
type DashboardData = { session: { name: string; email: string }; enrollments: string[]; completedCourseSlugs?: string[]; counters: { enrolled: number; certificates: number; activeAssessments: number }; certificates: CertificateView[]; courses: Course[] };
type Ticket = { id: number; subject: string; message: string; status: string; adminNote: string | null; createdAt: string };

async function readJsonResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text.trim()) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("The server returned an invalid JSON response.");
  }
}

export default function DashboardClient() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [selected, setSelected] = useState<string | "All">("All");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [ticketOpen, setTicketOpen] = useState(false);
  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketMessage, setTicketMessage] = useState("");
  const [search, setSearch] = useState("");
  const [courseScope, setCourseScope] = useState<"all" | "enrolled">("all");
  const router = useRouter();

  async function loadDashboard() {
    try {
      const response = await fetch("/api/dashboard", { cache: "no-store" });
      const body = await readJsonResponse<Partial<DashboardData> & { error?: string }>(response);
      if (!response.ok || !body.session || !body.counters || !Array.isArray(body.courses) || !Array.isArray(body.enrollments) || !Array.isArray(body.certificates)) throw new Error(body.error || "Unable to load your dashboard.");
      setData(body as DashboardData);
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load your dashboard.");
    }
  }

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void loadDashboard(), 0);
    const refreshLoad = window.setInterval(() => void loadDashboard(), 15000);
    const ticketLoad = window.setTimeout(() => {
      void fetch("/api/support/tickets")
        .then(async (response) => response.ok ? await readJsonResponse<{ tickets?: Ticket[] }>(response) : null)
        .then((body) => { if (body?.tickets) setTickets(body.tickets); })
        .catch(() => undefined);
    }, 0);
    return () => { window.clearTimeout(initialLoad); window.clearInterval(refreshLoad); window.clearTimeout(ticketLoad); };
  }, []);

  const visibleCourses = useMemo(() => data?.courses.filter((course) => (courseScope === "all" || data.enrollments.includes(course.id)) && (selected === "All" || course.category === selected) && `${course.title} ${course.description} ${course.category}`.toLowerCase().includes(search.toLowerCase())) || [], [data, selected, search, courseScope]);
  const progress = Math.min(100, data ? Math.round(data.counters.certificates * 25 + data.counters.activeAssessments * 10 + data.counters.enrolled * 5) : 0);

  async function enroll(courseId: string) {
    setBusy(courseId); setError("");
    const response = await fetch("/api/dashboard/enroll", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ courseId }) });
    if (!response.ok) { setError("Enrollment could not be saved."); setBusy(null); return; }
    setData((current) => current && current.enrollments.includes(courseId) ? current : current && { ...current, enrollments: [...current.enrollments, courseId], counters: { ...current.counters, enrolled: current.counters.enrolled + 1 } });
    setBusy(null);
  }

  async function submitTicket(event: React.FormEvent) {
    event.preventDefault();
    const response = await fetch("/api/support/tickets", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ subject: ticketSubject, message: ticketMessage }) });
    const body = await readJsonResponse<{ ticket?: Ticket; error?: string }>(response);
    if (!response.ok) { setError(body.error || "Your support ticket could not be submitted."); return; }
    if (body.ticket) {
      const ticket = body.ticket as Ticket;
      setTickets((current) => [ticket, ...current]);
    }
    setTicketSubject(""); setTicketMessage(""); setTicketOpen(false);
  }

  if (!data) return <main className="dashboard"><div className="dashboard-fallback"><p>{error || "Loading your learning dashboard..."}</p>{error && <button className="submit-button" onClick={() => void loadDashboard()}>Retry loading dashboard</button>}</div></main>;

  const featuredCourses = data.courses.filter((course) => course.isTrending).slice(0, 4);
  const completedCourses = data.courses.filter((course) => course.isCompleted);
  const scarcityFor = (course: Course) => Math.max(3, 24 - (course.enrollmentCount || 0) * 2 - (course.isTrending ? 3 : 0));

  return <main className="dashboard">
    <header className="dashboard-header"><div><p className="eyebrow">STUDENT DASHBOARD</p><h1>Welcome back, {data.session.name}.</h1><p className="dashboard-subtitle">Choose your next professional milestone.</p></div><div className="dashboard-actions"><Link className="dashboard-exam-link" href="/checkout">Open certificate checkout <span aria-hidden="true">-&gt;</span></Link><button className="logout-button" onClick={async () => { await fetch("/api/auth/logout", { method: "POST" }); router.push("/"); }}>Log out</button></div></header>
    <section className="featured-milestones"><div className="featured-heading"><div><p className="eyebrow">2026 / HIGH-MOMENTUM MILESTONES</p><h2>Start with what is moving.</h2></div><span className="live-label"><span className="live-dot" /> Updated live</span></div><div className="featured-grid">{featuredCourses.map((course) => <button type="button" className="featured-card" key={course.id} onClick={() => router.push(`/checkout?course=${encodeURIComponent(course.id)}`)}><span className="course-trend-badge">TRENDING 2026</span><strong>{course.title}</strong><small>{course.category} / {scarcityFor(course)} seats in this cohort</small><span className="featured-arrow" aria-hidden="true">-&gt;</span></button>)}</div></section>
    <section className="summary-grid"><button className={`summary-card ${courseScope === "enrolled" ? "active" : ""}`} type="button" onClick={() => { setCourseScope("enrolled"); setSelected("All"); setSearch(""); document.getElementById("course-catalog")?.scrollIntoView({ behavior: "smooth", block: "start" }); }}><span>Total Enrolled Courses</span><strong>{data.counters.enrolled}</strong><small>View enrolled pathways</small></button><button className="summary-card" type="button" onClick={() => document.getElementById("certificate-list")?.scrollIntoView({ behavior: "smooth", block: "start" })}><span>Certificates Earned</span><strong>{data.counters.certificates}</strong><small>View earned credentials</small></button><button className="summary-card" type="button" onClick={() => { setCourseScope("all"); document.getElementById("course-catalog")?.scrollIntoView({ behavior: "smooth", block: "start" }); }}><span>Active Assessments</span><strong>{data.counters.activeAssessments}</strong><small>View learning pathways</small></button></section>
    <section className="progress-panel"><div className="progress-copy"><p className="eyebrow">YOUR MOMENTUM</p><h2>{progress >= 50 ? "You are building a strong streak." : "Your next milestone is close."}</h2><p>Keep one pathway moving to unlock your next badge.</p></div><div className="progress-ring" style={{ "--progress": `${progress}%` } as React.CSSProperties}><strong>{progress}%</strong><span>pathway progress</span></div><div className="badge-row"><span className={data.counters.enrolled > 0 ? "badge earned" : "badge"}>FIRST ENROLLMENT</span><span className={data.counters.activeAssessments > 0 ? "badge earned" : "badge"}>IN THE ARENA</span><span className={data.counters.certificates > 0 ? "badge earned" : "badge"}>CREDENTIAL EARNED</span></div></section>
    <section className="completed-courses" id="completed-courses" aria-labelledby="completed-heading"><div className="catalog-heading"><div><p className="eyebrow">ASSESSMENTS PASSED</p><h2 id="completed-heading">Completed courses.</h2></div></div>{completedCourses.length === 0 ? <p>Courses you pass will appear here with their certificate payment status.</p> : <div className="course-grid">{completedCourses.map((course) => <article className="course-card" key={`completed-${course.id}`}><p className="course-category">{course.category}</p><h3>{course.title}</h3><p>Your assessment is passed. The optional official certificate requires payment submission and verification.</p>{course.paymentStatus === "PENDING" ? <p className="course-status-badge">Verification in Progress — usually approved within 1–2 hours.</p> : course.certificateStatus === "APPROVED" && course.verificationHash ? <Link className="course-action" href={`/certificates/${encodeURIComponent(course.verificationHash)}`}>View approved certificate</Link> : course.certificateStatus === "PENDING_APPROVAL" ? <p className="course-status-badge">Certificate request pending approval</p> : <Link className="course-action" href={`/checkout?course=${encodeURIComponent(course.id)}`}>Pay &amp; Unlock Certificate <span aria-hidden="true">-&gt;</span></Link>}</article>)}</div>}</section>
    <section className="catalog-heading" id="course-catalog"><div><p className="eyebrow">{courseScope === "enrolled" ? "YOUR ENROLLED PATHWAYS" : "2026 / TRENDING PATHWAYS"}</p><h2>{courseScope === "enrolled" ? "Keep your momentum." : "Build your next edge."}</h2></div><div className="category-tabs"><button className={selected === "All" ? "active" : ""} onClick={() => { setSelected("All"); setCourseScope("all"); }}>Trending / Top Ranking</button>{courseScope === "enrolled" && <button className="active" onClick={() => setCourseScope("all")}>Show all courses</button>}{[...new Set(data.courses.map((course) => course.category))].map((category) => <button className={selected === category ? "active" : ""} key={category} onClick={() => setSelected(category)}>{category.split(",")[0]}</button>)}</div></section><div className="catalog-search"><label htmlFor="course-search">Find a course</label><input id="course-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by title, skill, or category" /></div>
    {error && <p className="login-error" role="alert">{error}</p>}
    {data.certificates.length > 0 && <section className="certificate-section" id="certificate-list"><div className="catalog-heading"><div><p className="eyebrow">EARNED CREDENTIALS</p><h2>Your certificates.</h2></div></div><div className="certificate-grid">{data.certificates.map((certificate) => <CertificateCard key={certificate.verificationHash} certificate={certificate} />)}</div></section>}
    <section className="course-grid">{visibleCourses.map((course) => { const enrolled = data.enrollments.includes(course.id); const completed = Boolean(course.isCompleted || data.completedCourseSlugs?.includes(course.id)); const seats = scarcityFor(course); return <article className="course-card" key={course.id}><div className="course-card-topline"><p className="course-category">{course.category}</p>{course.isTrending && <span className="course-trend-badge">TRENDING 2026</span>}</div><h3>{course.title}</h3>{completed && <p className="course-status-badge">Completed</p>}<p>{course.description}</p><div className="micro-learning"><span>12-min lessons</span><span>6 modules</span><span>Practical exam</span></div><div className="credential-preview"><span className="credential-mark">✓</span><span><strong>SKILLDUCK</strong><small>VERIFIABLE CREDENTIAL</small></span></div><p className="scarcity-badge"><span className="live-dot" /> {seats} seats left in this cohort</p><div className="course-card-actions"><button className="course-action" disabled={busy === course.id} onClick={() => enrolled ? router.push(`/course/${course.id}`) : void enroll(course.id)}>{completed ? "View Course" : enrolled ? "Enrolled / View Course" : busy === course.id ? "Saving..." : "Enroll / View Course"} <span aria-hidden="true">-&gt;</span></button><button className="buy-card-action" onClick={() => router.push(`/checkout?course=${encodeURIComponent(course.id)}`)}>Buy Now / Enroll &amp; Pay</button></div></article>; })}</section>
    <section className="support-panel"><div><p className="eyebrow">STUDENT SUPPORT</p><h2>Need a hand?</h2><p>{tickets.length} ticket{tickets.length === 1 ? "" : "s"} submitted</p></div><button className="course-action" onClick={() => setTicketOpen(!ticketOpen)}>{ticketOpen ? "Close" : "Open support ticket"}</button>{ticketOpen && <form className="ticket-form" onSubmit={submitTicket}><input placeholder="Subject" value={ticketSubject} onChange={(event) => setTicketSubject(event.target.value)} required /><textarea placeholder="How can we help?" value={ticketMessage} onChange={(event) => setTicketMessage(event.target.value)} rows={4} required /><button className="submit-button" type="submit">Submit ticket</button></form>}{tickets.length > 0 && <div className="ticket-list">{tickets.slice(0, 3).map((ticket) => <div key={ticket.id}><p><strong>{ticket.subject}</strong> <span>{ticket.status}</span></p>{ticket.adminNote && <p className="ticket-reply">Admin reply: {ticket.adminNote}</p>}</div>)}</div>}</section>
  </main>;
}
