require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const path = require('path');
const connectDB = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const { startAutoCloseJob } = require('./utils/autoClose');

// Start the auto-close job once the database is connected.
connectDB().then(() => startAutoCloseJob());

// Bug fix: several controllers are async route handlers without their own
// try/catch. Previously an unhandled rejection (e.g. a DB timeout) would
// crash the entire Node process, taking down every user's session. This is a
// safety net, not a substitute for the per-controller error handling above —
// but it stops one bad request from bringing the whole server down.
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection:', reason);
});

const app = express();

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({ origin: process.env.CLIENT_URL || '*', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(mongoSanitize());
app.use(morgan('dev'));

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 300 });
app.use('/api', limiter);

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`NCCMS backend running on port ${PORT}`));
