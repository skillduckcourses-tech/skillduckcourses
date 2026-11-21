"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navigation() {
  const pathname = usePathname();
  const admin = pathname.startsWith("/admin");
  const isLandingPage = pathname === "/";
  if (admin) return null;
  const home = isLandingPage ? "/" : admin ? "/admin" : "/dashboard";
  return <nav className="global-nav"><Link className="brand-mark" href={home}>SKILL<span>DUCK</span></Link><div className="nav-links">{admin ? <><Link href="/admin/payments">Payments</Link><Link href="/admin/support">Support</Link><Link href="/admin/courses/new">New course</Link><Link href="/admin/students">Student tracking</Link></> : <><Link href="/dashboard">Dashboard</Link><Link href="/profile">Profile</Link><Link href="/checkout">Checkout</Link></>}</div>{!isLandingPage && pathname !== home && <Link className="back-link" href={home}>&lt;- Back</Link>}</nav>;
}