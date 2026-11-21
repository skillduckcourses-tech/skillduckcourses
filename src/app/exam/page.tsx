import { pageMetadata } from "@/src/lib/seo";
import ExamClient from "./exam-client";
import { Suspense } from "react";

export const metadata = pageMetadata("Course Assessment", "Complete your SkillDuck course assessment.", "/exam", true);

export default function ExamPage() {
  return <Suspense fallback={<main className="exam-shell"><p>Preparing your examination...</p></main>}><ExamClient /></Suspense>;
}