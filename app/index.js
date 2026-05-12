const express = require('express');
const http    = require('http');
const { Server } = require('socket.io');
const path    = require('path');
const cors    = require('cors');
const { connectDB } = require('./db');
const Engine  = require('./engine');
const attachSocket = require('./socket');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, { cors: { origin: '*' } });
const PORT   = process.env.PORT || 5000;

const store = { users: new Map(), txns: new Map(), bets: new Map() };
app.set('store', store);

app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

const engine = new Engine(io, store);

app.use('/api/auth',  require('./auth'));
app.use('/api/user',  require('./user'));

// FIXED LINE
app.use('/api/admin', require('./admin'));

// ✅ ADDED ROOT ROUTE (THIS FIXES "Cannot GET /")
app.get('/', (_, res) => {
  res.redirect('/game');
});

app.get('/api/state', (_, res) => res.json({ ok: true, data: engine.getState() }));

['/game', '/crash', '/play'].forEach(r => app.get(r, (_, res) =>
  res.sendFile(path.join(__dirname, 'public/game.html'))
));

app.get('/admin', (_, res) =>
  res.sendFile(path.join(__dirname, 'public/admin.html'))
);

attachSocket(io, engine);

connectDB().then(() => {
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[SERVER] Betfity Aviator running on port ${PORT}`);
    engine.start();
  });
});
