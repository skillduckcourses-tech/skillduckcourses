import { NextResponse } from "next/server";
import { DatabaseConfigurationError, isPrismaConnectionFailure, prisma, prismaErrorDiagnostics } from "@/src/lib/prisma";
import { COURSE_PRICE_PKR } from "@/src/lib/pricing";

export async function GET() {
  try {
    const courses = await prisma.course.findMany({
      where: { isPublished: true },
      orderBy: { title: "asc" },
      select: { slug: true, title: true, category: true },
    });
    return NextResponse.json(
      { courses: courses.map((course) => ({ ...course, price: COURSE_PRICE_PKR })) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const diagnostics = prismaErrorDiagnostics(error);
    console.error("Failed to load the public course catalog.", diagnostics);
    const unavailable = isPrismaConnectionFailure(error) || error instanceof DatabaseConfigurationError;
    return NextResponse.json({
      error: unavailable ? "The course catalog is temporarily unavailable. Please try again shortly." : "Unable to load courses.",
      code: unavailable ? "COURSE_DATABASE_UNAVAILABLE" : "COURSE_CATALOG_ERROR",
    }, { status: unavailable ? 503 : 500, headers: { "Cache-Control": "no-store" } });
  }
}
