const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const { suggest, chat } = require('../controllers/aiController');
const { protect, authorize } = require('../middleware/auth');

// Logged-in citizens.
router.post('/suggest', protect, authorize('citizen'), suggest);
router.post('/chat', protect, authorize('citizen'), chat);

// Visitors who are not logged in yet can still ask the chat box for help and
// get a suggestion (the homepage / department pages show it to everyone).
// Nothing is ever filed from here — they log in first to submit — and these
// two endpoints have a tighter rate limit to prevent abuse.
const publicLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 60, standardHeaders: true, legacyHeaders: false });
router.post('/public/suggest', publicLimiter, suggest);
router.post('/public/chat', publicLimiter, chat);

module.exports = router;
