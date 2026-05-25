import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkIdempotency, storeIdempotency } from "@/lib/redis";
import { CreateReservationSchema } from "@/lib/schemas";
import { computeExpiresAt } from "@/lib/utils-api";

export const dynamic = "force-dynamic";

// POST /api/reservations — reserve units with pessimistic locking
export async function POST(req: NextRequest) {
  // ── Idempotency check ────────────────────────────────────────────────────
  const idempotencyKey = req.headers.get("Idempotency-Key");
  if (idempotencyKey) {
    const cached = await checkIdempotency(idempotencyKey);
    if (cached) {
      return NextResponse.json(cached.body, { status: cached.status });
    }
  }

  // ── Parse & validate body ─────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = CreateReservationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const { productId, warehouseId, quantity } = parsed.data;

  // ── Pessimistic locking inside a transaction ──────────────────────────────
  // We use SELECT ... FOR UPDATE to lock the stock_levels row for this
  // product+warehouse combination. This guarantees that under heavy concurrent
  // load, exactly ONE request wins the race for the last unit — the others will
  // queue behind the lock and then see insufficient stock.
  try {
    const reservation = await prisma.$transaction(async (tx) => {
      // 1. Lock the specific stock row (FOR UPDATE blocks concurrent writers)
      //    NOTE: column names are quoted camelCase because Prisma did not apply @map
      //    to individual fields — it keeps them as-is in Postgres.
      const stockRows = await tx.$queryRaw<
        Array<{
          id: string;
          totalUnits: number;
          reservedUnits: number;
        }>
      >`
        SELECT id, "totalUnits", "reservedUnits"
        FROM stock_levels
        WHERE "productId" = ${productId}
          AND "warehouseId" = ${warehouseId}
        FOR UPDATE
      `;

      if (stockRows.length === 0) {
        throw new Error("STOCK_NOT_FOUND");
      }

      const stock = stockRows[0];
      const available = stock.totalUnits - stock.reservedUnits;

      if (available < quantity) {
        throw new Error("INSUFFICIENT_STOCK");
      }

      // 2. Lazy cleanup: release expired PENDING reservations for this SKU
      //    inside the same transaction — no separate cron needed for correctness.
      await tx.$executeRaw`
        UPDATE reservations
        SET status = 'RELEASED', "updatedAt" = NOW()
        WHERE "productId"  = ${productId}
          AND "warehouseId" = ${warehouseId}
          AND status       = 'PENDING'
          AND "expiresAt"  < NOW()
      `;

      // 3. Atomically increment reservedUnits
      await tx.$executeRaw`
        UPDATE stock_levels
        SET "reservedUnits" = "reservedUnits" + ${quantity},
            "updatedAt"     = NOW()
        WHERE id = ${stock.id}
      `;

      // 4. Create the reservation record
      const newReservation = await tx.reservation.create({
        data: {
          productId,
          warehouseId,
          quantity,
          status: "PENDING",
          expiresAt: computeExpiresAt(),
        },
        include: {
          product: true,
          warehouse: true,
        },
      });

      return newReservation;
    });

    const responseBody = reservation;
    const responseStatus = 201;

    // Cache for idempotency (24h TTL via Redis)
    if (idempotencyKey) {
      await storeIdempotency(idempotencyKey, responseStatus, responseBody);
    }

    return NextResponse.json(responseBody, { status: responseStatus });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "INSUFFICIENT_STOCK") {
        return NextResponse.json(
          { error: "Not enough stock available for this product/warehouse" },
          { status: 409 }
        );
      }
      if (error.message === "STOCK_NOT_FOUND") {
        return NextResponse.json(
          { error: "No stock record found for this product/warehouse" },
          { status: 404 }
        );
      }
    }
    console.error("[POST /api/reservations]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
