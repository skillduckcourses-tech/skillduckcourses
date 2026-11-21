import type { MetadataRoute } from "next";
import { prisma } from "@/src/lib/prisma";

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.skillduck.com").replace(/\/+$/, "");

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${siteUrl}/`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${siteUrl}/about`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${siteUrl}/contact`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${siteUrl}/privacy-policy`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.4,
    },
    {
      url: `${siteUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.4,
    },
  ];

  try {
    const courses = await prisma.course.findMany({
      where: { isPublished: true },
      select: { slug: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
    });

    const courseRoutes: MetadataRoute.Sitemap = courses.map((course) => ({
      url: `${siteUrl}/course/${encodeURIComponent(course.slug)}`,
      lastModified: course.updatedAt,
      changeFrequency: "weekly",
      priority: 0.9,
    }));

    let lessonRoutes: MetadataRoute.Sitemap = [];
    try {
      const lessons = await prisma.lesson.findMany({
        where: { course: { isPublished: true } },
        select: { id: true, updatedAt: true, course: { select: { slug: true } } },
        orderBy: { updatedAt: "desc" },
      });
      lessonRoutes = lessons.map((lesson) => ({
        url: `${siteUrl}/course/${encodeURIComponent(lesson.course.slug)}/lesson/${lesson.id}`,
        lastModified: lesson.updatedAt,
        changeFrequency: "monthly",
        priority: 0.7,
      }));
    } catch (error) {
      console.warn("Lesson URLs were omitted from the sitemap because lesson data is unavailable.", error);
    }

    return [...staticRoutes, ...courseRoutes, ...lessonRoutes];
  } catch (error) {
    console.warn("Sitemap generation fell back to public routes because the database is unavailable.", error);
    return staticRoutes;
  }
}
