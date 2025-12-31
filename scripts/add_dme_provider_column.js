import dotenv from "dotenv";
import { pool } from "../src/config/db.drizzle.js";

dotenv.config();

// Valid DME provider options
const DME_OPTIONS = [
  "none",
  "wheelchair",
  "oxygen",
  "bed",
  "over bed table",
  "pressure mattress",
];

async function addDmeProviderColumn() {
  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL is not defined in environment variables");
    process.exit(1);
  }

  console.log("🔍 Checking if dme_provider column exists...");

  const client = await pool.connect();

  try {
    // Check if column exists
    const checkResult = await client.query(
      `
      SELECT 1
      FROM information_schema.columns
      WHERE table_name = 'patients'
        AND column_name = 'dme_provider'
      `
    );

    if (checkResult.rowCount > 0) {
      console.log("✅ dme_provider column already exists in patients table");
      return;
    }

    // Add the column
    console.log("🔧 Adding dme_provider column to patients table...");
    await client.query(
      `ALTER TABLE patients ADD COLUMN "dme_provider" VARCHAR(255)`
    );

    console.log("✅ dme_provider column added successfully!");
    console.log("📝 Note: Existing records will have NULL values.");
    console.log("📝 Valid options are:", DME_OPTIONS.join(", "));
  } catch (error) {
    console.error("❌ Error adding dme_provider column:", error);
    throw error;
  } finally {
    client.release();
  }
}

// Run the script
addDmeProviderColumn()
  .then(() => {
    console.log("✅ Script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });

