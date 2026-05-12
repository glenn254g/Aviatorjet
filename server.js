const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const cors = require('cors');

const { connectDB } = require('./app/db');
const Engine = require('./app/engine');
const attachSocket = require('./app/socket');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*'
  }
});

const PORT = process.env.PORT || 5000;

const store = {
  users: new Map(),
  txns: new Map(),
  bets: new Map()
};

app.set('store', store);

app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// FIXED: use public folder directly
app.use(express.static(path.join(__dirname, 'public')));

// API routes
app.use('/auth', require('./app/auth'));
app.use('/api/auth', require('./app/auth'));
app.use('/api/user', require('./app/user'));
app.use('/api/admin', require('./app/admin'));

// Root route
app.get('/', (req, res) => {
  res.send('Betfity Aviator Server Running Successfully');
});

// Game state route
app.get('/api/state', (req, res) => {
  res.json({
    ok: true,
    data: engine.getState()
  });
});

const engine = new Engine(io, store);

// Game routes
['/game', '/crash', '/play'].forEach(route => {
  app.get(route, (req, res) => {
    res.sendFile(path.join(__dirname, 'public/game.html'));
  });
});

// Admin route
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/admin.html'));
});

attachSocket(io, engine);

connectDB()
  .then(() => {
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`[SERVER] Betfity Aviator running on port ${PORT}`);
      engine.start();
    });
  })
  .catch((err) => {
    console.error('Database connection failed:', err);
  });
