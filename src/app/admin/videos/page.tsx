import { pageMetadata } from "@/src/lib/seo";
import { requireAdmin } from "@/src/lib/server-session";
import { redirect } from "next/navigation";
import VideoImportForm from "./video-import-form";

export const metadata = pageMetadata("Video Content Manager", "Manage video resources attached to SkillDuck courses.", "/admin/videos", true);

export default async function AdminVideosPage() {
  if (!await requireAdmin()) redirect("/");
  return <main className="admin-shell"><p className="eyebrow">ADMIN CONTENT CMS</p><h1>Publish video traffic.</h1><p className="admin-copy">Import one video per line using: video ID | title | hook | attribution.</p><VideoImportForm /></main>;
}