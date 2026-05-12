const router = require('express').Router();
const { auth } = require('./middleware');
const { useMongo } = require('./db');
const { User, Txn, Bet } = require('./models');

router.get('/profile', auth, async (req, res) => {
  try {
    if (useMongo()) {
      const u = await User.findById(req.user.id).select('-password');
      return res.json({ ok: true, data: u });
    }
    const u = req.app.get('store').users.get(req.user.id);
    if (!u) return res.json({ ok: false, msg: 'Not found' });
    const { password, ...safe } = u;
    res.json({ ok: true, data: safe });
  } catch (e) { res.json({ ok: false, msg: e.message }); }
});

router.get('/balance', auth, async (req, res) => {
  try {
    if (useMongo()) {
      const u = await User.findById(req.user.id).select('balance bonus');
      return res.json({ ok: true, data: { balance: u.balance, bonus: u.bonus } });
    }
    const u = req.app.get('store').users.get(req.user.id);
    res.json({ ok: true, data: { balance: u?.balance ?? 0, bonus: u?.bonus ?? 0 } });
  } catch (e) { res.json({ ok: false, msg: e.message }); }
});

router.post('/deposit', auth, async (req, res) => {
  const amt = parseFloat(req.body.amount);
  if (!amt || amt < 10) return res.json({ ok: false, msg: 'Minimum deposit is KES 10' });
  await new Promise(r => setTimeout(r, 1200));
  try {
    if (useMongo()) {
      const u = await User.findById(req.user.id);
      u.balance = parseFloat((u.balance + amt).toFixed(2));
      await u.save();
      await Txn.create({ userId: u._id, username: u.username, type: 'deposit', amount: amt, note: 'Deposit' });
      return res.json({ ok: true, msg: `Deposit of KES ${amt} successful`, data: { balance: u.balance } });
    }
    const u = req.app.get('store').users.get(req.user.id);
    if (!u) return res.json({ ok: false, msg: 'User not found' });
    u.balance = parseFloat((u.balance + amt).toFixed(2));
    const txns = req.app.get('store').txns.get(req.user.id) || [];
    txns.unshift({ type: 'deposit', amount: amt, createdAt: new Date() });
    req.app.get('store').txns.set(req.user.id, txns.slice(0, 50));
    res.json({ ok: true, msg: `Deposit of KES ${amt} successful`, data: { balance: u.balance } });
  } catch (e) { res.json({ ok: false, msg: e.message }); }
});

router.post('/withdraw', auth, async (req, res) => {
  const amt = parseFloat(req.body.amount);
  if (!amt || amt < 10) return res.json({ ok: false, msg: 'Minimum withdrawal is KES 10' });
  try {
    if (useMongo()) {
      const u = await User.findById(req.user.id);
      if (u.balance < amt) return res.json({ ok: false, msg: 'Insufficient balance' });
      u.balance = parseFloat((u.balance - amt).toFixed(2));
      await u.save();
      await Txn.create({ userId: u._id, username: u.username, type: 'withdrawal', amount: -amt, note: 'Withdrawal' });
      return res.json({ ok: true, msg: `Withdrawal of KES ${amt} submitted`, data: { balance: u.balance } });
    }
    const u = req.app.get('store').users.get(req.user.id);
    if (!u) return res.json({ ok: false, msg: 'User not found' });
    if (u.balance < amt) return res.json({ ok: false, msg: 'Insufficient balance' });
    u.balance = parseFloat((u.balance - amt).toFixed(2));
    const txns = req.app.get('store').txns.get(req.user.id) || [];
    txns.unshift({ type: 'withdrawal', amount: -amt, createdAt: new Date() });
    req.app.get('store').txns.set(req.user.id, txns.slice(0, 50));
    res.json({ ok: true, msg: `Withdrawal of KES ${amt} submitted`, data: { balance: u.balance } });
  } catch (e) { res.json({ ok: false, msg: e.message }); }
});

router.get('/transactions', auth, async (req, res) => {
  try {
    if (useMongo()) {
      const txns = await Txn.find({ userId: req.user.id }).sort({ createdAt: -1 }).limit(50);
      return res.json({ ok: true, data: txns });
    }
    const txns = req.app.get('store').txns.get(req.user.id) || [];
    res.json({ ok: true, data: txns });
  } catch (e) { res.json({ ok: false, msg: e.message }); }
});

router.get('/bets', auth, async (req, res) => {
  try {
    if (useMongo()) {
      const bets = await Bet.find({ userId: req.user.id }).sort({ createdAt: -1 }).limit(50);
      return res.json({ ok: true, data: bets });
    }
    const bets = req.app.get('store').bets.get(req.user.id) || [];
    res.json({ ok: true, data: bets });
  } catch (e) { res.json({ ok: false, msg: e.message }); }
});

module.exports = router;
