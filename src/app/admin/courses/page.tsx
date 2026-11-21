import { pageMetadata } from "@/src/lib/seo";
import NewCourseForm from "./new/new-course-form";

export const metadata = pageMetadata("Courses & MCQs", "Create SkillDuck courses, publish lesson material, and author MCQ assessments.", "/admin/courses", true);

export default function AdminCoursesPage() {
  return (
    <main className="admin-shell">
      <p className="eyebrow">ADMIN COURSE STUDIO</p>
      <h1>Courses &amp; assessments.</h1>
      <p className="admin-copy">Publish course material and author the assessment question pool students will use after completing lessons.</p>
      <NewCourseForm defaultMode="new" />
    </main>
  );
}
