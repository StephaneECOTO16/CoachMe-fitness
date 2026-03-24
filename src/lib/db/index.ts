/**
 * Prisma client singleton with proper serverless handling.
 *
 * On Vercel (serverless), each function invocation risks creating a new
 * PrismaClient instance, exhausting the PostgreSQL connection pool.
 * We store the instance on the Node.js global object in development
 * to survive hot-reloads, and rely on Supabase's PgBouncer pooler
 * (POSTGRES_PRISMA_URL with ?pgbouncer=true) in production to cap
 * connections regardless of instance count.
 *
 * Never import PrismaClient directly anywhere else — always use this.
 */

import { PrismaClient } from "@prisma/client";
import { logger } from "@/lib/logger";

// Extend the Node.js global type so TypeScript knows about our cache
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

function createPrismaClient(): PrismaClient {
  const client = new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "warn", "error"]
        : ["warn", "error"],
  });

  // Log slow queries in all environments
  // @ts-expect-error — Prisma event types are not fully typed
  client.$on("query", (e: { duration: number; query: string }) => {
    if (e.duration > 500) {
      logger.warn({ duration: e.duration, query: e.query }, "Slow Prisma query");
    }
  });

  return client;
}

// In development: reuse across hot-reloads to avoid connection exhaustion.
// In production: each serverless instance gets one client, which is fine
// because Supabase's PgBouncer pools connections at the infrastructure level.
export const prisma = globalThis.__prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__prisma = prisma;
}
