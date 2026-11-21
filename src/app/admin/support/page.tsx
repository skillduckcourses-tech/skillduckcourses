import { pageMetadata } from "@/src/lib/seo";
import { requireAdmin } from "@/src/lib/server-session";
import { redirect } from "next/navigation";
import HelpDeskInbox from "./helpdesk-inbox";

export const metadata = pageMetadata("Student Support", "Manage learner support requests on SkillDuck.", "/admin/support", true);

export default async function AdminSupportPage() {
  if (!await requireAdmin()) redirect("/");
  return <HelpDeskInbox />;
}