"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

type Question = { id: string; text: string; options: string[] };
type Result = { score: number; passed: boolean; timedOut: boolean; warnings: number; certificateEligible: boolean; paymentRequired: boolean; courseSlug?: string | null; certificate?: { verificationHash: string; certificateNo: string; issuedTo: string } | null };

const MAX_WARNINGS = 3;

export default function ExamClient() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [examTitle, setExamTitle] = useState("Live assessment");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [warnings, setWarnings] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(true);
  const submitting = useRef(false);
  const examId = useSearchParams().get("examId") || "";

  const submit = useCallback(async (timedOut = false, warningCount = warnings) => {
    if (submitting.current) return;
    submitting.current = true;
    const response = await fetch(`/api/exams/${examId}/submit`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ answers, timedOut, warnings: warningCount }),
    });
    if (response.ok) setResult((await response.json()) as Result);
  }, [answers, warnings, examId]);

  useEffect(() => {
    if (!examId) return;
    fetch(`/api/exams/${examId}`)
      .then((response) => response.json())
      .then((data: { title?: string; questions: Question[]; durationSeconds: number }) => {
        setExamTitle(data.title || "Live assessment");
        setQuestions(data.questions);
        setSecondsLeft(data.durationSeconds);
        setLoading(false);
      });
  }, [examId]);

  useEffect(() => {
    if (loading || result || secondsLeft <= 0) return;
    const timer = window.setInterval(() => setSecondsLeft((value) => {
      if (value <= 1) {
        void submit(true);
        return 0;
      }
      return value - 1;
    }), 1000);
    return () => window.clearInterval(timer);
  }, [loading, result, secondsLeft, submit]);

  useEffect(() => {
    if (loading || result) return;
    const warn = () => {
      setWarnings((current) => {
        const next = current + 1;
        if (next >= MAX_WARNINGS) void submit(false, next);
        return next;
      });
    };
    const blockMenu = (event: MouseEvent) => { event.preventDefault(); warn(); };
    const blockClipboard = (event: ClipboardEvent) => { event.preventDefault(); warn(); };
    const onVisibility = () => { if (document.hidden) warn(); };
    document.addEventListener("contextmenu", blockMenu);
    document.addEventListener("copy", blockClipboard);
    document.addEventListener("cut", blockClipboard);
    document.addEventListener("paste", blockClipboard);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("contextmenu", blockMenu);
      document.removeEventListener("copy", blockClipboard);
      document.removeEventListener("cut", blockClipboard);
      document.removeEventListener("paste", blockClipboard);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [loading, result, submit]);

  if (loading) return <main className="exam-shell"><p>Preparing your examination...</p></main>;
  if (result) {
    return <main className="exam-shell result"><p className="eyebrow">SESSION CLOSED</p><h1>{result.passed ? "Assessment passed" : "Assessment submitted"}</h1><div className="score">{result.score}<span>/100</span></div><p>{result.timedOut ? "Your answers were submitted automatically when the timer ended." : result.warnings >= MAX_WARNINGS ? "The session was locked after three proctoring warnings." : "Your answers have been recorded."}</p>{result.passed && result.paymentRequired ? <div className="result-actions"><p>Excellent work. Your certificate is ready to unlock — complete the payment step to receive the official verified credential.</p><Link className="submit-button" href={result.courseSlug ? `/checkout?course=${encodeURIComponent(result.courseSlug)}` : "/checkout"}>Unlock certificate & pay</Link><Link className="text-link" href="/dashboard">Go to dashboard</Link></div> : result.certificate ? <div className="result-actions"><Link className="submit-button" href={`/certificates/${encodeURIComponent(result.certificate.verificationHash)}`}>View certificate</Link><Link className="text-link" href="/dashboard">Go to dashboard</Link></div> : <div className="result-actions"><Link className="submit-button" href="/dashboard">Go to dashboard</Link></div>}<Link className="text-link" href="/">Return home</Link></main>;
  }

  const minutes = Math.floor(secondsLeft / 60).toString().padStart(2, "0");
  const seconds = (secondsLeft % 60).toString().padStart(2, "0");
  return <main className="exam-shell"><header className="exam-header"><div><p className="eyebrow">LIVE ASSESSMENT</p><h1>{examTitle}</h1></div><div className={`timer ${secondsLeft < 60 ? "urgent" : ""}`} aria-live="polite"><span>TIME REMAINING</span>{minutes}:{seconds}</div></header><div className="proctor-bar">PROCTORING ACTIVE <span>{warnings}/{MAX_WARNINGS} warnings</span></div><section className="questions">{questions.map((question, index) => <fieldset className="question" key={question.id}><legend><span>{String(index + 1).padStart(2, "0")}</span>{question.text}</legend>{question.options.map((option) => <label className="option" key={option}><input type="radio" name={question.id} checked={answers[question.id] === option} onChange={() => setAnswers((current) => ({ ...current, [question.id]: option }))} />{option}</label>)}</fieldset>)}</section><button className="submit-button" onClick={() => void submit()}>Submit examination <span aria-hidden="true">-&gt;</span></button></main>;
}