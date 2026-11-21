import { pageMetadata } from "@/src/lib/seo";

export const metadata = pageMetadata("About SkillDuck", "Learn about SkillDuck’s practical, self-paced learning pathways, assessments, and verified certificate process.", "/about");

export default function AboutPage() {
  return (
    <main className="legal-page">
      <article className="legal-card">
        <p className="eyebrow">ABOUT</p>
        <h1>About SkillDuck</h1>
        <p>SkillDuck is a modern learning platform designed to help people build practical skills, gain meaningful confidence, and unlock credible professional outcomes. Our model combines self-paced study, guided assessment preparation, and verifiable certification so that learners can progress at a speed that matches their schedule and goals.</p>

        <h2>Our Mission</h2>
        <p>We believe practical learning should feel structured, motivating, and relevant to real work. SkillDuck exists to make skill-building more accessible for busy students, career-switchers, freelancers, and professionals who want a clearer route to measurable progress.</p>

        <h2>How We Teach</h2>
        <p>Each path is designed to teach the fundamentals, connect them to real examples, and reinforce them through structured checkpoints. Learners can work through assigned content, evaluate their understanding, and grow over time without the pressure of a rigid classroom environment.</p>

        <h2>Career and Credential Focus</h2>
        <p>SkillDuck emphasizes realistic outcomes. Our educational programs are meant to build strong foundations, support better decision-making, and create visible proof of learning. Verified certificates help learners communicate their readiness and strengthen their professional credibility when they are ready to take the next step.</p>

        <h2>Why Learners Choose SkillDuck</h2>
        <ul>
          <li>Practical and easy-to-follow learning pathways.</li>
          <li>Self-paced study that supports real-world schedules.</li>
          <li>Structured assessment and progression tracking.</li>
          <li>Verified certificates for documentation and trust.</li>
          <li>Clear educational support and public policy transparency.</li>
        </ul>

        <p>SkillDuck is committed to transparent learning, accessible education, and a user experience that respects both learner trust and the needs of the broader digital ecosystem.</p>
      </article>
    </main>
  );
}
