const jwt  = require('jsonwebtoken');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// SECURITY: no hardcoded production secret. In production a missing JWT_SECRET
// is a fatal misconfiguration (forgeable tokens) — fail fast. In development we
// allow a clearly-labelled throwaway so local startup isn't blocked.
const isProd = process.env.NODE_ENV === 'production';
const ENV_SECRET = process.env.JWT_SECRET;

if (isProd && (!ENV_SECRET || !ENV_SECRET.trim())) {
  throw new Error('JWT_SECRET is not set. Refusing to start in production with a default/forgeable secret. Set JWT_SECRET in the environment.');
}
if (ENV_SECRET && ENV_SECRET.length < 32) {
  console.warn('⚠️  JWT_SECRET is shorter than 32 characters — use a long random secret in production.');
}
if (!ENV_SECRET) {
  console.warn('⚠️  JWT_SECRET not set — using an insecure development-only secret. DO NOT use in production.');
}

const SECRET = ENV_SECRET || 'dev-only-insecure-secret-do-not-use-in-production';
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
