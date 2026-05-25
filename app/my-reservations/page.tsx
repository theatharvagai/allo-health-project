"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface ReservationData {
  id: string;
  quantity: number;
  status: "PENDING" | "CONFIRMED" | "RELEASED";
  createdAt: string;
  product: { name: string; imageUrl: string | null };
  warehouse: { name: string };
}

export default function MyReservationsPage() {
  const router = useRouter();
  const [reservations, setReservations] = useState<ReservationData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReservations = async () => {
      const stored = JSON.parse(localStorage.getItem("allo_my_reservations") || "[]") as string[];
      if (stored.length === 0) {
        setLoading(false);
        return;
      }

      const results = await Promise.all(
        stored.map(async (id) => {
          try {
            const res = await fetch(`/api/reservations/${id}`);
            if (res.ok) return await res.json() as ReservationData;
            return null;
          } catch {
            return null;
          }
        })
      );

      setReservations(results.filter((r): r is ReservationData => r !== null).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      setLoading(false);
    };

    fetchReservations();
  }, []);

  const statusConfig = {
    PENDING: { label: "Pending", className: "bg-amber-50 text-amber-700 border-amber-200" },
    CONFIRMED: { label: "Confirmed", className: "bg-green-50 text-green-700 border-green-200" },
    RELEASED: { label: "Released", className: "bg-red-50 text-red-700 border-red-200" },
  };

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-green-900">My Reservations</h1>
          <p className="mt-2 text-green-700/70">View and manage your recent holds and orders.</p>
        </div>
        <Button onClick={() => router.push("/")} variant="outline" className="border-green-200 text-green-700 hover:bg-green-50">
          Back to Products
        </Button>
      </div>

      {loading ? (
        <div className="text-center text-green-600/60 py-12">Loading reservations...</div>
      ) : reservations.length === 0 ? (
        <div className="text-center py-24 bg-white rounded-xl border border-green-100 shadow-sm">
          <p className="text-5xl mb-4">🛒</p>
          <p className="text-lg font-medium text-green-800">No reservations found.</p>
          <p className="text-green-600/70 mt-2">You haven't reserved any items yet.</p>
          <Button onClick={() => router.push("/")} className="mt-6 btn-primary">
            Browse Products
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reservations.map((res) => {
            const status = statusConfig[res.status];
            return (
              <Card key={res.id} className="mat-card border-0 bg-white overflow-hidden cursor-pointer hover:border-green-300 transition-colors" onClick={() => router.push(`/reservations/${res.id}`)}>
                <CardHeader className="px-5 pt-5 pb-3 bg-green-50/50 flex flex-row items-start justify-between border-b border-green-50">
                  <div>
                    <p className="font-bold text-green-900">{res.product.name}</p>
                    <p className="text-xs text-green-600/70 mt-1">{res.quantity} unit{res.quantity > 1 ? 's' : ''} at {res.warehouse.name}</p>
                  </div>
                  <Badge className={`shrink-0 border text-xs px-2.5 py-0.5 ${status.className}`}>
                    {status.label}
                  </Badge>
                </CardHeader>
                <CardContent className="px-5 py-3 flex justify-between items-center bg-white">
                  <p className="text-xs text-gray-500">{new Date(res.createdAt).toLocaleString()}</p>
                  <span className="text-xs font-semibold text-green-600 group-hover:underline">View Details →</span>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
