require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const compression = require('compression');
const path = require('path');
const fs = require('fs');
const connectDB = require('./config/db');
const User = require('./models/User');
const StoredFile = require('./models/StoredFile');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const { startAutoCloseJob } = require('./utils/autoClose');

const isProd = process.env.NODE_ENV === 'production';

// Refuse to run a public deployment with a guessable token secret.
if (isProd) {
  const secret = process.env.JWT_SECRET || '';
  if (secret.length < 24 || /change_this|secret$|^test/i.test(secret)) {
    console.error('JWT_SECRET is missing or too weak. Set a long random value (24+ characters) in the Render environment variables.');
    process.exit(1);
  }
}

// After the database connects: first-run seeding (Render has no shell on the
// free plan), then the background job that auto-closes resolved complaints.
connectDB().then(async () => {
  try {
    const hasSuperAdmin = await User.exists({ role: 'super_admin' });
    if (!hasSuperAdmin) {
      if (process.env.AUTO_SEED === 'true') {
        const password = process.env.SUPER_ADMIN_PASSWORD;
        if (isProd && (!password || password.length < 10)) {
          console.error('AUTO_SEED needs SUPER_ADMIN_PASSWORD (at least 10 characters). No Super Admin was created.');
        } else {
          const { seedDatabase } = require('./seed');
          await seedDatabase({
            demo: process.env.SEED_DEMO_DATA === 'true',
            superAdminEmail: process.env.SUPER_ADMIN_EMAIL || 'superadmin@nccms.gov.in',
            superAdminPassword: password || 'SuperAdmin@123',
          });
        }
      } else {
        console.warn('\n⚠️  No Super Admin account exists yet. Run `npm run seed` (local) or set AUTO_SEED=true with SUPER_ADMIN_PASSWORD (hosted).\n');
      }
    }
  } catch (err) {
    console.error('First-run seeding failed:', err.message);
  }
  startAutoCloseJob();
});

// Bug fix: several controllers are async route handlers without their own
// try/catch. Previously an unhandled rejection (e.g. a DB timeout) would
// crash the entire Node process, taking down every user's session. This is a
// safety net, not a substitute for the per-controller error handling above —
// but it stops one bad request from bringing the whole server down.
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection:', reason);
});

const app = express();

// Render (like most hosts) puts a proxy in front of the app. Without this the
// rate limiter would see every visitor as the same IP and logs would show the
// proxy's address instead of the visitor's.
app.set('trust proxy', 1);

app.use(helmet({
  crossOriginResourcePolicy: false,
  // The built website is served by this same server, so it needs a policy
  // that allows what the app really uses: Google Fonts and https images
  // (national emblem, leader photos).
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      'script-src': ["'self'"],
      'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      'font-src': ["'self'", 'data:', 'https://fonts.gstatic.com'],
      'img-src': ["'self'", 'data:', 'blob:', 'https:'],
      'connect-src': ["'self'"],
      'upgrade-insecure-requests': isProd ? [] : null,
    },
  },
}));
app.use(compression());
// CLIENT_URL is only needed if the website is hosted on a different domain
// than this API (comma-separate several). Same-origin deployments need nothing.
const allowedOrigins = (process.env.CLIENT_URL || '').split(',').map((o) => o.trim()).filter(Boolean);
app.use(cors({ origin: allowedOrigins.length ? allowedOrigins : true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(mongoSanitize());
app.use(morgan(isProd ? 'combined' : 'dev'));

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 300 });
app.use('/api', limiter);

// Uploaded images: files on disk first (local development), then the ones
// stored in MongoDB (hosted deployments).
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.get('/uploads/:filename', async (req, res, next) => {
  try {
    const file = await StoredFile.findOne({ filename: req.params.filename });
    if (!file) return next();
    res.set('Content-Type', file.contentType);
    res.set('Cache-Control', 'public, max-age=31536000, immutable');
    res.send(file.data);
  } catch (err) {
    next(err);
  }
});

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/departments', require('./routes/departmentRoutes'));
app.use('/api/complaints', require('./routes/complaintRoutes'));
app.use('/api/officer', require('./routes/officerRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/super-admin', require('./routes/superAdminRoutes'));
app.use('/api/approvals', require('./routes/approvalRoutes'));
app.use('/api/status-requests', require('./routes/statusChangeRoutes'));
app.use('/api/complaint-chat', require('./routes/complaintChatRoutes'));
app.use('/api/false-reports', require('./routes/falseReportRoutes'));
app.use('/api/helpline', require('./routes/helplineRoutes'));
app.use('/api/ai', require('./routes/aiRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/meta', require('./routes/metaRoutes'));
app.use('/api/settings', require('./routes/settingsRoutes'));

// ---- The website itself (single-service deployment) -----------------------
// `npm run build` puts the React app in frontend/dist; serve it from here so
// the whole system is one URL with no CORS to configure.
const dist = path.join(__dirname, '..', 'frontend', 'dist');
if (fs.existsSync(path.join(dist, 'index.html'))) {
  app.use(express.static(dist, {
    index: false,
    setHeaders: (res, filePath) => {
      // Vite fingerprints everything in /assets, so it can be cached forever.
      if (filePath.includes(`${path.sep}assets${path.sep}`)) res.set('Cache-Control', 'public, max-age=31536000, immutable');
    },
  }));
  // Any other page URL (/login, /citizen/complaints/…) is handled by React Router.
  app.get(/^\/(?!api\/|uploads\/).*/, (req, res) => {
    res.set('Cache-Control', 'no-cache');
    res.sendFile(path.join(dist, 'index.html'));
  });
}

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`NCCMS backend running on port ${PORT}`));
