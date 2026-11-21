import { COURSE_PRICE_PKR } from "@/src/lib/pricing";

export interface Course {
  id: string;
  title: string;
  slug: string;
  description: string;
  price: number;
}

export const courses: Course[] = [
  { id: "1", title: "Certified Web Developer", slug: "certified-web-developer", description: "Master modern web development from scratch.", price: COURSE_PRICE_PKR },
  { id: "2", title: "Advanced Python Programming", slug: "advanced-python-programming", description: "Deep dive into advanced python concepts and automation.", price: COURSE_PRICE_PKR },
  { id: "3", title: "Full-Stack React & Node", slug: "full-stack-react-node", description: "Build scalable full-stack applications with React and Node.js.", price: COURSE_PRICE_PKR },
  { id: "4", title: "UI/UX Masterclass", slug: "ui-ux-masterclass", description: "Learn user interface and experience design principles.", price: COURSE_PRICE_PKR }
];

