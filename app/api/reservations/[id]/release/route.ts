import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// POST /api/reservations/:id/release — release a pending reservation early
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Lock the reservation row
      const reservations = await tx.$queryRaw<
        Array<{
          id: string;
          status: string;
          quantity: number;
          productId: string;
          warehouseId: string;
        }>
      >`
        SELECT id, status, quantity, "productId", "warehouseId"
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

      // Release: restore reservedUnits
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

      return await tx.reservation.findUnique({
        where: { id },
        include: { product: true, warehouse: true },
      });
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "NOT_FOUND") {
        return NextResponse.json(
          { error: "Reservation not found" },
          { status: 404 }
        );
      }
      if (error.message.startsWith("WRONG_STATUS:")) {
        const status = error.message.split(":")[1];
        return NextResponse.json(
          { error: `Cannot release a reservation with status: ${status}` },
          { status: 409 }
        );
      }
    }
    console.error("[POST /api/reservations/:id/release]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
