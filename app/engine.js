const crypto = require('crypto');
const { useMongo } = require('./db');

class Engine {
  constructor(io, store) {
    this.io    = io;
    this.store = store;
    this.state = 'waiting';
    this.roundId = null;
    this.crashAt = 1.00;
    this.mult  = 1.00;
    this.t0    = null;
    this.history = [];
    this.bets  = new Map();
    this._wait = null;
    this._tick = null;
  }

  _crash() {
    const buf = crypto.randomBytes(4);
    const n   = buf.readUInt32BE(0) / 0xFFFFFFFF;
    return parseFloat(Math.max(1.00, (1 / (1 - n * 0.94))).toFixed(2));
  }

  _mult(ms) {
    return parseFloat(Math.max(1.00, Math.pow(1.07, ms / 1000)).toFixed(2));
  }

  _id() {
    return crypto.randomBytes(4).toString('hex');
  }

  _color(m) {
    return m >= 10 ? '#f39c12' : m >= 5 ? '#e84393' : m >= 2 ? '#0984e3' : '#6c5ce7';
  }

  getState() {
    return { state: this.state, mult: this.mult, roundId: this.roundId, history: this.history };
  }

  start() { this._startWait(); }

  _startWait() {
    this.state   = 'waiting';
    this.roundId = this._id();
    this.crashAt = this._crash();
    this.mult    = 1.00;
    this.bets.clear();
    let cd = 5;
    this.io.emit('g:wait', { cd, roundId: this.roundId });
    this._wait = setInterval(() => {
      cd--;
      if (cd > 0) { this.io.emit('g:wait', { cd, roundId: this.roundId }); }
      else { clearInterval(this._wait); this._startFly(); }
    }, 1000);
  }

  _startFly() {
    this.state = 'flying';
    this.t0    = Date.now();
    this.io.emit('g:start', { roundId: this.roundId });
    this._tick = setInterval(async () => {
      const ms  = Date.now() - this.t0;
      this.mult = this._mult(ms);
      this.io.emit('g:tick', { mult: this.mult });
      for (const [, b] of this.bets) {
        if (b.auto && !b.done && this.mult >= b.auto) await this._payout(b, this.mult, true);
      }
      if (this.mult >= this.crashAt) { clearInterval(this._tick); this._doCrash(); }
    }, 100);
  }

  async _doCrash() {
    this.state = 'crashed';
    const cp   = this.crashAt;
    this.history.unshift({ m: cp, c: this._color(cp) });
    if (this.history.length > 25) this.history.pop();
    this.io.emit('g:crash', { cp, history: this.history });
    for (const [, b] of this.bets) {
      if (!b.done) {
        this.io.to(b.sid).emit('b:lost', { pid: b.pid, amt: b.amt, cp });
        await this._recordLoss(b, cp);
      }
    }
    setTimeout(() => this._startWait(), 2000);
  }

  async _recordLoss(b, cp) {
    if (!useMongo()) {
      const bets = this.store.bets.get(b.uid) || [];
      bets.unshift({ amount: b.amt, status: 'lost', cashoutAt: null, winAmount: 0, createdAt: new Date() });
      this.store.bets.set(b.uid, bets.slice(0, 50));
      return;
    }
    try {
      const { Bet } = require('./models');
      if (b._id) await Bet.findByIdAndUpdate(b._id, { status: 'lost', crashPoint: cp });
    } catch {}
  }

  async _payout(b, mult, isAuto) {
    if (b.done) return;
    b.done = true;
    const win = parseFloat((b.amt * mult).toFixed(2));
    if (!useMongo()) {
      const u = this.store.users.get(b.uid);
      if (u) {
        u.balance = parseFloat((u.balance + win).toFixed(2));
        this.io.to(b.sid).emit('b:cash', { pid: b.pid, mult, win, bal: u.balance, isAuto });
      }
      const bets = this.store.bets.get(b.uid) || [];
      bets.unshift({ amount: b.amt, status: isAuto ? 'auto' : 'won', cashoutAt: mult, winAmount: win, createdAt: new Date() });
      this.store.bets.set(b.uid, bets.slice(0, 50));
      const txns = this.store.txns.get(b.uid) || [];
      txns.unshift({ type: 'win', amount: win, createdAt: new Date() });
      this.store.txns.set(b.uid, txns.slice(0, 50));
      return;
    }
    try {
      const { User, Bet, Txn } = require('./models');
      const u = await User.findById(b.uid);
      if (!u) return;
      u.balance = parseFloat((u.balance + win).toFixed(2));
      await u.save();
      if (b._id) await Bet.findByIdAndUpdate(b._id, { status: isAuto ? 'auto' : 'won', cashoutAt: mult, winAmount: win });
      await Txn.create({ userId: b.uid, username: b.uname, type: 'win', amount: win, note: `Cashout ${mult}x` });
      this.io.to(b.sid).emit('b:cash', { pid: b.pid, mult, win, bal: u.balance, isAuto });
    } catch {}
  }

  async placeBet(sid, uid, uname, pid, amt, auto) {
    if (this.state !== 'waiting') return { ok: false, msg: 'Round in progress' };
    const key = `${uid}_${pid}`;
    if (this.bets.has(key)) return { ok: false, msg: 'Bet already placed' };

    if (!useMongo()) {
      const u = this.store.users.get(uid);
      if (!u) return { ok: false, msg: 'User not found' };
      if (u.balance < amt) return { ok: false, msg: 'Insufficient balance' };
      if (u.blocked) return { ok: false, msg: 'Account blocked' };
      u.balance = parseFloat((u.balance - amt).toFixed(2));
      this.bets.set(key, { _id: null, sid, uid, uname, pid, amt, auto: auto || null, done: false });
      return { ok: true, bal: u.balance };
    }
    try {
      const { User, Bet, Txn } = require('./models');
      const u = await User.findById(uid);
      if (!u) return { ok: false, msg: 'User not found' };
      if (u.balance < amt) return { ok: false, msg: 'Insufficient balance' };
      if (u.blocked) return { ok: false, msg: 'Account blocked' };
      u.balance = parseFloat((u.balance - amt).toFixed(2));
      await u.save();
      const bd = await Bet.create({ userId: uid, username: uname, roundId: this.roundId, amount: amt, panelId: pid, autoCashout: auto || null });
      await Txn.create({ userId: uid, username: uname, type: 'bet', amount: -amt, note: 'Bet placed' });
      this.bets.set(key, { _id: bd._id, sid, uid, uname, pid, amt, auto: auto || null, done: false });
      return { ok: true, bal: u.balance };
    } catch (e) { return { ok: false, msg: e.message }; }
  }

  async cashout(sid, uid, pid) {
    if (this.state !== 'flying') return { ok: false, msg: 'No active round' };
    const key = `${uid}_${pid}`;
    const b   = this.bets.get(key);
    if (!b) return { ok: false, msg: 'No active bet' };
    if (b.done) return { ok: false, msg: 'Already cashed out' };
    await this._payout(b, this.mult, false);
    return { ok: true };
  }

  cancelBet(uid, pid) {
    if (this.state !== 'waiting') return { ok: false, msg: 'Cannot cancel after start' };
    const key = `${uid}_${pid}`;
    const b   = this.bets.get(key);
    if (!b) return { ok: false, msg: 'No bet found' };
    if (!useMongo()) {
      const u = this.store.users.get(uid);
      if (u) u.balance = parseFloat((u.balance + b.amt).toFixed(2));
    } else {
      try { const { User } = require('./models'); User.findByIdAndUpdate(uid, { $inc: { balance: b.amt } }).exec(); } catch {}
    }
    this.bets.delete(key);
    return { ok: true };
  }
}

module.exports = Engine;
