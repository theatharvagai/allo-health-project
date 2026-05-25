import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding database...");

  // Clear existing data
  await prisma.reservation.deleteMany();
  await prisma.stockLevel.deleteMany();
  await prisma.product.deleteMany();
  await prisma.warehouse.deleteMany();

  // Create warehouses
  const warehouseMumbai = await prisma.warehouse.create({
    data: { name: "Mumbai Central", location: "Mumbai, Maharashtra" },
  });
  const warehouseDelhi = await prisma.warehouse.create({
    data: { name: "Delhi North Hub", location: "New Delhi, Delhi" },
  });
  const warehouseBangalore = await prisma.warehouse.create({
    data: { name: "Bangalore Tech Park", location: "Bengaluru, Karnataka" },
  });

  console.log("✅ Warehouses created");

  // Create products
  const products = await Promise.all([
    prisma.product.create({
      data: {
        name: "Sony WH-1000XM5 Headphones",
        description:
          "Industry-leading noise cancelling wireless headphones with 30-hour battery life and crystal clear hands-free calling.",
        imageUrl:
          "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400",
      },
    }),
    prisma.product.create({
      data: {
        name: "Apple MacBook Air M2",
        description:
          "Supercharged by M2 chip. Strikingly thin design, 15.3-inch Liquid Retina display, up to 18 hours battery.",
        imageUrl:
          "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400",
      },
    }),
    prisma.product.create({
      data: {
        name: 'Samsung 4K OLED TV 55"',
        description:
          "Quantum HDR OLED, Neural Quantum Processor 4K, Object Tracking Sound, and Gaming Hub built-in.",
        imageUrl:
          "https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=400",
      },
    }),
    prisma.product.create({
      data: {
        name: "Nike Air Max 270",
        description:
          "Inspired by two icons of big Air: the Air Max 180 and Air Max 93. Max air cushioning in heel.",
        imageUrl:
          "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400",
      },
    }),
    prisma.product.create({
      data: {
        name: "Dyson V15 Detect Vacuum",
        description:
          "Laser reveals hidden dust. Intelligent suction adapts to floor type. 60 min run time.",
        imageUrl:
          "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400",
      },
    }),
    prisma.product.create({
      data: {
        name: "Kindle Paperwhite (16GB)",
        description:
          "3 months free Kindle Unlimited. 6.8\" display, adjustable warm light, waterproof, weeks of battery.",
        imageUrl:
          "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=400",
      },
    }),
  ]);

  console.log("✅ Products created");

  // Create stock levels
  const stockData = [
    // Sony Headphones
    { product: products[0], warehouse: warehouseMumbai, total: 50, reserved: 0 },
    { product: products[0], warehouse: warehouseDelhi, total: 30, reserved: 0 },
    { product: products[0], warehouse: warehouseBangalore, total: 1, reserved: 0 }, // low stock!
    // MacBook Air
    { product: products[1], warehouse: warehouseMumbai, total: 15, reserved: 0 },
    { product: products[1], warehouse: warehouseDelhi, total: 8, reserved: 0 },
    { product: products[1], warehouse: warehouseBangalore, total: 12, reserved: 0 },
    // Samsung TV
    { product: products[2], warehouse: warehouseMumbai, total: 20, reserved: 0 },
    { product: products[2], warehouse: warehouseDelhi, total: 5, reserved: 0 },
    // Nike Air Max
    { product: products[3], warehouse: warehouseMumbai, total: 100, reserved: 0 },
    { product: products[3], warehouse: warehouseDelhi, total: 75, reserved: 0 },
    { product: products[3], warehouse: warehouseBangalore, total: 60, reserved: 0 },
    // Dyson Vacuum
    { product: products[4], warehouse: warehouseMumbai, total: 10, reserved: 0 },
    { product: products[4], warehouse: warehouseBangalore, total: 3, reserved: 0 },
    // Kindle
    { product: products[5], warehouse: warehouseMumbai, total: 200, reserved: 0 },
    { product: products[5], warehouse: warehouseDelhi, total: 150, reserved: 0 },
    { product: products[5], warehouse: warehouseBangalore, total: 1, reserved: 0 }, // last unit!
  ];

  await Promise.all(
    stockData.map(({ product, warehouse, total, reserved }) =>
      prisma.stockLevel.create({
        data: {
          productId: product.id,
          warehouseId: warehouse.id,
          totalUnits: total,
          reservedUnits: reserved,
        },
      })
    )
  );

  console.log("✅ Stock levels created");
  console.log(`
🎉 Seed complete!
   - ${products.length} products
   - 3 warehouses
   - ${stockData.length} stock records

   Tip: Some items have only 1 unit — perfect for testing race conditions!
  `);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
