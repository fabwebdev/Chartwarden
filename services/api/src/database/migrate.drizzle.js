import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { db } from '../config/db.drizzle.js';

import { logger } from '../utils/logger.js';
async function runMigrations() {
  try {
    logger.info('Running migrations...')
    await migrate(db, { migrationsFolder: './database/migrations/drizzle' });
    logger.info('Migrations completed successfully!')
  } catch (error) {
    logger.error('Error running migrations:', error)
    process.exit(1);
  }
}

runMigrations();