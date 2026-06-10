const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { User, Shop, StaffPermission } = require('../models');
const { generateToken } = require('../utils/jwt');
const { authMiddleware, requireAdmin, getUserPermissions } = require('../middleware/auth');
const { PERMISSION_GROUPS, ALL_PERMISSIONS, isValidPermission } = require('../config/permissions');

// Keep only valid, de-duplicated permission keys from a client-supplied array.
const sanitizePermissions = (arr) =>
  Array.isArray(arr) ? [...new Set(arr.filter(isValidPermission))] : [];

// Register shop (Public)
router.post('/register-shop', async (req, res) => {
  try {
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
      role: 'ROLE_ADMIN',
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
router.post('/login', async (req, res) => {
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

    res.json({
      token,
      role: user.role,
      permissions
    });
  } catch (error) {
    res.status(500).json({ error: 'Login failed: ' + error.message });
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
    // Replace the full set.
    await StaffPermission.destroy({ where: { userId: staff.id } });
    if (perms.length) {
      await StaffPermission.bulkCreate(perms.map(permissionKey => ({ userId: staff.id, permissionKey })));
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

module.exports = router;
