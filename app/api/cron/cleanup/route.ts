import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/cron/cleanup
 *
 * This endpoint is meant to be called by Vercel Cron (see vercel.json).
 * It releases all PENDING reservations whose expiresAt has passed,
 * restoring the reserved units back to available stock.
 *
 * Secure with a secret token in production.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Find all expired pending reservations
    const expired = await prisma.reservation.findMany({
      where: {
        status: "PENDING",
        expiresAt: { lt: new Date() },
      },
      select: {
        id: true,
        productId: true,
        warehouseId: true,
        quantity: true,
      },
    });

    if (expired.length === 0) {
      return NextResponse.json({ released: 0, message: "Nothing to clean up" });
    }

    // Run all releases in a single transaction
    await prisma.$transaction(async (tx) => {
      for (const res of expired) {
        await tx.$executeRaw`
          UPDATE stock_levels
          SET "reservedUnits" = GREATEST("reservedUnits" - ${res.quantity}, 0),
              "updatedAt"     = NOW()
          WHERE "productId"   = ${res.productId}
            AND "warehouseId" = ${res.warehouseId}
        `;
      }

      await tx.$executeRaw`
        UPDATE reservations
        SET status      = 'RELEASED',
            "updatedAt" = NOW()
        WHERE status     = 'PENDING'
          AND "expiresAt" < NOW()
      `;
    });

    console.log(`[CRON] Released ${expired.length} expired reservations`);

    return NextResponse.json({
      released: expired.length,
      ids: expired.map((r) => r.id),
    });
  } catch (error) {
    console.error("[GET /api/cron/cleanup]", error);
    return NextResponse.json(
      { error: "Cleanup failed" },
      { status: 500 }
    );
  }
}
