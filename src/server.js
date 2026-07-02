require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const morgan     = require('morgan');
const compression = require('compression');
const rateLimit  = require('express-rate-limit');
const path       = require('path');

const sequelize  = require('./config/db');
require('./models');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app  = express();
const PORT = process.env.PORT || 5000;

// ── Security & performance ────────────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(compression());
app.use(cors({
  origin(origin, cb) {
    // Allow requests with no origin (mobile apps, curl, Postman, same-origin)
    if (!origin) return cb(null, true);
    const allowed = process.env.CLIENT_URL
      ? process.env.CLIENT_URL.split(',').map(u => u.trim())
      : null;
    if (!allowed) return cb(null, true);          // '*' when not configured
    if (allowed.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ── Rate limiting ─────────────────────────────────────────────────────────────
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, max: 300, standardHeaders: true, legacyHeaders: false }));

// ── Static uploads ────────────────────────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// ── Health-check (always available, even before DB connects) ─────────────────
app.get('/api/health', (_req, res) => {
  res.json({ success: true, message: 'Gwikonge PEFA Church API', time: new Date().toISOString() });
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api', require('./routes'));

app.use(notFound);
app.use(errorHandler);

// ── DB connect with retry (crucial for Render free tier cold-starts) ──────────
async function connectWithRetry(retries = 5, delayMs = 3000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await sequelize.authenticate();
      console.log('✅ Database connection established.');
      return;
    } catch (err) {
      if (attempt === retries) throw err;
      console.warn(`⚠️  DB connect attempt ${attempt}/${retries} failed: ${err.message}`);
      console.warn(`   Retrying in ${delayMs / 1000}s…`);
      await new Promise(r => setTimeout(r, delayMs));
      delayMs *= 1.5; // back-off
    }
  }
}

async function start() {
  try {
    // ── Validate required env vars before touching the DB ──────────────────
    const missing = [];
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'change_this_to_a_long_random_secret') {
      missing.push('JWT_SECRET (must be changed from the default placeholder)');
    }
    if (!process.env.DATABASE_URL && !process.env.DB_HOST) {
      missing.push('DATABASE_URL  (or DB_HOST / DB_NAME / DB_USER / DB_PASS)');
    }
    if (missing.length) {
      console.error('\n❌  Missing required environment variables:');
      missing.forEach(m => console.error('    •', m));
      console.error('\n   Copy .env.example → .env and fill in the values, then restart.\n');
      process.exit(1);
    }

    await connectWithRetry();

    // In dev, sync schema automatically.
    // In production, rely on manual migrations or a one-time sync run.
    if (process.env.NODE_ENV !== 'production') {
      await sequelize.sync({ alter: true });
      console.log('✅ Models synced (development mode).');
    } else {
      // Safe production sync: only create missing tables, never drop or alter
      await sequelize.sync({ force: false, alter: false });
      console.log('✅ Models synced (production – create-only).');
    }

    app.listen(PORT, () => {
      console.log(`\n🚀 Gwikonge PEFA Church API running on port ${PORT}`);
      console.log(`   Health check: http://localhost:${PORT}/api/health\n`);
    });

  } catch (err) {
    console.error('\n❌  Failed to start server:');
    console.error('    Message:', err.message);
    if (err.message.includes('ECONNREFUSED')) {
      console.error('\n   ── Postgres connection refused. Check: ──────────────────────────');
      console.error('   • Is PostgreSQL running?');
      console.error('   • Is DATABASE_URL set correctly in your .env / Render env vars?');
      console.error('   • On Render: go to your service → Environment → add DATABASE_URL');
      console.error('     (copy it from your Render PostgreSQL database → "Connection" tab)');
      console.error('   ──────────────────────────────────────────────────────────────────\n');
    }
    process.exit(1);
  }
}

start();
module.exports = app;
