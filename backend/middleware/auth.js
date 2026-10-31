const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Verifies JWT and attaches user to req
const protect = async (req, res, next) => {
  let token;
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer')) {
    try {
      token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password');
      if (!req.user || !req.user.isActive) {
        return res.status(401).json({ message: 'Not authorized, user not found or inactive' });
      }
      return next();
    } catch (err) {
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

// Like `protect`, but never rejects the request — if a valid token is
// present, req.user is populated (e.g. so a logged-in citizen's state can
// personalize the public department listing); with no/invalid token, the
// request just proceeds as anonymous (req.user stays undefined).
const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer')) {
    try {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      if (user && user.isActive) req.user = user;
    } catch (err) {
      // ignore — treat as anonymous
    }
  }
  next();
};

// Restricts route to specific roles, e.g. authorize('admin', 'officer')
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: `Role '${req.user?.role}' is not permitted to access this resource` });
    }
    next();
  };
};

module.exports = { protect, authorize, optionalAuth };
