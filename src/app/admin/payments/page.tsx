import { pageMetadata } from "@/src/lib/seo";
import { requireAdmin } from "@/src/lib/server-session";
import { redirect } from "next/navigation";
import AdminPaymentsClient from "./payments-client";

export const metadata = pageMetadata("Payment Review", "Review certificate payment submissions for SkillDuck learners.", "/admin/payments", true);

export default async function AdminPaymentsPage() {
  if (!await requireAdmin()) redirect("/");
  return <AdminPaymentsClient />;
}