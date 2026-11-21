import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CertificateCard from "../certificate-card";
import { prisma } from "@/src/lib/prisma";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://skillduckcourses.site";

async function findCertificate(identifier: string) {
  const numericId = Number(identifier);
  if (Number.isSafeInteger(numericId) && numericId > 0) {
    const certificateById = await prisma.certificate.findUnique({
      where: { id: numericId },
      include: {
        user: { select: { fullName: true, name: true, email: true } },
        course: { select: { title: true } },
      },
    });
    if (certificateById) return certificateById;
  }

  return prisma.certificate.findUnique({
    where: { verificationHash: identifier },
    include: {
      user: { select: { fullName: true, name: true, email: true } },
      course: { select: { title: true } },
    },
  });
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const certificate = await findCertificate(id);
  const courseTitle = certificate?.course.title || "Certificate";
  const title = certificate?.status === "APPROVED" ? `${courseTitle} Certificate Verification` : "Certificate Status";
  const description = certificate?.status === "APPROVED"
    ? `View the SkillDuck certificate record for ${courseTitle} and confirm its verification status.`
    : "View the current status of a SkillDuck certificate request.";

  return {
    title,
    description,
    robots: { index: false, follow: false },
    alternates: { canonical: `/certificates/${encodeURIComponent(id)}` },
    openGraph: {
      title: `${title} | SkillDuck`,
      description,
      url: `/certificates/${encodeURIComponent(id)}`,
      type: "website",
      siteName: "SkillDuck",
    },
    twitter: { card: "summary", title: `${title} | SkillDuck`, description },
  };
}

export default async function CertificatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const certificate = await findCertificate(id);
  if (!certificate) notFound();

  const issuedTo = certificate.user.fullName || certificate.user.name || certificate.user.email;
  const courseTitle = certificate.course.title;
  const approved = certificate.status === "APPROVED";
  const expired = Boolean(certificate.expiresAt && certificate.expiresAt <= new Date());
  const credentialJsonLd = {
    "@context": "https://schema.org",
    "@type": "EducationalOccupationalCredential",
    name: `${courseTitle} Certificate`,
    description: `SkillDuck certificate ${certificate.certificateNo}${approved && !expired ? " is approved and verifiable" : " is not currently valid"}.`,
    credentialCategory: "Professional Certification",
    recognizedBy: { "@type": "Organization", name: "SkillDuck", url: siteUrl },
    identifier: certificate.certificateNo,
    url: `${siteUrl}/certificates/${encodeURIComponent(certificate.verificationHash)}`,
  };

  return (
    <main className="verify-shell">
      {approved && !expired ? (
        <>
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(credentialJsonLd).replace(/</g, "\\u003c") }} />
          <p className="eyebrow certificate-page-status">CERTIFICATE RECORD / VERIFIED</p>
          <CertificateCard certificate={{
            certificateNo: certificate.certificateNo,
            verificationHash: certificate.verificationHash,
            issuedTo,
            course: courseTitle,
            issuedAt: certificate.issuedAt.toISOString(),
            status: "valid",
          }} />
        </>
      ) : (
        <>
          <p className="eyebrow certificate-page-status">CERTIFICATE RECORD</p>
          <h1>{expired ? "Certificate expired" : certificate.status === "PENDING_APPROVAL" ? "Certificate pending approval" : "Certificate not approved"}</h1>
          <section className="verify-details" aria-label="Certificate details">
            <p><strong>Certificate:</strong> {certificate.certificateNo}</p>
            <p><strong>Issued to:</strong> {issuedTo}</p>
            <p><strong>Course:</strong> {courseTitle}</p>
            <p><strong>Status:</strong> {expired ? "Expired" : certificate.status.replaceAll("_", " ")}</p>
            <p>This certificate record is not currently available as an approved credential.</p>
          </section>
        </>
      )}
    </main>
  );
}