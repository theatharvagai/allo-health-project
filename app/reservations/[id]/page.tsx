"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { formatCountdown } from "@/lib/utils-api";

interface ReservationData {
  id: string;
  productId: string;
  warehouseId: string;
  quantity: number;
  status: "PENDING" | "CONFIRMED" | "RELEASED";
  expiresAt: string;
  createdAt: string;
  product: {
    id: string;
    name: string;
    description: string | null;
    imageUrl: string | null;
  };
  warehouse: {
    id: string;
    name: string;
    location: string;
  };
}

const EXPIRY_MINUTES = 10;

export default function ReservationPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [reservation, setReservation] = useState<ReservationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeLeftMs, setTimeLeftMs] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const [releasing, setReleasing] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchReservation = useCallback(async () => {
    try {
      const res = await fetch(`/api/reservations/${id}`);
      if (res.status === 404) {
        setError("Reservation not found.");
        return;
      }
      if (!res.ok) throw new Error("Failed to load reservation");
      const data: ReservationData = await res.json();
      setReservation(data);

      const msLeft = new Date(data.expiresAt).getTime() - Date.now();
      setTimeLeftMs(Math.max(0, msLeft));
    } catch {
      setError("Could not load reservation.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchReservation();
  }, [fetchReservation]);

  // Countdown timer
  useEffect(() => {
    if (!reservation || reservation.status !== "PENDING") return;

    timerRef.current = setInterval(() => {
      setTimeLeftMs((prev) => {
        const next = Math.max(0, prev - 1000);
        if (next === 0) {
          clearInterval(timerRef.current!);
          // Refresh to get updated status
          fetchReservation();
        }
        return next;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [reservation, fetchReservation]);

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      const idempotencyKey = `confirm-${id}-${Date.now()}`;
      const res = await fetch(`/api/reservations/${id}/confirm`, {
        method: "POST",
        headers: { "Idempotency-Key": idempotencyKey },
      });
      const data = await res.json();

      if (res.status === 410) {
        toast.error("Reservation expired!", {
          description: "Your hold has expired. Please start a new reservation.",
        });
        await fetchReservation();
        return;
      }

      if (!res.ok) {
        toast.error("Confirmation failed", { description: data.error });
        return;
      }

      setReservation(data);
      toast.success("Purchase confirmed! 🎉", {
        description: `Your order for ${data.product?.name} is confirmed.`,
      });
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setConfirming(false);
    }
  };

  const handleRelease = async () => {
    setReleasing(true);
    try {
      const res = await fetch(`/api/reservations/${id}/release`, {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error("Could not cancel", { description: data.error });
        return;
      }

      setReservation(data);
      toast.info("Reservation cancelled", {
        description: "Stock has been released back to inventory.",
      });
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setReleasing(false);
    }
  };

  const progressPercent =
    reservation?.status === "PENDING"
      ? (timeLeftMs / (EXPIRY_MINUTES * 60 * 1000)) * 100
      : 0;

  const statusConfig = {
    PENDING: {
      label: "Pending",
      className: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    },
    CONFIRMED: {
      label: "Confirmed ✓",
      className: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    },
    RELEASED: {
      label: "Released",
      className: "bg-red-500/20 text-red-400 border-red-500/30",
    },
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-20">
        <div className="glass-card rounded-2xl p-8 text-center">
          <div className="shimmer mx-auto mb-4 h-8 w-48 rounded-xl" />
          <div className="shimmer mx-auto h-5 w-64 rounded-lg" />
        </div>
      </div>
    );
  }

  if (error || !reservation) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-20 text-center">
        <div className="glass-card rounded-2xl p-12">
          <p className="text-5xl mb-4">😕</p>
          <h2 className="text-xl font-semibold text-white mb-2">
            {error ?? "Reservation not found"}
          </h2>
          <Button
            onClick={() => router.push("/")}
            className="mt-6 bg-violet-600 hover:bg-violet-500 text-white"
          >
            Back to Products
          </Button>
        </div>
      </div>
    );
  }

  const status = statusConfig[reservation.status];
  const isExpired = reservation.status === "PENDING" && timeLeftMs === 0;

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      {/* Back link */}
      <button
        onClick={() => router.push("/")}
        className="mb-8 flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition-colors duration-200"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to products
      </button>

      <Card className="glass-card gradient-border rounded-2xl border-0 overflow-hidden">
        {/* Product image strip */}
        {reservation.product.imageUrl && (
          <div className="relative h-40 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={reservation.product.imageUrl}
              alt={reservation.product.name}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#111118]" />
          </div>
        )}

        <CardHeader className="px-6 pt-6 pb-2">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-white/30 mb-1">
                Reservation #{reservation.id.slice(-8).toUpperCase()}
              </p>
              <h1 className="text-2xl font-bold text-white">
                {reservation.product.name}
              </h1>
              <p className="mt-1 text-sm text-white/50">
                {reservation.quantity} unit{reservation.quantity > 1 ? "s" : ""}{" "}
                from{" "}
                <span className="text-violet-400">
                  {reservation.warehouse.name}
                </span>
              </p>
            </div>
            <Badge className={`shrink-0 text-sm ${status.className}`}>
              {status.label}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="px-6 pb-6 space-y-6">
          <Separator className="bg-white/5" />

          {/* Timer section — only for PENDING */}
          {reservation.status === "PENDING" && (
            <div className="rounded-xl bg-white/[0.03] p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-white/70">
                  Time remaining
                </span>
                <span
                  className={`font-mono text-2xl font-bold tabular-nums ${
                    timeLeftMs < 120000
                      ? "text-red-400"
                      : timeLeftMs < 300000
                      ? "text-amber-400"
                      : "text-emerald-400"
                  }`}
                >
                  {isExpired ? "EXPIRED" : formatCountdown(timeLeftMs)}
                </span>
              </div>
              <Progress
                value={progressPercent}
                className="h-2 bg-white/10"
              />
              {timeLeftMs < 120000 && !isExpired && (
                <p className="mt-2 text-xs text-red-400">
                  ⚠️ Hurry! Your reservation is about to expire.
                </p>
              )}
              {isExpired && (
                <p className="mt-2 text-xs text-red-400">
                  Your reservation has expired. The stock has been released.
                </p>
              )}
            </div>
          )}

          {/* Confirmed state */}
          {reservation.status === "CONFIRMED" && (
            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-5 text-center">
              <p className="text-4xl mb-2">🎉</p>
              <p className="font-semibold text-emerald-400 text-lg">
                Purchase Confirmed!
              </p>
              <p className="text-sm text-white/50 mt-1">
                Your order has been placed. Stock permanently decremented.
              </p>
            </div>
          )}

          {/* Released state */}
          {reservation.status === "RELEASED" && (
            <div className="rounded-xl bg-white/[0.03] border border-white/10 p-5 text-center">
              <p className="text-4xl mb-2">🔓</p>
              <p className="font-semibold text-white/60 text-lg">
                Reservation Released
              </p>
              <p className="text-sm text-white/40 mt-1">
                Stock has been returned to inventory.
              </p>
            </div>
          )}

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-3">
            {[
              {
                label: "Warehouse",
                value: reservation.warehouse.name,
              },
              {
                label: "Location",
                value: reservation.warehouse.location,
              },
              {
                label: "Quantity",
                value: `${reservation.quantity} unit${reservation.quantity > 1 ? "s" : ""}`,
              },
              {
                label: "Created",
                value: new Date(reservation.createdAt).toLocaleTimeString(),
              },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="rounded-lg bg-white/[0.03] px-4 py-3"
              >
                <p className="text-xs text-white/30 mb-0.5">{label}</p>
                <p className="text-sm font-medium text-white">{value}</p>
              </div>
            ))}
          </div>

          {/* Action buttons */}
          {reservation.status === "PENDING" && !isExpired && (
            <div className="flex gap-3 pt-2">
              <Button
                onClick={handleConfirm}
                disabled={confirming || releasing}
                className="flex-1 bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-500 hover:to-indigo-500 shadow-lg shadow-violet-500/20 h-11"
              >
                {confirming ? "Confirming…" : "✓ Confirm Purchase"}
              </Button>
              <Button
                variant="outline"
                onClick={handleRelease}
                disabled={confirming || releasing}
                className="border-white/10 bg-white/5 text-white/70 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 h-11 transition-all duration-200"
              >
                {releasing ? "Cancelling…" : "Cancel"}
              </Button>
            </div>
          )}

          {(reservation.status !== "PENDING" || isExpired) && (
            <Button
              onClick={() => router.push("/")}
              className="w-full bg-white/5 hover:bg-white/10 text-white border border-white/10 h-11"
            >
              ← Back to Products
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
