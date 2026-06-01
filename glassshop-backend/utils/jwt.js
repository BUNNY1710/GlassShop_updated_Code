const jwt = require('jsonwebtoken');
require('dotenv').config();

const SECRET = process.env.JWT_SECRET || 'glassshopglassshopglassshopglassshop';
const EXPIRATION = process.env.JWT_EXPIRATION || '24h';

const generateToken = (username, role) => {
  return jwt.sign(
    {
      sub: username,
      role: role
    },
    SECRET,
    {
      expiresIn: EXPIRATION
    }
  );
};

const validateToken = (token) => {
  try {
    jwt.verify(token, SECRET);
    return true;
  } catch (error) {
    return false;
  }
};

const extractUsername = (token) => {
  try {
    const decoded = jwt.verify(token, SECRET);
    return decoded.sub;
  } catch (error) {
    return null;
  }
};

const extractRole = (token) => {
  try {
    const decoded = jwt.verify(token, SECRET);
    return decoded.role;
  } catch (error) {
    return null;
  }
};

module.exports = {
  generateToken,
  validateToken,
  extractUsername,
  extractRole
};
