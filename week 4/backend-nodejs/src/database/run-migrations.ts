import 'reflect-metadata';
import { AppDataSource } from '../config/data-source';
import { logger } from '../common/utils/logger';

async function runMigrations() {
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      logger.info('Database connected for migrations');
    }

    logger.info('Running pending migrations...');
    await AppDataSource.runMigrations();
    logger.info('Migrations completed successfully');

    await AppDataSource.destroy();
  } catch (err) {
    if (err instanceof Error) {
      logger.error('Migration failed', { error: err.message });
    }
    process.exit(1);
  }
}

runMigrations();
