"use client";

export default function WhatsAppSupport() {
  const phone = "923398033003";
  const message = encodeURIComponent("Hi, I need help with Certified SkillDuck.");
  return <a className="whatsapp-support" href={`https://wa.me/${phone}?text=${message}`} target="_blank" rel="noreferrer" aria-label="Contact support on WhatsApp"><span aria-hidden="true">WA</span><strong>Need help?</strong></a>;
}