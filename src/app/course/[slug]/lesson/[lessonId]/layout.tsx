import type { Metadata } from "next";
import { prisma } from "@/src/lib/prisma";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.skillduck.com";

type LessonParams = { slug: string; lessonId: string };

async function getPublicLesson(params: LessonParams) {
  const lessonId = Number(params.lessonId);
  if (!Number.isSafeInteger(lessonId) || lessonId <= 0) return null;
  return prisma.lesson.findFirst({
    where: { id: lessonId, course: { slug: params.slug, isPublished: true } },
    select: {
      id: true,
      title: true,
      description: true,
      documentUrl: true,
      slideUrls: true,
      course: { select: { slug: true, title: true, description: true } },
    },
  });
}

export async function generateMetadata({ params }: { params: Promise<LessonParams> }): Promise<Metadata> {
  const lesson = await getPublicLesson(await params);
  if (!lesson) return { title: "Lesson not found", robots: { index: false, follow: false } };

  const description = (lesson.description || lesson.course.description || `Study ${lesson.title} in the ${lesson.course.title} course.`).replace(/\s+/g, " ").trim();
  const canonical = `/course/${lesson.course.slug}/lesson/${lesson.id}`;
  return {
    title: `${lesson.title} | ${lesson.course.title} Study Guide`,
    description: description.length > 160 ? `${description.slice(0, 157).trimEnd()}...` : description,
    alternates: { canonical },
    openGraph: {
      title: `${lesson.title} | ${lesson.course.title}`,
      description,
      url: canonical,
      siteName: "SkillDuck",
      type: "article",
    },
    twitter: { card: "summary", title: `${lesson.title} | SkillDuck`, description },
  };
}

export default async function LessonLayout({ children, params }: { children: React.ReactNode; params: Promise<LessonParams> }) {
  const lesson = await getPublicLesson(await params);
  return (
    <>
      {lesson ? (
        <article className="legal-page">
          <div className="legal-card">
            <p className="eyebrow">{lesson.course.title} / STUDY GUIDE</p>
            <h1>{lesson.title}</h1>
            {lesson.description ? <p>{lesson.description}</p> : lesson.course.description ? <p>{lesson.course.description}</p> : null}
            {lesson.documentUrl ? <p><a href={lesson.documentUrl}>Open the course PDF study material</a></p> : null}
            {lesson.slideUrls.filter((url) => url.toLowerCase().endsWith(".pdf")).map((url) => <p key={url}><a href={url}>Open PDF lesson material</a></p>)}
            <p><a href={`/course/${lesson.course.slug}`}>Return to the {lesson.course.title} course overview</a></p>
          </div>
        </article>
      ) : null}
      {children}
    </>
  );
}