import { prisma } from "@/src/lib/prisma";

export function courseCategoryLabel(category: string) {
  return {
    MICROSOFT: "Microsoft Free Fundamentals & Productivity",
    AMAZON_ECOMMERCE: "Amazon E-Commerce & FBA Mastery",
    AI_ML: "Artificial Intelligence & Machine Learning Engineering",
    DIGITAL_MARKETING_SHOPIFY: "Digital Marketing & Shopify Growth",
    MEDICAL_HEALTH: "Medical & Healthcare",
    GYM_FITNESS: "Gym & Physical Fitness",
  }[category] || category;
}

export async function findCourse(identifier: string) {
  const decoded = decodeURIComponent(identifier).trim();
  const numericId = Number.parseInt(decoded, 10);
  if (Number.isSafeInteger(numericId) && String(numericId) === decoded) {
    const courseById = await prisma.course.findUnique({ where: { id: numericId } });
    if (courseById) return courseById;
  }
  return prisma.course.findUnique({ where: { slug: decoded.toLowerCase() } });
}