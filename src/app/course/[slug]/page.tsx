import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { findCourse } from "@/src/lib/course-lookup";
import { prisma } from "@/src/lib/prisma";
import CourseView from "./course-view";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://skillduckcourses.site";

const courseFaqs = [
  {
    question: "Can I take the assessment before finishing the lessons?",
    answer: "Yes. SkillDuck allows students to take the course assessment directly. You can review the study materials first, but viewing progress is not a prerequisite for starting the exam.",
  },
  {
    question: "When do I pay for a certificate?",
    answer: "Learning and the assessment are available without upfront payment. After passing, submit the certificate payment for review to request an official verified certificate.",
  },
  {
    question: "What does the course study guide contain?",
    answer: "The study guide lists the lessons and descriptions published by the course team. Review the lesson materials for the detailed subject content and examples.",
  },
];

function descriptionFor(course: { title: string; category: string; description: string | null }) {
  const supplied = course.description?.trim();
  return supplied || `${course.title} is a SkillDuck learning pathway in ${course.category.toLowerCase().replace(/_/g, " ")}. Check this page for published lessons and study resources.`;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const course = await findCourse(slug);
  if (!course || !course.isPublished) {
    return {
      title: "Course not found",
      description: "This SkillDuck course is unavailable.",
      robots: { index: false, follow: false },
    };
  }

  const description = descriptionFor(course).replace(/\s+/g, " ").trim();
  const shortDescription = description.length > 160 ? `${description.slice(0, 157).trimEnd()}...` : description;
  const canonical = `/course/${course.slug}`;
  return {
    title: `${course.title} Course and Study Guide`,
    description: shortDescription,
    keywords: [course.title, `${course.title} course`, `${course.title} study guide`, String(course.category).toLowerCase().replace(/_/g, " ")],
    alternates: { canonical },
    openGraph: {
      title: `${course.title} Course and Study Guide | SkillDuck`,
      description: shortDescription,
      url: canonical,
      siteName: "SkillDuck",
      type: "article",
    },
    twitter: { card: "summary", title: `${course.title} Course | SkillDuck`, description: shortDescription },
  };
}

export default async function CoursePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const foundCourse = await findCourse(slug);
  if (!foundCourse || !foundCourse.isPublished) notFound();

  const [course, lessons] = await Promise.all([
    prisma.course.findUnique({ where: { id: foundCourse.id }, select: { id: true, slug: true, title: true, category: true, description: true } }),
    prisma.lesson.findMany({
      where: { courseId: foundCourse.id },
      orderBy: { createdAt: "asc" },
      select: { id: true, title: true, description: true, documentUrl: true, slideUrls: true },
    }),
  ]);
  if (!course) notFound();

  const description = descriptionFor(course);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: course.title,
    description,
    provider: { "@type": "Organization", name: "SkillDuck", url: siteUrl },
    courseCode: course.slug,
    educationalLevel: "Open enrollment",
    hasCourseInstance: {
      "@type": "CourseInstance",
      courseMode: "online",
      inLanguage: "en",
      isAccessibleForFree: true,
    },
    url: `${siteUrl}/course/${course.slug}`,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <main className="course-view seo-course-layout">
        <article className="seo-course-copy">
          <p className="eyebrow">PUBLIC COURSE OVERVIEW</p>
          <h1>{course.title}</h1>
          <section aria-labelledby="course-overview-heading">
            <h2 id="course-overview-heading">Course overview</h2>
            <p>{description}</p>
            <p>Subject area: {String(course.category).toLowerCase().replace(/_/g, " ")}.</p>
            <p>Students may study the published resources at their own pace and take the assessment directly. A certificate is optional and requires passing the assessment, payment submission, and approval.</p>
          </section>
        </article>

        <section className="seo-syllabus" aria-labelledby="study-guide-heading">
          <p className="eyebrow">COURSE MATERIALS</p>
          <h2 id="study-guide-heading">Study guide and lessons</h2>
          {lessons.length ? lessons.map((lesson, index) => (
            <article className="seo-module" key={lesson.id}>
              <h3>{`${index + 1}. ${lesson.title}`}</h3>
              {lesson.description ? <p>{lesson.description}</p> : <p>Open this lesson to review its published course material.</p>}
              <a href={`/course/${course.slug}/lesson/${lesson.id}`}>Open lesson</a>
              {lesson.documentUrl && <a className="resource-link" href={lesson.documentUrl}>Open PDF study material</a>}
              {lesson.slideUrls.filter((url) => url.toLowerCase().endsWith(".pdf")).map((url) => <a className="resource-link" href={url} key={url}>Open lesson PDF</a>)}
            </article>
          )) : <p>Lesson materials for this course are being prepared. Check back for the published study guide.</p>}
        </section>

        <section className="seo-faq" aria-labelledby="course-faq-heading">
          <p className="eyebrow">COURSE DETAILS</p>
          <h2 id="course-faq-heading">Frequently asked questions</h2>
          {courseFaqs.map((faq) => (
            <details key={faq.question}>
              <summary>{faq.question}</summary>
              <p>{faq.answer}</p>
            </details>
          ))}
        </section>

        <CourseView slug={course.slug} />
      </main>
    </>
  );
}