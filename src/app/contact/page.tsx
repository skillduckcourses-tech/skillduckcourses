import { pageMetadata } from "@/src/lib/seo";

export const metadata = pageMetadata("Contact SkillDuck", "Contact SkillDuck for account, course, payment review, and certificate verification support.", "/contact");

export default function ContactPage() {
  return (
    <main className="legal-page">
      <article className="legal-card">
        <p className="eyebrow">SUPPORT</p>
        <h1>Contact SkillDuck</h1>
        <p>We’re here to help with account support, course questions, payment review issues, and certificate verification inquiries.</p>

        <form className="contact-form" action="mailto:support@skillduck.site" method="post" encType="text/plain">
          <label>
            Name
            <input type="text" name="name" placeholder="Your full name" />
          </label>
          <label>
            Email
            <input type="email" name="email" placeholder="name@example.com" />
          </label>
          <label>
            Message
            <textarea name="message" rows={6} placeholder="Tell us how we can help." />
          </label>
          <button type="submit">Send message</button>
        </form>

        <p><strong>Email:</strong> <a href="mailto:support@skillduck.site">support@skillduck.site</a></p>
        <p><strong>Support hours:</strong> Monday to Friday, 9:00 AM to 6:00 PM UTC</p>
      </article>
    </main>
  );
}
