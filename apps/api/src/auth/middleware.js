import { readCookie, SESSION_COOKIE, findSessionUser } from './session.js';

export async function requireAuth(req, res, next) {
  try {
    const user = await findSessionUser(readCookie(req, SESSION_COOKIE));
    if (!user) return res.status(401).json({ error: 'UNAUTHENTICATED' });
    req.user = { id: Number(user.id), email: user.email, role: user.role };
    return next();
  } catch (error) {
    return next(error);
  }
}

/** RBAC (PRD §4): tidak ada peran yang boleh menulis ledger di luar Bendahara. */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'UNAUTHENTICATED' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'FORBIDDEN', role: req.user.role });
    }
    return next();
  };
}
