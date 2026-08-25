import 'reflect-metadata';
import app from './app';
import { env } from './config/env';
import { logger } from './common/utils/logger';
import { AppDataSource } from './config/data-source';

const PORT = env.PORT;

async function start() {
  try {
    // Initialize database
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      logger.info('Database initialized successfully');
    }

    const server = app.listen(PORT, () => {
      logger.info(`Server running`, {
        port: PORT,
        environment: env.NODE_ENV,
      });
    });

    // Handle EADDRINUSE error
    server.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        logger.error(`Port ${PORT} is already in use`);
        process.exit(1);
      }
      throw err;
    });

    // Graceful shutdown
    const shutdown = async () => {
      logger.info('Shutting down gracefully...');
      server.close(async () => {
        if (AppDataSource.isInitialized) {
          await AppDataSource.destroy();
          logger.info('Database connection closed');
        }
        logger.info('Server closed');
        process.exit(0);
      });
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (err) {
    if (err instanceof Error) {
      logger.error('Failed to start server', { error: err.message });
    }
    process.exit(1);
  }
}

start();
