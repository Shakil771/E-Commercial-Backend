import app from './app.js';
import connectDB from './config/db.js';
import env from './config/env.js';
import logger from './utils/logger.js';

process.on('uncaughtException', (err) => {
  logger.error(`UNCAUGHT EXCEPTION: ${err.name} - ${err.message}`);
  logger.error(err.stack);
  process.exit(1);
});

let server;

const startServer = async () => {
  await connectDB();

  server = app.listen(env.port, () => {
    logger.info(`Server running in ${env.nodeEnv} mode on port ${env.port}`);
  });
};

startServer();

process.on('unhandledRejection', (err) => {
  logger.error(`UNHANDLED REJECTION: ${err.name} - ${err.message}`);
  logger.error(err.stack);
  if (server) {
    server.close(() => process.exit(1));
  } else {
    process.exit(1);
  }
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully');
  if (server) {
    server.close(() => {
      logger.info('Process terminated');
    });
  }
});

process.on('SIGINT', () => {
  logger.info('SIGINT received. Shutting down gracefully');
  if (server) {
    server.close(() => {
      logger.info('Process terminated');
      process.exit(0);
    });
  }
});
