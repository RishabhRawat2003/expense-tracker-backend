import { env } from './config/env';
import app from './app';
import { db } from './db/knex';

const server = app.listen(env.PORT, () => {
  console.log(`API listening on http://localhost:${env.PORT}`);
});

function shutdown(signal: string) {
  console.log(`${signal} received, shutting down`);
  server.close(async () => {
    await db.destroy();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
