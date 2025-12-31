import dotenv from "dotenv";
import { pool } from "../src/config/db.drizzle.js";

dotenv.config();

async function addVeteransStatusColumn() {
  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL is not defined in environment variables");
    process.exit(1);
  }

  console.log("🔍 Checking if veterans_status column exists...");

  const client = await pool.connect();

  try {
    // Check if column exists
    const checkResult = await client.query(
      `
      SELECT 1
      FROM information_schema.columns
      WHERE table_name = 'patients'
        AND column_name = 'veterans_status'
      `
    );

    if (checkResult.rowCount > 0) {
      console.log("✅ veterans_status column already exists in patients table");
      return;
    }

    // Add the column
    console.log("🔧 Adding veterans_status column to patients table...");
    await client.query(
      `ALTER TABLE patients ADD COLUMN "veterans_status" BIGINT`
    );

    console.log("✅ veterans_status column added successfully!");
    console.log("📝 Note: Existing records will have NULL values. You can update them as needed.");
  } catch (error) {
    console.error("❌ Error adding veterans_status column:", error);
    throw error;
  } finally {
    client.release();
  }
}

// Run the script
addVeteransStatusColumn()
  .then(() => {
    console.log("✅ Script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });

