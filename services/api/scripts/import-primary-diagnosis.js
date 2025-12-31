import dotenv from "dotenv";
import { db } from "../src/config/db.drizzle.js";
import { primary_diagnosis } from "../src/db/schemas/primaryDiagnosis.schema.js";
import { eq } from "drizzle-orm";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Import Primary Diagnoses from CSV or JSON file
 * 
 * CSV Format:
 * code,description
 * A00,Cholera
 * A01,Typhoid and paratyphoid fevers
 * 
 * JSON Format:
 * [
 *   { "code": "A00", "description": "Cholera" },
 *   { "code": "A01", "description": "Typhoid and paratyphoid fevers" }
 * ]
 */

async function importPrimaryDiagnoses(filePath) {
  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL is not defined in environment variables");
    process.exit(1);
  }

  const fullPath = path.resolve(filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.error(`❌ File not found: ${fullPath}`);
    process.exit(1);
  }

  console.log(`📂 Reading file: ${fullPath}`);
  
  let diagnoses = [];
  const fileExtension = path.extname(fullPath).toLowerCase();

  try {
    if (fileExtension === '.json') {
      // Read JSON file
      const fileContent = fs.readFileSync(fullPath, 'utf8');
      const data = JSON.parse(fileContent);
      
      if (Array.isArray(data)) {
        diagnoses = data.map(item => ({
          code: item.code || item.Code || item.CODE || item.name || item.Name,
          description: item.description || item.Description || item.DESCRIPTION || item.desc || item.desc,
        }));
      } else {
        console.error("❌ JSON file must contain an array of diagnosis objects");
        process.exit(1);
      }
    } else if (fileExtension === '.csv') {
      // Read CSV file
      const fileContent = fs.readFileSync(fullPath, 'utf8');
      const lines = fileContent.split('\n').filter(line => line.trim());
      
      // Parse header
      const header = lines[0].split(',').map(h => h.trim().toLowerCase());
      const codeIndex = header.findIndex(h => h === 'code' || h === 'name' || h === 'icd10');
      const descIndex = header.findIndex(h => h === 'description' || h === 'desc' || h === 'diagnosis');
      
      if (codeIndex === -1 || descIndex === -1) {
        console.error("❌ CSV must have 'code' and 'description' columns");
        console.error("   Found columns:", header.join(", "));
        process.exit(1);
      }
      
      // Parse data rows
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        if (values[codeIndex] && values[descIndex]) {
          diagnoses.push({
            code: values[codeIndex],
            description: values[descIndex],
          });
        }
      }
    } else {
      console.error("❌ Unsupported file format. Please use .csv or .json");
      process.exit(1);
    }

    console.log(`📊 Found ${diagnoses.length} diagnoses to import`);

    let insertedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    // Import in batches for better performance
    const batchSize = 100;
    for (let i = 0; i < diagnoses.length; i += batchSize) {
      const batch = diagnoses.slice(i, i + batchSize);
      
      for (const diag of batch) {
        try {
          // Check if already exists
          const existing = await db
            .select()
            .from(primary_diagnosis)
            .where(eq(primary_diagnosis.diagnosis_code, diag.code))
            .limit(1);
          
          if (existing.length > 0) {
            skippedCount++;
            continue;
          }
          
          // Insert new diagnosis
          const now = new Date();
          await db.insert(primary_diagnosis).values({
            diagnosis_code: diag.code,
            diagnosis_description: diag.description,
            createdAt: now,
            updatedAt: now,
          });
          
          insertedCount++;
          
          if (insertedCount % 100 === 0) {
            console.log(`   ✅ Processed ${insertedCount} diagnoses...`);
          }
        } catch (error) {
          console.error(`❌ Error inserting "${diag.code}":`, error.message);
          errorCount++;
        }
      }
    }

    console.log(`\n📊 Import Summary:`);
    console.log(`   ✅ Inserted: ${insertedCount}`);
    console.log(`   ⏭️  Skipped (already exists): ${skippedCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`   📦 Total: ${diagnoses.length}`);

    // Verify
    const totalCount = await db.select().from(primary_diagnosis);
    console.log(`\n📊 Total diagnoses in database: ${totalCount.length}`);

  } catch (error) {
    console.error("❌ Error importing diagnoses:", error);
    throw error;
  }
}

// Run if called directly
const filePath = process.argv[2];
if (!filePath) {
  console.log(`
Usage: node scripts/import-primary-diagnosis.js <file-path>

Examples:
  node scripts/import-primary-diagnosis.js data/icd10-codes.csv
  node scripts/import-primary-diagnosis.js data/icd10-codes.json

File Formats:
  CSV: code,description
  JSON: [{"code": "A00", "description": "Cholera"}]
  `);
  process.exit(1);
}

importPrimaryDiagnoses(filePath)
  .then(() => {
    console.log("\n✅ Import completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Import failed:", error);
    process.exit(1);
  });

