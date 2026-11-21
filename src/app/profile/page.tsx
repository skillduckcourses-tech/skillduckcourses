import { pageMetadata } from "@/src/lib/seo";
import ProfileClient from "./profile-client";

export const metadata = pageMetadata("Profile Settings", "Manage the official name used on your SkillDuck certificate.", "/profile", true);

export default function ProfilePage() {
  return <ProfileClient />;
}
