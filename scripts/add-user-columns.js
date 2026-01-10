require("dotenv").config();
const { Client } = require("pg");

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL not set in .env");
  process.exit(1);
}

const client = new Client({ connectionString });

async function run() {
  try {
    await client.connect();
    console.log("Connected to DB. Running ALTER TABLE...");
    await client.query("BEGIN");
    await client.query(
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS "bankName" varchar;'
    );
    await client.query(
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS "accountNumber" varchar;'
    );
    await client.query(
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS "accountName" varchar;'
    );
    // Balance columns matching entity definitions
    await client.query(
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS "usdtBalance" numeric(18,8) DEFAULT 0;'
    );
    await client.query(
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS "ethBalance" numeric(30,18) DEFAULT 0;'
    );
    await client.query(
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS "strkBalance" numeric(30,18) DEFAULT 0;'
    );
    await client.query(
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS "solBalance" numeric(30,18) DEFAULT 0;'
    );
    await client.query(
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS "btcBalance" numeric(30,8) DEFAULT 0;'
    );
    await client.query(
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS "xlmBalance" numeric(30,7) DEFAULT 0;'
    );
    await client.query(
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS "dotBalance" numeric(30,10) DEFAULT 0;'
    );
    // OTP, reset tokens, transaction PIN, kyc status
    await client.query(
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS "emailOTP" varchar;'
    );
    await client.query(
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS "emailOTPExpiry" timestamp;'
    );
    await client.query(
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS "phoneOTP" varchar;'
    );
    await client.query(
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS "phoneOTPExpiry" timestamp;'
    );
    await client.query(
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS "passwordResetToken" varchar;'
    );
    await client.query(
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS "passwordResetExpiry" timestamp;'
    );
    await client.query(
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS "transactionPin" varchar;'
    );
    await client.query(
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS \"kycStatus\" varchar DEFAULT 'pending';"
    );
    await client.query("COMMIT");
    ('ALTER TABLE users ADD COLUMN IF NOT EXISTS "accountNumber" varchar;');

    await client.query(
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS "accountName" varchar;'
    );
    await client.query("COMMIT");
    console.log("Columns added (if they did not exist)");
  } catch (err) {
    console.error("Error running ALTER TABLE:", err.stack || err);
    try {
      await client.query("ROLLBACK");
    } catch (e) {}
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
