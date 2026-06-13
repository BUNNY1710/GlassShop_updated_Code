const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { sequelize, User, Shop, StaffPermission, AuditLog } = require('../models');
const { Op } = require('sequelize');
const { generateToken } = require('../utils/jwt');

// Activity-type → audit actions, so the Activities tab can filter by module.
const ACTIVITY_TYPE_ACTIONS = {
  stock:        ['ADD', 'REMOVE', 'EDIT', 'ADD_REMNANT'],
  transfers:    ['TRANSFER'],
  optimization: ['OPTIMIZE_CONFIRM'],
  quotations:   ['CREATE_QUOTATION', 'EDIT_QUOTATION', 'DELETE_QUOTATION'],
  orders:       ['CREATE_INVOICE', 'EDIT_INVOICE', 'DELETE_INVOICE'],
  customers:    ['CREATE_CUSTOMER', 'UPDATE_CUSTOMER', 'DELETE_CUSTOMER'],
  stands:       ['ADD_STAND', 'EDIT_STAND', 'DISABLE_STAND', 'DELETE_STAND'],
  glass:        ['ADD_GLASS_TYPE', 'EDIT_GLASS_TYPE', 'DELETE_GLASS_TYPE', 'RESTORE_GLASS_TYPE'],
  users:        ['USER_LOGIN', 'USER_LOGOUT', 'PASSWORD_CHANGE', 'CREATE_STAFF', 'CREATE_ADMIN', 'DELETE_ADMIN', 'STAFF_PERMISSION_UPDATED'],
};
function rangeStart(range, from) {
  const now = new Date();
  if (range === 'today') return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (range === 'week')  { const d = new Date(now); d.setDate(d.getDate() - 7); return d; }
  if (range === 'month') { const d = new Date(now); d.setMonth(d.getMonth() - 1); return d; }
  if (range === 'custom' && from) { const d = new Date(from); return isNaN(d) ? null : d; }
  return null;
}
// Roll up grouped action counts into the summary cards.
function buildSummary(grouped) {
  const sum = { total: 0, stock: 0, transfers: 0, optimization: 0, quotations: 0, orders: 0, customers: 0, stands: 0, glass: 0, users: 0 };
  const cat = (action) => Object.keys(ACTIVITY_TYPE_ACTIONS).find(k => ACTIVITY_TYPE_ACTIONS[k].includes(action));
  for (const g of grouped) {
    const n = parseInt(g.cnt, 10) || 0;
    sum.total += n;
    const c = cat(g.action);
    if (c) sum[c] += n;
  }
  return sum;
}

// Shared handler for "activities of a user" (admin viewing staff, or self).
async function listActivities(req, res, targetUsername, shopId) {
  const { type, range, from, to, search } = req.query;
  const where = { username: targetUsername, shopId };

  if (type && type !== 'all' && ACTIVITY_TYPE_ACTIONS[type]) {
    where.action = { [Op.in]: ACTIVITY_TYPE_ACTIONS[type] };
  }
  const start = rangeStart(range, from);
  if (start || (range === 'custom' && to)) {
    where.timestamp = {};
    if (start) where.timestamp[Op.gte] = start;
    if (range === 'custom' && to) { const d = new Date(to); if (!isNaN(d)) where.timestamp[Op.lte] = d; }
  }
  if (search && search.trim()) {
    const q = `%${search.trim()}%`;
    where[Op.or] = [
      { glassType: { [Op.iLike]: q } },
      { details:   { [Op.iLike]: q } },
      { action:    { [Op.iLike]: q } },
    ];
  }

  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const size = Math.min(200, Math.max(1, parseInt(req.query.size, 10) || 50));

  const { rows, count } = await AuditLog.findAndCountAll({
    where, order: [['timestamp', 'DESC']], limit: size, offset: (page - 1) * size,
  });

  // Summary respects date/search but NOT type (so cards always show the breakdown).
  const summaryWhere = { ...where };
  delete summaryWhere.action;
  const grouped = await AuditLog.findAll({
    where: summaryWhere,
    attributes: ['action', [sequelize.fn('COUNT', sequelize.col('id')), 'cnt']],
    group: ['action'], raw: true,
  });

  res.json({
    data: rows, page, size, total: count, totalPages: Math.ceil(count / size),
    summary: buildSummary(grouped),
  });
}
const { authMiddleware, requireAdmin, requireOwner, getUserPermissions } = require('../middleware/auth');
const { PERMISSION_GROUPS, ALL_PERMISSIONS, isValidPermission } = require('../config/permissions');
const rateLimit = require('../middleware/rateLimit');

// Throttle credential endpoints to slow brute-force (per IP).
const loginLimiter = rateLimit({ windowMs: 5 * 60_000, max: 20, message: 'Too many login attempts. Try again in a few minutes.' });

// Keep only valid, de-duplicated permission keys from a client-supplied array.
const sanitizePermissions = (arr) =>
  Array.isArray(arr) ? [...new Set(arr.filter(isValidPermission))] : [];

// Register shop (Public in dev; gated in production).
// SECURITY: unauthenticated tenant creation is disabled in production unless
// ALLOW_PUBLIC_REGISTRATION=true is explicitly set. Behaviour in development is
// unchanged so local setup/seeding keeps working.
router.post('/register-shop', async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production' && process.env.ALLOW_PUBLIC_REGISTRATION !== 'true') {
      return res.status(403).json({ error: 'Public registration is disabled. Contact an administrator to create a shop.' });
    }
    const { username, password, shopName, email } = req.body;

    if (!username || !username.trim()) {
      return res.status(400).json({ error: 'Username is required' });
    }
    if (!password || !password.trim()) {
      return res.status(400).json({ error: 'Password is required' });
    }
    if (!shopName || !shopName.trim()) {
      return res.status(400).json({ error: 'Shop name is required' });
    }

    // Check if username already exists
    const existingUser = await User.findOne({ where: { userName: username } });
    if (existingUser) {
      return res.status(409).json({ error: 'Username already exists. Please choose a different username.' });
    }

    // Create shop
    const shop = await Shop.create({
      shopName,
      email
    });

    // Create admin user
    const hashedPassword = await bcrypt.hash(password, 10);
    await User.create({
      userName: username,
      password: hashedPassword,
      role: 'ROLE_OWNER', // the account that creates the shop is its owner
      shopId: shop.id
    });

    res.json({ message: 'Shop registered successfully' });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: 'Username already exists. Please choose a different username.' });
    }
    res.status(500).json({ error: 'Registration failed: ' + error.message });
  }
});

// Create staff (Admin only)
router.post('/create-staff', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validate input
    if (!username || !username.trim()) {
      return res.status(400).json({ error: 'Username is required' });
    }
    if (!password || !password.trim()) {
      return res.status(400).json({ error: 'Password is required' });
    }
    if (password.length < 4) {
      return res.status(400).json({ error: 'Password must be at least 4 characters long' });
    }

    const admin = await User.findOne({
      where: { userName: req.user.username },
      include: [{ model: Shop, as: 'shop' }]
    });

    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    if (!admin.shopId) {
      return res.status(400).json({ error: 'Admin is not linked to a shop' });
    }

    // Check if username already exists
    const existingUser = await User.findOne({ where: { userName: username.trim() } });
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists. Please choose a different username.' });
    }

    // Create staff user
    const hashedPassword = await bcrypt.hash(password.trim(), 10);
    const staff = await User.create({
      userName: username.trim(),
      password: hashedPassword,
      role: 'ROLE_STAFF',
      shopId: admin.shopId
    });

    // Save selected permissions
    const perms = sanitizePermissions(req.body.permissions);
    if (perms.length) {
      await StaffPermission.bulkCreate(
        perms.map(permissionKey => ({ userId: staff.id, permissionKey }))
      );
    }

    AuditLog.create({
      username: admin.userName, role: admin.role, action: 'CREATE_STAFF',
      quantity: 0, shopId: admin.shopId, timestamp: new Date(),
      details: `Created staff "${staff.userName}"${perms.length ? ` with ${perms.length} permission(s)` : ''}`,
    }).catch(() => {});

    res.json({ message: 'Staff created successfully', id: staff.id, permissions: perms });
  } catch (error) {
    console.error('Error creating staff:', error);
    // Handle Sequelize unique constraint error
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ error: 'Username already exists. Please choose a different username.' });
    }
    // Handle other Sequelize errors
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ error: error.errors.map(e => e.message).join(', ') });
    }
    res.status(500).json({ error: 'Failed to create staff: ' + error.message });
  }
});

// Login
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !username.trim()) {
      return res.status(400).json({ error: 'Username is required' });
    }
    if (!password || !password.trim()) {
      return res.status(400).json({ error: 'Password is required' });
    }

    const user = await User.findOne({ where: { userName: username } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const token = generateToken(user.userName, user.role);
    const permissions = await getUserPermissions(user);

    // Audit the login (best-effort — never block login on an audit failure).
    if (user.shopId) {
      AuditLog.create({
        username: user.userName, role: user.role, action: 'USER_LOGIN',
        quantity: 0, shopId: user.shopId, timestamp: new Date(),
        details: `${user.userName} logged in`,
      }).catch(() => {});
    }

    res.json({
      token,
      role: user.role,
      permissions
    });
  } catch (error) {
    res.status(500).json({ error: 'Login failed: ' + error.message });
  }
});

// Logout — audits the event (stateless JWT; client also clears its token).
router.post('/logout', authMiddleware, async (req, res) => {
  try {
    const user = await User.findOne({ where: { userName: req.user.username } });
    if (user?.shopId) {
      AuditLog.create({
        username: user.userName, role: user.role, action: 'USER_LOGOUT',
        quantity: 0, shopId: user.shopId, timestamp: new Date(),
        details: `${user.userName} logged out`,
      }).catch(() => {});
    }
    res.json({ message: 'Logged out' });
  } catch {
    res.json({ message: 'Logged out' });
  }
});

// Get profile
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const username = req.user?.username;
    if (!username) {
      return res.status(401).json({ error: 'Username not found in token' });
    }

    const user = await User.findOne({
      where: { userName: username },
      include: [{ model: Shop, as: 'shop' }]
    });

    if (!user) {
      console.error(`User not found in database: ${username}`);
      return res.status(404).json({ error: `User not found: ${username}. Please register or log in again.` });
    }

    const permissions = await getUserPermissions(user);

    res.json({
      username: user.userName,
      role: user.role,
      shopId: user.shop ? user.shop.id : null,
      shopName: user.shop ? user.shop.shopName : null,
      permissions
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Change password
router.post('/change-password', authMiddleware, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    const user = await User.findOne({ where: { userName: req.user.username } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isValidPassword = await bcrypt.compare(oldPassword, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ error: 'Old password is incorrect' });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    if (user.shopId) {
      AuditLog.create({
        username: user.userName, role: user.role, action: 'PASSWORD_CHANGE',
        quantity: 0, shopId: user.shopId, timestamp: new Date(),
        details: `${user.userName} changed their password`,
      }).catch(() => {});
    }

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get staff list (Admin only)
router.get('/staff', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const username = req.user?.username;
    if (!username) {
      return res.status(401).json({ error: 'Username not found in token' });
    }

    const admin = await User.findOne({
      where: { userName: username },
      include: [{ model: Shop, as: 'shop' }]
    });

    if (!admin) {
      console.error(`Admin not found in database: ${username}`);
      return res.status(404).json({ error: `Admin not found: ${username}. Please register or log in again.` });
    }

    const staff = await User.findAll({
      where: {
        shopId: admin.shopId,
        role: 'ROLE_STAFF'
      },
      include: [{ model: StaffPermission, as: 'permissions' }]
    });

    res.json(staff.map(s => {
      const perms = (s.permissions || []).map(p => p.permissionKey);
      return {
        id: s.id,
        userName: s.userName,
        role: s.role,
        shopId: s.shopId,
        permissions: perms,
        permissionCount: perms.length
      };
    }));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete staff (Admin only)
router.delete('/staff/:id', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const admin = await User.findOne({
      where: { userName: req.user.username },
      include: [{ model: Shop, as: 'shop' }]
    });

    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    const staff = await User.findByPk(req.params.id);
    if (!staff) {
      return res.status(404).json({ error: 'Staff not found' });
    }

    // Security: same shop only
    if (staff.shopId !== admin.shopId) {
      return res.status(403).json({ error: 'Not allowed' });
    }

    await staff.destroy();
    res.json({ message: 'Staff removed' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Permission catalogue (Admin only) — drives the staff permission UI.
router.get('/permissions/catalog', authMiddleware, requireAdmin, (req, res) => {
  res.json({ groups: PERMISSION_GROUPS, all: ALL_PERMISSIONS });
});

// Get a staff member's permissions (Admin only)
router.get('/staff/:id/permissions', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const admin = await User.findOne({ where: { userName: req.user.username } });
    if (!admin) return res.status(404).json({ error: 'Admin not found' });

    const staff = await User.findOne({ where: { id: req.params.id, shopId: admin.shopId } });
    if (!staff) return res.status(404).json({ error: 'Staff not found or not in your shop' });

    const rows = await StaffPermission.findAll({ where: { userId: staff.id } });
    res.json({ id: staff.id, username: staff.userName, permissions: rows.map(r => r.permissionKey) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Replace a staff member's permissions (Admin only)
router.put('/staff/:id/permissions', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const admin = await User.findOne({ where: { userName: req.user.username } });
    if (!admin) return res.status(404).json({ error: 'Admin not found' });

    const staff = await User.findOne({ where: { id: req.params.id, shopId: admin.shopId } });
    if (!staff) return res.status(404).json({ error: 'Staff not found or not in your shop' });
    if (staff.role !== 'ROLE_STAFF') {
      return res.status(400).json({ error: 'Permissions can only be set on staff users (admins have all permissions)' });
    }

    const perms = sanitizePermissions(req.body.permissions);

    // Capture the previous set so we can audit what changed.
    const before = (await StaffPermission.findAll({ where: { userId: staff.id } })).map(p => p.permissionKey);
    const beforeSet = new Set(before);
    const afterSet = new Set(perms);
    const granted = perms.filter(p => !beforeSet.has(p));
    const revoked = before.filter(p => !afterSet.has(p));

    // Replace the full set.
    await StaffPermission.destroy({ where: { userId: staff.id } });
    if (perms.length) {
      await StaffPermission.bulkCreate(perms.map(permissionKey => ({ userId: staff.id, permissionKey })));
    }

    // Audit the change (only if something actually changed).
    if (granted.length || revoked.length) {
      const parts = [];
      if (granted.length) parts.push(`granted ${granted.join(', ')}`);
      if (revoked.length) parts.push(`revoked ${revoked.join(', ')}`);
      await AuditLog.create({
        username: admin.userName, role: admin.role, action: 'STAFF_PERMISSION_UPDATED',
        quantity: perms.length, shopId: admin.shopId, timestamp: new Date(),
        details: `Updated permissions for staff "${staff.userName}": ${parts.join('; ')}.`,
      });
    }

    res.json({ message: 'Permissions updated', permissions: perms, permissionCount: perms.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update permissions: ' + error.message });
  }
});

// Reset staff password — Admin only
router.put('/staff/:id/password', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.trim().length < 4) {
      return res.status(400).json({ error: 'Password must be at least 4 characters' });
    }

    const admin = await User.findOne({
      where: { userName: req.user.username },
      include: [{ model: Shop, as: 'shop' }],
    });
    if (!admin) return res.status(404).json({ error: 'Admin not found' });

    const staff = await User.findOne({ where: { id: req.params.id, shopId: admin.shopId } });
    if (!staff) return res.status(404).json({ error: 'Staff not found or not in your shop' });

    staff.password = await bcrypt.hash(newPassword.trim(), 10);
    await staff.save();

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reset password: ' + error.message });
  }
});

// GET /api/auth/staff/:id/activities — a specific staff member's activity feed
// + performance summary (Admin only). Supports ?type=&range=&from=&to=&search=&page=&size=
router.get('/staff/:id/activities', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const admin = await User.findOne({ where: { userName: req.user.username } });
    if (!admin || !admin.shopId) return res.status(404).json({ error: 'Admin not linked to a shop' });

    const staff = await User.findOne({ where: { id: req.params.id, shopId: admin.shopId } });
    if (!staff) return res.status(404).json({ error: 'Staff not found or not in your shop' });

    await listActivities(req, res, staff.userName, admin.shopId);
  } catch (error) {
    console.error('Error fetching staff activities:', error);
    res.status(500).json({ error: 'Failed to fetch activities' });
  }
});

// GET /api/auth/my-activities — the current user's own activity feed (any role).
router.get('/my-activities', authMiddleware, async (req, res) => {
  try {
    const user = await User.findOne({ where: { userName: req.user.username } });
    if (!user || !user.shopId) return res.status(404).json({ error: 'User not linked to a shop' });
    await listActivities(req, res, user.userName, user.shopId);
  } catch (error) {
    console.error('Error fetching my activities:', error);
    res.status(500).json({ error: 'Failed to fetch activities' });
  }
});

// Create admin (Owner only) — a full-access ADMIN account.
router.post('/create-admin', authMiddleware, requireOwner, async (req, res) => {
  try {
    const owner = await User.findOne({ where: { userName: req.user.username } });
    if (!owner || !owner.shopId) return res.status(404).json({ error: 'Owner not linked to a shop' });

    const { username, password, whatsappNumber } = req.body;
    if (!username || !username.trim()) return res.status(400).json({ error: 'Username is required' });
    if (!password || password.length < 4) return res.status(400).json({ error: 'Password must be at least 4 characters' });

    const exists = await User.findOne({ where: { userName: username.trim() } });
    if (exists) return res.status(409).json({ error: 'Username already exists' });

    const hashed = await bcrypt.hash(password, 10);
    const admin = await User.create({
      userName: username.trim(), password: hashed, role: 'ROLE_ADMIN',
      whatsappNumber: whatsappNumber || null, shopId: owner.shopId,
    });

    AuditLog.create({
      username: owner.userName, role: owner.role, action: 'CREATE_ADMIN',
      quantity: 0, shopId: owner.shopId, timestamp: new Date(),
      details: `Created Admin account: ${admin.userName}`,
    }).catch(() => {});

    res.status(201).json({ message: 'Admin created successfully', id: admin.id, role: admin.role });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create admin: ' + error.message });
  }
});

// List all users in this shop (Owner + Admin) for the User Management screen.
router.get('/users', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const me = await User.findOne({ where: { userName: req.user.username } });
    if (!me || !me.shopId) return res.status(404).json({ error: 'Not linked to a shop' });
    const users = await User.findAll({
      where: { shopId: me.shopId },
      attributes: ['id', 'userName', 'role', 'whatsappNumber'],
      order: [['id', 'ASC']],
    });
    res.json(users.map(u => ({ id: u.id, userName: u.userName, role: u.role, whatsappNumber: u.whatsappNumber })));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users: ' + error.message });
  }
});

// Delete an admin (Owner only). Cannot delete the owner or yourself.
router.delete('/admin/:id', authMiddleware, requireOwner, async (req, res) => {
  try {
    const owner = await User.findOne({ where: { userName: req.user.username } });
    if (!owner || !owner.shopId) return res.status(404).json({ error: 'Owner not linked to a shop' });

    const target = await User.findOne({ where: { id: req.params.id, shopId: owner.shopId } });
    if (!target) return res.status(404).json({ error: 'User not found or not in your shop' });
    if (target.id === owner.id) return res.status(400).json({ error: 'You cannot delete your own account' });
    if ((target.role || '').toUpperCase().includes('OWNER')) return res.status(403).json({ error: 'The owner account cannot be deleted' });
    if (!(target.role || '').toUpperCase().includes('ADMIN')) return res.status(400).json({ error: 'Use staff delete for staff users' });

    const name = target.userName;
    await StaffPermission.destroy({ where: { userId: target.id } }).catch(() => {});
    await target.destroy();

    AuditLog.create({
      username: owner.userName, role: owner.role, action: 'DELETE_ADMIN',
      quantity: 0, shopId: owner.shopId, timestamp: new Date(),
      details: `Deleted Admin account: ${name}`,
    }).catch(() => {});

    res.json({ message: 'Admin deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete admin: ' + error.message });
  }
});

module.exports = router;
