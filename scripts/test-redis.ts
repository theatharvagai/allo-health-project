import "dotenv/config";
import { Redis } from "@upstash/redis";

const r = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

async function test() {
  await r.set("test-key", "allo-redis-ok");
  const val = await r.get("test-key");
  console.log("✅ Redis connection OK:", val);
  await r.del("test-key");
}

test().catch(console.error);
