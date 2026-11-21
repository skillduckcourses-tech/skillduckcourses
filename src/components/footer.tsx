import Link from "next/link";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-brand">
        <p className="eyebrow">SKILLDUCK</p>
        <p>Self-paced online learning with practical skill development and verified certification.</p>
      </div>
      <nav className="footer-links" aria-label="Footer navigation">
        <Link href="/about">About</Link>
        <Link href="/contact">Contact</Link>
        <Link href="/privacy-policy">Privacy Policy</Link>
        <Link href="/terms">Terms</Link>
      </nav>
      <div className="footer-meta">
        <a href="mailto:support@skillduck.com">support@skillduck.com</a>
        <span>© 2026 SkillDuck</span>
      </div>
    </footer>
  );
}
