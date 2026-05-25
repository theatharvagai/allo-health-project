import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkIdempotency, storeIdempotency } from "@/lib/redis";

export const dynamic = "force-dynamic";

// POST /api/reservations/:id/confirm — confirm a pending reservation
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // ── Idempotency check ────────────────────────────────────────────────────
  const idempotencyKey = req.headers.get("Idempotency-Key");
  if (idempotencyKey) {
    const cached = await checkIdempotency(`confirm:${idempotencyKey}`);
    if (cached) {
      return NextResponse.json(cached.body, { status: cached.status });
    }
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Lock the reservation row
      const reservations = await tx.$queryRaw<
        Array<{
          id: string;
          status: string;
          expiresAt: Date;
          quantity: number;
          productId: string;
          warehouseId: string;
        }>
      >`
        SELECT id, status, "expiresAt", quantity, "productId", "warehouseId"
        FROM reservations
        WHERE id = ${id}
        FOR UPDATE
      `;

      if (reservations.length === 0) {
        throw new Error("NOT_FOUND");
      }

      const reservation = reservations[0];

      if (reservation.status !== "PENDING") {
        throw new Error(`WRONG_STATUS:${reservation.status}`);
      }

      // Check expiry
      if (new Date(reservation.expiresAt) < new Date()) {
        // Mark as released and restore stock
        await tx.$executeRaw`
          UPDATE reservations
          SET status = 'RELEASED', "updatedAt" = NOW()
          WHERE id = ${id}
        `;
        await tx.$executeRaw`
          UPDATE stock_levels
          SET "reservedUnits" = GREATEST("reservedUnits" - ${reservation.quantity}, 0),
              "updatedAt"     = NOW()
          WHERE "productId"   = ${reservation.productId}
            AND "warehouseId" = ${reservation.warehouseId}
        `;
        throw new Error("EXPIRED");
      }

      // Confirm: permanently decrement both totalUnits and reservedUnits
      await tx.$executeRaw`
        UPDATE reservations
        SET status = 'CONFIRMED', "updatedAt" = NOW()
        WHERE id = ${id}
      `;
      await tx.$executeRaw`
        UPDATE stock_levels
        SET "totalUnits"    = GREATEST("totalUnits" - ${reservation.quantity}, 0),
            "reservedUnits" = GREATEST("reservedUnits" - ${reservation.quantity}, 0),
            "updatedAt"     = NOW()
        WHERE "productId"   = ${reservation.productId}
          AND "warehouseId" = ${reservation.warehouseId}
      `;

      return await tx.reservation.findUnique({
        where: { id },
        include: { product: true, warehouse: true },
      });
    });

    const responseBody = result;
    const responseStatus = 200;

    if (idempotencyKey) {
      await storeIdempotency(
        `confirm:${idempotencyKey}`,
        responseStatus,
        responseBody
      );
    }

    return NextResponse.json(responseBody, { status: responseStatus });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "NOT_FOUND") {
        return NextResponse.json(
          { error: "Reservation not found" },
          { status: 404 }
        );
      }
      if (error.message === "EXPIRED") {
        return NextResponse.json(
          { error: "Reservation has expired" },
          { status: 410 }
        );
      }
      if (error.message.startsWith("WRONG_STATUS:")) {
        const status = error.message.split(":")[1];
        return NextResponse.json(
          { error: `Cannot confirm a reservation with status: ${status}` },
          { status: 409 }
        );
      }
    }
    console.error("[POST /api/reservations/:id/confirm]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
