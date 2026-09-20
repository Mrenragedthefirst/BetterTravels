require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');
const { initializePool, closePool } = require('./config/database');

const userRoutes  = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// Serve the frontend as static files
app.use(express.static(path.join(__dirname, '../../frontend/public')));

// ── API Routes ──────────────────────────────────────────────────────────────
app.use('/api/user',  userRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Catch-all: send frontend for any non-API path
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ success: false, error: `API route not found: ${req.method} ${req.path}` });
  }
  res.sendFile(path.join(__dirname, '../../frontend/public/index.html'));
});

// ── Centralized Error Handler (Priority 4) ──────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[BetterTravel Error]', err.stack || err.message);
  res.status(err.status || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'An internal server error occurred.' : err.message
  });
});

// ── Start Server ─────────────────────────────────────────────────────────────
(async () => {
  try {
    await initializePool();
    app.listen(PORT, () => {
      console.log(`\n[BetterTravel] Server running at http://localhost:${PORT}`);
      console.log(`    Passenger Portal -> http://localhost:${PORT}`);
      console.log(`    Admin Console    -> http://localhost:${PORT}/#admin\n`);
    });
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
})();

// ── Process Guards (Priority 4) ──────────────────────────────────────────────
process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught Exception:', err.message);
  // Don't exit — keep server alive for Oracle pool cleanup
});

process.on('unhandledRejection', (reason) => {
  console.error('[FATAL] Unhandled Promise Rejection:', reason);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down gracefully...');
  await closePool();
  process.exit(0);
});
