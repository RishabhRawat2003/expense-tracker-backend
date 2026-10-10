import path from 'node:path';
import knex from 'knex';
import { env } from '../config/env';
import { db } from './knex';

const migrationConfig = {
  directory: path.join(__dirname, 'migrations'),
  loadExtensions: [path.extname(__filename)],
};

async function ensureDatabase() {
  try {
    await db.raw('SELECT 1');
    return;
  } catch (err) {
    if ((err as { code?: string }).code !== '3D000') throw err;
  }

  const url = new URL(env.DATABASE_URL);
  const dbName = decodeURIComponent(url.pathname.slice(1));
  url.pathname = '/postgres';

  const admin = knex({ client: 'pg', connection: url.toString() });
  try {
    const { rows } = await admin.raw('SELECT 1 FROM pg_database WHERE datname = ?', [dbName]);
    if (rows.length === 0) {
      await admin.raw('CREATE DATABASE ??', [dbName]);
      console.log(`Created database "${dbName}"`);
    }
  } finally {
    await admin.destroy();
  }
}

async function main() {
  const command = process.argv[2] ?? 'latest';

  if (command === 'rollback') {
    const [batch, files] = await db.migrate.rollback(migrationConfig);
    console.log(`Rolled back batch ${batch}: ${files.length} migration(s)`);
    return;
  }

  await ensureDatabase();
  const [batch, files] = await db.migrate.latest(migrationConfig);
  console.log(files.length ? `Batch ${batch} ran: ${files.join(', ')}` : 'Already up to date');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => db.destroy());
