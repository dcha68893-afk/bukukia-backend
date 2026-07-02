const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { isAtLeast } = require('../config/roles');

async function authenticateToken(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ success: false, message: 'Authentication required' });

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(payload.id);
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'Invalid or expired session' });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
}

async function optionalAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return next();
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(payload.id);
    if (user && user.isActive) req.user = user;
    next();
  } catch (err) {
    next();
  }
}

// Exact allow-list. Use when access doesn't follow a strict hierarchy
// (e.g. "pastor or admin can moderate prayer, but leader cannot").
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ success: false, message: 'Authentication required' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'You do not have permission to perform this action' });
    }
    next();
  };
}

// Hierarchy cutoff. Use when "this role and everything above it" should pass
// (e.g. requireMinRole('leader') lets leader, pastor, admin, super_admin through).
function requireMinRole(minRole) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ success: false, message: 'Authentication required' });
    if (!isAtLeast(req.user.role, minRole)) {
      return res.status(403).json({ success: false, message: 'You do not have permission to perform this action' });
    }
    next();
  };
}

// A user may always act on their own resource; otherwise falls back to a min role check.
// Usage: requireSelfOrMinRole((req) => req.params.id, 'admin')
function requireSelfOrMinRole(getResourceUserId, minRole) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ success: false, message: 'Authentication required' });
    const resourceUserId = getResourceUserId(req);
    if (resourceUserId && resourceUserId === req.user.id) return next();
    if (isAtLeast(req.user.role, minRole)) return next();
    return res.status(403).json({ success: false, message: 'You do not have permission to perform this action' });
  };
}

// Ministry-scoped leadership check. A 'leader' may only act on records tied to the
// ministry they lead (req.user.ministryId); pastors/admins/super_admins are unrestricted.
// getItemMinistryId(req) should resolve the ministryId of the record being acted on
// (e.g. from an already-loaded record, or null for a brand-new record being created).
function requireOwnMinistryOrMinRole(getItemMinistryId, minRole = 'pastor') {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ success: false, message: 'Authentication required' });
    if (isAtLeast(req.user.role, minRole)) return next(); // pastor+ bypass scoping entirely
    if (req.user.role !== 'leader') {
      return res.status(403).json({ success: false, message: 'You do not have permission to perform this action' });
    }
    if (!req.user.ministryId) {
      return res.status(403).json({ success: false, message: 'You have not been assigned to a ministry yet. Ask your pastor or admin to assign you one before managing content.' });
    }
    const itemMinistryId = getItemMinistryId(req);
    if (itemMinistryId && itemMinistryId !== req.user.ministryId) {
      return res.status(403).json({ success: false, message: 'You can only manage content belonging to your own ministry.' });
    }
    next();
  };
}

module.exports = { authenticateToken, optionalAuth, requireRole, requireMinRole, requireSelfOrMinRole, requireOwnMinistryOrMinRole };
