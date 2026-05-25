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

  useEffect(() => { fetchReservation(); }, [fetchReservation]);

  useEffect(() => {
    if (!reservation || reservation.status !== "PENDING") return;
    timerRef.current = setInterval(() => {
      setTimeLeftMs((prev) => {
        const next = Math.max(0, prev - 1000);
        if (next === 0) {
          clearInterval(timerRef.current!);
          fetchReservation();
        }
        return next;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [reservation, fetchReservation]);

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      const res = await fetch(`/api/reservations/${id}/confirm`, {
        method: "POST",
        headers: { "Idempotency-Key": `confirm-${id}-${Date.now()}` },
      });
      const data = await res.json();
      if (res.status === 410) {
        toast.error("Reservation expired!", {
          description: "Your hold has expired. Please make a new reservation.",
        });
        await fetchReservation();
        return;
      }
      if (!res.ok) {
        toast.error("Confirmation failed", { description: data.error });
        return;
      }
      setReservation(data);
      toast.success("Order confirmed! 🎉", {
        description: `Your ${data.product?.name} has been reserved at ${data.warehouse?.name}.`,
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
      const res = await fetch(`/api/reservations/${id}/release`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast.error("Could not cancel", { description: data.error });
        return;
      }
      setReservation(data);
      toast.info("Reservation cancelled", {
        description: "Stock has been returned to the centre.",
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

  const isExpired = reservation?.status === "PENDING" && timeLeftMs === 0;

  const timerColor =
    timeLeftMs < 120000 ? "text-red-600" :
    timeLeftMs < 300000 ? "text-orange-500" :
    "text-green-600";

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-20">
        <div className="mat-card rounded-xl p-8 text-center bg-white">
          <div className="shimmer mx-auto mb-4 h-8 w-48 rounded-xl" />
          <div className="shimmer mx-auto h-5 w-64 rounded-lg" />
        </div>
      </div>
    );
  }

  if (error || !reservation) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-20 text-center">
        <div className="mat-card rounded-xl p-12 bg-white">
          <p className="text-5xl mb-4">😕</p>
          <h2 className="text-xl font-semibold text-green-900 mb-2">
            {error ?? "Reservation not found"}
          </h2>
          <Button onClick={() => router.push("/")} className="mt-6 btn-primary">
            ← Back to Products
          </Button>
        </div>
      </div>
    );
  }

  const statusConfig = {
    PENDING: { label: "Pending", className: "bg-amber-50 text-amber-700 border-amber-200" },
    CONFIRMED: { label: "Confirmed ✓", className: "bg-green-50 text-green-700 border-green-200" },
    RELEASED: { label: "Released", className: "bg-red-50 text-red-700 border-red-200" },
  };
  const status = statusConfig[reservation.status];

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      {/* Back */}
      <button
        onClick={() => router.push("/")}
        className="mb-6 flex items-center gap-2 text-sm text-green-600 hover:text-green-800 transition-colors"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to products
      </button>

      <Card className="mat-card rounded-xl border-0 overflow-hidden bg-white">
        {/* Product image strip */}
        {reservation.product.imageUrl && (
          <div className="relative h-36 overflow-hidden bg-green-50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={reservation.product.imageUrl}
              alt={reservation.product.name}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white/80" />
          </div>
        )}

        <CardHeader className="px-6 pt-5 pb-2">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-green-500 mb-1">
                Allo Health · Reservation #{reservation.id.slice(-8).toUpperCase()}
              </p>
              <h1 className="text-2xl font-bold text-green-900">
                {reservation.product.name}
              </h1>
              <p className="mt-1 text-sm text-green-600/70">
                {reservation.quantity} unit{reservation.quantity > 1 ? "s" : ""} ·{" "}
                <span className="font-semibold text-green-700">
                  {reservation.warehouse.name}
                </span>
              </p>
            </div>
            <Badge className={`shrink-0 border text-sm px-3 py-1 ${status.className}`}>
              {status.label}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="px-6 pb-6 space-y-5">
          <Separator className="bg-green-50" />

          {/* Timer — PENDING only */}
          {reservation.status === "PENDING" && (
            <div className="rounded-xl bg-green-50 border border-green-100 p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-green-700">Time remaining to confirm</span>
                <span className={`font-mono text-3xl font-bold tabular-nums ${timerColor}`}>
                  {isExpired ? "EXPIRED" : formatCountdown(timeLeftMs)}
                </span>
              </div>
              <Progress value={progressPercent} className="h-2 bg-green-100" />
              {timeLeftMs < 120000 && !isExpired && (
                <p className="mt-2 text-xs text-orange-600 flex items-center gap-1">
                  <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  Hurry! Your reservation is about to expire.
                </p>
              )}
            </div>
          )}

          {/* Confirmed */}
          {reservation.status === "CONFIRMED" && (
            <div className="rounded-xl bg-green-50 border border-green-200 p-5 text-center">
              <p className="text-4xl mb-2">✅</p>
              <p className="font-bold text-green-700 text-lg">Order Confirmed!</p>
              <p className="text-sm text-green-600/70 mt-1">
                Your order has been confirmed at {reservation.warehouse.name}.
              </p>
            </div>
          )}

          {/* Released */}
          {reservation.status === "RELEASED" && (
            <div className="rounded-xl bg-gray-50 border border-gray-200 p-5 text-center">
              <p className="text-4xl mb-2">🔓</p>
              <p className="font-semibold text-gray-600 text-lg">Reservation Released</p>
              <p className="text-sm text-gray-500 mt-1">
                Stock has been returned to the centre inventory.
              </p>
            </div>
          )}

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Allo Health Centre", value: reservation.warehouse.name },
              { label: "Location", value: reservation.warehouse.location },
              { label: "Quantity Reserved", value: `${reservation.quantity} unit${reservation.quantity > 1 ? "s" : ""}` },
              { label: "Created At", value: new Date(reservation.createdAt).toLocaleTimeString() },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-xl bg-green-50/60 border border-green-100 px-4 py-3">
                <p className="text-[10px] text-green-500 font-medium uppercase tracking-wide mb-0.5">{label}</p>
                <p className="text-sm font-semibold text-green-900">{value}</p>
              </div>
            ))}
          </div>

          {/* Action buttons */}
          {reservation.status === "PENDING" && !isExpired && (
            <div className="flex gap-3 pt-1">
              <Button
                onClick={handleConfirm}
                disabled={confirming || releasing}
                className="flex-1 btn-primary h-11 text-sm font-semibold rounded-xl"
              >
                {confirming ? "Confirming…" : "✓ Confirm Order"}
              </Button>
              <Button
                variant="outline"
                onClick={handleRelease}
                disabled={confirming || releasing}
                className="border-red-200 bg-white text-red-600 hover:bg-red-50 hover:border-red-300 h-11 rounded-xl transition-all"
              >
                {releasing ? "Cancelling…" : "Cancel"}
              </Button>
            </div>
          )}

          {(reservation.status !== "PENDING" || isExpired) && (
            <Button
              onClick={() => router.push("/")}
              className="w-full h-11 rounded-xl border border-green-200 bg-green-50 text-green-700 hover:bg-green-100 font-semibold"
              variant="outline"
            >
              ← Back to Products
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
