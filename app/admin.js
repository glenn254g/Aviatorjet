const router = require('express').Router();
const { adminOnly } = require('./middleware');
const { useMongo } = require('./db');
const { User, Txn, Bet } = require('./models');

router.get('/stats', adminOnly, async (req, res) => {
  try {
    if (useMongo()) {
      const [users, bets, deps, wits] = await Promise.all([
        User.countDocuments(),
        Bet.countDocuments(),
        Txn.aggregate([{ $match: { type: 'deposit' } }, { $group: { _id: null, t: { $sum: '$amount' } } }]),
        Txn.aggregate([{ $match: { type: 'withdrawal' } }, { $group: { _id: null, t: { $sum: { $abs: '$amount' } } } }]),
      ]);
      return res.json({ ok: true, data: { users, bets, deposits: deps[0]?.t || 0, withdrawals: wits[0]?.t || 0 } });
    }
    const store = req.app.get('store');
    res.json({ ok: true, data: { users: store.users.size, bets: 0, deposits: 0, withdrawals: 0 } });
  } catch (e) { res.json({ ok: false, msg: e.message }); }
});

router.get('/users', adminOnly, async (req, res) => {
  try {
    if (useMongo()) {
      const users = await User.find().select('-password').sort({ createdAt: -1 });
      return res.json({ ok: true, data: users });
    }
    const list = [...req.app.get('store').users.values()].map(({ password, ...u }) => u);
    res.json({ ok: true, data: list });
  } catch (e) { res.json({ ok: false, msg: e.message }); }
});

router.post('/block', adminOnly, async (req, res) => {
  const { userId, blocked } = req.body;
  try {
    if (useMongo()) {
      await User.findByIdAndUpdate(userId, { blocked: !!blocked });
      return res.json({ ok: true });
    }
    const u = req.app.get('store').users.get(userId);
    if (u) u.blocked = !!blocked;
    res.json({ ok: true });
  } catch (e) { res.json({ ok: false, msg: e.message }); }
});

router.get('/txns', adminOnly, async (req, res) => {
  try {
    if (useMongo()) {
      const txns = await Txn.find().sort({ createdAt: -1 }).limit(100);
      return res.json({ ok: true, data: txns });
    }
    res.json({ ok: true, data: [] });
  } catch (e) { res.json({ ok: false, msg: e.message }); }
});

module.exports = router;
