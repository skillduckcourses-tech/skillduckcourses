import { redirect } from "next/navigation";
import { requireAdmin } from "@/src/lib/server-session";
import AdminNavigation from "./admin-navigation";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  if (!admin) redirect("/");

  return (
    <div className="admin-workspace">
      <AdminNavigation name={admin.name || admin.email} />
      <div className="admin-main-content">{children}</div>
    </div>
  );
}
