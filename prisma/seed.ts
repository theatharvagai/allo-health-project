import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding Allo Health database...");

  // Clear existing data
  await prisma.reservation.deleteMany();
  await prisma.stockLevel.deleteMany();
  await prisma.product.deleteMany();
  await prisma.warehouse.deleteMany();

  // ── Allo Health Centres (Warehouses) ──────────────────────────────────────
  const centres = await Promise.all([
    prisma.warehouse.create({ data: { name: "Allo Health Bangalore", location: "Koramangala, Bengaluru, Karnataka" } }),
    prisma.warehouse.create({ data: { name: "Allo Health Delhi", location: "Connaught Place, New Delhi" } }),
    prisma.warehouse.create({ data: { name: "Allo Health Hyderabad", location: "Banjara Hills, Hyderabad, Telangana" } }),
    prisma.warehouse.create({ data: { name: "Allo Health Chennai", location: "Anna Nagar, Chennai, Tamil Nadu" } }),
    prisma.warehouse.create({ data: { name: "Allo Health Mumbai", location: "Andheri West, Mumbai, Maharashtra" } }),
  ]);

  const [bangalore, delhi, hyderabad, chennai, mumbai] = centres;
  console.log("✅ Allo Health Centres created (Bangalore, Delhi, Hyderabad, Chennai, Mumbai)");

  // ── Pharmacy Products (9) ─────────────────────────────────────────────────
  const products = await Promise.all([
    // 1. Metformin (Diabetes medicine)
    prisma.product.create({
      data: {
        name: "Metformin 500mg Tablets",
        description: "First-line oral antidiabetic medication for Type 2 Diabetes management. 30-tablet strip. Prescription required.",
        imageUrl: "/products/metformin.png",
      },
    }),
    // 2. Omeprazole (Antacid)
    prisma.product.create({
      data: {
        name: "Omeprazole 20mg Capsules",
        description: "Proton pump inhibitor for acid reflux, GERD, and peptic ulcer treatment. 14-capsule pack.",
        imageUrl: "/products/omeprazole.png",
      },
    }),
    // 3. Digital BP Monitor
    prisma.product.create({
      data: {
        name: "Automatic BP Monitor (Upper Arm)",
        description: "Clinically validated blood pressure monitor with large LCD display, irregular heartbeat detection, and memory for 60 readings.",
        imageUrl: "/products/bp_monitor.png",
      },
    }),
    // 4. Pulse Oximeter
    prisma.product.create({
      data: {
        name: "Fingertip Pulse Oximeter",
        description: "Medical-grade SpO2 and heart rate monitor. Fast 6-second reading. OLED display. Includes carry case and lanyard.",
        imageUrl: "/products/oximeter.png",
      },
    }),
    // 5. Glucometer Kit
    prisma.product.create({
      data: {
        name: "Blood Glucose Glucometer Kit",
        description: "Includes glucometer device, 10 test strips, lancets, and lancing device. Results in 5 seconds. No coding required.",
        imageUrl: "/products/glucometer.png",
      },
    }),
    // 6. Cetirizine (Antihistamine)
    prisma.product.create({
      data: {
        name: "Cetirizine 10mg Tablets",
        description: "Second-generation antihistamine for allergic rhinitis, urticaria, and seasonal allergies. Non-drowsy formula. 10-tablet strip.",
        imageUrl: "/products/cetirizine.png",
      },
    }),
    // 7. Nebulizer
    prisma.product.create({
      data: {
        name: "Compressor Nebulizer Machine",
        description: "For asthma, COPD, and respiratory conditions. Converts liquid medication into fine mist. Includes adult and child masks. Quiet operation.",
        imageUrl: "/products/nebulizer.png",
      },
    }),
    // 8. Vitamin D3 + K2
    prisma.product.create({
      data: {
        name: "Vitamin D3 + K2 Supplements",
        description: "High-potency Vitamin D3 2000 IU with K2-MK7 100mcg for bone health, immunity, and calcium absorption. 60 softgel capsules.",
        imageUrl: "/products/vitamin.png",
      },
    }),
    // 9. Rapid Antigen Test Kit
    prisma.product.create({
      data: {
        name: "Rapid Antigen Test Kit",
        description: "ICMR-approved home antigen test. Accurate results in 15 minutes. Easy self-collection nasal swab. Includes extraction tube and test card.",
        imageUrl: "/products/antigen.png",
      },
    }),
  ]);

  console.log(`✅ ${products.length} pharmacy products created`);

  // ── Stock Levels per Centre ───────────────────────────────────────────────
  // Spread stock realistically — some centres have low stock to demo alerts
  const stockData = [
    // 1. Metformin
    { product: products[0], warehouse: bangalore, total: 200, reserved: 0 },
    { product: products[0], warehouse: delhi, total: 150, reserved: 0 },
    { product: products[0], warehouse: hyderabad, total: 1, reserved: 0 },  // last one!
    { product: products[0], warehouse: chennai, total: 100, reserved: 0 },
    // 2. Omeprazole
    { product: products[1], warehouse: bangalore, total: 80, reserved: 0 },
    { product: products[1], warehouse: mumbai, total: 60, reserved: 0 },
    { product: products[1], warehouse: delhi, total: 3, reserved: 0 },      // low stock
    // 3. BP Monitor
    { product: products[2], warehouse: bangalore, total: 25, reserved: 0 },
    { product: products[2], warehouse: delhi, total: 15, reserved: 0 },
    { product: products[2], warehouse: hyderabad, total: 10, reserved: 0 },
    { product: products[2], warehouse: chennai, total: 5, reserved: 0 },    // low stock
    { product: products[2], warehouse: mumbai, total: 20, reserved: 0 },
    // 4. Pulse Oximeter
    { product: products[3], warehouse: bangalore, total: 40, reserved: 0 },
    { product: products[3], warehouse: hyderabad, total: 1, reserved: 0 },  // last one!
    { product: products[3], warehouse: mumbai, total: 30, reserved: 0 },
    // 5. Glucometer Kit
    { product: products[4], warehouse: delhi, total: 18, reserved: 0 },
    { product: products[4], warehouse: chennai, total: 12, reserved: 0 },
    { product: products[4], warehouse: bangalore, total: 2, reserved: 0 },  // low stock
    // 6. Cetirizine
    { product: products[5], warehouse: bangalore, total: 300, reserved: 0 },
    { product: products[5], warehouse: delhi, total: 250, reserved: 0 },
    { product: products[5], warehouse: hyderabad, total: 180, reserved: 0 },
    { product: products[5], warehouse: chennai, total: 200, reserved: 0 },
    { product: products[5], warehouse: mumbai, total: 220, reserved: 0 },
    // 7. Nebulizer
    { product: products[6], warehouse: bangalore, total: 8, reserved: 0 },
    { product: products[6], warehouse: delhi, total: 5, reserved: 0 },
    { product: products[6], warehouse: mumbai, total: 3, reserved: 0 },     // low stock
    // 8. Vitamin D3 + K2
    { product: products[7], warehouse: bangalore, total: 120, reserved: 0 },
    { product: products[7], warehouse: hyderabad, total: 90, reserved: 0 },
    { product: products[7], warehouse: chennai, total: 75, reserved: 0 },
    { product: products[7], warehouse: mumbai, total: 60, reserved: 0 },
    // 9. Rapid Antigen Test
    { product: products[8], warehouse: bangalore, total: 500, reserved: 0 },
    { product: products[8], warehouse: delhi, total: 400, reserved: 0 },
    { product: products[8], warehouse: hyderabad, total: 1, reserved: 0 },  // last one!
    { product: products[8], warehouse: chennai, total: 350, reserved: 0 },
    { product: products[8], warehouse: mumbai, total: 300, reserved: 0 },
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

  console.log(`✅ ${stockData.length} stock records created`);
  console.log(`
🏥 Allo Health Seed Complete!
   - ${products.length} pharmacy products & medical equipment
   - 5 Allo Health centres (Bangalore, Delhi, Hyderabad, Chennai, Mumbai)
   - ${stockData.length} stock level records
   
   Some centres have only 1 unit — perfect for testing pessimistic locking!
  `);
}

main()
  .catch((e) => { console.error("❌ Seed failed:", e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
