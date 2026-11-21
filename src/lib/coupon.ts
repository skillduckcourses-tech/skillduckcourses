import { createHmac } from "crypto";

export function dailyCouponCode(date = new Date()) {
  const day = date.toISOString().slice(0, 10);
  return createHmac("sha256", process.env.COUPON_SECRET || "change-this-coupon-secret").update(day).digest("hex").slice(0, 10).toUpperCase();
}