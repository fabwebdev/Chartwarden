import { logger } from '../../utils/logger.js';

class DatabaseSeeder {
  /**
   * Seed the application's database.
   *
   * @return {Promise<void>}
   */
  async run() {
    // In Fastify/Node.js, we would typically call other seeder files directly
    // This is a placeholder to match Laravel's structure
    logger.info('Running database seeders...')
    
    // Call other seeders
    // await UserSeeder.run();
    // await SelectSeeder.run();
    
    logger.info('Database seeding completed.')
  }
}

export default new DatabaseSeeder();