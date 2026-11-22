import { pageMetadata } from "@/src/lib/seo";
import { requireAdmin } from "@/src/lib/server-session";
import { redirect } from "next/navigation";
import NewCourseForm from "./new-course-form";

export const metadata = pageMetadata("Create a Course", "Create a SkillDuck course and attach lesson resources.", "/admin/courses/new", true);

export default async function NewCoursePage() {
  if (!await requireAdmin()) redirect("/");
  return <main className="admin-shell"><p className="eyebrow">ADMIN COURSE STUDIO</p><h1>Create a course.</h1><p className="admin-copy">Publish a pathway and attach its first learning resource in one step.</p><NewCourseForm defaultMode="new" /></main>;
}