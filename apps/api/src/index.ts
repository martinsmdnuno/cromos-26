import { buildServer } from './server.js';
import { env } from './env.js';

const app = buildServer();

app
  .listen({ host: '0.0.0.0', port: env.API_PORT })
  .then((addr) => {
    app.log.info(`Cromos 26 API listening on ${addr}`);
  })
  .catch((err) => {
    app.log.error(err);
    process.exit(1);
  });

const shutdown = async (sig: string) => {
  app.log.info({ sig }, 'shutting down');
  await app.close();
  process.exit(0);
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
