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

// Catch-all: send frontend for any other path
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/public/index.html'));
});

// ── Start Server ─────────────────────────────────────────────────────────────
(async () => {
  try {
    await initializePool();
    app.listen(PORT, () => {
      console.log(`\n🚇  BetterTravel Server running at http://localhost:${PORT}`);
      console.log(`    User Portal  → http://localhost:${PORT}`);
      console.log(`    Admin Portal → http://localhost:${PORT}/#admin\n`);
    });
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
})();

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down gracefully...');
  await closePool();
  process.exit(0);
});
