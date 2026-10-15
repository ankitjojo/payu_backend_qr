import { app } from './app';
import { config } from './config';
import { logger } from './utils/logger.util';

const startServer = () => {
  try {
    app.listen(config.port, () => {
      logger.info(`Server is running in ${config.env} mode on http://localhost:${config.port}`);
      logger.info(`Frontend UI available at http://localhost:${config.port}/`);
    });
  } catch (error) {
    logger.error('Failed to start the server', error);
    process.exit(1);
  }
};

startServer();
