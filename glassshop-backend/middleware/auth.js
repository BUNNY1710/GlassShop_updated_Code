const { validateToken, extractUsername, extractRole } = require('../utils/jwt');
const { User, StaffPermission } = require('../models');
const { ALL_PERMISSIONS } = require('../config/permissions');

const isAdminRole = (role) => (role || '').replace('ROLE_', '').toUpperCase() === 'ADMIN';

// Resolve the full permission-key list for a user. Admin => everything.
async function getUserPermissions(user) {
  if (!user) return [];
  if (isAdminRole(user.role)) return [...ALL_PERMISSIONS];
  const rows = await StaffPermission.findAll({ where: { userId: user.id } });
  return rows.map(r => r.permissionKey);
}

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

// Gate an endpoint on a specific permission key. Admin always passes. Staff
// must have the key in staff_permissions. Permissions resolved from the DB
// each request (same pattern as shopId resolution — JWT carries no permissions).
const requirePermission = (key) => async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    if (isAdminRole(req.user.role)) return next();

    const user = await User.findOne({ where: { userName: req.user.username } });
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const has = await StaffPermission.findOne({ where: { userId: user.id, permissionKey: key } });
    if (!has) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to perform this action.'
      });
    }
    req._dbUser = user; // cache resolved user for the handler
    next();
  } catch (err) {
    return res.status(500).json({ error: 'Permission check failed' });
  }
};

// Like requirePermission but passes if the user holds ANY of the given keys.
// Used for read endpoints whose data is consumed by several modules (e.g. the
// optimization page reads quotations), so a visible page never hits a 403.
const requireAnyPermission = (...keys) => async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    if (isAdminRole(req.user.role)) return next();

    const user = await User.findOne({ where: { userName: req.user.username } });
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const has = await StaffPermission.findOne({
      where: { userId: user.id, permissionKey: { [require('sequelize').Op.in]: keys } }
    });
    if (!has) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to perform this action.'
      });
    }
    req._dbUser = user;
    next();
  } catch (err) {
    return res.status(500).json({ error: 'Permission check failed' });
  }
};

module.exports = {
  authMiddleware,
  requireRole,
  requireAdmin,
  requireStaff,
  requirePermission,
  requireAnyPermission,
  getUserPermissions
};
