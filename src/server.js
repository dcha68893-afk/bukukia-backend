require('dotenv').config();
const buildApp  = require('./app');
const sequelize = require('./config/db');

const app  = buildApp();
const PORT = process.env.PORT || 5000;

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
      // Production sync: creates any missing tables AND adds any columns that exist
      // on a model but not yet in the database (this is what was causing errors like
      // 'column "ministryId" does not exist' — new fields added to models never
      // reached the live DB because alter was previously turned off).
      // alter:true never drops your existing data rows; it only adds/updates columns
      // to match the models. Take a DB backup before deploys that add new fields,
      // as a general safety practice.
      await sequelize.sync({ force: false, alter: true });
      console.log('✅ Models synced (production – auto create + alter).');
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
