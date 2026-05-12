const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { sign } = require('./middleware');
const { useMongo } = require('./db');
const { User } = require('./models');

router.post('/register', async (req, res) => {
  const { name, username, mobile, password, promo } = req.body;
  const uname = (name || username || '').trim();
  const mob   = (mobile || '').trim();

  if (!uname || !mob || !password)
    return res.json({ ok: false, msg: 'All fields required' });

  if (password.length < 6)
    return res.json({ ok: false, msg: 'Password min 6 characters' });

  const role = ['admin', 'Admin'].includes(uname) ? 'admin' : 'user';

  try {
    if (useMongo()) {
      const exists = await User.findOne({
        $or: [{ username: uname }, { mobile: mob }]
      });

      if (exists)
        return res.json({ ok: false, msg: 'Username or mobile already registered' });

      const user = await User.create({
        username: uname,
        mobile: mob,
        password,
        balance: 1000,
        bonus: 50,
        role,
        referredBy: promo || ''
      });

      const { Txn } = require('./models');

      await Txn.create({
        userId: user._id,
        username: uname,
        type: 'bonus',
        amount: 1000,
        note: 'Welcome bonus'
      });

      return res.json({
        ok: true,
        data: {
          token: sign({ id: user._id, username: uname, role }),
          username: uname,
          balance: 1000,
          role
        }
      });
    }

    const store = req.app.get('store');

    for (const u of store.users.values()) {
      if (u.username === uname || u.mobile === mob)
        return res.json({ ok: false, msg: 'Username or mobile already registered' });
    }

    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const hash = await bcrypt.hash(password, 10);

    store.users.set(id, {
      id,
      _id: id,
      username: uname,
      mobile: mob,
      password: hash,
      balance: 1000,
      bonus: 50,
      role,
      blocked: false
    });

    return res.json({
      ok: true,
      data: {
        token: sign({ id, username: uname, role }),
        username: uname,
        balance: 1000,
        role
      }
    });

  } catch (e) {
    res.json({ ok: false, msg: e.message });
  }
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password)
    return res.json({ ok: false, msg: 'All fields required' });

  try {
    if (useMongo()) {
      const user = await User.findOne({
        $or: [{ username }, { mobile: username }]
      });

      if (!user || user.blocked)
        return res.json({
          ok: false,
          msg: user?.blocked ? 'Account blocked' : 'Invalid credentials'
        });

      if (!await user.checkPassword(password))
        return res.json({ ok: false, msg: 'Invalid credentials' });

      return res.json({
        ok: true,
        data: {
          token: sign({ id: user._id, username: user.username, role: user.role }),
          username: user.username,
          balance: user.balance,
          role: user.role
        }
      });
    }

    const store = req.app.get('store');
    let found = null;

    for (const u of store.users.values()) {
      if (u.username === username || u.mobile === username) {
        found = u;
        break;
      }
    }

    if (!found)
      return res.json({ ok: false, msg: 'Invalid credentials' });

    if (found.blocked)
      return res.json({ ok: false, msg: 'Account blocked' });

    if (!await bcrypt.compare(password, found.password))
      return res.json({ ok: false, msg: 'Invalid credentials' });

    return res.json({
      ok: true,
      data: {
        token: sign({ id: found.id, username: found.username, role: found.role }),
        username: found.username,
        balance: found.balance,
        role: found.role
      }
    });

  } catch (e) {
    res.json({ ok: false, msg: e.message });
  }
});

module.exports = router;
