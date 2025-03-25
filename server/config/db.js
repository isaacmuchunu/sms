const { neon, neonConfig } = require('@neondatabase/serverless');

const redactDatabaseUrl = (url) => {
  try {
    const u = new URL(url);
    if (u.password) u.password = '<password>';
    return u.toString();
  } catch {
    return '<invalid-url>';
  }
};

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required for NeonDB connection.');
}

let sql;

const connectDB = async () => {
  try {
    if (!sql) {
      sql = neon(DATABASE_URL);
    }
    // Verify connectivity with a lightweight query.
    const [{ now }] = await sql`SELECT NOW() AS now`;
    console.log(`NeonDB Connected: ${redactDatabaseUrl(DATABASE_URL)} (server time: ${now})`);
    return sql;
  } catch (error) {
    console.error(`NeonDB Connection Error (${redactDatabaseUrl(DATABASE_URL)}): ${error.message}`);
    throw error;
  }
};

const getSql = () => {
  if (!sql) {
    throw new Error('Database not connected. Call connectDB() first.');
  }
  return sql;
};

module.exports = { connectDB, getSql, redactDatabaseUrl };
