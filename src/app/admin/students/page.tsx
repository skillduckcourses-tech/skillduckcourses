import { pageMetadata } from "@/src/lib/seo";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/src/lib/server-session";
import AdminStudentsClient from "./students-client";

export const metadata = pageMetadata("Student Records", "Review student course completion and certificate records.", "/admin/students", true);

export default async function AdminStudentsPage() {
  if (!await requireAdmin()) redirect("/");
  return <AdminStudentsClient />;
}
