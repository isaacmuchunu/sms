const { getSql } = require('../config/db');
const { Client } = require('@neondatabase/serverless');

/**
 * Lightweight query helper for NeonDB.
 * All database access should go through this module to keep migration simple.
 */

const getExecutor = (client) => client || getSql();

const db = {
  /**
   * Execute a raw SQL query using tagged template literals.
   * Example: db.query`SELECT * FROM users WHERE id = ${id}`
   */
  query(strings, ...values) {
    const sql = getSql();
    return sql(strings, ...values);
  },

  /**
   * Execute a raw SQL string with bound parameters.
   * Use this when building dynamic queries.
   */
  async raw(queryText, params = [], client = null) {
    const exec = getExecutor(client);
    return exec(queryText, params);
  },

  /**
   * Insert a single row and return the created record.
   */
  async insert(table, data, returning = ['*'], client = null) {
    const exec = getExecutor(client);
    const keys = Object.keys(data);
    const columns = keys.map((k) => `"${k}"`).join(', ');
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
    const values = keys.map((k) => data[k]);
    const returnCols = returning.map((c) => (c === '*' ? '*' : `"${c}"`)).join(', ');
    const query = `INSERT INTO "${table}" (${columns}) VALUES (${placeholders}) RETURNING ${returnCols}`;
    const rows = await exec(query, values);
    return rows[0];
  },

  /**
   * Update row(s) by where clause and return updated records.
   * whereClause example: { id: someId }
   */
  async update(table, data, whereClause, returning = ['*'], client = null) {
    const exec = getExecutor(client);
    const setKeys = Object.keys(data);
    const setClause = setKeys.map((k, i) => `"${k}" = $${i + 1}`).join(', ');
    const whereKeys = Object.keys(whereClause);
    const whereOffset = setKeys.length;
    const whereStr = whereKeys
      .map((k, i) => `"${k}" = $${whereOffset + i + 1}`)
      .join(' AND ');
    const values = [...setKeys.map((k) => data[k]), ...whereKeys.map((k) => whereClause[k])];
    const returnCols = returning.map((c) => (c === '*' ? '*' : `"${c}"`)).join(', ');
    const query = `UPDATE "${table}" SET ${setClause} WHERE ${whereStr} RETURNING ${returnCols}`;
    return exec(query, values);
  },

  /**
   * Delete row(s) by where clause and return deleted records.
   */
  async delete(table, whereClause, returning = ['*'], client = null) {
    const exec = getExecutor(client);
    const whereKeys = Object.keys(whereClause);
    const whereStr = whereKeys.map((k, i) => `"${k}" = $${i + 1}`).join(' AND ');
    const values = whereKeys.map((k) => whereClause[k]);
    const returnCols = returning.map((c) => (c === '*' ? '*' : `"${c}"`)).join(', ');
    const query = `DELETE FROM "${table}" WHERE ${whereStr} RETURNING ${returnCols}`;
    return exec(query, values);
  },

  /**
   * Find one row by where clause.
   */
  async findOne(table, whereClause, client = null) {
    const exec = getExecutor(client);
    const whereKeys = Object.keys(whereClause);
    const whereStr = whereKeys.map((k, i) => `"${k}" = $${i + 1}`).join(' AND ');
    const values = whereKeys.map((k) => whereClause[k]);
    const query = `SELECT * FROM "${table}" WHERE ${whereStr} LIMIT 1`;
    const rows = await exec(query, values);
    return rows[0] || null;
  },

  /**
   * Find many rows with optional WHERE, ORDER BY, LIMIT, OFFSET.
   */
  async findMany(table, options = {}, client = null) {
    const exec = getExecutor(client);
    const { where = {}, orderBy = null, limit = null, offset = null } = options;
    const whereKeys = Object.keys(where);
    const whereStr = whereKeys.length
      ? 'WHERE ' + whereKeys.map((k, i) => `"${k}" = $${i + 1}`).join(' AND ')
      : '';
    const values = whereKeys.map((k) => where[k]);
    let query = `SELECT * FROM "${table}" ${whereStr}`;
    if (orderBy) {
      if (!/^((?:[a-zA-Z0-9_.]+|"[a-zA-Z0-9_]+")\s+(?:ASC|DESC)\s*,\s*)*(?:[a-zA-Z0-9_.]+|"[a-zA-Z0-9_]+")\s+(?:ASC|DESC)$/i.test(orderBy)) {
        throw new Error(`Invalid orderBy value: ${orderBy}`);
      }
      query += ` ORDER BY ${orderBy}`;
    }
    if (limit) query += ` LIMIT ${limit}`;
    if (offset) query += ` OFFSET ${offset}`;
    return exec(query, values);
  },

  /**
   * Count rows with optional WHERE clause.
   */
  async count(table, where = {}, client = null) {
    const exec = getExecutor(client);
    const whereKeys = Object.keys(where);
    const whereStr = whereKeys.length
      ? 'WHERE ' + whereKeys.map((k, i) => `"${k}" = $${i + 1}`).join(' AND ')
      : '';
    const values = whereKeys.map((k) => where[k]);
    const query = `SELECT COUNT(*) AS count FROM "${table}" ${whereStr}`;
    const [row] = await exec(query, values);
    return parseInt(row.count, 10);
  },

  /**
   * Run an arbitrary SQL file or multi-statement string.
   * Splits on semicolons; use with care.
   */
  async runMigrations(sqlText) {
    const sql = getSql();
    const statements = sqlText
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    for (const statement of statements) {
      await sql(`${statement};`);
    }
  },

  /**
   * Execute a callback inside a NeonDB transaction using a dedicated Client.
   * The callback receives a transactional db object whose methods use the
   * same signatures as db.* helpers.
   *
   * Example:
   *   await db.transaction(async (tdb) => {
   *     const payment = await tdb.insert('fee_payments', { ... });
   *     await tdb.update('fee_invoices', { ... }, { id: invoice.id });
   *   });
   */
  async transaction(callback) {
    const DATABASE_URL = process.env.DATABASE_URL;
    if (!DATABASE_URL) {
      throw new Error('DATABASE_URL is required to run a transaction');
    }

    const client = new Client(DATABASE_URL);
    await client.connect();

    const exec = (queryText, params = []) => client.query(queryText, params);

    const txnDb = {
      raw: (queryText, params = []) => db.raw(queryText, params, exec),
      insert: (table, data, returning = ['*']) => db.insert(table, data, returning, exec),
      update: (table, data, whereClause, returning = ['*']) => db.update(table, data, whereClause, returning, exec),
      delete: (table, whereClause, returning = ['*']) => db.delete(table, whereClause, returning, exec),
      findOne: (table, whereClause) => db.findOne(table, whereClause, exec),
      findMany: (table, options = {}) => db.findMany(table, options, exec),
      count: (table, where = {}) => db.count(table, where, exec),
    };

    try {
      await client.query('BEGIN');
      const result = await callback(txnDb);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      await client.end();
    }
  },
};

module.exports = db;
