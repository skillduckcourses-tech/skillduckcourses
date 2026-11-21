"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import QRCode from "qrcode";

export type CertificateView = {
  certificateNo: string;
  verificationHash: string;
  issuedTo: string;
  course: string;
  issuedAt: string;
  status?: string;
};

function displayDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

function CornerFlourish({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 90 90" aria-hidden="true" focusable="false">
      <path d="M5 84C18 62 20 33 7 8c25 13 54 11 76-2-13 22-15 51-2 76C56 69 27 71 5 84Z" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M15 75C31 58 34 37 17 18c20 17 41 14 59-2-16 18-19 39-2 59-19-17-40-14-59 0Z" fill="none" stroke="currentColor" strokeWidth="1" />
      <circle cx="45" cy="45" r="3" fill="currentColor" />
    </svg>
  );
}

function OfficialSeal() {
  return (
    <div className="diploma-seal" role="img" aria-label="SkillDuck verified credential official seal">
      <span className="diploma-seal-ring diploma-seal-ring-outer" />
      <span className="diploma-seal-ring diploma-seal-ring-inner" />
      <span className="diploma-seal-top">SKILLDUCK</span>
      <span className="diploma-seal-bottom">VERIFIED CREDENTIAL • AUTHENTIC</span>
      <span className="diploma-seal-center"><span>★</span><strong>✓</strong></span>
      <span className="diploma-seal-dot diploma-seal-dot-left">✦</span>
      <span className="diploma-seal-dot diploma-seal-dot-right">✦</span>
    </div>
  );
}

export default function CertificateCard({ certificate, preview = false }: { certificate: CertificateView; preview?: boolean }) {
  const [isMounted, setIsMounted] = useState(false);
  const [qrCode, setQrCode] = useState("");
  const verificationUrl = typeof window === "undefined"
    ? `/certificates/${encodeURIComponent(certificate.verificationHash)}`
    : `${window.location.origin}/certificates/${encodeURIComponent(certificate.verificationHash)}`;

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    let active = true;
    void QRCode.toDataURL(verificationUrl, { margin: 1, width: 240, errorCorrectionLevel: "H", color: { dark: "#0f172a", light: "#ffffff" } })
      .then((url) => { if (active) setQrCode(url); })
      .catch(() => { if (active) setQrCode(""); });
    return () => { active = false; };
  }, [verificationUrl]);

  if (!isMounted) return null;

  return (
    <section className="diploma-stage" aria-label="SkillDuck certificate of achievement">
      <article className="certificate-card diploma-frame print:shadow-none print:m-0 print:w-full">
        <div className="diploma-gap">
          <div className="diploma-inner">
            <svg className="diploma-watermark" viewBox="0 0 240 240" aria-hidden="true" focusable="false">
              <path d="M120 10 151 42 195 45 198 89 230 120 198 151 195 195 151 198 120 230 89 198 45 195 42 151 10 120 42 89 45 45 89 42Z" fill="none" stroke="currentColor" strokeWidth="5" />
              <circle cx="120" cy="120" r="65" fill="none" stroke="currentColor" strokeWidth="4" />
              <path d="m120 72 14 29 32 5-23 23 5 32-28-15-28 15 5-32-23-23 32-5Z" fill="none" stroke="currentColor" strokeWidth="4" />
              <text x="120" y="218" textAnchor="middle">CERTIFIED SKILLDUCK</text>
            </svg>
            <CornerFlourish className="diploma-corner diploma-corner-tl" />
            <CornerFlourish className="diploma-corner diploma-corner-tr" />
            <CornerFlourish className="diploma-corner diploma-corner-bl" />
            <CornerFlourish className="diploma-corner diploma-corner-br" />

            <header className="diploma-heading">
              <p className="diploma-kicker"><span>✦</span> OFFICIAL CREDENTIAL <i>•</i> CERTIFIED SKILLDUCK <span>✦</span></p>
              <h1>Certificate of Achievement</h1>
              <div className="diploma-heading-rule"><span />✦<span /></div>
            </header>

            <div className="diploma-recipient">
              <p className="diploma-script">This is to certify that</p>
              <p className="diploma-recipient-name">{certificate.issuedTo}</p>
              <span className="diploma-name-rule" />
              <p className="diploma-completion-copy">has successfully completed the rigorous assessment and curriculum requirements for</p>
              <h2 className="diploma-course-title">{certificate.course}</h2>
            </div>

            <footer className="diploma-footer">
              <div className="diploma-signature-block">
                <div className="diploma-signature-script" aria-label="Director signature">
                  <span>M. Wajdan Ch.</span>
                  <span className="diploma-signature-underline" />
                </div>
                <strong>Director of Academic Standards</strong>
                <small>Certified SkillDuck</small>
              </div>

              <div className="diploma-seal-column"><OfficialSeal /></div>

              <div className="diploma-verification">
                <div className="diploma-qr-box">
                  {qrCode ? (
                    <Image className="certificate-qr" src={qrCode} width={104} height={104} unoptimized alt={`QR code verifying certificate ${certificate.certificateNo}`} />
                  ) : <span className="certificate-qr-placeholder" aria-label="Generating verification QR code" />}
                </div>
                <div className="diploma-metadata">
                  <p><span>Certificate ID</span><strong>{certificate.certificateNo}</strong></p>
                  <p><span>Issue Date</span><strong>{displayDate(certificate.issuedAt)}</strong></p>
                  <p><span>Status</span><strong className="diploma-verified-status">● VERIFIED</strong></p>
                </div>
              </div>
            </footer>
            <p className="diploma-authenticity">Authentic achievement • Independently verifiable • SkillDuck official registry</p>
          </div>
        </div>
      </article>

      <div className="certificate-actions print:hidden">
        {!preview && <a className="text-link" href={`/certificates/${encodeURIComponent(certificate.verificationHash)}`}>View certificate</a>}
        <button className="course-action" type="button" onClick={() => window.print()}>Download / Print</button>
      </div>
    </section>
  );
}