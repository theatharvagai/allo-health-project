# Allo Inventory — Take-Home Exercise

A real-time inventory reservation system built for the **Allo Engineering** take-home exercise.  
Live URL: *(add your Vercel URL here after deploy)*  
Repo: https://github.com/theatharvagai/allo-health-project

---

## What it does

When a customer clicks "Reserve", we hold their units for **10 minutes**.  
- ✅ If they confirm (payment success) → stock is permanently decremented  
- 🔓 If they cancel or the timer runs out → stock is released back immediately

This prevents two customers from buying the same last item (no double-booking).

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Database | Prisma ORM + Neon (hosted Postgres) |
| Cache / Idempotency | Upstash Redis |
| Validation | Zod |
| UI | Tailwind CSS + shadcn/ui |
| Deploy | Vercel |

---

## Running Locally

### 1. Clone & install

```bash
git clone https://github.com/theatharvagai/allo-health-project.git
cd allo-health-project
npm install
```

### 2. Set up environment variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

You need:
- **DATABASE_URL** — get from [neon.tech](https://neon.tech) → New Project → Connection String
- **UPSTASH_REDIS_REST_URL** and **UPSTASH_REDIS_REST_TOKEN** — get from [upstash.com](https://upstash.com) → Create Redis Database → REST API tab

### 3. Run database migration

```bash
npx prisma migrate dev --name init
```

### 4. Seed the database

```bash
npm run db:seed
```

This creates 6 products, 3 warehouses, and stock levels — including some items with only **1 unit** (perfect for testing race conditions).

### 5. Start the dev server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

---

## How Reservation Expiry Works

### In Production (Vercel Cron)

`vercel.json` configures a cron job that calls `/api/cron/cleanup` every minute.  
This endpoint finds all `PENDING` reservations past their `expiresAt` timestamp and:
1. Sets their status to `RELEASED`
2. Restores the `reservedUnits` back to the stock level row

### Lazy Cleanup (Built-in)

Every time a new reservation is **created** for a product/warehouse, we also release expired reservations for that same SKU inside the same transaction. This means even without the cron running, stock leaks are self-healing during normal traffic.

### Trade-off

The cron runs at most once per minute, so in the worst case an expired reservation holds stock for ~60 extra seconds. This is acceptable for a checkout flow. A production system might use a Redis sorted-set TTL queue for millisecond precision.

---

## How the Race Condition is Prevented

The `POST /api/reservations` endpoint uses **pessimistic locking**:

```sql
SELECT id, total_units, reserved_units
FROM stock_levels
WHERE product_id = $1 AND warehouse_id = $2
FOR UPDATE   -- ← this is the magic
```

`FOR UPDATE` tells Postgres to **lock that row** until the transaction commits. If two requests arrive simultaneously for the last unit:

1. Request A grabs the lock, checks available = 1, increments `reserved_units`, commits ✅
2. Request B waits, gets the lock after A commits, checks available = 0, returns **409** ❌

This is mathematically impossible to double-book because Postgres serializes access to that row.

---

## Idempotency (Bonus)

Both `POST /api/reservations` and `POST /api/reservations/:id/confirm` support an optional `Idempotency-Key` header.

How it works:
1. Client sends a unique key with the request (e.g. a UUID)
2. Server checks Upstash Redis for `idempotency:{key}`
3. If found → return the cached response immediately (no side effect)
4. If not found → execute the operation, then store `{status, body}` in Redis with a 24-hour TTL

This means a network retry with the same key is completely safe — you'll never double-reserve.

---

## API Reference

| Method | Path | Response |
|--------|------|---------|
| GET | `/api/products` | List products with stock per warehouse |
| GET | `/api/warehouses` | List all warehouses |
| POST | `/api/reservations` | Create reservation (`201`), insufficient stock (`409`) |
| GET | `/api/reservations/:id` | Get a reservation |
| POST | `/api/reservations/:id/confirm` | Confirm (`200`), expired (`410`) |
| POST | `/api/reservations/:id/release` | Release early (`200`) |
| GET | `/api/cron/cleanup` | Release expired reservations (cron) |

---

## Trade-offs & Things I'd Do Differently

### What I focused on
- **Correctness first**: The pessimistic locking approach is bulletproof. A Zod + DB-layer guarantee means no optimistic race can slip through.
- **Idempotency**: Implemented properly with Redis, not just a DB unique constraint (which wouldn't handle cross-service retries).
- **Clean separation**: Schemas in `lib/schemas.ts`, DB logic in API routes, UI state in client components.

### What I'd improve with more time
1. **Auth**: Real users with sessions — right now anyone can confirm/cancel any reservation by ID.
2. **Pessimistic lock timeout**: Set `lock_timeout` to avoid long waits under extreme load.
3. **Redis TTL queue for expiry**: Instead of polling with cron, push reservation IDs into a Redis sorted set at creation time. A worker pops expired entries with zero latency.
4. **Optimistic UI updates**: Currently the product page re-fetches after reserve. Could use SWR/React Query for smarter cache invalidation.
5. **Tests**: Concurrency test with `Promise.all` of 10 simultaneous reservation requests to prove only one succeeds.
6. **Metrics**: Track reservation success/failure rates, average checkout time, stock turnover per warehouse.

---

## Local Dev Commands

```bash
npm run dev          # start dev server
npm run db:migrate   # run prisma migrations
npm run db:seed      # seed the database
npm run db:studio    # open Prisma Studio (visual DB browser)
npm run db:reset     # reset + re-seed (destructive!)
npm run build        # production build
```
