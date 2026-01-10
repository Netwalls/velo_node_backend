require("dotenv").config();
const { Client } = require("pg");

const client = new Client({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    await client.connect();
    const res = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default, numeric_precision, numeric_scale
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position;
    `);
    console.log("users table columns:");
    res.rows.forEach((r) => {
      console.log(
        r.column_name,
        r.data_type,
        r.is_nullable,
        r.column_default,
        r.numeric_precision,
        r.numeric_scale
      );
    });
  } catch (err) {
    console.error("Error checking columns:", err.message || err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
