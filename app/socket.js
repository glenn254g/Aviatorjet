const jwt    = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'bft_aviator_secret_ke_2025';

module.exports = function attachSocket(io, engine) {
  io.use((socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.query.token;
    if (token) {
      try { socket.user = jwt.verify(token, SECRET); }
      catch { socket.user = null; }
    }
    next();
  });

  io.on('connection', socket => {
    socket.emit('g:state', engine.getState());

    socket.on('b:place', async data => {
      if (!socket.user) return socket.emit('b:err', { pid: data?.pid, msg: 'Not authenticated' });
      const { pid = 1, amt, auto } = data;
      const amount = parseFloat(amt);
      if (!amount || amount < 1) return socket.emit('b:err', { pid, msg: 'Min bet is 1 KES' });
      const r = await engine.placeBet(socket.id, socket.user.id, socket.user.username, pid, amount, auto || null);
      if (r.ok) socket.emit('b:ok', { pid, amt: amount, bal: r.bal });
      else socket.emit('b:err', { pid, msg: r.msg });
    });

    socket.on('b:cash', async data => {
      if (!socket.user) return socket.emit('b:err', { pid: data?.pid, msg: 'Not authenticated' });
      const r = await engine.cashout(socket.id, socket.user.id, data?.pid || 1);
      if (!r.ok) socket.emit('b:err', { pid: data?.pid, msg: r.msg });
    });

    socket.on('b:cancel', data => {
      if (!socket.user) return;
      const r = engine.cancelBet(socket.user.id, data?.pid || 1);
      if (r.ok) socket.emit('b:cancelled', { pid: data?.pid });
    });
  });
};
