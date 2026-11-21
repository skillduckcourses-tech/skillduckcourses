import { pageMetadata } from "@/src/lib/seo";
import Link from "next/link";
import { prisma } from "@/src/lib/prisma";

export const metadata = pageMetadata("Admin Control Center", "Manage SkillDuck courses, payments, learners, and support tickets.", "/admin", true);

const numberFormat = new Intl.NumberFormat("en-PK", { maximumFractionDigits: 0 });

export default async function AdminPage() {
  const [revenueRows, pendingPayments, issuedCertificates, openChatTickets, openLegacyTickets, recentPayments] = await Promise.all([
    prisma.payment.groupBy({
      by: ["currency"],
      where: { status: "COMPLETED" },
      _sum: { amount: true },
    }),
    prisma.payment.count({ where: { status: "PENDING" } }),
    prisma.certificate.count({ where: { status: "APPROVED" } }),
    prisma.supportTicket.count({ where: { status: "OPEN" } }),
    prisma.legacySupportTicket.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } }),
    prisma.payment.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        amount: true,
        currency: true,
        status: true,
        method: true,
        user: { select: { name: true, email: true } },
        course: { select: { title: true } },
      },
    }),
  ]);
  const revenue = revenueRows.reduce((totals, row) => {
    const currency = row.currency.toUpperCase();
    if (currency === "PKR") totals.pkr += Number(row._sum.amount || 0);
    if (currency === "USD") totals.usd += Number(row._sum.amount || 0);
    return totals;
  }, { pkr: 0, usd: 0 });
  const openTickets = openChatTickets + openLegacyTickets;

  return (
    <main className="admin-shell admin-overview">
      <div className="admin-page-heading">
        <div><p className="eyebrow">ADMIN CONTROL CENTER / OVERVIEW</p><h1>Platform overview.</h1></div>
        <span className="admin-live-status"><i /> LIVE PLATFORM DATA</span>
      </div>
      <p className="admin-copy">Monitor revenue, payment reviews, certificates, and student support from your operations workspace.</p>

      <section className="admin-stat-grid" aria-label="Platform metrics">
        <article className="admin-stat-card revenue">
          <span>Total revenue</span>
          <strong>PKR {numberFormat.format(revenue.pkr)}</strong>
          <small>USD {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(revenue.usd)} · completed payments</small>
        </article>
        <article className="admin-stat-card">
          <span>Pending verifications</span>
          <strong>{numberFormat.format(pendingPayments)}</strong>
          <small>Payment proofs waiting for review</small>
        </article>
        <article className="admin-stat-card">
          <span>Issued certificates</span>
          <strong>{numberFormat.format(issuedCertificates)}</strong>
          <small>Approved and publicly verifiable</small>
        </article>
        <article className="admin-stat-card">
          <span>Open support tickets</span>
          <strong>{numberFormat.format(openTickets)}</strong>
          <small>Live inbox and legacy tickets</small>
        </article>
      </section>

      <div className="admin-overview-columns">
        <section className="admin-panel">
          <div className="admin-panel-heading"><div><p className="eyebrow">OPERATIONS</p><h2>Quick actions</h2></div></div>
          <div className="admin-quick-actions">
            <Link href="/admin/payments"><span className="admin-action-icon">↗</span><span><strong>Review payments</strong><small>{pendingPayments} awaiting verification</small></span><b>→</b></Link>
            <Link href="/admin/courses"><span className="admin-action-icon">＋</span><span><strong>Upload a course</strong><small>Course material and MCQ assessments</small></span><b>→</b></Link>
            <Link href="/admin/support"><span className="admin-action-icon">✳</span><span><strong>Open help desk</strong><small>{openTickets} conversations need attention</small></span><b>→</b></Link>
          </div>
        </section>
        <section className="admin-panel admin-recent-panel">
          <div className="admin-panel-heading"><div><p className="eyebrow">LATEST ACTIVITY</p><h2>Recent payments</h2></div><Link href="/admin/payments">View all <span>→</span></Link></div>
          <div className="admin-recent-payments">
            {recentPayments.length === 0 ? <p className="admin-empty-state">Payment submissions will appear here.</p> : recentPayments.map((payment) => (
              <article key={payment.id}>
                <span className={`admin-payment-indicator ${payment.status.toLowerCase()}`}>{payment.status === "COMPLETED" ? "✓" : payment.status === "PENDING" ? "…" : "!"}</span>
                <span className="admin-payment-person"><strong>{payment.user.name || payment.user.email}</strong><small>{payment.course.title} · {payment.method.replaceAll("_", " ")}</small></span>
                <strong className="admin-payment-amount">{payment.currency} {Number(payment.amount).toLocaleString("en-PK")}</strong>
              </article>
            ))}
          </div>
        </section>
      </div>
      <section className="admin-secondary-actions">
        <Link href="/admin/students">Student records <span>→</span></Link>
        <Link href="/admin/videos">Video library <span>→</span></Link>
        <Link href="/admin/security">Security settings <span>→</span></Link>
        <Link href="/admin/certificate-preview">Certificate preview <span>→</span></Link>
      </section>
    </main>
  );
}