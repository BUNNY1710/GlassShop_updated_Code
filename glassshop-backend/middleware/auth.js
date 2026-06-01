const { validateToken, extractUsername, extractRole } = require('../utils/jwt');
const { User } = require('../models');

const authMiddleware = async (req, res, next) => {
  // Skip for OPTIONS requests
  if (req.method === 'OPTIONS') {
    return next();
  }

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.substring(7);

  try {
    if (!validateToken(token)) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const username = extractUsername(token);
    const role = extractRole(token);

    if (!username || !role) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Attach user info to request
    req.user = {
      username,
      role
    };

    next();
  } catch (error) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
};

const requireRole = (...roles) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userRole = req.user.role.replace('ROLE_', '').toUpperCase();
    const allowedRoles = roles.map(r => r.toUpperCase());

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    next();
  };
};

const requireAdmin = requireRole('ADMIN');
const requireStaff = requireRole('STAFF', 'ADMIN');

module.exports = {
  authMiddleware,
  requireRole,
  requireAdmin,
  requireStaff
};
