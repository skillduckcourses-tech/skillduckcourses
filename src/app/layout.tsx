import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import Footer from "@/src/components/footer";
import WhatsAppSupport from "./whatsapp-support";
import Navigation from "./navigation";
import HelpDeskWidget from "@/src/components/HelpDeskWidget";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.skillduck.com";
const adsenseClient = process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT || "";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "SkillDuck - Learn & Get Certified",
    template: "%s | SkillDuck - Learn & Get Certified",
  },
  description:
    "SkillDuck helps learners master practical digital skills through self-paced online courses with verified professional certificates and instant course completion tracking.",
  keywords: [
    "Online Courses with Certificates",
    "Skill Learning Platform",
    "Free Coding & AI Courses",
    "Verified Professional Certification",
    "self-paced online learning",
    "professional certification courses",
    "AI and coding courses",
    "digital skill training",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "SkillDuck - Learn & Get Certified",
    description:
      "Access practical online courses, free skill-building content, and verified professional certificates designed to help you upskill faster.",
    url: siteUrl,
    siteName: "SkillDuck",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80",
        width: 1200,
        height: 630,
        alt: "SkillDuck learning platform preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "SkillDuck - Learn & Get Certified",
    description:
      "Self-paced online learning with verified certification and practical skill development for modern career growth.",
    images: [
      "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80",
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f3f1e8",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Navigation />
        {children}
        <Footer />
        <WhatsAppSupport />
        <HelpDeskWidget />
        {adsenseClient ? (
          <Script
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(adsenseClient)}`}
            strategy="afterInteractive"
            crossOrigin="anonymous"
          />
        ) : null}
      </body>
    </html>
  );
}