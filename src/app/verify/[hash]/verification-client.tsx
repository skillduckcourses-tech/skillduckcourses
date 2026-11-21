"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import CertificateCard from "@/src/app/certificates/certificate-card";

type Verification = { valid: boolean; status?: string; certificateNo?: string; verificationHash?: string; issuedTo?: string; course?: string; issuedAt?: string; error?: string };

export default function VerificationClient({ hash }: { hash: string }) {
  const [result, setResult] = useState<Verification | null>(null);
  useEffect(() => { fetch(`/api/certificates/verify/${encodeURIComponent(hash)}`).then(async (response) => setResult(await response.json())).catch(() => setResult({ valid: false, error: "Verification service unavailable." })); }, [hash]);
  if (!result) return <main className="verify-shell"><p>Checking certificate...</p></main>;
  return <main className="verify-shell"><p className="eyebrow">CERTIFICATE VERIFICATION</p><h1>{result.valid ? "Certificate verified" : "Certificate not found"}</h1>{result.valid && result.certificateNo && result.verificationHash && result.issuedTo && result.course && result.issuedAt ? <CertificateCard certificate={{ certificateNo: result.certificateNo, verificationHash: result.verificationHash, issuedTo: result.issuedTo, course: result.course, issuedAt: result.issuedAt, status: result.status }} /> : <p>{result.error || (result.status === "expired" ? "This certificate has expired." : "This certificate hash is not valid.")}</p>}<Link className="text-link" href="/">Return home</Link></main>;
}