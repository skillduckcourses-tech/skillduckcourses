import { createWriteStream } from "fs";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import type { Prisma } from "@prisma/client";
import PDFDocument from "pdfkit";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/src/lib/server-session";
import { prisma } from "@/src/lib/prisma";
import { youtubeVideoId } from "@/src/lib/youtube";
import { COURSE_PRICE_PKR } from "@/src/lib/pricing";

export const runtime = "nodejs";

const categories = ["MICROSOFT", "AMAZON_ECOMMERCE", "AI_ML", "DIGITAL_MARKETING_SHOPIFY", "MEDICAL_HEALTH", "GYM_FITNESS"] as const;

type GeneratedQuestion = {
  text: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
};

type CurriculumBundle = {
  title?: string;
  description?: string;
  curriculumText?: string;
  questions?: GeneratedQuestion[];
};

type OpenAiResponse = {
  choices?: Array<{ message?: { content?: string } }>;
};

type GeminiResponse = {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
};

function parseSubmittedQuestions(raw: string): GeneratedQuestion[] | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!Array.isArray(parsed) || parsed.length < 10 || parsed.length > 30) return null;
  const questions: GeneratedQuestion[] = [];
  for (const item of parsed) {
    if (!item || typeof item !== "object") return null;
    const question = item as Record<string, unknown>;
    if (
      typeof question.text !== "string" ||
      typeof question.correctAnswer !== "string" ||
      typeof question.explanation !== "string" ||
      !Array.isArray(question.options) ||
      question.options.length !== 4 ||
      question.options.some((option) => typeof option !== "string")
    ) return null;
    const text = question.text.trim();
    const options = question.options.map((option: string) => option.trim());
    const correctAnswer = question.correctAnswer.trim();
    const explanation = question.explanation.trim();
    if (
      !text ||
      text.length > 1000 ||
      options.some((option) => !option || option.length > 300) ||
      new Set(options.map((option) => option.toLowerCase())).size !== 4 ||
      !options.includes(correctAnswer) ||
      explanation.length > 2000
    ) return null;
    questions.push({ text, options, correctAnswer, explanation });
  }
  return new Set(questions.map((question) => question.text.toLowerCase())).size === questions.length ? questions : null;
}

async function saveExamQuestions(
  transaction: Prisma.TransactionClient,
  courseId: number,
  courseTitle: string,
  questions: GeneratedQuestion[],
) {
  const existingExam = await transaction.exam.findFirst({ where: { courseId }, orderBy: { createdAt: "asc" } });
  const exam = existingExam || await transaction.exam.create({
    data: {
      courseId,
      title: `${courseTitle} Certification Assessment`,
      description: `${courseTitle} knowledge check`,
      durationMin: 23,
      passingScore: 70,
      isPublished: true,
    },
  });
  await transaction.exam.update({ where: { id: exam.id }, data: { isPublished: true } });
  await transaction.question.createMany({
    data: questions.map((question) => ({
      examId: exam.id,
      text: question.text,
      options: question.options,
      correctAnswer: question.correctAnswer,
      explanation: question.explanation,
      points: 1,
    })),
  });
}

async function saveUploadedAsset(file: File) {
  if (file.size > 15 * 1024 * 1024) throw new Error(`${file.name} exceeds the 15 MB upload limit.`);
  const extension = path.extname(file.name).toLowerCase();
  const supportedExtensions = new Set([".pdf", ".ppt", ".pptx", ".doc", ".docx", ".png", ".jpg", ".jpeg", ".webp"]);
  if (!supportedExtensions.has(extension)) throw new Error(`${file.name} is not a supported PDF, document, slide, or image file.`);
  const targetDir = path.join(process.cwd(), "public", "uploads", "slides");
  await mkdir(targetDir, { recursive: true });
  const safeName = `${crypto.randomUUID()}${extension}`;
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (extension === ".pdf" && new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-") {
    throw new Error(`${file.name} is not a valid PDF file.`);
  }
  await writeFile(path.join(targetDir, safeName), bytes, { flag: "wx" });
  return `/uploads/slides/${safeName}`;
}

function normalizeCourseCategory(raw: string) {
  return categories.includes(raw as (typeof categories)[number]) ? (raw as (typeof categories)[number]) : null;
}

function slugifyTitle(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function stripMarkdownJson(input: string) {
  return input.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
}

function parseJsonSafely<T>(raw: unknown): T | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    return null;
  }
}

function jsonError(status: number, message: string, metadata: Record<string, unknown> = {}) {
  return NextResponse.json({ success: false, error: message, ...metadata }, { status });
}

function getQuestionBank(courseTitle: string, category: string): GeneratedQuestion[] {
  const modules = [
    "Foundations and strategy",
    "Practical workflow and tools",
    "Measurement and optimization",
    "Risk, compliance, and quality",
    "Case studies and diagnostics",
    "Advanced execution and growth",
  ];

  const bank: GeneratedQuestion[] = [];
  for (let index = 0; index < 30; index += 1) {
    const moduleName = modules[index % modules.length];
    const correctIndex = (index + 1) % 4;
    const options = [
      `Start with the ${moduleName.toLowerCase()} baseline and validate the decision with evidence`,
      `Skip scaffolding and act on the fastest-looking option`,
      `Rely only on anecdotal examples from unrelated tasks`,
      `Delay evaluation until the project is already complete`,
    ];
    const answer = options[correctIndex];
    bank.push({
      text: `${courseTitle}: In a ${category.toLowerCase()} project, which action best supports sustainable execution for the ${moduleName.toLowerCase()} stage?`,
      options,
      correctAnswer: answer,
      explanation: `The most defensible move is to build the baseline, validate evidence, and improve through measurable iteration while staying aligned to the project goal.`,
    });
  }
  return bank;
}

function buildCurriculumText(courseTitle: string, category: string) {
  const modules = [
    "Foundations and positioning",
    "Practical systems and tools",
    "Process design and execution",
    "Quality assurance and feedback",
    "Metrics, analytics, and improvement",
    "Scaling and strategic adaptation",
  ];

  const sectionBuilder: string[] = [];
  for (let moduleIndex = 0; moduleIndex < modules.length; moduleIndex += 1) {
    const moduleTitle = modules[moduleIndex];
    const sectionParts: string[] = [];
    for (let paragraphIndex = 0; paragraphIndex < 12; paragraphIndex += 1) {
      sectionParts.push(
        `In module ${moduleIndex + 1}, ${moduleTitle.toLowerCase()}, learners in ${courseTitle} should approach the subject with evidence, context, and practical accountability. This chapter explains why the work matters in ${category.toLowerCase()} environments, how to connect concepts to real operational decisions, and how to measure progress using repeatable methods. Students should evaluate each step through clear goals, quality checks, and direct application to realistic case scenarios. The emphasis is on building sustainable systems, not memorizing isolated tactics. A disciplined workflow improves execution quality, helps teams communicate better, and reduces costly avoidable mistakes. The learner should document assumptions, test ideas with evidence, and refine the process continuously based on measurable outcomes. This creates a stable learning path that scales beyond a single project and supports professional confidence when decisions are reviewed by peers, clients, or stakeholders.`,
      );
    }
    sectionBuilder.push(`## ${moduleIndex + 1}. ${moduleTitle}\n\n${sectionParts.join("\n\n")}`);
  }

  const conclusion = `\n\n## Final learning outcome\n\n${courseTitle} is designed to produce practical competence, deeper understanding, and measurable confidence in ${category.toLowerCase()} work. Learners should complete each module with working knowledge, not just awareness. They should be able to interpret signals, decide based on evidence, communicate clearly, and apply the method in real projects. This curriculum intentionally balances conceptual clarity with applied execution. Students who complete it will not only understand what to do, but also why it matters, how to defend the decision, and how to improve the process iteratively. The final result is a professional-grade ability to plan, execute, and evaluate outcomes with discipline and confidence.`;

  return `${sectionBuilder.join("\n\n")}${conclusion}`;
}

async function synthesizeCourseBundle(courseTitle: string, category: string, slug: string): Promise<{
  title: string;
  description: string;
  curriculumText: string;
  questions: GeneratedQuestion[];
  wordCount: number;
  slug: string;
}> {
  const prompt = `You are an expert curriculum designer. Create a comprehensive professional curriculum for "${courseTitle}" in the "${category}" domain. Return valid JSON only with keys: "title", "description", "moduleTitles", "curriculumText", "questions". The "curriculumText" must be at least 5000 words and written in polished academic prose. The "questions" value must be an array of 30 objects: {"text":"...","options":["...","...","...","..."],"correctAnswer":"...","explanation":"..."}.`;

  const systemPrompt = "Return strict JSON. Do not wrap it in markdown. Do not include comments or extra prose.";

  let content = buildCurriculumText(courseTitle, category);
  const questionBank = getQuestionBank(courseTitle, category);

  if (process.env.OPENAI_API_KEY) {
    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          temperature: 0.7,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt },
          ],
          response_format: { type: "json_object" },
        }),
      });
      if (response.ok) {
        const rawText = await response.text();
        const json = parseJsonSafely<OpenAiResponse>(rawText);
        const raw = json?.choices?.[0]?.message?.content;
        const parsed = raw ? parseJsonSafely<CurriculumBundle>(stripMarkdownJson(raw)) : null;
        if (parsed?.curriculumText && Array.isArray(parsed.questions) && parsed.questions.length >= 30) {
          content = String(parsed.curriculumText);
          return {
            title: String(parsed.title || courseTitle),
            description: String(parsed.description || `${courseTitle} is a structured, industry-ready learning pathway.`),
            curriculumText: content,
            questions: parsed.questions.slice(0, 30),
            wordCount: content.split(/\s+/).filter(Boolean).length,
            slug,
          };
        }
      }
    } catch (error) {
      console.warn("OpenAI generation failed, falling back to local generation.", error);
    }
  }

  if (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY) {
    try {
      const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(apiKey || "")}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      });
      if (response.ok) {
        const rawText = await response.text();
        const json = parseJsonSafely<GeminiResponse>(rawText);
        const raw = json?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (raw) {
          const parsed = parseJsonSafely<CurriculumBundle>(stripMarkdownJson(raw));
          if (parsed?.curriculumText && Array.isArray(parsed.questions) && parsed.questions.length >= 30) {
            content = String(parsed.curriculumText);
            return {
              title: String(parsed.title || courseTitle),
              description: String(parsed.description || `${courseTitle} is a structured, industry-ready learning pathway.`),
              curriculumText: content,
              questions: parsed.questions.slice(0, 30),
              wordCount: content.split(/\s+/).filter(Boolean).length,
              slug,
            };
          }
        }
      }
    } catch (error) {
      console.warn("Gemini generation failed, falling back to local generation.", error);
    }
  }

  return {
    title: courseTitle,
    description: `${courseTitle} is a structured, practical learning pathway designed for applied skill-building and professional readiness.`,
    curriculumText: content,
    questions: questionBank,
    wordCount: content.split(/\s+/).filter(Boolean).length,
    slug,
  };
}

async function writeGeneratedPdf(outputDir: string, courseTitle: string, curriculumText: string) {
  const fileName = `${slugifyTitle(courseTitle)}-${crypto.randomUUID()}.pdf`;
  const outputPath = path.join(outputDir, fileName);
  const doc = new PDFDocument({ margin: 50, size: "A4" });
  const stream = doc.pipe(createWriteStream(outputPath));

  doc.fontSize(22).text(courseTitle, { align: "left" });
  doc.moveDown();
  doc.fontSize(12).text(curriculumText, {
    align: "justify",
    width: 500,
    lineGap: 5,
  });
  doc.end();

  await new Promise<void>((resolve, reject) => {
    stream.on("finish", () => resolve());
    stream.on("error", reject);
  });

  const totalPages = Math.max(1, Math.ceil(curriculumText.split(/\s+/).filter(Boolean).length / 300));
  return { fileName, documentUrl: `/uploads/pdfs/${fileName}`, totalPages };
}

async function triggerAutonomousCourseGeneration(courseId: number, input: { title: string; category: string; slug: string; description?: string }) {
  try {
    const bundle = await synthesizeCourseBundle(input.title, input.category, input.slug);
    const outputDir = path.join(process.cwd(), "public", "uploads", "pdfs");
    await mkdir(outputDir, { recursive: true });

    const pdf = await writeGeneratedPdf(outputDir, input.title, bundle.curriculumText);

    const computedReadTime = Math.max(600, Math.ceil((bundle.wordCount / 220) * 60));
    const lessonTitle = `${input.title} Core Curriculum`;
    const lessonDescription = input.description || bundle.description || `A structured learning path for ${input.title}.`;

    await prisma.$transaction(async (transaction) => {
      const course = await transaction.course.update({
        where: { id: courseId },
        data: { description: lessonDescription },
        select: { id: true, title: true, slug: true, category: true },
      });

      const existingLesson = await transaction.lesson.findFirst({ where: { courseId: course.id } });
      if (!existingLesson) {
        await transaction.lesson.create({
          data: {
            courseId: course.id,
            title: lessonTitle,
            description: lessonDescription,
            hasVideo: false,
            slideUrls: [pdf.documentUrl],
            documentUrl: pdf.documentUrl,
            isPdfDocument: true,
            pdfPageCount: pdf.totalPages,
            contentWordCount: bundle.wordCount,
            estimatedReadTime: computedReadTime,
          },
        });
      } else {
        await transaction.lesson.update({
          where: { id: existingLesson.id },
          data: {
            title: lessonTitle,
            description: lessonDescription,
            hasVideo: false,
            slideUrls: existingLesson.slideUrls.length ? existingLesson.slideUrls : [pdf.documentUrl],
            documentUrl: existingLesson.documentUrl || pdf.documentUrl,
            isPdfDocument: true,
            pdfPageCount: pdf.totalPages,
            contentWordCount: bundle.wordCount,
            estimatedReadTime: computedReadTime,
          },
        });
      }

      const existingExam = await transaction.exam.findFirst({ where: { courseId: course.id } });
      const exam = existingExam || await transaction.exam.create({
        data: {
          courseId: course.id,
          title: `${input.title} Certification Assessment`,
          description: `${input.title} knowledge check`,
          durationMin: 23,
          passingScore: 70,
          isPublished: true,
        },
      });

      const questionRows = bundle.questions.map((question: GeneratedQuestion, index: number) => ({
        examId: exam.id,
        text: `${question.text} (${index + 1})`,
        options: question.options,
        correctAnswer: question.correctAnswer,
        explanation: question.explanation,
        points: 1,
      }));
      await transaction.question.createMany({ data: questionRows });

      const existingResource = await transaction.resource.findFirst({ where: { courseId: course.id } });
      if (!existingResource) {
        await transaction.resource.create({
          data: {
            courseId: course.id,
            title: `${input.title} Study Guide`,
            category: input.category as (typeof categories)[number],
            contentType: "PDF",
            sourceUrl: pdf.documentUrl,
            uploadedBy: 0,
          },
        });
      }
    });
  } catch (error) {
    console.error(`Course generation failed for ${input.title}:`, error);
  }
}

export async function GET() {
  try {
    if (!await requireAdmin()) return jsonError(403, "Admin access required.");
    const courses = await prisma.course.findMany({ where: { isPublished: true }, orderBy: [{ isTrending: "desc" }, { ranking: "asc" }, { title: "asc" }], select: { id: true, slug: true, title: true, category: true, ranking: true, isTrending: true } });
    return NextResponse.json({ success: true, courses });
  } catch (error) {
    return jsonError(500, error instanceof Error ? error.message : "Unable to load published courses.");
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    if (!admin) return jsonError(403, "Admin access required.");

    const form = await request.formData();
    const existingCourseId = Number(form.get("courseId") || 0);
    const title = String(form.get("title") || "").trim();
    const description = String(form.get("description") || "").trim();
    const category = normalizeCourseCategory(String(form.get("category") || "")) || "AI_ML";
    const slugFromForm = String(form.get("slug") || "").trim();
    const resourceType = String(form.get("resourceType") || "");
    const materialUrl = String(form.get("materialUrl") || "").trim();
    const resourceTitle = String(form.get("resourceTitle") || "").trim();
    const lessonTitle = String(form.get("lessonTitle") || resourceTitle || title || "Lesson").trim();
    const lessonDescription = String(form.get("lessonDescription") || "").trim();
    const estimatedReadTimeRaw = Number(form.get("estimatedReadTime") || 600);
    const estimatedReadTime = Number.isFinite(estimatedReadTimeRaw) ? Math.max(60, Math.round(estimatedReadTimeRaw)) : 600;
    const questions = parseSubmittedQuestions(String(form.get("questions") || ""));
    if (!questions) return jsonError(400, "Add 10 to 30 unique MCQs. Each question must have four unique options and one correct answer.");
    if (resourceType === "URL") {
      try {
        const parsedUrl = new URL(materialUrl);
        if (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") throw new Error();
      } catch {
        return jsonError(400, "Enter a valid http or https lesson material URL.");
      }
    }
    const slideFiles = Array.from(form.getAll("slideFiles")).filter((item): item is File => item instanceof File && item.size > 0);
    if (slideFiles.length > 20) return jsonError(400, "Upload no more than 20 lesson files at once.");
    if (slideFiles.reduce((total, file) => total + file.size, 0) > 50 * 1024 * 1024) return jsonError(400, "The combined lesson upload must be 50 MB or smaller.");
    const slideUrls = await Promise.all(slideFiles.map((file) => saveUploadedAsset(file)));

    if (existingCourseId) {
      const course = await prisma.course.findFirst({ where: { id: existingCourseId, isPublished: true }, select: { id: true, category: true, slug: true, title: true, description: true } });
      if (!course) return jsonError(404, "Select an existing published course.");

      let sourceUrl = "";
      if (resourceType === "YOUTUBE") {
        const videoId = youtubeVideoId(String(form.get("youtubeUrl") || ""));
        if (!videoId) return jsonError(400, "Enter a valid YouTube URL.");
        sourceUrl = `https://www.youtube.com/watch?v=${videoId}`;
      } else if (resourceType === "URL") {
        sourceUrl = materialUrl;
      } else if (resourceType === "PDF") {
        const file = form.get("pdf");
        if (!(file instanceof File) || file.size === 0 || file.size > 15 * 1024 * 1024) return jsonError(400, "Choose a PDF smaller than 15 MB.");
        const bytes = new Uint8Array(await file.arrayBuffer());
        if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-") return jsonError(400, "The uploaded file is not a valid PDF.");
        const safeName = `${crypto.randomUUID()}.pdf`;
        const uploadDir = path.join(process.cwd(), "public", "uploads", "pdfs");
        await mkdir(uploadDir, { recursive: true });
        await writeFile(path.join(uploadDir, safeName), bytes, { flag: "wx" });
        sourceUrl = `/uploads/pdfs/${safeName}`;
      } else if (resourceType === "FILES" && slideUrls.length > 0) {
        // Uploaded lesson files are stored in the lesson's slideUrls.
      } else {
        return jsonError(400, "Add a YouTube link, upload a PDF, or attach slide/document files for this lesson.");
      }

      const lessonData = {
        title: lessonTitle || course.title,
        description: lessonDescription || course.description || null,
        hasVideo: resourceType === "YOUTUBE",
        slideUrls: resourceType === "URL" ? [...slideUrls, sourceUrl] : slideUrls,
        documentUrl: resourceType === "PDF" && sourceUrl ? sourceUrl : null,
        isPdfDocument: resourceType === "PDF" && Boolean(sourceUrl),
        pdfPageCount: resourceType === "PDF" && sourceUrl ? 1 : 1,
        estimatedReadTime: Math.round(estimatedReadTime),
      };

      await prisma.$transaction(async (transaction) => {
        if (sourceUrl && resourceType !== "URL") {
          await transaction.resource.create({
            data: {
              courseId: course.id,
              title: resourceTitle || lessonTitle || course.title,
              category: course.category,
              contentType: resourceType === "YOUTUBE" ? "YOUTUBE" : "PDF",
              sourceUrl,
              uploadedBy: 0,
            },
          });
        }
        if (resourceType === "YOUTUBE" && sourceUrl) {
          const videoId = youtubeVideoId(sourceUrl);
          if (videoId) {
            await transaction.youTubeVideo.create({
              data: {
                courseId: course.id,
                videoId,
                title: resourceTitle || lessonTitle || course.title,
                durationSeconds: 600,
                isPublished: true,
              },
            });
          }
        }
        await transaction.lesson.create({
          data: {
            courseId: course.id,
            ...lessonData,
          },
        });
        await saveExamQuestions(transaction, course.id, course.title, questions);
      });

      return NextResponse.json({ success: true, attached: true, course: { id: course.id, slug: course.slug, title: course.title }, sourceUrl }, { status: 201 });
    }

    if (!title) return jsonError(400, "A course title is required.");
    if (description.length < 20) return jsonError(400, "Add a course overview of at least 20 characters so students know what the course covers.");
    if (!["YOUTUBE", "PDF", "FILES", "URL"].includes(resourceType)) return jsonError(400, "Choose a YouTube video, external material URL, PDF, or slide/document lesson material.");
    if (resourceType === "FILES" && slideUrls.length === 0) return jsonError(400, "Upload at least one slide or document for this lesson.");

    const resolvedSlug = slugifyTitle(slugFromForm || title);
    if (!resolvedSlug) return jsonError(400, "Enter a valid course slug using letters and numbers.");
    const existing = await prisma.course.findUnique({ where: { slug: resolvedSlug } });
    if (existing) return jsonError(409, "A course with this title already exists.");

    let sourceUrl = "";
    if (resourceType === "YOUTUBE") {
      const videoId = youtubeVideoId(String(form.get("youtubeUrl") || ""));
      if (!videoId) return jsonError(400, "Enter a valid YouTube URL.");
      sourceUrl = `https://www.youtube.com/watch?v=${videoId}`;
    }

    if (resourceType === "URL") sourceUrl = materialUrl;

    if (resourceType === "PDF") {
      const file = form.get("pdf");
      if (!(file instanceof File) || file.size === 0 || file.size > 15 * 1024 * 1024) return jsonError(400, "Choose a PDF smaller than 15 MB.");
      const bytes = new Uint8Array(await file.arrayBuffer());
      if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-") return jsonError(400, "The uploaded file is not a valid PDF.");
      const safeName = `${crypto.randomUUID()}.pdf`;
      const uploadDir = path.join(process.cwd(), "public", "uploads", "pdfs");
      await mkdir(uploadDir, { recursive: true });
      await writeFile(path.join(uploadDir, safeName), bytes, { flag: "wx" });
      sourceUrl = `/uploads/pdfs/${safeName}`;
    }

    const generatedDescription = description;

    const lessonData = {
      title: lessonTitle || "Lesson",
      description: lessonDescription || generatedDescription,
      hasVideo: resourceType === "YOUTUBE",
      slideUrls: resourceType === "URL" ? [...slideUrls, sourceUrl] : slideUrls,
      documentUrl: resourceType === "PDF" && sourceUrl ? sourceUrl : null,
      isPdfDocument: resourceType === "PDF" && Boolean(sourceUrl),
      pdfPageCount: resourceType === "PDF" && sourceUrl ? 1 : 1,
      estimatedReadTime: Math.round(estimatedReadTime),
    };

    const course = await prisma.$transaction(async (transaction) => {
      const createdCourse = await transaction.course.create({
        data: {
          slug: resolvedSlug,
          title,
          description: generatedDescription,
          category,
          price: COURSE_PRICE_PKR,
          isPublished: true,
        },
      });
      if (sourceUrl && resourceType !== "URL") {
        await transaction.resource.create({
          data: {
            courseId: createdCourse.id,
            title: resourceTitle || lessonTitle || createdCourse.title,
            category,
            contentType: resourceType === "YOUTUBE" ? "YOUTUBE" : "PDF",
            sourceUrl,
            uploadedBy: 0,
          },
        });
      }
      if (resourceType === "YOUTUBE" && sourceUrl) {
        const videoId = youtubeVideoId(sourceUrl);
        if (videoId) {
          await transaction.youTubeVideo.create({
            data: {
              courseId: createdCourse.id,
              videoId,
              title: resourceTitle || lessonTitle || createdCourse.title,
              durationSeconds: 600,
              isPublished: true,
            },
          });
        }
      }
      await transaction.lesson.create({
        data: {
          courseId: createdCourse.id,
          ...lessonData,
        },
      });
      await saveExamQuestions(transaction, createdCourse.id, createdCourse.title, questions);
      return createdCourse;
    });

    return NextResponse.json({ success: true, course: { id: course.id, slug: course.slug, title: course.title }, sourceUrl, autoGenerated: false }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && (error.message.includes("upload limit") || error.message.includes("supported PDF") || error.message.includes("valid PDF"))) {
      return jsonError(400, error.message);
    }
    return jsonError(500, error instanceof Error ? error.message : "Unable to create course.");
  }
}
