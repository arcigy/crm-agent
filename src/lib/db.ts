import { Pool, QueryResult, QueryResultRow } from 'pg';

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL is not defined in environment variables!');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Optimized for serverless/Next.js
  max: parseInt(process.env.DB_POOL_MAX || '10'),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT_MILLIS || '5000'),
  ssl: process.env.DATABASE_URL?.includes('railway') || process.env.NODE_ENV === 'production' 
    ? { rejectUnauthorized: false } 
    : false,
});

/**
 * Direct database access for atomic operations/raw SQL
 */
export const db = {
  async query<T extends QueryResultRow = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
    const start = Date.now();
    try {
      const res = await pool.query<T>(text, params);
      const duration = Date.now() - start;
      if (process.env.NODE_ENV === 'development') {
        console.log('[DB Query]', { text, duration, rows: res.rowCount });
      }
      return res;
    } catch (error) {
      console.error('[DB Query Error]', { text, error });
      throw error;
    }
  },
  
  async getClient() {
    return await pool.connect();
  }
};

export default db;
