import type { Metadata } from "next";

const siteName = "SkillDuck";

export function pageMetadata(title: string, description: string, pathname: string, noindex = false): Metadata {
  return {
    title,
    description,
    alternates: { canonical: pathname },
    robots: noindex ? { index: false, follow: false } : { index: true, follow: true },
    openGraph: {
      title: `${title} | ${siteName}`,
      description,
      url: pathname,
      siteName,
      type: "website",
    },
    twitter: { card: "summary", title: `${title} | ${siteName}`, description },
  };
}