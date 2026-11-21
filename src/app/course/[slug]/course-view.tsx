"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { COURSE_PRICE_PKR } from "@/src/lib/pricing";

type LessonData = {
  id: number;
  title: string;
  description: string | null;
  hasVideo: boolean;
  slideUrls: string[];
  documentUrl?: string | null;
  isPdfDocument?: boolean | null;
  estimatedReadTime: number;
};

type CourseData = {
  course: { title: string; description: string | null; category: string; price: number };
  lesson: LessonData | null;
  isPaid: boolean;
  readingOnly: boolean;
  video: { kind: "youtube" | "file"; sourceUrl: string; videoId: string; title: string; durationSeconds: number } | null;
  resources: { id: number; title: string; contentType: "YOUTUBE" | "PDF"; sourceUrl: string }[];
  exam: { id: number; title: string } | null;
  progress: { watchedSeconds: number; readingSeconds: number; points: number; isCompleted: boolean };
  certificate: { verificationHash: string; certificateNo: string; status?: "APPROVED" | "PENDING_APPROVAL" | "REJECTED" | "PASSED" | null } | null;
};

type ExamGate = { canStartExam: boolean; completedLessons: number; totalLessons: number; progressPercent: number };

async function readJsonResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text.trim()) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("The server returned an invalid response. Please refresh and try again.");
  }
}

export default function CourseView({ slug }: { slug: string }) {
  const [data, setData] = useState<CourseData | null>(null);
  const [watched, setWatched] = useState(0);
  const [readingSeconds, setReadingSeconds] = useState(0);
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);
  const [examGate, setExamGate] = useState<ExamGate>({ canStartExam: false, completedLessons: 0, totalLessons: 0, progressPercent: 0 });
  const watchedRef = useRef(0);
  const readingRef = useRef(0);
  const router = useRouter();

  useEffect(() => {
    fetch(`/api/courses/${slug}`)
      .then(async (response) => {
        const body = await readJsonResponse<Partial<CourseData> & { error?: string }>(response);
        if (!response.ok || !body.course) throw new Error(body.error || "Course could not be loaded.");
        return body as CourseData;
      })
      .then((courseData) => {
        setData(courseData);
        if (typeof courseData.progress?.watchedSeconds === "number") {
          setWatched(Math.min(courseData.video?.durationSeconds || 600, courseData.progress.watchedSeconds));
        }
        if (typeof courseData.progress?.readingSeconds === "number") {
          setReadingSeconds(Math.min(courseData.lesson?.estimatedReadTime || 600, courseData.progress.readingSeconds));
        }
      })
      .catch((loadError: unknown) => setError(loadError instanceof Error ? loadError.message : "Course could not be loaded."));
  }, [slug]);

  useEffect(() => {
    watchedRef.current = watched;
    readingRef.current = readingSeconds;
  }, [watched, readingSeconds]);

  useEffect(() => {
    if (!data) return;
    let active = true;
    void fetch(`/api/courses/${slug}/progress`)
      .then(async (response) => {
        if (!response.ok) return;
        const progress = await readJsonResponse<{ watchedSeconds?: number; readingSeconds?: number; canStartExam?: boolean; completedLessons?: number; totalLessons?: number; progressPercent?: number }>(response);
        if (!active) return;
        if (typeof progress.watchedSeconds === "number") setWatched(Math.min(data.video?.durationSeconds || 600, progress.watchedSeconds));
        if (typeof progress.readingSeconds === "number") setReadingSeconds(Math.min(data.lesson?.estimatedReadTime || 600, progress.readingSeconds));
        setExamGate({ canStartExam: Boolean(progress.canStartExam), completedLessons: progress.completedLessons || 0, totalLessons: progress.totalLessons || 0, progressPercent: progress.progressPercent || 0 });
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, [data, slug]);

  useEffect(() => {
    if (!data?.video) return;
    const interval = window.setInterval(() => {
      setWatched((current) => Math.min(data.video?.durationSeconds || 600, current + 1));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [data?.video]);

  useEffect(() => {
    if (!data?.readingOnly && !data?.lesson) return;
    const interval = window.setInterval(() => {
      if (document.hidden) return;
      setReadingSeconds((current) => Math.min(data.lesson?.estimatedReadTime || 600, current + 1));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [data?.readingOnly, data?.lesson]);

  useEffect(() => {
    if (!data?.video && !data?.readingOnly && !data?.lesson) return;
    const saveProgress = () => {
      void fetch(`/api/courses/${slug}/progress`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ watchedSeconds: watchedRef.current, readingSeconds: readingRef.current }),
        keepalive: true,
      }).then(async (response) => {
        if (!response.ok) return;
        const body = await readJsonResponse<{ isCompleted?: boolean; readingSeconds?: number; points?: number; certificate?: { verificationHash: string; certificateNo: string } | null }>(response);
        if (body.isCompleted || body.certificate) {
          setData((current) => current ? {
            ...current,
            progress: {
              ...current.progress,
              watchedSeconds: watchedRef.current,
              readingSeconds: body.readingSeconds ?? readingRef.current,
              points: body.points ?? current.progress.points,
              isCompleted: Boolean(body.isCompleted || current.progress.isCompleted),
            },
            certificate: body.certificate || current.certificate,
          } : current);
        }
      });
    };

    const interval = window.setInterval(saveProgress, 5000);
    window.addEventListener("pagehide", saveProgress);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("pagehide", saveProgress);
    };
  }, [data, slug]);

  useEffect(() => {
    const block = (event: ClipboardEvent | MouseEvent) => event.preventDefault();
    document.addEventListener("contextmenu", block);
    document.addEventListener("copy", block);
    document.addEventListener("cut", block);
    document.addEventListener("paste", block);
    return () => {
      document.removeEventListener("contextmenu", block);
      document.removeEventListener("copy", block);
      document.removeEventListener("cut", block);
      document.removeEventListener("paste", block);
    };
  }, []);

  async function startExam() {
    if (!data) return;
    const certificateHash = data.certificate?.verificationHash;
    if (data.progress.isCompleted || data.certificate) {
      if (data.certificate?.status === "APPROVED" && certificateHash) {
        router.push(`/certificates/${certificateHash}`);
        return;
      }
      if (!data.certificate && data.progress.isCompleted) {
        router.push(`/checkout?course=${encodeURIComponent(slug)}`);
        return;
      }
      setError("This course is already completed and cannot be retested. Payment approval is still pending.");
      return;
    }
    setStarting(true);
    await fetch(`/api/courses/${slug}/progress`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ watchedSeconds: watched, readingSeconds }),
    });
    const response = await fetch(`/api/courses/${slug}/watch`, { method: "POST" });
    const body = await readJsonResponse<{ error?: string; completed?: boolean; certificateHash?: string; examId?: number }>(response);
    if (!response.ok) {
      setError(body.error || "The course route could not be loaded.");
      setStarting(false);
      return;
    }
    if (body.completed) {
      if (body.certificateHash) router.push(`/certificates/${body.certificateHash}`);
      else setError("This course is already completed.");
      setStarting(false);
      return;
    }
    router.push(`/exam?examId=${body.examId}`);
  }

  if (!data) return <section className="course-view" aria-live="polite"><p>{error || "Loading course..."}</p></section>;
  if (!data.course) return <section className="course-view"><p className="login-error">Course details are unavailable.</p></section>;

  const duration = data.video?.durationSeconds || data.lesson?.estimatedReadTime || 600;
  const activeSeconds = Math.max(watched, readingSeconds);
  const eligible = examGate.canStartExam;
  const pdfResources = data.resources.filter((resource) => resource.contentType === "PDF");
  const generatedDocumentUrl = data.lesson?.isPdfDocument ? data.lesson.documentUrl || pdfResources[0]?.sourceUrl || null : null;
  const certificateStatus = data.certificate?.status || (data.progress.isCompleted ? "PASSED" : null);
  const certificateHash = data.certificate?.verificationHash ?? null;
  const isCourseCompleted = Boolean(data.progress.isCompleted || certificateStatus);
  const primaryActionLabel = certificateStatus === "APPROVED" ? "View Certificate" : certificateStatus === "PENDING_APPROVAL" ? "Payment Pending Approval" : isCourseCompleted ? "Pay & Unlock Certificate" : eligible ? "Proceed to MCQ test" : "Review 80% of each lesson to unlock";
  const primaryActionDisabled = certificateStatus === "APPROVED" || certificateStatus === "PENDING_APPROVAL" || (!eligible && !isCourseCompleted);

  return (
    <section className="course-view" aria-label="Course learning and assessment">
      <p className="eyebrow">{data.course.category}</p>
      <p className="course-price">PKR {COURSE_PRICE_PKR} course fee</p>

      {isCourseCompleted && (
        <div className="completion-banner">
          <strong>Course completed</strong>
          <span>{certificateStatus === "APPROVED" ? "Your certificate is approved and live." : certificateStatus === "PENDING_APPROVAL" ? "Your payment is pending approval." : "This course has already been completed and is locked from retesting."}</span>
          {certificateStatus === "APPROVED" && certificateHash ? (
            <button className="course-action" onClick={() => router.push(`/certificates/${certificateHash}`)}>
              View certificate
            </button>
          ) : null}
        </div>
      )}

      <details className="syllabus-preview">
        <summary>
          Preview syllabus <span>6 modules / practical pathway</span>
        </summary>
        <ol>
          <li>Foundations and vocabulary</li>
          <li>Tools, workflows, and setup</li>
          <li>Applied practice and case studies</li>
          <li>Quality, safety, and professional standards</li>
          <li>Assessment preparation</li>
          <li>Next-step career project</li>
        </ol>
      </details>

      {data.lesson ? (
        <section className="lesson-summary">
          <h2>{data.lesson.title}</h2>
          {data.lesson.description ? <p>{data.lesson.description}</p> : null}
          <div className="lesson-meta">
            <span>{data.lesson.hasVideo ? "Video lesson" : "Slide lesson"}</span>
            <span>{data.lesson.slideUrls.length} slide(s)</span>
            <span>{data.lesson.estimatedReadTime}s target</span>
          </div>
          <button type="button" className="course-action" onClick={() => router.push(`/course/${slug}/lesson/${data.lesson?.id}`)}>
            Open lesson
          </button>
        </section>
      ) : null}

      {data.video ? (
        <>
          <div className="video-frame">
            {data.video.kind === "youtube" ? (
              <iframe
                title={data.video.title}
                src={data.video.sourceUrl}
                loading="lazy"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <video controls preload="metadata" src={data.video.sourceUrl} title={data.video.title} />
            )}
          </div>
          <div className="watch-progress">
            <span style={{ width: `${Math.min(100, (activeSeconds / duration) * 100)}%` }} />
          </div>
          <p className="watch-status">{Math.floor((activeSeconds / duration) * 100)}% watched. You can take the assessment whenever you are ready.</p>
        </>
      ) : data.lesson && ((data.lesson.slideUrls.length > 0) || generatedDocumentUrl) ? (
        <div className="slide-preview">
          {generatedDocumentUrl ? (
            <div className="pdf-reader">
              <iframe title="Generated course PDF" src={generatedDocumentUrl} loading="lazy" />
            </div>
          ) : data.lesson.slideUrls.slice(0, 3).map((url, index) => (
            <div className="slide-card" key={`${url}-${index}`}>
              {url.toLowerCase().endsWith(".pdf") ? (
                <embed src={url} title={`Slide ${index + 1}`} />
              ) : /\.(png|jpe?g|webp)$/i.test(url) ? (
                <img src={url} alt={`Slide ${index + 1}`} loading="lazy" decoding="async" />
              ) : <a className="resource-link" href={url}>Download lesson file {index + 1}</a>}
            </div>
          ))}
        </div>
      ) : data.readingOnly ? (
        <>
          <div className="pdf-reader">
            <iframe title="Course reading material" src={pdfResources[0]?.sourceUrl} loading="lazy" />
          </div>
          <div className="watch-progress">
            <span style={{ width: `${Math.min(100, (readingSeconds / duration) * 100)}%` }} />
          </div>
          <p className="watch-status">{Math.floor((readingSeconds / duration) * 100)}% reading progress  /  {Math.floor(readingSeconds / 60)} points earned</p>
        </>
      ) : (
        <p className="login-error">This course has no assigned learning module yet.</p>
      )}

      {error ? <p className="login-error">{error}</p> : null}

      <button type="button" className="course-action" onClick={startExam} disabled={starting || !eligible || primaryActionDisabled}>
        {starting ? "Starting exam..." : primaryActionLabel}
      </button>
      <p className="watch-status">
        Review at least 80% of every lesson to unlock the final assessment. {examGate.completedLessons} of {examGate.totalLessons} lessons complete ({examGate.progressPercent}% overall). After passing, submit certificate payment for admin verification.
      </p>
    </section>
  );
}
