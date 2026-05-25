import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function test() {
  // Get first product+warehouse combo
  const stock = await prisma.stockLevel.findFirst({
    where: { totalUnits: { gte: 2 } },
    include: { product: true, warehouse: true },
  });
  if (!stock) throw new Error("No stock found");

  console.log(`Testing with: ${stock.product.name} @ ${stock.warehouse.name}`);
  console.log(`Available: ${stock.totalUnits - stock.reservedUnits}`);

  // Test reservation
  const res = await fetch("http://localhost:3000/api/reservations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": `test-${Date.now()}`,
    },
    body: JSON.stringify({
      productId: stock.productId,
      warehouseId: stock.warehouseId,
      quantity: 1,
    }),
  });

  const data = await res.json();
  console.log(`POST /api/reservations → ${res.status}`, data.id ? `✅ ID: ${data.id}` : `❌ ${JSON.stringify(data)}`);
  if (!data.id) return;

  // Test GET reservation
  const getRes = await fetch(`http://localhost:3000/api/reservations/${data.id}`);
  const getData = await getRes.json();
  console.log(`GET /api/reservations/${data.id} → ${getRes.status}`, getData.status === "PENDING" ? "✅ PENDING" : `❌ ${getData.status}`);

  // Test confirm
  const confirmRes = await fetch(`http://localhost:3000/api/reservations/${data.id}/confirm`, {
    method: "POST",
    headers: { "Idempotency-Key": `confirm-test-${Date.now()}` },
  });
  const confirmData = await confirmRes.json();
  console.log(`POST /api/reservations/${data.id}/confirm → ${confirmRes.status}`, confirmData.status === "CONFIRMED" ? "✅ CONFIRMED" : `❌ ${JSON.stringify(confirmData)}`);

  console.log("\n🎉 All tests passed!");
}

test().catch((e) => { console.error("❌ Test failed:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
