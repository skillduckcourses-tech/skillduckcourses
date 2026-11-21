"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

const primaryLinks = [
  { href: "/admin", label: "Overview", icon: "01" },
  { href: "/admin/payments", label: "Payments & approvals", icon: "02" },
  { href: "/admin/courses", label: "Courses & MCQs", icon: "03" },
  { href: "/admin/support", label: "Live help desk", icon: "04" },
  { href: "/admin/security", label: "Security settings", icon: "05" },
];

const otherLinks = [
  { href: "/admin/students", label: "Student records" },
  { href: "/admin/videos", label: "Video library" },
  { href: "/admin/tickets", label: "Legacy tickets" },
];

export default function AdminNavigation({ name }: { name: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState("");

  async function signOut() {
    setSigningOut(true);
    setSignOutError("");
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error("Unable to sign out. Please try again.");
      router.push("/");
      router.refresh();
    } catch (error) {
      setSignOutError(error instanceof Error ? error.message : "Unable to sign out. Please try again.");
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <aside className="admin-sidebar">
      <Link className="admin-sidebar-brand" href="/admin">
        <span className="admin-brand-mark">SD</span>
        <span>SKILLDUCK<small>ADMIN CONSOLE</small></span>
      </Link>
      <p className="admin-nav-label">WORKSPACE</p>
      <nav className="admin-side-links" aria-label="Admin workspace">
        {primaryLinks.map((link) => {
          const active = link.href === "/admin" ? pathname === link.href : pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <Link href={link.href} key={link.href} className={active ? "active" : ""} aria-current={active ? "page" : undefined}>
              <span>{link.icon}</span>{link.label}
            </Link>
          );
        })}
      </nav>
      <p className="admin-nav-label admin-nav-label-secondary">MANAGE</p>
      <nav className="admin-side-links admin-secondary-links" aria-label="Additional admin tools">
        {otherLinks.map((link) => {
          const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
          return <Link href={link.href} key={link.href} className={active ? "active" : ""}>{link.label}</Link>;
        })}
      </nav>
      <div className="admin-account">
        <span className="admin-account-avatar">{name.trim().charAt(0).toUpperCase() || "A"}</span>
        <span className="admin-account-name">{name}<small>Administrator</small></span>
        <button type="button" aria-label="Sign out" disabled={signingOut} onClick={() => void signOut()} title="Sign out">
          {signingOut ? "..." : "↗"}
        </button>
      </div>
      {signOutError ? <p className="admin-signout-error" role="alert">{signOutError}</p> : null}
    </aside>
  );
}
