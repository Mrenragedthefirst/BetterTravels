const oracledb = require('oracledb');
require('dotenv').config();

// Ensure node-oracledb runs in pure JavaScript Thin Mode (Zero C-binaries / Zero Instant Client required)
// In node-oracledb 6+, Thin Mode is default unless initOracleClient is called.
oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
oracledb.autoCommit = false; // Explicit transaction control

let pool = null;

async function initializePool() {
  if (!pool) {
    try {
      pool = await oracledb.createPool({
        user: process.env.DB_USER || 'BTAPP',
        password: process.env.DB_PASSWORD || 'YourSecurePassword123',
        connectString: process.env.DB_CONNECT_STRING || 'localhost:1521/XEPDB1',
        poolMin: 2,
        poolMax: 10,
        poolIncrement: 2,
        poolTimeout: 60
      });
      console.log('✓ Oracle Database Connection Pool Initialized (Thin Mode)');
    } catch (err) {
      console.error('✗ Failed to initialize Oracle connection pool:', err.message);
      throw err;
    }
  }
  return pool;
}

async function closePool() {
  if (pool) {
    try {
      await pool.close(10);
      console.log('Oracle Connection Pool closed.');
    } catch (err) {
      console.error('Error closing pool:', err.message);
    }
  }
}

/**
 * Execute a SQL query or statement with auto-released connection
 */
async function execute(sql, binds = {}, options = {}) {
  const currentPool = await initializePool();
  let connection;
  try {
    connection = await currentPool.getConnection();
    const result = await connection.execute(sql, binds, {
      autoCommit: options.autoCommit || false,
      outFormat: oracledb.OUT_FORMAT_OBJECT,
      ...options
    });
    return result;
  } catch (err) {
    console.error('Oracle SQL Execution Error:', err.message, '\nSQL:', sql);
    throw err;
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (closeErr) {
        console.error('Error returning connection to pool:', closeErr.message);
      }
    }
  }
}

module.exports = {
  initializePool,
  closePool,
  execute,
  oracledb
};
