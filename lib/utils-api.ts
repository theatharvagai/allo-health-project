import { NextResponse } from "next/server";

/**
 * Returns a consistent JSON error response.
 */
export function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Formats milliseconds remaining as MM:SS string.
 */
export function formatCountdown(ms: number): string {
  if (ms <= 0) return "00:00";
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

/**
 * Returns how many minutes until expiry from now.
 */
export function expiryMinutes(): number {
  return parseInt(process.env.RESERVATION_EXPIRY_MINUTES ?? "10", 10);
}

/**
 * Computes the expiry Date for a new reservation.
 */
export function computeExpiresAt(): Date {
  const minutes = expiryMinutes();
  return new Date(Date.now() + minutes * 60 * 1000);
}
