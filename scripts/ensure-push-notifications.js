const { Client } = require('pg');

async function main() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL is required to ensure push notification tables.');
  }

  const client = new Client({
    connectionString,
    ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false },
  });

  await client.connect();

  try {
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS "PushSubscription" (
        "id" SERIAL NOT NULL,
        "userId" UUID NOT NULL,
        "endpoint" TEXT NOT NULL,
        "p256dh" TEXT NOT NULL,
        "auth" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS "Notification" (
        "id" SERIAL NOT NULL,
        "userId" UUID NOT NULL,
        "title" TEXT NOT NULL,
        "body" TEXT NOT NULL,
        "type" TEXT NOT NULL DEFAULT 'SYSTEM',
        "isRead" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
      );
    `);

    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "PushSubscription_endpoint_key"
      ON "PushSubscription"("endpoint");
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS "PushSubscription_userId_idx"
      ON "PushSubscription"("userId");
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS "Notification_userId_idx"
      ON "Notification"("userId");
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS "Notification_createdAt_idx"
      ON "Notification"("createdAt");
    `);

    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'PushSubscription_userId_fkey'
        ) THEN
          ALTER TABLE "PushSubscription"
          ADD CONSTRAINT "PushSubscription_userId_fkey"
          FOREIGN KEY ("userId") REFERENCES "User"("id")
          ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
      END $$;
    `);

    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'Notification_userId_fkey'
        ) THEN
          ALTER TABLE "Notification"
          ADD CONSTRAINT "Notification_userId_fkey"
          FOREIGN KEY ("userId") REFERENCES "User"("id")
          ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
      END $$;
    `);

    await client.query('COMMIT');
    console.log('Push notification tables are ready.');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
