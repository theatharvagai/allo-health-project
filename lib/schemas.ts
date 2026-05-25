import { z } from "zod";

// ── Products ──────────────────────────────────────────────────────────────────

export const ProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  imageUrl: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const StockLevelSchema = z.object({
  id: z.string(),
  productId: z.string(),
  warehouseId: z.string(),
  totalUnits: z.number().int().nonnegative(),
  reservedUnits: z.number().int().nonnegative(),
  warehouse: z
    .object({
      id: z.string(),
      name: z.string(),
      location: z.string(),
    })
    .optional(),
});

export const ProductWithStockSchema = ProductSchema.extend({
  stockLevels: z.array(StockLevelSchema),
});

// ── Warehouses ────────────────────────────────────────────────────────────────

export const WarehouseSchema = z.object({
  id: z.string(),
  name: z.string(),
  location: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

// ── Reservations ──────────────────────────────────────────────────────────────

export const ReservationStatusSchema = z.enum([
  "PENDING",
  "CONFIRMED",
  "RELEASED",
]);

export const CreateReservationSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
  warehouseId: z.string().min(1, "Warehouse ID is required"),
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
});

export const ReservationSchema = z.object({
  id: z.string(),
  productId: z.string(),
  warehouseId: z.string(),
  quantity: z.number().int(),
  status: ReservationStatusSchema,
  expiresAt: z.coerce.date(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  product: ProductSchema.optional(),
  warehouse: WarehouseSchema.optional(),
});

export type Product = z.infer<typeof ProductSchema>;
export type StockLevel = z.infer<typeof StockLevelSchema>;
export type ProductWithStock = z.infer<typeof ProductWithStockSchema>;
export type Warehouse = z.infer<typeof WarehouseSchema>;
export type ReservationStatus = z.infer<typeof ReservationStatusSchema>;
export type CreateReservation = z.infer<typeof CreateReservationSchema>;
export type Reservation = z.infer<typeof ReservationSchema>;
