import { pageMetadata } from "@/src/lib/seo";
import { requireAdmin } from "@/src/lib/server-session";
import { redirect } from "next/navigation";
import AdminTicketsClient from "./tickets-client";

export const metadata = pageMetadata("Support Tickets", "Review and respond to learner support tickets.", "/admin/tickets", true);

export default async function AdminTicketsPage() {
  if (!await requireAdmin()) redirect("/");
  return <AdminTicketsClient />;
}