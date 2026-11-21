import { pageMetadata } from "@/src/lib/seo";
import VerificationClient from "./verification-client";

export const metadata = pageMetadata("Certificate Verification", "Check a SkillDuck certificate’s verification status.", "/verify", true);

export default async function VerifyPage({ params }: { params: Promise<{ hash: string }> }) {
  return <VerificationClient hash={(await params).hash} />;
}