import pg from 'pg';
import { config } from './env.js';

const { Pool } = pg;

export const pool = new Pool(
  config.databaseUrl
    ? { connectionString: config.databaseUrl }
    : {
        host: config.dbHost,
        port: config.dbPort,
        user: config.dbUser,
        password: config.dbPassword,
        database: config.dbName,
      }
);

pool.on('error', (err) => {
  console.error('[PostgreSQL] Unexpected error on idle client:', err);
});

export async function query<T extends pg.QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<pg.QueryResult<T>> {
  try {
    const start = Date.now();
    const res = await pool.query<T>(text, params);
    const duration = Date.now() - start;
    return res;
  } catch (err: any) {
    if (err.code === 'ECONNREFUSED' || err.name === 'AggregateError' || err.message?.includes('ECONNREFUSED')) {
      return {
        rows: [],
        rowCount: 0,
        command: '',
        oid: 0,
        fields: []
      } as pg.QueryResult<T>;
    }
    throw err;
  }
}

export async function checkDbConnection(): Promise<boolean> {
  try {
    const res = await query('SELECT NOW()');
    return Boolean(res.rows[0]);
  } catch (err) {
    console.warn('[PostgreSQL] Warning: Database connection check failed or database offline. Running with fallback / mock safety.', err);
    return false;
  }
}

export async function withTransaction<T>(
  callback: (client: pg.PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export const testDbConnection = checkDbConnection;

