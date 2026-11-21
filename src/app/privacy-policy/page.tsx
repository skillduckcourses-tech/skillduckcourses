import { pageMetadata } from "@/src/lib/seo";

export const metadata = pageMetadata("Privacy Policy", "Read how SkillDuck handles account information, course progress, cookies, advertising, and privacy requests.", "/privacy-policy");

export default function PrivacyPolicyPage() {
  return (
    <main className="legal-page">
      <article className="legal-card">
        <p className="eyebrow">LEGAL</p>
        <h1>Privacy Policy</h1>
        <p>SkillDuck is committed to protecting the privacy and security of learners, visitors, and partners. This policy explains how we collect, use, store, and disclose information when you use our learning platform, read public content, request a certificate, or interact with advertisements.</p>

        <h2>1. Information We Collect</h2>
        <p>We may collect information such as your name, email address, account credentials, course progress, exam scores, payment reference data, and service-related communications. We may also gather technical data such as browser type, device information, IP address, access timestamps, and cookie identifiers to improve platform reliability and maintain security.</p>

        <h2>2. Use of Information</h2>
        <p>We use your information to provide learning experiences, manage certificates, evaluate exam results, deliver account support, improve course content, and maintain compliance with operational and legal obligations. We may also use aggregate or anonymized metrics to improve the user experience and platform quality.</p>

        <h2>3. Cookies and Advertising</h2>
        <p>We use cookies and similar technologies to remember preferences, support secure access, improve website functionality, and analyze website traffic. Some third-party services, including advertising partners and analytics providers, may set cookies to personalize ads or measure campaign performance. This may include Google AdSense-related technologies.</p>
        <p>By continuing to use SkillDuck, you agree that cookies may be used for essential site operations, analytics, and advertising personalization where legally permitted. You can configure your browser to refuse cookies, though some features may not work as intended.</p>

        <h2>4. Google AdSense and Third-Party Advertising</h2>
        <p>SkillDuck may use third-party advertising services such as Google AdSense to display relevant advertisements on public pages. These providers may use cookies, device identifiers, or similar technologies to serve personalized or contextual ads based on your browsing activity and interests. Google may also use data in accordance with its own privacy policy and advertising settings.</p>
        <p>Users may opt out of personalized advertising through Google Ads Settings or manage cookie preferences in their browser. We do not sell personal information, but we may share limited technical or advertising-related data with approved service providers to support website operations and monetization.</p>

        <h2>5. Security and Retention</h2>
        <p>We store account and certification data securely and restrict access to authorized personnel only. We retain records as needed for account administration, legal compliance, exam integrity, and certificate verification. Although we aim to protect information appropriately, no digital system can guarantee absolute security.</p>

        <h2>6. Your Rights</h2>
        <p>Depending on your location, you may have rights to access, correct, delete, or limit the processing of your personal data. You may also object to marketing or personalized ad practices where applicable. If you need help managing your personal data, please contact us using the details at the end of this policy.</p>

        <h2>7. Contact</h2>
        <p>If you have concerns about privacy, cookies, or advertising, contact us at <a href="mailto:support@skillduck.com">support@skillduck.com</a>.</p>
      </article>
    </main>
  );
}
