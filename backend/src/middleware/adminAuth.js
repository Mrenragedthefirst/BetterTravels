/**
 * Admin Authentication Middleware
 * Checks for a Bearer token in the Authorization header.
 * Token is compared against ADMIN_SECRET in .env
 *
 * Frontend must send:
 *   Authorization: Bearer <token>
 */
const ADMIN_SECRET = process.env.ADMIN_SECRET;

module.exports = function adminAuth(req, res, next) {
  if (!ADMIN_SECRET) {
    // If no secret configured, allow through (dev mode / unconfigured)
    return next();
  }

  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token || token !== ADMIN_SECRET) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized. Valid admin token required.',
      requiresAuth: true
    });
  }

  next();
};
