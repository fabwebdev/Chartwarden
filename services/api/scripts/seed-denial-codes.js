#!/usr/bin/env node

/**
 * Seed Denial Codes Script
 * Populates CARC/RARC codes and denial categories
 *
 * Usage: node scripts/seed-denial-codes.js
 */

import DenialCodesService from '../src/services/DenialCodes.service.js';

async function main() {
  console.log('🌱 Starting CARC/RARC code seeding...\n');

  try {
    const results = await DenialCodesService.seedAll();

    console.log('\n✅ Seeding completed successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📊 CARC Codes: ${results.carc.count} codes`);
    console.log(`📊 RARC Codes: ${results.rarc.count} codes`);
    console.log(`📊 Denial Categories: ${results.categories.count} categories`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('💡 Next steps:');
    console.log('   1. Verify codes: SELECT * FROM carc_codes LIMIT 10;');
    console.log('   2. Test lookup: Use DenialCodesService.getCARCCode("50");');
    console.log('   3. Integrate with ERA processing for automatic denial analysis\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error seeding codes:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
