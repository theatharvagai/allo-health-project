"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

interface StockLevel {
  id: string;
  warehouseId: string;
  totalUnits: number;
  reservedUnits: number;
  warehouse: {
    id: string;
    name: string;
    location: string;
  };
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  stockLevels: StockLevel[];
}

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedWarehouse, setSelectedWarehouse] = useState<StockLevel | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [reserving, setReserving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch("/api/products");
      if (!res.ok) throw new Error("Failed to fetch products");
      const data = await res.json();
      setProducts(data);
    } catch (err) {
      toast.error("Could not load products");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const openReserveDialog = (product: Product, stock: StockLevel) => {
    setSelectedProduct(product);
    setSelectedWarehouse(stock);
    setQuantity(1);
    setDialogOpen(true);
  };

  const handleReserve = async () => {
    if (!selectedProduct || !selectedWarehouse) return;
    setReserving(true);

    try {
      const idempotencyKey = `${selectedProduct.id}-${selectedWarehouse.warehouseId}-${Date.now()}`;
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({
          productId: selectedProduct.id,
          warehouseId: selectedWarehouse.warehouseId,
          quantity,
        }),
      });

      const data = await res.json();

      if (res.status === 409) {
        toast.error("Not enough stock!", {
          description: data.error,
        });
        return;
      }

      if (!res.ok) {
        toast.error("Reservation failed", { description: data.error });
        return;
      }

      setDialogOpen(false);
      toast.success("Reserved!", {
        description: `Held for 10 minutes. Complete checkout to confirm.`,
        action: {
          label: "View Reservation",
          onClick: () => {
            window.location.href = `/reservations/${data.id}`;
          },
        },
      });

      // Refresh products to show updated stock
      await fetchProducts();
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setReserving(false);
    }
  };

  const availableStock = (s: StockLevel) => s.totalUnits - s.reservedUnits;

  const stockBadge = (available: number) => {
    if (available === 0)
      return <Badge variant="destructive" className="text-xs">Out of Stock</Badge>;
    if (available <= 3)
      return (
        <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs pulse-glow">
          Only {available} left!
        </Badge>
      );
    return (
      <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs">
        {available} available
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="mb-12 text-center">
          <div className="shimmer mx-auto mb-4 h-10 w-64 rounded-xl" />
          <div className="shimmer mx-auto h-5 w-96 rounded-lg" />
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="glass-card rounded-2xl overflow-hidden">
              <div className="shimmer h-52 w-full" />
              <div className="p-5 space-y-3">
                <div className="shimmer h-5 w-3/4 rounded" />
                <div className="shimmer h-4 w-full rounded" />
                <div className="shimmer h-4 w-2/3 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-16">
      {/* Hero */}
      <div className="mb-14 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-1.5 text-sm text-violet-400">
          <span className="h-1.5 w-1.5 rounded-full bg-violet-400 pulse-glow" />
          Live inventory — reservations expire in 10 mins
        </div>
        <h1 className="mb-4 text-5xl font-bold tracking-tight text-white">
          Reserve Before You{" "}
          <span className="gradient-text">Miss Out</span>
        </h1>
        <p className="mx-auto max-w-xl text-lg text-white/50">
          Secure your items at checkout. Your reservation holds stock for 10
          minutes while you complete payment.
        </p>
      </div>

      {/* Product Grid */}
      {products.length === 0 ? (
        <div className="py-24 text-center text-white/40">
          <p className="text-lg">No products found. Run the seed script to populate data.</p>
          <code className="mt-3 block text-sm text-violet-400">npm run db:seed</code>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => {
            const totalAvailable = product.stockLevels.reduce(
              (sum, s) => sum + availableStock(s),
              0
            );

            return (
              <Card
                key={product.id}
                className="glass-card gradient-border group flex flex-col overflow-hidden rounded-2xl border-0 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-violet-500/10"
              >
                {/* Product Image */}
                <div className="relative h-52 overflow-hidden bg-gradient-to-br from-violet-900/20 to-indigo-900/20">
                  {product.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-4xl text-white/10">
                      📦
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-3 left-3">
                    {totalAvailable === 0 ? (
                      <Badge variant="destructive">Out of Stock</Badge>
                    ) : totalAvailable <= 5 ? (
                      <Badge className="bg-amber-500/90 text-black font-semibold pulse-glow">
                        Only {totalAvailable} left!
                      </Badge>
                    ) : null}
                  </div>
                </div>

                <CardHeader className="pb-2 pt-5 px-5">
                  <h2 className="text-lg font-semibold leading-tight text-white">
                    {product.name}
                  </h2>
                  {product.description && (
                    <p className="mt-1 line-clamp-2 text-sm text-white/50">
                      {product.description}
                    </p>
                  )}
                </CardHeader>

                <CardContent className="flex-1 px-5 pb-2">
                  <Separator className="mb-3 bg-white/5" />
                  <p className="mb-2 text-xs font-medium uppercase tracking-wider text-white/30">
                    Stock by Warehouse
                  </p>
                  <div className="space-y-2">
                    {product.stockLevels.map((stock) => {
                      const available = availableStock(stock);
                      return (
                        <div
                          key={stock.id}
                          className="flex items-center justify-between rounded-lg bg-white/[0.03] px-3 py-2"
                        >
                          <div>
                            <p className="text-sm font-medium text-white/80">
                              {stock.warehouse.name}
                            </p>
                            <p className="text-xs text-white/30">
                              {stock.warehouse.location}
                            </p>
                          </div>
                          {stockBadge(available)}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>

                <CardFooter className="px-5 pb-5 pt-3">
                  <div className="flex w-full flex-col gap-2">
                    {product.stockLevels
                      .filter((s) => availableStock(s) > 0)
                      .map((stock) => (
                        <Button
                          key={stock.id}
                          onClick={() => openReserveDialog(product, stock)}
                          className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-500 hover:to-indigo-500 shadow-lg shadow-violet-500/20 hover:shadow-violet-500/40 transition-all duration-300"
                        >
                          Reserve from {stock.warehouse.name}
                        </Button>
                      ))}
                    {totalAvailable === 0 && (
                      <Button disabled className="w-full opacity-40">
                        Out of Stock
                      </Button>
                    )}
                  </div>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {/* Reserve Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="border-white/10 bg-[#111118] text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              Reserve Item
            </DialogTitle>
            <DialogDescription className="text-white/50">
              Your hold expires in <strong className="text-violet-400">10 minutes</strong>.
              Complete payment before the timer runs out.
            </DialogDescription>
          </DialogHeader>

          {selectedProduct && selectedWarehouse && (
            <div className="space-y-4 py-2">
              <div className="rounded-xl bg-white/[0.04] p-4">
                <p className="font-semibold text-white">{selectedProduct.name}</p>
                <p className="mt-0.5 text-sm text-white/50">
                  from{" "}
                  <span className="text-violet-400">
                    {selectedWarehouse.warehouse.name}
                  </span>
                </p>
              </div>

              <div className="flex items-center gap-4">
                <span className="text-sm text-white/60">Quantity</span>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="h-8 w-8 border-white/10 bg-white/5 text-white hover:bg-white/10"
                  >
                    −
                  </Button>
                  <span className="w-8 text-center font-bold text-white">
                    {quantity}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setQuantity((q) =>
                        Math.min(availableStock(selectedWarehouse), q + 1)
                      )
                    }
                    className="h-8 w-8 border-white/10 bg-white/5 text-white hover:bg-white/10"
                  >
                    +
                  </Button>
                </div>
                <span className="ml-auto text-xs text-white/30">
                  {availableStock(selectedWarehouse)} available
                </span>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={() => setDialogOpen(false)}
              className="text-white/60 hover:text-white hover:bg-white/10"
            >
              Cancel
            </Button>
            <Button
              onClick={handleReserve}
              disabled={reserving}
              className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-500 hover:to-indigo-500"
            >
              {reserving ? "Reserving…" : "Confirm Reservation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
