"use client";

import { useEffect, useState } from "react";

const courses = ["AI Foundations", "Azure Fundamentals", "Shopify Growth", "FBA Product Research"];

export default function SocialProof({ compact = false }: { compact?: boolean }) {
  const [learners, setLearners] = useState(1240);
  const [recentCourse, setRecentCourse] = useState("AI Foundations");

  useEffect(() => {
    const interval = window.setInterval(() => {
      setLearners((value) => value + 1);
      setRecentCourse((current) => courses[(courses.indexOf(current) + 1) % courses.length]);
    }, 12000);
    return () => window.clearInterval(interval);
  }, []);

  return <div className={`social-proof ${compact ? "compact" : ""}`}><span className="live-dot" /> <strong>{learners.toLocaleString()}+</strong> learners building credentials <span className="social-proof-divider">/</span> <span>Someone just joined {recentCourse}</span></div>;
}
