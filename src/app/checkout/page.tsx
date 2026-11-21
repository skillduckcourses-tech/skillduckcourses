import { pageMetadata } from "@/src/lib/seo";
import CheckoutClient from "./checkout-client";
import { Suspense } from "react";

export const metadata = pageMetadata("Certificate Checkout", "Submit a certificate payment reference for an assessment you have passed.", "/checkout", true);

export default function CheckoutPage() { return <Suspense fallback={<main className="checkout-shell"><p>Loading checkout...</p></main>}><CheckoutClient /></Suspense>; }