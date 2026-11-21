import { pageMetadata } from "@/src/lib/seo";

export const metadata = pageMetadata("Terms of Service", "Review SkillDuck’s terms for course access, assessments, certificate issuance, payments, and acceptable platform use.", "/terms");

export default function TermsPage() {
  return (
    <main className="legal-page">
      <article className="legal-card">
        <p className="eyebrow">LEGAL</p>
        <h1>Terms of Service</h1>
        <p>These Terms of Service govern the use of SkillDuck educational content, course access, assessments, and certificate pathways. By using SkillDuck, you agree to comply with these terms and any applicable local laws.</p>

        <h2>1. Learning Platform Use</h2>
        <p>SkillDuck provides self-paced learning resources, educational assessments, and certificate-related workflows to support professional development. Users may access public content for browsing and review, while account-based features require registration and valid login credentials.</p>

        <h2>2. Course Access and Completion</h2>
        <p>Course modules, practice material, and assessments are intended for educational purposes only. Students are responsible for using the platform lawfully and in line with course instructions. Completion of a course does not guarantee employment, licensing, or professional recognition beyond the credential issued by SkillDuck under the platform rules.</p>

        <h2>3. Assessment Integrity</h2>
        <p>Users must complete assessments honestly and without unauthorized assistance. Cheating, sharing answers, bypassing proctoring controls, or tampering with the platform may result in exam invalidation, account restrictions, or removal of certification eligibility.</p>

        <h2>4. Certification Issuance</h2>
        <p>Certificates are only issued according to the course rules, passing assessment requirements, payment approval flow, and admin review process. SkillDuck reserves the right to confirm compliance before approving or issuing a credential. Approved credentials remain subject to verification rules and may be revoked if fraudulent activity is discovered.</p>

        <h2>5. Payment and Approval</h2>
        <p>Students may be required to submit payment proof to request final certificate approval. Approval is determined by the platform and/or admin reviewers based on valid payment evidence, course completion, and assessment results. Approved credentials are made available via the official verification route.</p>

        <h2>6. Intellectual Property</h2>
        <p>All platform content, course materials, assessments, logos, and related assets remain the property of SkillDuck or its licensors unless otherwise stated. Users may not copy, redistribute, republish, or commercially exploit content without prior written permission.</p>

        <h2>7. Service Availability</h2>
        <p>SkillDuck aims to provide a reliable learning environment, but we do not guarantee uninterrupted service or error-free operation. We may update content, change course offerings, or suspend services temporarily to maintain stability, security, or compliance.</p>

        <h2>8. Limitation of Liability</h2>
        <p>SkillDuck is provided for educational and informational purposes. We do not warrant that the platform or its course outcomes will guarantee employment, licensing, or any specific professional result. We are not liable for indirect, incidental, or consequential damages arising from use of the platform, except where prohibited by law.</p>

        <h2>9. Changes to Terms</h2>
        <p>We may update these terms from time to time to reflect new features, legal requirements, or operational improvements. Continued use of the platform after updates indicates acceptance of the revised terms.</p>

        <h2>10. Contact</h2>
        <p>Questions about these terms should be sent to <a href="mailto:support@skillduck.site">support@skillduck.site</a>.</p>
      </article>
    </main>
  );
}
