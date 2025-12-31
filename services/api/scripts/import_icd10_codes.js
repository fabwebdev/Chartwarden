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
 * Import ICD-10 codes from text file
 * 
 * Text Format:
 * CODE - Description
 * A000  - Cholera due to Vibrio cholerae 01, biovar cholerae
 * A001  - Cholera due to Vibrio cholerae 01, biovar eltor
 */

async function importICD10Codes(filePath) {
  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL is not defined in environment variables");
    process.exit(1);
  }

  // Default to icd10-codes.txt in project root if no path provided
  const fullPath = filePath 
    ? path.resolve(filePath)
    : path.resolve(__dirname, "..", "icd10-codes.txt");
  
  if (!fs.existsSync(fullPath)) {
    console.error(`❌ File not found: ${fullPath}`);
    process.exit(1);
  }

  console.log(`📂 Reading file: ${fullPath}`);
  
  try {
    const fileContent = fs.readFileSync(fullPath, 'utf8');
    const lines = fileContent.split('\n').filter(line => line.trim());
    
    console.log(`📊 Found ${lines.length} lines to process`);

    const diagnoses = [];
    
    // Parse each line: "CODE - Description"
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;
      
      // Match pattern: CODE - Description
      // Handle various formats: "CODE - Description", "CODE- Description", "CODE -Description"
      const match = trimmedLine.match(/^([A-Z0-9.]+)\s*-\s*(.+)$/);
      
      if (match) {
        const code = match[1].trim();
        const description = match[2].trim();
        
        if (code && description) {
          diagnoses.push({ code, description });
        }
      } else {
        // Try alternative format without dash
        const parts = trimmedLine.split(/\s{2,}/); // Split on 2+ spaces
        if (parts.length >= 2) {
          const code = parts[0].trim();
          const description = parts.slice(1).join(' ').trim();
          if (code && description) {
            diagnoses.push({ code, description });
          }
        } else {
          console.warn(`⚠️  Skipping line (unable to parse): ${trimmedLine.substring(0, 50)}...`);
        }
      }
    }

    console.log(`📊 Parsed ${diagnoses.length} ICD-10 codes to import`);

    if (diagnoses.length === 0) {
      console.error("❌ No valid ICD-10 codes found in file");
      process.exit(1);
    }

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
            console.log(`   ✅ Processed ${insertedCount} codes...`);
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
    console.error("❌ Error importing ICD-10 codes:", error);
    throw error;
  }
}

// Run if called directly
const filePath = process.argv[2];

importICD10Codes(filePath)
  .then(() => {
    console.log("\n✅ Import completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Import failed:", error);
    process.exit(1);
  });

