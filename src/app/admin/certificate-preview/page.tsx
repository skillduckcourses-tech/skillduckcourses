import { redirect } from "next/navigation";
import { pageMetadata } from "@/src/lib/seo";
import { requireAdmin } from "@/src/lib/server-session";
import CertificateCard from "@/src/app/certificates/certificate-card";

export const metadata = pageMetadata("Certificate Design Preview", "Preview and print the SkillDuck certificate design.", "/admin/certificate-preview", true);

export default async function CertificatePreviewPage() {
  if (!await requireAdmin()) redirect("/");

  return (
    <main className="admin-shell">
      <p className="eyebrow">ADMIN CERTIFICATE PREVIEW</p>
      <h2 className="certificate-preview-title">Sample certificate.</h2>
      <p className="admin-copy">This is a design preview only. It does not create or query a certificate record.</p>
      <CertificateCard
        preview
        certificate={{
          certificateNo: "SKD-2026-SAMPLE",
          verificationHash: "sample-preview",
          issuedTo: "Example Learner",
          course: "SkillDuck Professional Learning Pathway",
          issuedAt: new Date().toISOString(),
          status: "SAMPLE",
        }}
      />
    </main>
  );
}
