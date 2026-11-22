"use client";

import { useEffect, useMemo, useState } from "react";
import { COURSE_PRICE_PKR } from "@/src/lib/pricing";

const categories = [["MICROSOFT", "Computer Science / Microsoft"], ["AMAZON_ECOMMERCE", "Amazon E-Commerce"], ["AI_ML", "AI & Machine Learning"], ["DIGITAL_MARKETING_SHOPIFY", "Digital Marketing & Shopify"], ["MEDICAL_HEALTH", "Medical & Healthcare"], ["GYM_FITNESS", "Gym & Fitness"]] as const;
type QuestionDraft = { text: string; options: [string, string, string, string]; correctIndex: number; explanation: string };
type PublishedCourse = { id: number; title: string; slug: string; category: string };
const emptyQuestion = (): QuestionDraft => ({ text: "", options: ["", "", "", ""], correctIndex: 0, explanation: "" });

async function readJsonResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text.trim()) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("The server returned an invalid JSON response. Please try again.");
  }
}

export default function NewCourseForm({ defaultMode = "existing" }: { defaultMode?: "new" | "existing" }) {
  const [resourceType, setResourceType] = useState("YOUTUBE");
  const [mode, setMode] = useState<"new" | "existing">(defaultMode);
  const [questions, setQuestions] = useState<QuestionDraft[]>(Array.from({ length: 10 }, emptyQuestion));
  const [courseId, setCourseId] = useState("");
  const [courseQuery, setCourseQuery] = useState("");
  const [courses, setCourses] = useState<PublishedCourse[]>([]);
  const [courseLoading, setCourseLoading] = useState(true);
  const [courseLoadError, setCourseLoadError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    void fetch("/api/admin/courses", { cache: "no-store" })
      .then(async (response) => {
        const body = await readJsonResponse<{ courses?: PublishedCourse[]; error?: string }>(response);
        if (!response.ok) throw new Error(body.error || "The course list could not be loaded.");
        if (!Array.isArray(body.courses)) throw new Error("The course catalog returned an invalid response.");
        if (active) setCourses(body.courses);
      })
      .catch((loadError: unknown) => {
        if (active) setCourseLoadError(loadError instanceof Error ? loadError.message : "The course list could not be loaded.");
      })
      .finally(() => {
        if (active) setCourseLoading(false);
      });
    return () => { active = false; };
  }, []);

  const visibleCourses = useMemo(
    () =>
      courses
        .filter((course) => `${course.title} ${course.slug} ${course.category}`.toLowerCase().includes(courseQuery.toLowerCase()))
        .slice(0, 8),
    [courses, courseQuery],
  );

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    if (questions.length < 10 || questions.length > 30 || questions.some((question) =>
      !question.text.trim() ||
      question.options.some((option) => !option.trim()) ||
      new Set(question.options.map((option) => option.trim().toLowerCase())).size !== 4
    )) {
      setMessage("Complete 10–30 questions with four distinct answer choices each.");
      return;
    }
    setLoading(true);
    setMessage("");
    const formData = new FormData(form);
    formData.set("questions", JSON.stringify(questions.map((question) => ({
      text: question.text.trim(),
      options: question.options.map((option) => option.trim()),
      correctAnswer: question.options[question.correctIndex].trim(),
      explanation: question.explanation.trim(),
    }))));
    try {
      const response = await fetch("/api/admin/courses", { method: "POST", body: formData });
      const body = await readJsonResponse<{ course?: { title?: string }; error?: string }>(response);
      if (!response.ok) throw new Error(body.error || "The course could not be published.");
      setMessage(`Published ${body.course?.title || "course"} with ${questions.length} assessment questions.`);
      form.reset();
      setQuestions(Array.from({ length: 10 }, emptyQuestion));
    } catch (submitError) {
      setMessage(submitError instanceof Error ? submitError.message : "The course could not be published.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="admin-form course-create-form" onSubmit={submit}>
      <div className="resource-toggle">
        <button type="button" className={mode === "existing" ? "active" : ""} onClick={() => setMode("existing")}>
          Attach to published course
        </button>
        <button type="button" className={mode === "new" ? "active" : ""} onClick={() => setMode("new")}>
          Create new course
        </button>
      </div>

      <details className="admin-course-catalog" open>
        <summary>
          <span>Published course catalog</span>
          <strong>{courseLoading ? "Loading..." : courseLoadError ? "Unavailable" : `${courses.length} courses`}</strong>
        </summary>
        {courseLoadError ? (
          <p className="login-error" role="alert">{courseLoadError}</p>
        ) : courseLoading ? (
          <p>Loading published courses...</p>
        ) : courses.length === 0 ? (
          <p>No published courses were found in this database. Create a course here or seed the intended database.</p>
        ) : (
          <ul>
            {courses.map((course) => <li key={course.id}>{course.title}<small>{course.category} / {course.slug}</small></li>)}
          </ul>
        )}
      </details>

      {mode === "existing" ? (
        <label>
          Search published courses
          <input
            value={courseQuery}
            onChange={(event) => {
              setCourseQuery(event.target.value);
              setCourseId("");
            }}
            placeholder="Search by course title or slug"
            required
          />
          {courseQuery && !courseId && !courseLoading && !courseLoadError && (
            <span className="course-autocomplete admin-course-picker">
              {visibleCourses.map((course) => (
                <button
                  type="button"
                  key={course.id}
                  onClick={() => {
                    setCourseId(String(course.id));
                    setCourseQuery(course.title);
                  }}
                >
                  {course.title}
                  <small>
                    {course.category} / {course.slug}
                  </small>
                </button>
              ))}
              {visibleCourses.length === 0 && <span>No published course matches.</span>}
            </span>
          )}
          <input type="hidden" name="courseId" value={courseId} />
        </label>
      ) : (
        <>
          <label>
            Course title
            <input name="title" placeholder="Clinical Nutrition Foundations" required />
          </label>
          <label>
            Slug
            <input name="slug" placeholder="clinical-nutrition-foundations" />
          </label>
          <label>
            Description
            <textarea name="description" placeholder="Explain what students will learn, the topics covered, and the intended outcomes." rows={5} required minLength={20} />
          </label>
          <label>
            Category
            <select name="category" defaultValue="MEDICAL_HEALTH">
              {categories.map(([value, label]) => (
                <option value={value} key={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </>
      )}

      <label>
        Lesson title
        <input name="lessonTitle" placeholder="Week 1 lesson" />
      </label>
      <label>
        Lesson description
        <textarea name="lessonDescription" placeholder="What should the student learn in this lesson?" rows={4} />
      </label>

      <label>
        Lesson viewing target (seconds)
        <input type="number" name="estimatedReadTime" min={60} step={30} defaultValue={600} />
      </label>

      <label>
        Resource title
        <input name="resourceTitle" placeholder="Week 1 study resource" />
      </label>

      <fieldset>
        <legend>Lesson material</legend>
        <div className="resource-toggle">
          <button type="button" className={resourceType === "YOUTUBE" ? "active" : ""} onClick={() => setResourceType("YOUTUBE")}>
              Video URL
            </button>
            <button type="button" className={resourceType === "URL" ? "active" : ""} onClick={() => setResourceType("URL")}>
              Material URL
          </button>
          <button type="button" className={resourceType === "PDF" ? "active" : ""} onClick={() => setResourceType("PDF")}>
            Single PDF
          </button>
          <button type="button" className={resourceType === "FILES" ? "active" : ""} onClick={() => setResourceType("FILES")}>
            Slides / documents
          </button>
        </div>
        <input type="hidden" name="resourceType" value={resourceType} />

        {resourceType === "YOUTUBE" ? (
          <label>
            Video URL (YouTube)
            <input name="youtubeUrl" placeholder="https://www.youtube.com/watch?v=..." required />
          </label>
        ) : resourceType === "URL" ? (
          <label>
            Material URL (http or https)
            <input name="materialUrl" type="url" placeholder="https://example.com/course-material" required />
          </label>
        ) : resourceType === "PDF" ? (
          <label>
            Upload PDF
            <input type="file" name="pdf" accept="application/pdf,.pdf" required />
          </label>
        ) : <p className="admin-copy">Upload one or more files below to make this lesson available to students.</p>}
      </fieldset>

      <label>
        Upload slides or documents (PDF, PowerPoint, Word, or images)
        <input type="file" name="slideFiles" accept=".pdf,.ppt,.pptx,.doc,.docx,.png,.jpg,.jpeg,.webp,application/pdf,image/*" multiple={resourceType !== "PDF"} required={resourceType === "FILES"} />
      </label>

      <p className="admin-copy">New courses are priced at PKR {COURSE_PRICE_PKR}. Each submission publishes one lesson on the selected course. Add further lessons by submitting another lesson with that course selected.</p>

      <fieldset className="mcq-builder">
        <legend>Assessment questions <span>10–30 required</span></legend>
        <p className="admin-copy">Questions and answer keys are stored with the course assessment. The correct answer is not shown to students.</p>
        {questions.map((question, questionIndex) => (
          <article className="mcq-question-editor" key={questionIndex}>
            <div className="mcq-question-heading">
              <strong>Question {questionIndex + 1}</strong>
              {questions.length > 10 ? <button type="button" onClick={() => setQuestions((current) => current.filter((_, index) => index !== questionIndex))}>Remove</button> : null}
            </div>
            <label>
              Question
              <textarea value={question.text} maxLength={1000} rows={2} required onChange={(event) => setQuestions((current) => current.map((item, index) => index === questionIndex ? { ...item, text: event.target.value } : item))} />
            </label>
            <div className="mcq-options-grid">
              {question.options.map((option, optionIndex) => (
                <label key={optionIndex}>
                  Option {String.fromCharCode(65 + optionIndex)}
                  <input value={option} maxLength={300} required onChange={(event) => setQuestions((current) => current.map((item, index) => {
                    if (index !== questionIndex) return item;
                    const nextOptions = [...item.options] as QuestionDraft["options"];
                    nextOptions[optionIndex] = event.target.value;
                    return { ...item, options: nextOptions };
                  }))} />
                </label>
              ))}
            </div>
            <label>
              Correct answer
              <select value={question.correctIndex} onChange={(event) => setQuestions((current) => current.map((item, index) => index === questionIndex ? { ...item, correctIndex: Number(event.target.value) } : item))}>
                {question.options.map((_, optionIndex) => <option value={optionIndex} key={optionIndex}>Option {String.fromCharCode(65 + optionIndex)}</option>)}
              </select>
            </label>
            <label>
              Explanation (optional)
              <textarea value={question.explanation} maxLength={2000} rows={2} onChange={(event) => setQuestions((current) => current.map((item, index) => index === questionIndex ? { ...item, explanation: event.target.value } : item))} />
            </label>
          </article>
        ))}
        <button type="button" className="mcq-add-button" disabled={questions.length >= 30} onClick={() => setQuestions((current) => [...current, emptyQuestion()])}>Add a question</button>
      </fieldset>

      {message ? <p className="admin-message">{message}</p> : null}
      <button type="submit" disabled={loading}>
        {loading ? "Publishing..." : mode === "new" ? "Publish course & assessment" : "Publish lesson & MCQs"}
      </button>
    </form>
  );
}
