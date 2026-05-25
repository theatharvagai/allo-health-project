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

const CATEGORY_COLORS: Record<string, string> = {
  "Medicine": "bg-blue-50 text-blue-700 border-blue-200",
  "Equipment": "bg-purple-50 text-purple-700 border-purple-200",
  "Diagnostic": "bg-amber-50 text-amber-700 border-amber-200",
  "Supplement": "bg-green-50 text-green-700 border-green-200",
};

function getCategory(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes("monitor") || lower.includes("oximeter") || lower.includes("glucometer") || lower.includes("nebulizer") || lower.includes("thermometer") || lower.includes("bp")) return "Equipment";
  if (lower.includes("test") || lower.includes("strip") || lower.includes("kit")) return "Diagnostic";
  if (lower.includes("vitamin") || lower.includes("zinc") || lower.includes("omega")) return "Supplement";
  return "Medicine";
}

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedWarehouse, setSelectedWarehouse] = useState<StockLevel | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [reserving, setReserving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

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
        toast.error("Not enough stock!", { description: data.error });
        return;
      }
      if (!res.ok) {
        toast.error("Reservation failed", { description: data.error });
        return;
      }
      setDialogOpen(false);
      toast.success("Reservation created!", {
        description: `${selectedProduct.name} held for 10 mins at ${selectedWarehouse.warehouse.name}.`,
        action: {
          label: "View Reservation",
          onClick: () => { window.location.href = `/reservations/${data.id}`; },
        },
      });
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
      return <span className="text-xs font-medium px-2 py-0.5 rounded-full badge-stock-out">Out of Stock</span>;
    if (available <= 5)
      return <span className="text-xs font-medium px-2 py-0.5 rounded-full badge-stock-low pulse-green">Only {available} left!</span>;
    return <span className="text-xs font-medium px-2 py-0.5 rounded-full badge-stock-ok">{available} in stock</span>;
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="mb-10 text-center">
          <div className="shimmer mx-auto mb-4 h-10 w-80 rounded-xl" />
          <div className="shimmer mx-auto h-5 w-96 rounded-lg" />
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="mat-card rounded-xl overflow-hidden">
              <div className="shimmer h-44 w-full" />
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
    <div className="mx-auto max-w-7xl px-6 py-10">
      {/* Page Header */}
      <div className="mb-10 text-center">
        <div className="mb-3 flex items-center justify-center gap-2">
          <div className="h-px flex-1 max-w-24 bg-green-200" />
          <span className="text-xs font-semibold tracking-widest text-green-600 uppercase">
            Allo Health Centres Across India
          </span>
          <div className="h-px flex-1 max-w-24 bg-green-200" />
        </div>
        <h1 className="mb-3 text-4xl font-bold tracking-tight text-green-900">
          Allo Health Inventory System
        </h1>
        <p className="mx-auto max-w-xl text-base text-green-700/70">
          Reserve medicines and medical equipment from your nearest Allo Health centre.
          Holds are valid for 10 minutes while you complete your order.
        </p>

        {/* Search */}
        <div className="mt-6 mx-auto max-w-md relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search medicines or equipment..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-green-200 bg-white pl-10 pr-4 py-2.5 text-sm text-green-900 placeholder-green-400 outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100 elevation-1"
          />
        </div>
      </div>

      {/* Stats bar */}
      <div className="mb-8 flex flex-wrap items-center justify-center gap-6 rounded-xl bg-white border border-green-100 px-8 py-4 elevation-1">
        {[
          { label: "Products Listed", value: products.length },
          { label: "Allo Health Centres", value: new Set(products.flatMap(p => p.stockLevels.map(s => s.warehouseId))).size },
          { label: "Total SKUs", value: products.reduce((a, p) => a + p.stockLevels.length, 0) },
          { label: "Reservation Window", value: "10 min" },
        ].map(({ label, value }) => (
          <div key={label} className="text-center">
            <p className="text-2xl font-bold text-green-700">{value}</p>
            <p className="text-xs text-green-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Product Grid */}
      {filteredProducts.length === 0 ? (
        <div className="py-24 text-center text-green-600/40">
          <p className="text-5xl mb-4">💊</p>
          <p className="text-lg font-medium">
            {searchQuery ? `No products matching "${searchQuery}"` : "No products found. Run: npm run db:seed"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProducts.map((product) => {
            const totalAvailable = product.stockLevels.reduce(
              (sum, s) => sum + availableStock(s), 0
            );
            const category = getCategory(product.name);

            return (
              <Card
                key={product.id}
                className="mat-card flex flex-col overflow-hidden rounded-xl border-0 bg-white p-0"
              >
                {/* Product Image */}
                <div className="relative h-44 overflow-hidden bg-gradient-to-br from-green-50 to-emerald-50">
                  {product.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-5xl">
                      💊
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                  {/* Category badge */}
                  <div className="absolute top-3 left-3">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${CATEGORY_COLORS[category]}`}>
                      {category}
                    </span>
                  </div>
                  {/* Low stock overlay */}
                  {totalAvailable > 0 && totalAvailable <= 5 && (
                    <div className="absolute top-3 right-3">
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-orange-100 text-orange-700 border border-orange-200 pulse-green">
                        Low Stock
                      </span>
                    </div>
                  )}
                  {totalAvailable === 0 && (
                    <div className="absolute inset-0 bg-white/50 flex items-center justify-center">
                      <span className="text-sm font-bold text-red-600 bg-white px-4 py-2 rounded-full border border-red-200 shadow">
                        Out of Stock
                      </span>
                    </div>
                  )}
                </div>

                <CardHeader className="pb-2 pt-4 px-4">
                  <h2 className="text-base font-bold leading-tight text-green-900">
                    {product.name}
                  </h2>
                  {product.description && (
                    <p className="mt-1 line-clamp-2 text-xs text-green-700/60">
                      {product.description}
                    </p>
                  )}
                </CardHeader>

                <CardContent className="flex-1 px-4 pb-2">
                  <Separator className="mb-3 bg-green-50" />
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-green-500">
                    Allo Health Centre Stock
                  </p>
                  <div className="space-y-1.5">
                    {product.stockLevels.map((stock) => {
                      const available = availableStock(stock);
                      return (
                        <div
                          key={stock.id}
                          className="flex items-center justify-between rounded-lg bg-green-50/60 px-3 py-2 border border-green-100"
                        >
                          <div>
                            <p className="text-xs font-semibold text-green-800">
                              {stock.warehouse.name}
                            </p>
                            <p className="text-[10px] text-green-500">
                              {stock.warehouse.location}
                            </p>
                          </div>
                          {stockBadge(available)}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>

                <CardFooter className="px-4 pb-4 pt-3">
                  <div className="flex w-full flex-col gap-2">
                    {product.stockLevels
                      .filter((s) => availableStock(s) > 0)
                      .map((stock) => (
                        <Button
                          key={stock.id}
                          onClick={() => openReserveDialog(product, stock)}
                          className="w-full btn-primary h-9 text-sm font-semibold rounded-lg"
                        >
                          Reserve · {stock.warehouse.name}
                        </Button>
                      ))}
                    {totalAvailable === 0 && (
                      <Button disabled className="w-full h-9 text-sm rounded-lg bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200">
                        Currently Unavailable
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
        <DialogContent className="border-green-100 bg-white text-green-900 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-green-900">
              Reserve Item
            </DialogTitle>
            <DialogDescription className="text-green-600/70">
              Your hold expires in{" "}
              <strong className="text-green-600">10 minutes</strong>.
              Complete your order before the timer runs out.
            </DialogDescription>
          </DialogHeader>

          {selectedProduct && selectedWarehouse && (
            <div className="space-y-4 py-2">
              {/* Product summary */}
              <div className="rounded-xl bg-green-50 border border-green-100 p-4">
                <p className="font-bold text-green-900">{selectedProduct.name}</p>
                <p className="mt-0.5 text-sm text-green-600">
                  Allo Health Centre —{" "}
                  <span className="font-semibold">{selectedWarehouse.warehouse.name}</span>
                </p>
                <p className="text-xs text-green-500 mt-0.5">{selectedWarehouse.warehouse.location}</p>
              </div>

              {/* Quantity picker */}
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-green-700">Quantity</span>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="h-8 w-8 border-green-200 bg-white text-green-700 hover:bg-green-50 hover:border-green-300 rounded-lg p-0"
                  >
                    −
                  </Button>
                  <span className="w-8 text-center font-bold text-green-900 text-lg">
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
                    className="h-8 w-8 border-green-200 bg-white text-green-700 hover:bg-green-50 hover:border-green-300 rounded-lg p-0"
                  >
                    +
                  </Button>
                </div>
                <span className="ml-auto text-xs text-green-500 bg-green-50 px-2 py-1 rounded-full border border-green-100">
                  {availableStock(selectedWarehouse)} available
                </span>
              </div>

              {/* Info note */}
              <div className="flex items-start gap-2 rounded-lg bg-blue-50 border border-blue-100 px-3 py-2.5">
                <svg className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-xs text-blue-700">
                  Stock is reserved for 10 minutes. You can confirm or cancel at any time. Unused reservations release automatically.
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={() => setDialogOpen(false)}
              className="text-green-600 hover:text-green-700 hover:bg-green-50"
            >
              Cancel
            </Button>
            <Button
              onClick={handleReserve}
              disabled={reserving}
              className="btn-primary px-6"
            >
              {reserving ? "Reserving…" : "Confirm Reservation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
