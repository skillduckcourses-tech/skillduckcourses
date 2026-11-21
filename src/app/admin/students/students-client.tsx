"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type StudentRecord = {
  userName: string;
  email: string;
  courseTitle: string;
  score: number;
  completedAt: string;
  certificateNo: string;
  verificationHash: string;
  verificationUrl: string;
  progressPercent: number;
  status: "PASSED" | "CERTIFIED";
};

export default function AdminStudentsClient() {
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [error, setError] = useState("");

  async function load() {
    const response = await fetch("/api/admin/students");
    if (!response.ok) {
      setError("Unable to load certified student activity.");
      return;
    }
    const body = (await response.json()) as { students?: StudentRecord[]; error?: string };
    if (body.error) {
      setError(body.error);
      return;
    }
    setStudents(body.students || []);
    setError("");
  }

  useEffect(() => {
    const initial = window.setTimeout(() => void load(), 0);
    const refresh = window.setInterval(() => void load(), 15000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(refresh);
    };
  }, []);

  return (
    <main className="admin-shell">
      <p className="eyebrow">STUDENT TRACKING</p>
      <h1>Certified learners.</h1>
      <p className="admin-copy">Every learner with 100% completion and a passing exam is listed here with their verification link and completion time.</p>
      {error && <p className="login-error">{error}</p>}
      <section className="admin-ticket-list">
        {students.length === 0 ? (
          <p>No certified students yet.</p>
        ) : (
          students.map((student) => (
            <article className="admin-ticket" key={`${student.email}-${student.courseTitle}`}>
              <div>
                <p className="course-category">{student.status} / {student.progressPercent}% complete</p>
                <h2>{student.userName || student.email}</h2>
                <p>{student.email}</p>
                <p><strong>Course:</strong> {student.courseTitle}</p>
                <p><strong>Score:</strong> {student.score}%</p>
                <p><strong>Completed:</strong> {new Date(student.completedAt).toLocaleString()}</p>
                <p><strong>Certificate:</strong> {student.certificateNo}</p>
                <p>
                  <Link className="text-link" href={student.verificationUrl}>Open verification link</Link>
                </p>
              </div>
            </article>
          ))
        )}
      </section>
    </main>
  );
}
