// Builds and returns the configured Express app, with NO side effects:
// no DB connection, no app.listen(). This is what makes the app testable —
// supertest can hit it directly in-process without a real network port,
// and multiple test files can each require this fresh without port
// conflicts. server.js is the only place that actually starts listening.
require('dotenv').config();
const express     = require('express');
const cors        = require('cors');
const helmet      = require('helmet');
const morgan      = require('morgan');
const compression = require('compression');
const rateLimit   = require('express-rate-limit');
const path        = require('path');

require('./models'); // registers all model associations
const { notFound, errorHandler } = require('./middleware/errorHandler');

function buildApp() {
  const app = express();

  app.use(helmet({ crossOriginResourcePolicy: false }));
  app.use(compression());
  app.use(cors({
    origin(origin, cb) {
      if (!origin) return cb(null, true);
      const allowed = process.env.CLIENT_URL
        ? process.env.CLIENT_URL.split(',').map((u) => u.trim())
        : null;
      if (!allowed) return cb(null, true);
      if (allowed.includes(origin)) return cb(null, true);
      cb(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
  }));
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Silence request logging in tests — keeps `npm test` output readable.
  if (process.env.NODE_ENV !== 'test') {
    app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
  }

  // Rate limiting is disabled under NODE_ENV=test since a test suite
  // legitimately fires far more than 300 requests/15min at the API from a
  // single "IP" (localhost) — that's a test-runner characteristic, not
  // something a rate limiter should be evaluating.
  if (process.env.NODE_ENV !== 'test') {
    app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, max: 300, standardHeaders: true, legacyHeaders: false }));
  }

  app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

  app.get('/api/health', (_req, res) => {
    res.json({ success: true, message: 'Gwikonge PEFA Church API', time: new Date().toISOString() });
  });

  app.use('/api', require('./routes'));

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = buildApp;
