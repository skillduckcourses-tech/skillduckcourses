import type { Metadata } from "next";
import HomeClient from "./home-client";

export const metadata: Metadata = {
  title: "Practical Online Courses and Verified Certificates",
  description: "Build practical skills with self-paced online courses, free assessments, and optional verified certificates from SkillDuck.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Practical Online Courses and Verified Certificates | SkillDuck",
    description: "Explore practical learning pathways, take assessments, and unlock verified certificates after passing.",
    url: "/",
    siteName: "SkillDuck",
    type: "website",
    images: [{ url: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80", width: 1200, height: 630, alt: "Learners studying together" }],
  },
  twitter: { card: "summary_large_image", title: "Practical Online Courses | SkillDuck", description: "Build practical skills with self-paced learning and verified certificates." },
};

export default function HomePage() {
  return <HomeClient />;
}