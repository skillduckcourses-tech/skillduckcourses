import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { COURSE_PRICE_PKR } from "@/src/lib/pricing";

export async function GET() {
  const courses = await prisma.course.findMany({
    where: { isPublished: true },
    orderBy: { title: "asc" },
    select: { slug: true, title: true, category: true },
  });
  return NextResponse.json({ courses: courses.map((course) => ({ ...course, price: COURSE_PRICE_PKR })) });
}
