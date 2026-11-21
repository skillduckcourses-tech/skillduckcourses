export type ExamQuestion = {
  id: string;
  text: string;
  options: string[];
  answer: string;
};

export const exam = {
  id: "web-foundations",
  title: "Web Development Foundations",
  durationSeconds: 15 * 60,
  passingScore: 70,
  questions: [
    { id: "q1", text: "Which HTML element is used for the main page heading?", options: ["<h1>", "<header>", "<title>", "<heading>"], answer: "<h1>" },
    { id: "q2", text: "What does CSS primarily control?", options: ["Database records", "Presentation and layout", "Server memory", "DNS records"], answer: "Presentation and layout" },
    { id: "q3", text: "Which HTTP status means a request succeeded?", options: ["301", "404", "200", "500"], answer: "200" },
    { id: "q4", text: "Which JavaScript keyword creates a block-scoped variable?", options: ["var", "let", "define", "static"], answer: "let" },
    { id: "q5", text: "What is the safest place to validate exam answers?", options: ["Only in the browser", "Only in CSS", "On the server", "In the URL"], answer: "On the server" },
  ] satisfies ExamQuestion[],
};

export function shuffledQuestions(seed: string) {
  return [...exam.questions].sort((left, right) => hash(`${seed}:${left.id}`) - hash(`${seed}:${right.id}`));
}

function hash(value: string) {
  return [...value].reduce((total, character) => (total * 31 + character.charCodeAt(0)) >>> 0, 7);
}