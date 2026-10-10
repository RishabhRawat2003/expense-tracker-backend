import knex from 'knex';
import { types } from 'pg';
import { env } from '../config/env';

types.setTypeParser(types.builtins.NUMERIC, (v) => parseFloat(v));
types.setTypeParser(types.builtins.INT8, (v) => parseInt(v, 10));
types.setTypeParser(types.builtins.DATE, (v) => v);

export const db = knex({
  client: 'pg',
  connection: env.DATABASE_URL,
  pool: { min: 0, max: env.DB_POOL_MAX },
});
