const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'bft_aviator_secret_ke_2025';

function auth(req, res, next) {
  const h = req.headers.authorization;
  if (!h || !h.startsWith('Bearer ')) return res.json({ ok: false, msg: 'Unauthorized' });
  try {
    req.user = jwt.verify(h.slice(7), SECRET);
    next();
  } catch {
    res.json({ ok: false, msg: 'Invalid token' });
  }
}

function adminOnly(req, res, next) {
  auth(req, res, () => {
    if (req.user.role !== 'admin') return res.json({ ok: false, msg: 'Admins only' });
    next();
  });
}

function sign(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: '30d' });
}

module.exports = { auth, adminOnly, sign };
