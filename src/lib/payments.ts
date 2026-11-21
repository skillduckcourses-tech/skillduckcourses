import { COURSE_PRICE_PKR } from "@/src/lib/pricing";

export const paymentOptions = {
  meezan: {
    method: "MEEZAN_BANK" as const,
    label: "Meezan Bank",
    amount: COURSE_PRICE_PKR,
    currency: "PKR",
    accountNumber: "02290107660173",
    accountTitle: "Muhammad Wajdan Chaudhry",
  },
  upaisa: {
    method: "UPAISA_NAYAPAY" as const,
    label: "UPaisa / NayaPay",
    amount: COURSE_PRICE_PKR,
    currency: "PKR",
    accountNumber: "03377775957",
    accountTitle: "Muhammad Wajdan Chaudhry",
  },
  secondaryWallet: {
    method: "SECONDARY_WALLET" as const,
    label: "JazzCash / EasyPaisa / Secondary Wallet",
    amount: COURSE_PRICE_PKR,
    currency: "PKR",
    accountNumber: process.env.JAZZCASH_ACCOUNT || "03398033003",
    accountTitle: process.env.PAYMENT_BENEFICIARY || "Muhammad Wajdan Chaudhry",
  },
  citibank: {
    method: "CITIBANK_WIRE" as const,
    label: "Citibank International Wire / Bank Transfer",
    amount: 10,
    currency: "USD",
    accountNumber: process.env.CITIBANK_ACCOUNT || "70587070002569995",
    accountTitle: process.env.PAYMENT_BENEFICIARY || "Muhammad Wajdan Chaudhry",
    routing: process.env.CITIBANK_ROUTING || "031100209",
    swift: process.env.CITIBANK_SWIFT || "CITIUS33",
  },
  crypto: {
    method: "USDT_TRON" as const,
    label: "USDT Crypto Transfer",
    amount: 10,
    currency: "USD",
    network: "TRC20 / BEP20",
    wallet: process.env.USDT_WALLET || "TBtx2zv5uq3napwAWViN8jb88wfk93HcPG",
  },
};

export type PaymentOptionKey = keyof typeof paymentOptions;