import type { MetadataRoute } from "next";

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://skillduckcourses.site").replace(/\/+$/, "");

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/course/", "/about", "/contact", "/privacy-policy", "/terms"],
        disallow: ["/admin", "/dashboard", "/api", "/profile", "/exam", "/checkout", "/certificates", "/verify"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
