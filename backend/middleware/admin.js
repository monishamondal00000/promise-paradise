import { findUserById } from '../dal/users.js';

export const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'adminpp@gmail.com';

export async function adminMiddleware(req, res, next) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated.' });
    // Admin via email match (works even if user record isn't loaded)
    if (req.user.email === ADMIN_EMAIL) return next();
    const user = await findUserById(req.user.id);
    if (user && (user.isAdmin || user.email === ADMIN_EMAIL)) return next();
    return res.status(403).json({ error: 'Admin access required.' });
  } catch (err) {
    return res.status(500).json({ error: 'Admin check failed.', details: err.message });
  }
}
