import { pageMetadata } from "@/src/lib/seo";
import DashboardClient from "./dashboard-client";

export const metadata = pageMetadata("Student Dashboard", "Manage your learning progress, assessments, support requests, and certificate status.", "/dashboard", true);

export default function DashboardPage() {
  return <DashboardClient />;
}